from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import auth
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/settings", tags=["settings"])

class SettingsUpdate(BaseModel):
    pump_name: str
    pump_lat: float
    pump_lng: float
    geofence_radius: int

@router.get("/")
def get_settings(db: Session = Depends(get_db)):
    config = db.query(models.AppConfig).first()
    if not config:
        # Return defaults if not initialized for some reason
        return {"pump_name": "Petrol Pump Staff Management", "pump_lat": 28.6139, "pump_lng": 77.2090, "geofence_radius": 200}
    return {
        "pump_name": config.pump_name,
        "pump_lat": config.pump_lat,
        "pump_lng": config.pump_lng,
        "geofence_radius": config.geofence_radius
    }

@router.put("/")
def update_settings(
    settings: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_manager)
):
    config = db.query(models.AppConfig).first()
    if not config:
        config = models.AppConfig(
            pump_name=settings.pump_name,
            pump_lat=settings.pump_lat,
            pump_lng=settings.pump_lng,
            geofence_radius=settings.geofence_radius
        )
        db.add(config)
    else:
        config.pump_name = settings.pump_name
        config.pump_lat = settings.pump_lat
        config.pump_lng = settings.pump_lng
        config.geofence_radius = settings.geofence_radius
        
    db.commit()
    db.refresh(config)
    
    return {
        "message": "Settings updated successfully",
        "pump_name": config.pump_name,
        "pump_lat": config.pump_lat,
        "pump_lng": config.pump_lng,
        "geofence_radius": config.geofence_radius
    }
