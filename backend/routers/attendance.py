from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from database import get_db
import models
import auth

router = APIRouter(prefix="/attendance", tags=["attendance"])

class CheckInRequest(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    notes: str = ""

class CheckOutRequest(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None

def record_to_dict(r: models.AttendanceRecord, user_name: str = ""):
    return {
        "id": r.id,
        "user_id": r.user_id,
        "user_name": user_name,
        "date": r.date.isoformat() if r.date else None,
        "check_in": r.check_in.isoformat() if r.check_in else None,
        "check_out": r.check_out.isoformat() if r.check_out else None,
        "check_in_lat": r.check_in_lat,
        "check_in_lng": r.check_in_lng,
        "check_out_lat": r.check_out_lat,
        "check_out_lng": r.check_out_lng,
        "status": r.status,
        "notes": r.notes,
    }

@router.post("/checkin")
def check_in(data: CheckInRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    today = date.today()
    existing = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.user_id == current_user.id,
        models.AttendanceRecord.date == today
    ).first()
    if existing and existing.check_in:
        raise HTTPException(status_code=400, detail="Already checked in today")
    
    now = datetime.utcnow()
    # Determine if late (after 9am for morning shift, etc.)
    hour = now.hour
    status = "present"
    if current_user.shift == "Morning" and hour >= 9:
        status = "late"
    elif current_user.shift == "Evening" and hour >= 15:
        status = "late"
    elif current_user.shift == "Night" and hour >= 23:
        status = "late"
    
    if existing:
        existing.check_in = now
        existing.check_in_lat = data.lat
        existing.check_in_lng = data.lng
        existing.notes = data.notes
        existing.status = status
        db.commit()
        db.refresh(existing)
        return record_to_dict(existing, current_user.name)
    
    record = models.AttendanceRecord(
        user_id=current_user.id,
        date=today,
        check_in=now,
        check_in_lat=data.lat,
        check_in_lng=data.lng,
        status=status,
        notes=data.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record_to_dict(record, current_user.name)

@router.post("/checkout")
def check_out(data: CheckOutRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    today = date.today()
    record = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.user_id == current_user.id,
        models.AttendanceRecord.date == today
    ).first()
    if not record or not record.check_in:
        raise HTTPException(status_code=400, detail="Not checked in yet")
    if record.check_out:
        raise HTTPException(status_code=400, detail="Already checked out today")
    record.check_out = datetime.utcnow()
    record.check_out_lat = data.lat
    record.check_out_lng = data.lng
    db.commit()
    db.refresh(record)
    return record_to_dict(record, current_user.name)

@router.get("/today")
def today_attendance(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    today = date.today()
    if current_user.role == "manager":
        records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.date == today).all()
        result = []
        for r in records:
            user = db.query(models.User).filter(models.User.id == r.user_id).first()
            result.append(record_to_dict(r, user.name if user else ""))
        return result
    else:
        record = db.query(models.AttendanceRecord).filter(
            models.AttendanceRecord.user_id == current_user.id,
            models.AttendanceRecord.date == today
        ).first()
        return record_to_dict(record, current_user.name) if record else None

@router.get("/my-history")
def my_history(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    records = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.user_id == current_user.id
    ).order_by(models.AttendanceRecord.date.desc()).limit(30).all()
    return [record_to_dict(r, current_user.name) for r in records]

@router.get("/all")
def all_attendance(db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    records = db.query(models.AttendanceRecord).order_by(models.AttendanceRecord.date.desc()).limit(200).all()
    result = []
    for r in records:
        user = db.query(models.User).filter(models.User.id == r.user_id).first()
        result.append(record_to_dict(r, user.name if user else ""))
    return result
