from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from database import get_db
import models
import auth
from utils import get_ist_now, get_ist_today

router = APIRouter(prefix="/tasks", tags=["tasks"])

class TaskCreate(BaseModel):
    assigned_to: int
    title: str
    description: str = ""
    priority: str = "medium"
    due_date: Optional[str] = None

class TaskUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None

def task_to_dict(t: models.Task, db: Session):
    assignee = db.query(models.User).filter(models.User.id == t.assigned_to).first()
    assigner = db.query(models.User).filter(models.User.id == t.assigned_by).first()
    return {
        "id": t.id,
        "assigned_to": t.assigned_to,
        "assigned_to_name": assignee.name if assignee else "",
        "assigned_by": t.assigned_by,
        "assigned_by_name": assigner.name if assigner else "",
        "title": t.title,
        "description": t.description,
        "priority": t.priority,
        "status": t.status,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }

@router.post("/")
def create_task(data: TaskCreate, db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    task = models.Task(
        assigned_to=data.assigned_to,
        assigned_by=manager.id,
        title=data.title,
        description=data.description,
        priority=data.priority,
        due_date=date.fromisoformat(data.due_date) if data.due_date else None,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task_to_dict(task, db)

@router.get("/my")
def my_tasks(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    tasks = db.query(models.Task).filter(
        models.Task.assigned_to == current_user.id
    ).order_by(models.Task.created_at.desc()).all()
    return [task_to_dict(t, db) for t in tasks]

@router.get("/all")
def all_tasks(db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    tasks = db.query(models.Task).order_by(models.Task.created_at.desc()).all()
    return [task_to_dict(t, db) for t in tasks]

@router.put("/{task_id}/complete")
def complete_task(task_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.assigned_to != current_user.id and current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Not authorized")
    task.status = "completed"
    task.completed_at = get_ist_now()
    db.commit()
    db.refresh(task)
    return task_to_dict(task, db)

@router.put("/{task_id}/status")
def update_task_status(task_id: int, data: TaskUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.assigned_to != current_user.id and current_user.role != "manager":
        raise HTTPException(status_code=403, detail="Not authorized")
    if data.status:
        task.status = data.status
        if data.status == "completed":
            task.completed_at = get_ist_now()
    if data.priority and current_user.role == "manager":
        task.priority = data.priority
    db.commit()
    db.refresh(task)
    return task_to_dict(task, db)

@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}
