from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models
import auth
from datetime import datetime
from utils import get_ist_now, get_ist_today

router = APIRouter(prefix="/tracking", tags=["tracking"])

class LocationUpdate(BaseModel):
    lat: float
    lng: float
    accuracy: float = 0

def haversine_km(lat1, lng1, lat2, lng2):
    import math
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def loc_to_dict(l: models.GpsLocation, db: Session):
    user = db.query(models.User).filter(models.User.id == l.user_id).first()
    return {
        "id": l.id,
        "user_id": l.user_id,
        "user_name": user.name if user else "",
        "lat": l.lat,
        "lng": l.lng,
        "accuracy": l.accuracy,
        "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        "is_in_zone": l.is_in_zone,
    }

@router.post("/update")
def update_location(data: LocationUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    config = db.query(models.AppConfig).first()
    if not config:
        config = models.AppConfig(pump_lat=28.6139, pump_lng=77.2090, geofence_radius=200)
        
    dist = haversine_km(data.lat, data.lng, config.pump_lat, config.pump_lng)
    
    # Configure radius from meters to km
    geofence_km = config.geofence_radius / 1000.0
    is_in_zone = dist <= geofence_km
    
    loc = models.GpsLocation(
        user_id=current_user.id,
        lat=data.lat,
        lng=data.lng,
        accuracy=data.accuracy,
        is_in_zone=is_in_zone,
        timestamp=get_ist_now(),
    )
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return {**loc_to_dict(loc, db), "distance_km": round(dist, 3), "alert": not is_in_zone}

@router.get("/live")
def live_locations(db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    """Get the latest location for each active staff member"""
    users = db.query(models.User).filter(models.User.is_active == True, models.User.role == "staff").all()
    result = []
    for user in users:
        last_loc = db.query(models.GpsLocation).filter(
            models.GpsLocation.user_id == user.id
        ).order_by(models.GpsLocation.timestamp.desc()).first()
        if last_loc:
            d = loc_to_dict(last_loc, db)
            d["user_name"] = user.name
            d["shift"] = user.shift
            result.append(d)
        else:
            result.append({
                "user_id": user.id,
                "user_name": user.name,
                "shift": user.shift,
                "lat": None,
                "lng": None,
                "is_in_zone": None,
                "timestamp": None,
            })
    return result

@router.get("/history/{user_id}")
def location_history(user_id: int, db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    locs = db.query(models.GpsLocation).filter(
        models.GpsLocation.user_id == user_id
    ).order_by(models.GpsLocation.timestamp.desc()).limit(100).all()
    return [loc_to_dict(l, db) for l in locs]
