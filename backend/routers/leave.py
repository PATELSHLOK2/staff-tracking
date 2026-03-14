from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from database import get_db
import models
import auth
from utils import get_ist_now, get_ist_today

router = APIRouter(prefix="/leaves", tags=["leaves"])

class LeaveCreate(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: str = ""

class LeaveReview(BaseModel):
    status: str  # approved or rejected
    manager_note: str = ""

def leave_to_dict(l: models.LeaveApplication, db: Session):
    user = db.query(models.User).filter(models.User.id == l.user_id).first()
    return {
        "id": l.id,
        "user_id": l.user_id,
        "user_name": user.name if user else "",
        "leave_type": l.leave_type,
        "start_date": l.start_date.isoformat() if l.start_date else None,
        "end_date": l.end_date.isoformat() if l.end_date else None,
        "reason": l.reason,
        "status": l.status,
        "manager_note": l.manager_note,
        "created_at": l.created_at.isoformat() if l.created_at else None,
        "reviewed_at": l.reviewed_at.isoformat() if l.reviewed_at else None,
    }

@router.post("/")
def apply_leave(data: LeaveCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    start = date.fromisoformat(data.start_date)
    end = date.fromisoformat(data.end_date)
    if end < start:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    leave = models.LeaveApplication(
        user_id=current_user.id,
        leave_type=data.leave_type,
        start_date=start,
        end_date=end,
        reason=data.reason,
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave_to_dict(leave, db)

@router.get("/my")
def my_leaves(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    leaves = db.query(models.LeaveApplication).filter(
        models.LeaveApplication.user_id == current_user.id
    ).order_by(models.LeaveApplication.created_at.desc()).all()
    return [leave_to_dict(l, db) for l in leaves]

@router.get("/all")
def all_leaves(db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    leaves = db.query(models.LeaveApplication).order_by(models.LeaveApplication.created_at.desc()).all()
    return [leave_to_dict(l, db) for l in leaves]

@router.get("/pending")
def pending_leaves(db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    leaves = db.query(models.LeaveApplication).filter(
        models.LeaveApplication.status == "pending"
    ).order_by(models.LeaveApplication.created_at.desc()).all()
    return [leave_to_dict(l, db) for l in leaves]

@router.put("/{leave_id}/review")
def review_leave(leave_id: int, data: LeaveReview, db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    leave = db.query(models.LeaveApplication).filter(models.LeaveApplication.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    if leave.status != "pending":
        raise HTTPException(status_code=400, detail="Leave already reviewed")
    if data.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    leave.status = data.status
    leave.manager_note = data.manager_note
    leave.reviewed_by = manager.id
    leave.reviewed_at = get_ist_now()
    
    # Deduct leave balance if approved
    if data.status == "approved":
        days = (leave.end_date - leave.start_date).days + 1
        user = db.query(models.User).filter(models.User.id == leave.user_id).first()
        if user:
            if leave.leave_type == "casual":
                user.casual_leave = max(0, user.casual_leave - days)
            elif leave.leave_type == "sick":
                user.sick_leave = max(0, user.sick_leave - days)
            elif leave.leave_type == "paid":
                user.paid_leave = max(0, user.paid_leave - days)
    
    db.commit()
    db.refresh(leave)
    return leave_to_dict(leave, db)
