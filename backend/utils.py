from datetime import datetime, timedelta

def get_ist_now():
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

def get_ist_today():
    return get_ist_now().date()
