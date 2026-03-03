from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
import models
import auth

router = APIRouter(prefix="/staff", tags=["staff"])

class StaffCreate(BaseModel):
    name: str
    username: str
    password: str
    role: str = "staff"
    phone: str = ""
    email: str = ""
    shift: str = "Morning"
    department: str = "General"
    employee_id: str = ""

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    shift: Optional[str] = None
    department: Optional[str] = None
    employee_id: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

def user_to_dict(user: models.User):
    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "role": user.role,
        "phone": user.phone,
        "email": user.email,
        "shift": user.shift,
        "department": user.department,
        "employee_id": user.employee_id,
        "is_active": user.is_active,
        "casual_leave": user.casual_leave,
        "sick_leave": user.sick_leave,
        "paid_leave": user.paid_leave,
        "unpaid_leave": user.unpaid_leave,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }

@router.get("/")
def list_staff(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    users = db.query(models.User).filter(models.User.is_active == True).all()
    return [user_to_dict(u) for u in users]

@router.get("/{user_id}")
def get_staff(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Staff not found")
    return user_to_dict(user)

@router.post("/")
def create_staff(data: StaffCreate, db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    existing = db.query(models.User).filter(models.User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    user = models.User(
        name=data.name,
        username=data.username,
        password_hash=auth.hash_password(data.password),
        role=data.role,
        phone=data.phone,
        email=data.email,
        shift=data.shift,
        department=data.department,
        employee_id=data.employee_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user_to_dict(user)

@router.put("/{user_id}")
def update_staff(user_id: int, data: StaffUpdate, db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Staff not found")
    for field, value in data.dict(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user_to_dict(user)

@router.delete("/{user_id}")
def delete_staff(user_id: int, db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Staff not found")
    user.is_active = False
    db.commit()
    return {"message": "Staff deactivated"}
