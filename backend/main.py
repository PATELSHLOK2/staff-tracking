from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, SessionLocal
import models
import auth

# Create DB tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Petrol Pump Staff Management API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
from routers import auth as auth_router
from routers import staff, attendance, leave, tasks, communication, shifts, tracking, reports

app.include_router(auth_router.router)
app.include_router(staff.router)
app.include_router(attendance.router)
app.include_router(leave.router)
app.include_router(tasks.router)
app.include_router(communication.router)
app.include_router(shifts.router)
app.include_router(tracking.router)
app.include_router(reports.router)

@app.get("/")
def root():
    return {"message": "Petrol Pump Staff Management API", "status": "running"}

@app.get("/health")
def health():
    return {"status": "ok"}

def seed_data():
    """Seed demo data if no users exist"""
    db = SessionLocal()
    try:
        if db.query(models.User).count() > 0:
            return
        
        # Create manager
        manager = models.User(
            name="Rajesh Kumar (Manager)",
            username="admin",
            password_hash=auth.hash_password("admin123"),
            role="manager",
            phone="9876543210",
            email="manager@petrolpump.com",
            shift="Morning",
            department="Management",
            employee_id="MGR001",
        )
        db.add(manager)
        
        # Create staff members
        staff_members = [
            ("Anil Sharma", "staff1", "staff123", "Morning", "Fuel Dispensing", "EMP001", "9876543201"),
            ("Suresh Patel", "staff2", "staff123", "Evening", "Fuel Dispensing", "EMP002", "9876543202"),
            ("Mohan Singh", "staff3", "staff123", "Night", "Fuel Dispensing", "EMP003", "9876543203"),
            ("Ravi Verma", "staff4", "staff123", "Morning", "Maintenance", "EMP004", "9876543204"),
            ("Deepak Joshi", "staff5", "staff123", "Evening", "Cashier", "EMP005", "9876543205"),
            ("Vijay Mishra", "staff6", "staff123", "Night", "Security", "EMP006", "9876543206"),
        ]
        
        for name, username, password, shift, dept, emp_id, phone in staff_members:
            u = models.User(
                name=name,
                username=username,
                password_hash=auth.hash_password(password),
                role="staff",
                phone=phone,
                email=f"{username}@petrolpump.com",
                shift=shift,
                department=dept,
                employee_id=emp_id,
            )
            db.add(u)
        
        db.commit()
        
        # Seed some announcements
        db.refresh(manager)
        
        announcements = [
            ("Safety Reminder", "All staff must wear safety jackets while on duty. Zero tolerance for violations.", "urgent"),
            ("Monthly Meeting", "Monthly staff meeting scheduled for 1st of next month at 9:00 AM.", "normal"),
            ("New Attendance Policy", "Please check in via the app before starting your shift. GPS location required.", "normal"),
        ]
        for title, msg, priority in announcements:
            ann = models.Announcement(author_id=manager.id, title=title, message=msg, priority=priority)
            db.add(ann)
        
        db.commit()
        
        # Seed tasks
        staff_list = db.query(models.User).filter(models.User.role == "staff").all()
        from datetime import date, timedelta
        today = date.today()
        task_data = [
            (staff_list[0].id, "Check pump meter readings", "Record all meter readings and report to manager", "high"),
            (staff_list[1].id, "Stock inventory check", "Count and report current fuel stock levels", "medium"),
            (staff_list[2].id, "Nightly security rounds", "Complete 3 rounds of the premises every hour", "high"),
            (staff_list[3].id, "Pump maintenance check", "Inspect pump #3 for reported leakage", "urgent"),
            (staff_list[4].id, "Cash reconciliation", "Match today's sales with POS records", "high"),
        ]
        for assigned_to, title, desc, priority in task_data:
            t = models.Task(
                assigned_to=assigned_to,
                assigned_by=manager.id,
                title=title,
                description=desc,
                priority=priority if priority != "urgent" else "high",
                due_date=today + timedelta(days=1),
            )
            db.add(t)
        
        db.commit()
        print("✅ Demo data seeded successfully!")
    except Exception as e:
        print(f"Seed error: {e}")
        db.rollback()
    finally:
        db.close()

# Run seed on startup
seed_data()
