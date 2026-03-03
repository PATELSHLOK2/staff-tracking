from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import get_db
import models
import auth

router = APIRouter(prefix="/communication", tags=["communication"])

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    priority: str = "normal"

class FeedbackCreate(BaseModel):
    message: str
    category: str = "general"
    is_anonymous: bool = False

def ann_to_dict(a: models.Announcement, db: Session):
    author = db.query(models.User).filter(models.User.id == a.author_id).first()
    return {
        "id": a.id,
        "author_id": a.author_id,
        "author_name": author.name if author else "",
        "title": a.title,
        "message": a.message,
        "priority": a.priority,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }

def fb_to_dict(f: models.Feedback, db: Session):
    author = db.query(models.User).filter(models.User.id == f.author_id).first()
    return {
        "id": f.id,
        "author_id": f.author_id,
        "author_name": "Anonymous" if f.is_anonymous else (author.name if author else ""),
        "message": f.message,
        "category": f.category,
        "is_anonymous": f.is_anonymous,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }

@router.post("/announcements")
def create_announcement(data: AnnouncementCreate, db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    ann = models.Announcement(
        author_id=manager.id,
        title=data.title,
        message=data.message,
        priority=data.priority,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return ann_to_dict(ann, db)

@router.get("/announcements")
def list_announcements(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    anns = db.query(models.Announcement).order_by(models.Announcement.created_at.desc()).limit(50).all()
    return [ann_to_dict(a, db) for a in anns]

@router.delete("/announcements/{ann_id}")
def delete_announcement(ann_id: int, db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    ann = db.query(models.Announcement).filter(models.Announcement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(ann)
    db.commit()
    return {"message": "Deleted"}

@router.post("/feedback")
def submit_feedback(data: FeedbackCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    fb = models.Feedback(
        author_id=current_user.id,
        message=data.message,
        category=data.category,
        is_anonymous=data.is_anonymous,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb_to_dict(fb, db)

@router.get("/feedback")
def list_feedback(db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    feedbacks = db.query(models.Feedback).order_by(models.Feedback.created_at.desc()).all()
    return [fb_to_dict(f, db) for f in feedbacks]
