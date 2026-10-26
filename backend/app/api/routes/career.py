from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entities import User, UserRole, InternProfile, TaskAssignment, TaskStatus
from app.api.deps import get_current_user
from app.integrations.ai_provider import ai_service

router = APIRouter(prefix="/career-guidance", tags=["Career Development & Guidance"])

@router.get("/me")
def get_my_personalized_career_guidance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches career guidance for the currently authenticated intern."""
    profile = db.query(InternProfile).filter(InternProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intern profile not found.")
    return get_personalized_career_guidance(profile.id, db, current_user)

@router.get("/{intern_id}")
def get_personalized_career_guidance(
    intern_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates evidence-based, personalized career development guidance,
    resume impact statements, portfolio project recommendations, and interview prep questions
    based on the intern's actual completed milestone deliverables.
    """
    intern = db.query(InternProfile).filter(InternProfile.id == intern_id).first()
    if not intern:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intern profile not found.")

    # Permissions Guard: Intern can only view their own guidance
    if current_user.role == UserRole.INTERN:
        profile = db.query(InternProfile).filter(InternProfile.user_id == current_user.id).first()
        if not profile or profile.id != intern.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    assignments = db.query(TaskAssignment).filter(TaskAssignment.intern_id == intern.id).all()
    completed_task_titles = [
        a.task.title for a in assignments
        if a.task and a.status in (TaskStatus.APPROVED, TaskStatus.SUBMITTED, TaskStatus.IN_REVIEW)
    ]

    guidance = ai_service.generate_career_guidance(
        intern_name=intern.user.full_name,
        role=intern.role_title,
        tasks_completed=completed_task_titles
    )

    return {
        "intern_id": intern.id,
        "intern_name": intern.user.full_name,
        "role_title": intern.role_title,
        "candidate_id": intern.candidate_id,
        "completed_tasks_count": len(completed_task_titles),
        "guidance": guidance
    }
