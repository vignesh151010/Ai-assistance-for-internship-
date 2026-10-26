import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.core.database import SessionLocal
from app.models.entities import User, UserRole
from app.core.security import get_password_hash

def create_admin_user(email: str, full_name: str, password: str):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email.lower().strip()).first()
        if existing:
            print(f"User with email '{email}' already exists.")
            return

        user = User(
            email=email.lower().strip(),
            full_name=full_name.strip(),
            password_hash=get_password_hash(password),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(user)
        db.commit()
        print(f"Admin '{full_name}' ({email}) created successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        create_admin_user(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        print("Usage: python scripts/create_admin.py <email> <full_name> <password>")
