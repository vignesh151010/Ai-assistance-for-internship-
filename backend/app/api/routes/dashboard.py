from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    User, UserRole, InternProfile, InternStatus, TaskAssignment,
    TaskStatus, ReviewSession, MeetingStatus, ReviewOutcome,
    Certificate, NotificationLog, DeliveryStatus
)
from app.api.deps import get_current_user, require_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/admin-stats")
def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    now = datetime.utcnow()

    total_interns = db.query(InternProfile).count()
    active_interns = db.query(InternProfile).filter(InternProfile.status == InternStatus.ACTIVE).count()
    completed_interns = db.query(InternProfile).filter(InternProfile.status == InternStatus.COMPLETED).count()

    pending_submissions = db.query(TaskAssignment).filter(
        TaskAssignment.status.in_([TaskStatus.ASSIGNED, TaskStatus.CHANGES_REQUIRED])
    ).count()

    overdue_tasks = db.query(TaskAssignment).filter(
        TaskAssignment.deadline < now,
        TaskAssignment.status.notin_([TaskStatus.APPROVED, TaskStatus.SUBMITTED])
    ).count()

    upcoming_reviews = db.query(ReviewSession).filter(
        ReviewSession.scheduled_date >= now,
        ReviewSession.meeting_status == MeetingStatus.SCHEDULED
    ).count()

    reviews_requiring_decision = db.query(ReviewSession).filter(
        ReviewSession.review_outcome == ReviewOutcome.PENDING
    ).count()

    pending_completion_approvals = db.query(InternProfile).filter(
        InternProfile.completion_eligible == True,
        InternProfile.completion_approved == False
    ).count()

    certificates_issued = db.query(Certificate).filter(Certificate.is_revoked == False).count()

    email_failures = db.query(NotificationLog).filter(
        NotificationLog.status == DeliveryStatus.FAILED
    ).count()

    return {
        "total_interns": total_interns,
        "active_interns": active_interns,
        "completed_interns": completed_interns,
        "pending_submissions": pending_submissions,
        "overdue_tasks": overdue_tasks,
        "upcoming_reviews": upcoming_reviews,
        "reviews_requiring_decision": reviews_requiring_decision,
        "pending_completion_approvals": pending_completion_approvals,
        "certificates_issued": certificates_issued,
        "email_failures": email_failures,
        "system_status": {
            "ai_provider": "Ready (Active)",
            "google_calendar": "Configured / Sandbox Active",
            "email_service": "Dispatcher Online",
            "database": "MySQL 8 / Connected"
        }
    }

@router.get("/mentor-stats")
def get_mentor_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assigned_interns = db.query(InternProfile).filter(InternProfile.assigned_mentor_id == current_user.id).all()
    intern_ids = [i.id for i in assigned_interns]

    pending_reviews = db.query(ReviewSession).filter(
        ReviewSession.mentor_id == current_user.id,
        ReviewSession.meeting_status == MeetingStatus.SCHEDULED
    ).count()

    submissions_to_review = db.query(TaskAssignment).filter(
        TaskAssignment.mentor_id == current_user.id,
        TaskAssignment.status == TaskStatus.SUBMITTED
    ).count()

    return {
        "assigned_interns_count": len(assigned_interns),
        "pending_reviews_count": pending_reviews,
        "submissions_to_review": submissions_to_review
    }

@router.get("/intern-stats")
def get_intern_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(InternProfile).filter(InternProfile.user_id == current_user.id).first()
    if not profile:
        return {"progress_percentage": 0.0, "tasks_count": 0, "reviews_count": 0}

    assignments = db.query(TaskAssignment).filter(TaskAssignment.intern_id == profile.id).all()
    approved_tasks = sum(1 for a in assignments if a.status == TaskStatus.APPROVED)
    total_tasks = len(assignments)

    reviews = db.query(ReviewSession).filter(ReviewSession.intern_id == profile.id).all()
    cert = db.query(Certificate).filter(Certificate.intern_id == profile.id, Certificate.is_revoked == False).first()

    return {
        "candidate_id": profile.candidate_id,
        "role_title": profile.role_title,
        "status": profile.status.value,
        "progress_percentage": profile.progress_percentage,
        "total_tasks": total_tasks,
        "approved_tasks": approved_tasks,
        "total_reviews": len(reviews),
        "completion_eligible": profile.completion_eligible,
        "completion_approved": profile.completion_approved,
        "has_certificate": cert is not None,
        "certificate_id": cert.certificate_id if cert else None
    }
