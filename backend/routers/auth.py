from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models
import auth

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.username == request.username,
        models.User.is_active == True
    ).first()
    if not user or not auth.verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = auth.create_access_token({"user_id": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "role": user.role,
            "shift": user.shift,
            "department": user.department,
            "employee_id": user.employee_id,
            "phone": user.phone,
            "email": user.email,
        }
    }

@router.get("/me")
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "username": current_user.username,
        "role": current_user.role,
        "shift": current_user.shift,
        "department": current_user.department,
        "employee_id": current_user.employee_id,
        "phone": current_user.phone,
        "email": current_user.email,
        "casual_leave": current_user.casual_leave,
        "sick_leave": current_user.sick_leave,
        "paid_leave": current_user.paid_leave,
        "unpaid_leave": current_user.unpaid_leave,
    }
