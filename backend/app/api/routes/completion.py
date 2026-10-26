from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import generate_certificate_id
from app.models.entities import (
    User, UserRole, InternProfile, InternStatus, TaskAssignment, TaskStatus,
    ReviewSession, MeetingStatus, AttendanceStatus, ReviewOutcome,
    ImprovementAction, Certificate, DeliveryStatus, NotificationLog
)
from app.api.deps import get_current_user, require_admin
from app.integrations.certificate_generator import certificate_generator
from app.integrations.email_provider import email_provider, EmailTemplates
from app.integrations.ai_provider import ai_service

router = APIRouter(prefix="/completion", tags=["Internship Completion"])

@router.get("/eligibility/{intern_id}")
def check_completion_eligibility(
    intern_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    intern = db.query(InternProfile).filter(InternProfile.id == intern_id).first()
    if not intern:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intern not found.")

    assignments = db.query(TaskAssignment).filter(TaskAssignment.intern_id == intern.id).all()
    reviews = db.query(ReviewSession).filter(ReviewSession.intern_id == intern.id).all()
    improvements = db.query(ImprovementAction).filter(ImprovementAction.intern_id == intern.id).all()

    total_tasks = len(assignments)
    approved_tasks = sum(1 for a in assignments if a.status == TaskStatus.APPROVED)
    tasks_satisfied = total_tasks > 0 and (approved_tasks == total_tasks)

    completed_reviews = sum(1 for r in reviews if r.meeting_status == MeetingStatus.COMPLETED)
    verified_attendance = sum(1 for r in reviews if r.attendance_status == AttendanceStatus.VERIFIED)
    reviews_satisfied = completed_reviews > 0

    unresolved_improvements = sum(1 for imp in improvements if not imp.is_resolved)
    improvements_satisfied = unresolved_improvements == 0

    eligible = tasks_satisfied and reviews_satisfied

    # Update eligibility flag
    intern.completion_eligible = eligible
    db.commit()

    return {
        "intern_id": intern.id,
        "intern_name": intern.user.full_name,
        "eligible": eligible,
        "completion_approved": intern.completion_approved,
        "criteria_breakdown": {
            "tasks": {
                "total": total_tasks,
                "approved": approved_tasks,
                "satisfied": tasks_satisfied
            },
            "reviews": {
                "total": len(reviews),
                "completed": completed_reviews,
                "verified_attendance": verified_attendance,
                "satisfied": reviews_satisfied
            },
            "improvements": {
                "unresolved": unresolved_improvements,
                "satisfied": improvements_satisfied
            }
        }
    }

@router.post("/approve/{intern_id}")
def approve_completion_and_issue_certificate(
    intern_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    intern = db.query(InternProfile).filter(InternProfile.id == intern_id).first()
    if not intern:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intern not found.")

    # Prevent duplicate certificate issuance
    existing_cert = db.query(Certificate).filter(
        Certificate.intern_id == intern.id,
        Certificate.is_revoked == False
    ).first()
    if existing_cert:
        return {
            "success": True,
            "message": "Certificate already generated.",
            "certificate_id": existing_cert.certificate_id,
            "pdf_filename": existing_cert.pdf_filename
        }

    # 1. Generate unique Certificate ID
    cert_id = generate_certificate_id()
    now = datetime.utcnow()
    verify_url = f"{settings.FRONTEND_URL}/verify-certificate/{cert_id}"

    # 2. Build PDF Certificate
    task_assignments = db.query(TaskAssignment).filter(TaskAssignment.intern_id == intern.id).all()
    task_titles = [a.task.title for a in task_assignments if a.task]
    summary_text = f"Successful delivery of {len(task_titles)} milestone deliverables in {intern.role_title}."

    pdf_path = certificate_generator.generate_pdf(
        certificate_id=cert_id,
        intern_name=intern.user.full_name,
        internship_role=intern.role_title,
        start_date=intern.start_date or now,
        end_date=intern.end_date or now,
        completion_date=now,
        verification_url=verify_url,
        project_summary=summary_text
    )

    cert = Certificate(
        certificate_id=cert_id,
        intern_id=intern.id,
        intern_name=intern.user.full_name,
        internship_role=intern.role_title,
        start_date=intern.start_date,
        end_date=intern.end_date,
        completion_date=now,
        project_summary=summary_text,
        template_version="v1.0",
        pdf_filename=f"{cert_id}.pdf",
        pdf_path=pdf_path,
        verification_url=verify_url,
        approved_by_admin_id=admin.id,
        delivery_status=DeliveryStatus.GENERATED
    )
    db.add(cert)

    # 3. Update Intern status
    intern.completion_approved = True
    intern.status = InternStatus.COMPLETED
    intern.progress_percentage = 100.0

    # 4. Generate AI Career Guidance and send final completion email
    guidance = ai_service.generate_career_guidance(
        intern_name=intern.user.full_name,
        role=intern.role_title,
        tasks_completed=task_titles
    )

    html_content = EmailTemplates.completion_and_certificate_html(
        intern_name=intern.user.full_name,
        role=intern.role_title,
        cert_id=cert_id,
        verify_url=verify_url,
        guidance=guidance
    )

    send_res = email_provider.send_email(
        recipient_email=intern.user.email,
        recipient_name=intern.user.full_name,
        subject=f"Internship Certificate & Career Recommendations — {intern.role_title}",
        html_content=html_content,
        attachment_path=pdf_path
    )

    if send_res.success:
        cert.delivery_status = DeliveryStatus.SENT
        cert.delivered_at = now

    notif = NotificationLog(
        recipient_email=intern.user.email,
        recipient_name=intern.user.full_name,
        notification_type="CERTIFICATE_DELIVERED",
        subject="Internship Certificate & Career Recommendations",
        body_html=html_content,
        provider="mock",
        provider_message_id=send_res.message_id,
        status=DeliveryStatus.SENT if send_res.success else DeliveryStatus.FAILED
    )
    db.add(notif)
    db.commit()

    return {
        "success": True,
        "certificate_id": cert_id,
        "message": f"Internship approved and certificate {cert_id} generated and delivered.",
        "verification_url": verify_url,
        "pdf_filename": f"{cert_id}.pdf"
    }
