from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Date
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
from utils import get_ist_now, get_ist_today

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="staff")  # "manager" or "staff"
    phone = Column(String, default="")
    email = Column(String, default="")
    shift = Column(String, default="Morning")  # Morning, Evening, Night
    department = Column(String, default="General")
    employee_id = Column(String, default="")
    casual_leave = Column(Integer, default=12)
    sick_leave = Column(Integer, default=10)
    paid_leave = Column(Integer, default=15)
    unpaid_leave = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_ist_now)

    attendance_records = relationship("AttendanceRecord", back_populates="user")
    leave_applications = relationship("LeaveApplication", back_populates="user", foreign_keys="LeaveApplication.user_id")
    tasks = relationship("Task", back_populates="assignee", foreign_keys="Task.assigned_to")
    announcements = relationship("Announcement", back_populates="author")
    feedbacks = relationship("Feedback", back_populates="author")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    check_in = Column(DateTime)
    check_out = Column(DateTime)
    check_in_lat = Column(Float)
    check_in_lng = Column(Float)
    check_out_lat = Column(Float)
    check_out_lng = Column(Float)
    status = Column(String, default="present")  # present, absent, late, half_day
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=get_ist_now)

    user = relationship("User", back_populates="attendance_records")

class Shift(Base):
    __tablename__ = "shifts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_name = Column(String, default="")
    shift_name = Column(String, nullable=False)  # Morning, Evening, Night
    start_time = Column(String, default="06:00")
    end_time = Column(String, default="14:00")
    date = Column(Date, nullable=False)
    is_off = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_ist_now)

class LeaveApplication(Base):
    __tablename__ = "leave_applications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    leave_type = Column(String, nullable=False)  # casual, sick, paid, unpaid
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, default="")
    status = Column(String, default="pending")  # pending, approved, rejected
    manager_note = Column(Text, default="")
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=get_ist_now)

    user = relationship("User", back_populates="leave_applications", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    priority = Column(String, default="medium")  # low, medium, high
    status = Column(String, default="pending")  # pending, in_progress, completed
    due_date = Column(Date, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=get_ist_now)

    assignee = relationship("User", back_populates="tasks", foreign_keys=[assigned_to])
    assigner = relationship("User", foreign_keys=[assigned_by])

class GpsLocation(Base):
    __tablename__ = "gps_locations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    accuracy = Column(Float, default=0)
    timestamp = Column(DateTime, default=get_ist_now)
    is_in_zone = Column(Boolean, default=True)

class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String, default="normal")  # normal, urgent
    created_at = Column(DateTime, default=get_ist_now)

    author = relationship("User", back_populates="announcements")

class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String, default="general")  # general, complaint, suggestion
    is_anonymous = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_ist_now)

    author = relationship("User", back_populates="feedbacks")

class AppConfig(Base):
    __tablename__ = "app_config"
    id = Column(Integer, primary_key=True, index=True)
    pump_name = Column(String, nullable=False, default="Petrol Pump Staff Management")
    pump_lat = Column(Float, nullable=False, default=28.6139)
    pump_lng = Column(Float, nullable=False, default=77.2090)
    geofence_radius = Column(Integer, nullable=False, default=200)
    updated_at = Column(DateTime, default=get_ist_now, onupdate=get_ist_now)
