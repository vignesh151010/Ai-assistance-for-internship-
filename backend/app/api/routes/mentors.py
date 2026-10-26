from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import User, UserRole, MentorProfile
from app.api.deps import get_current_user

router = APIRouter(prefix="/mentors", tags=["Mentors"])

@router.get("")
def list_mentors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mentors = db.query(User).filter(User.role == UserRole.MENTOR, User.is_active == True).all()
    results = []
    for m in mentors:
        profile = m.mentor_profile
        results.append({
            "id": m.id,
            "full_name": m.full_name,
            "email": m.email,
            "department": profile.department if profile else "Engineering",
            "designation": profile.designation if profile else "Technical Mentor",
            "expertise": profile.expertise if profile else "Full-Stack Software Architecture"
        })
    return results
