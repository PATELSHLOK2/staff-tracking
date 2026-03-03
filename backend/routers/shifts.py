from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from database import get_db
import models
import auth

router = APIRouter(prefix="/shifts", tags=["shifts"])

class ShiftCreate(BaseModel):
    user_id: int
    shift_name: str
    start_time: str
    end_time: str
    date: str
    is_off: bool = False

class ShiftBulkCreate(BaseModel):
    shifts: List[ShiftCreate]

def shift_to_dict(s: models.Shift):
    return {
        "id": s.id,
        "user_id": s.user_id,
        "user_name": s.user_name,
        "shift_name": s.shift_name,
        "start_time": s.start_time,
        "end_time": s.end_time,
        "date": s.date.isoformat() if s.date else None,
        "is_off": s.is_off,
    }

@router.get("/week")
def get_week_shifts(week_start: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    from datetime import timedelta
    start = date.fromisoformat(week_start)
    end = start + timedelta(days=6)
    shifts = db.query(models.Shift).filter(
        models.Shift.date >= start,
        models.Shift.date <= end
    ).all()
    return [shift_to_dict(s) for s in shifts]

@router.get("/my")
def my_shifts(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    from datetime import timedelta
    today = date.today()
    start = today
    end = today + timedelta(days=14)
    shifts = db.query(models.Shift).filter(
        models.Shift.user_id == current_user.id,
        models.Shift.date >= start,
        models.Shift.date <= end
    ).order_by(models.Shift.date).all()
    return [shift_to_dict(s) for s in shifts]

@router.post("/")
def create_shift(data: ShiftCreate, db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    user = db.query(models.User).filter(models.User.id == data.user_id).first()
    shift_date = date.fromisoformat(data.date)
    existing = db.query(models.Shift).filter(
        models.Shift.user_id == data.user_id,
        models.Shift.date == shift_date
    ).first()
    if existing:
        existing.shift_name = data.shift_name
        existing.start_time = data.start_time
        existing.end_time = data.end_time
        existing.is_off = data.is_off
        db.commit()
        db.refresh(existing)
        return shift_to_dict(existing)
    shift = models.Shift(
        user_id=data.user_id,
        user_name=user.name if user else "",
        shift_name=data.shift_name,
        start_time=data.start_time,
        end_time=data.end_time,
        date=shift_date,
        is_off=data.is_off,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift_to_dict(shift)

@router.post("/bulk")
def create_bulk_shifts(data: ShiftBulkCreate, db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    results = []
    for sd in data.shifts:
        user = db.query(models.User).filter(models.User.id == sd.user_id).first()
        shift_date = date.fromisoformat(sd.date)
        existing = db.query(models.Shift).filter(
            models.Shift.user_id == sd.user_id,
            models.Shift.date == shift_date
        ).first()
        if existing:
            existing.shift_name = sd.shift_name
            existing.start_time = sd.start_time
            existing.end_time = sd.end_time
            existing.is_off = sd.is_off
            db.commit()
            db.refresh(existing)
            results.append(shift_to_dict(existing))
        else:
            shift = models.Shift(
                user_id=sd.user_id,
                user_name=user.name if user else "",
                shift_name=sd.shift_name,
                start_time=sd.start_time,
                end_time=sd.end_time,
                date=shift_date,
                is_off=sd.is_off,
            )
            db.add(shift)
            db.commit()
            db.refresh(shift)
            results.append(shift_to_dict(shift))
    return results

@router.delete("/{shift_id}")
def delete_shift(shift_id: int, db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    shift = db.query(models.Shift).filter(models.Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db.delete(shift)
    db.commit()
    return {"message": "Shift deleted"}
