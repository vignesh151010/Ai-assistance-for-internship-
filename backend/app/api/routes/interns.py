from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import User, UserRole, InternProfile, InternStatus, MentorProfile
from app.api.deps import get_current_user, require_mentor, require_admin
from app.schemas.all_schemas import InternProfileResponse

router = APIRouter(prefix="/interns", tags=["Intern Management"])

@router.get("", response_model=List[InternProfileResponse])
def list_interns(
    mentor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InternProfile)

    if current_user.role == UserRole.MENTOR:
        query = query.filter(InternProfile.assigned_mentor_id == current_user.id)
    elif mentor_id:
        query = query.filter(InternProfile.assigned_mentor_id == mentor_id)

    profiles = query.order_by(InternProfile.created_at.desc()).all()
    results = []
    for p in profiles:
        mentor_name = p.mentor.full_name if p.mentor else None
        results.append(InternProfileResponse(
            id=p.id,
            user_id=p.user_id,
            candidate_id=p.candidate_id,
            role_title=p.role_title,
            college=p.college,
            department=p.department,
            start_date=p.start_date,
            end_date=p.end_date,
            assigned_mentor_id=p.assigned_mentor_id,
            status=p.status,
            progress_percentage=p.progress_percentage,
            completion_eligible=p.completion_eligible,
            completion_approved=p.completion_approved,
            full_name=p.user.full_name if p.user else "Unknown",
            email=p.user.email if p.user else "unknown@domain.com",
            mentor_name=mentor_name,
            created_at=p.created_at
        ))
    return results

@router.get("/{intern_id}", response_model=InternProfileResponse)
def get_intern_by_id(
    intern_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = db.query(InternProfile).filter(InternProfile.id == intern_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intern not found.")

    if current_user.role == UserRole.INTERN and p.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    mentor_name = p.mentor.full_name if p.mentor else None
    return InternProfileResponse(
        id=p.id,
        user_id=p.user_id,
        candidate_id=p.candidate_id,
        role_title=p.role_title,
        college=p.college,
        department=p.department,
        start_date=p.start_date,
        end_date=p.end_date,
        assigned_mentor_id=p.assigned_mentor_id,
        status=p.status,
        progress_percentage=p.progress_percentage,
        completion_eligible=p.completion_eligible,
        completion_approved=p.completion_approved,
        full_name=p.user.full_name if p.user else "Unknown",
        email=p.user.email if p.user else "unknown@domain.com",
        mentor_name=mentor_name,
        created_at=p.created_at
    )

@router.put("/{intern_id}/assign-mentor")
def assign_mentor(
    intern_id: int,
    mentor_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    intern = db.query(InternProfile).filter(InternProfile.id == intern_id).first()
    if not intern:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intern not found.")

    mentor = db.query(User).filter(User.id == mentor_id, User.role == UserRole.MENTOR).first()
    if not mentor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor not found.")

    intern.assigned_mentor_id = mentor.id
    db.commit()

    return {
        "success": True,
        "message": f"Assigned mentor {mentor.full_name} to intern {intern.user.full_name}."
    }
