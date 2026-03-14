from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from datetime import date, timedelta
from database import get_db
import models
import auth
import io
from utils import get_ist_now, get_ist_today

router = APIRouter(prefix="/reports", tags=["reports"])

def get_date_range(period: str):
    today = get_ist_today()
    if period == "daily":
        return today, today
    elif period == "weekly":
        start = today - timedelta(days=today.weekday())
        return start, today
    elif period == "monthly":
        start = today.replace(day=1)
        return start, today
    return today - timedelta(days=30), today

@router.get("/attendance-summary")
def attendance_summary(period: str = "monthly", db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    start, end = get_date_range(period)
    users = db.query(models.User).filter(models.User.is_active == True, models.User.role == "staff").all()
    result = []
    for user in users:
        records = db.query(models.AttendanceRecord).filter(
            models.AttendanceRecord.user_id == user.id,
            models.AttendanceRecord.date >= start,
            models.AttendanceRecord.date <= end,
        ).all()
        present = sum(1 for r in records if r.status in ["present", "late"])
        late = sum(1 for r in records if r.status == "late")
        absent = sum(1 for r in records if r.status == "absent")
        # Calculate total hours
        total_minutes = 0
        for r in records:
            if r.check_in and r.check_out:
                diff = (r.check_out - r.check_in).total_seconds() / 60
                total_minutes += diff
        result.append({
            "user_id": user.id,
            "user_name": user.name,
            "shift": user.shift,
            "department": user.department,
            "total_days": len(records),
            "present": present,
            "absent": absent,
            "late": late,
            "total_hours": round(total_minutes / 60, 1),
        })
    return {"period": period, "start": start.isoformat(), "end": end.isoformat(), "data": result}

@router.get("/leave-summary")
def leave_summary(period: str = "monthly", db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    start, end = get_date_range(period)
    leaves = db.query(models.LeaveApplication).filter(
        models.LeaveApplication.created_at >= start,
        models.LeaveApplication.created_at <= end,
    ).all()
    summary = []
    for l in leaves:
        user = db.query(models.User).filter(models.User.id == l.user_id).first()
        days = (l.end_date - l.start_date).days + 1
        summary.append({
            "user_name": user.name if user else "",
            "leave_type": l.leave_type,
            "days": days,
            "status": l.status,
            "start_date": l.start_date.isoformat(),
            "end_date": l.end_date.isoformat(),
        })
    return {"period": period, "data": summary}

@router.get("/performance")
def performance_report(period: str = "monthly", db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    start, end = get_date_range(period)
    users = db.query(models.User).filter(models.User.is_active == True, models.User.role == "staff").all()
    result = []
    for user in users:
        att_records = db.query(models.AttendanceRecord).filter(
            models.AttendanceRecord.user_id == user.id,
            models.AttendanceRecord.date >= start,
            models.AttendanceRecord.date <= end,
        ).all()
        tasks = db.query(models.Task).filter(
            models.Task.assigned_to == user.id,
        ).all()
        completed_tasks = [t for t in tasks if t.status == "completed"]
        total_min = sum(
            (r.check_out - r.check_in).total_seconds() / 60
            for r in att_records if r.check_in and r.check_out
        )
        result.append({
            "user_id": user.id,
            "user_name": user.name,
            "shift": user.shift,
            "department": user.department,
            "attendance_days": len(att_records),
            "total_hours": round(total_min / 60, 1),
            "tasks_assigned": len(tasks),
            "tasks_completed": len(completed_tasks),
            "completion_rate": round(len(completed_tasks) / len(tasks) * 100, 1) if tasks else 0,
            "on_time_rate": round(sum(1 for r in att_records if r.status == "present") / len(att_records) * 100, 1) if att_records else 0,
        })
    return {"period": period, "start": start.isoformat(), "end": end.isoformat(), "data": result}

@router.get("/export/attendance-csv")
def export_attendance_csv(period: str = "monthly", db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    start, end = get_date_range(period)
    records = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.date >= start,
        models.AttendanceRecord.date <= end,
    ).order_by(models.AttendanceRecord.date.desc()).all()
    
    import csv
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Name", "Check In", "Check Out", "Status", "Hours"])
    for r in records:
        user = db.query(models.User).filter(models.User.id == r.user_id).first()
        hours = ""
        if r.check_in and r.check_out:
            hours = round((r.check_out - r.check_in).total_seconds() / 3600, 2)
        writer.writerow([
            r.date, user.name if user else "", 
            r.check_in.strftime("%H:%M") if r.check_in else "",
            r.check_out.strftime("%H:%M") if r.check_out else "",
            r.status, hours
        ])
    
    return Response(content=output.getvalue(), media_type="text/csv",
                   headers={"Content-Disposition": "attachment; filename=attendance.csv"})

@router.get("/dashboard-stats")
def dashboard_stats(db: Session = Depends(get_db), manager: models.User = Depends(auth.require_manager)):
    today = get_ist_today()
    total_staff = db.query(models.User).filter(models.User.is_active == True, models.User.role == "staff").count()
    today_records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.date == today).all()
    checked_in = sum(1 for r in today_records if r.check_in and not r.check_out)
    checked_out = sum(1 for r in today_records if r.check_in and r.check_out)
    pending_leaves = db.query(models.LeaveApplication).filter(models.LeaveApplication.status == "pending").count()
    pending_tasks = db.query(models.Task).filter(models.Task.status == "pending").count()
    
    return {
        "total_staff": total_staff,
        "present_today": len(today_records),
        "checked_in": checked_in,
        "checked_out": checked_out,
        "absent_today": total_staff - len(today_records),
        "pending_leaves": pending_leaves,
        "pending_tasks": pending_tasks,
    }
