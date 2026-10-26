from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import generate_verification_code
from app.models.entities import (
    User, UserRole, InternProfile, TaskAssignment, TaskStatus,
    ReviewSession, ReviewType, MeetingStatus, AttendanceStatus,
    ReviewOutcome, ReviewNote, ImprovementAction, NotificationLog, DeliveryStatus
)
from app.api.deps import get_current_user, require_mentor
from app.integrations.google_calendar import calendar_service
from app.integrations.email_provider import email_provider, EmailTemplates
from app.integrations.ai_provider import ai_service
from app.services.workflow_engine import WorkflowEngineService, JOB_PROCESS_REVIEW_DECISION
from app.schemas.all_schemas import (
    ReviewScheduleRequest, ReviewSessionResponse, ReviewDecisionRequest,
    ReviewAttendanceCheckInRequest
)

router = APIRouter(prefix="/reviews", tags=["Reviews & Mentorship"])

@router.post("/schedule", response_model=ReviewSessionResponse)
def schedule_review_session(
    payload: ReviewScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mentor)
):
    intern = db.query(InternProfile).filter(InternProfile.id == payload.intern_id).first()
    if not intern:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intern profile not found.")

    mentor = db.query(User).filter(User.id == payload.mentor_id).first()
    if not mentor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor not found.")

    # Generate 6-digit OTP verification code
    otp_code = generate_verification_code()
    # Expire 48 hours after scheduled date
    expires_at = payload.scheduled_date + timedelta(hours=48)

    # Google Meet / Calendar Integration
    summary = f"Milestone Review: {intern.user.full_name} ({intern.role_title})"
    desc = f"Progress review session with mentor {mentor.full_name}. Identity verification required."
    cal_res = calendar_service.create_meeting(
        summary=summary,
        description=desc,
        start_dt=payload.scheduled_date,
        end_dt=payload.scheduled_date + timedelta(minutes=30),
        attendee_emails=[intern.user.email, mentor.email],
        timezone=payload.timezone
    )

    review = ReviewSession(
        intern_id=intern.id,
        mentor_id=mentor.id,
        task_assignment_id=payload.task_assignment_id,
        review_type=payload.review_type,
        scheduled_date=payload.scheduled_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        timezone=payload.timezone,
        meeting_url=cal_res.meeting_url,
        calendar_event_id=cal_res.event_id,
        meeting_status=MeetingStatus.SCHEDULED,
        attendance_status=AttendanceStatus.PENDING,
        verification_code=otp_code,
        verification_expires_at=expires_at,
        verification_used=False,
        review_outcome=ReviewOutcome.PENDING
    )
    db.add(review)
    db.flush()

    # Send Notification Email
    date_str = payload.scheduled_date.strftime("%B %d, %Y")
    html_content = EmailTemplates.review_scheduled_html(
        intern_name=intern.user.full_name,
        mentor_name=mentor.full_name,
        date_str=date_str,
        time_str=f"{payload.start_time} - {payload.end_time}",
        meeting_url=cal_res.meeting_url,
        verification_code=otp_code
    )

    send_res = email_provider.send_email(
        recipient_email=intern.user.email,
        recipient_name=intern.user.full_name,
        subject=f"Review Scheduled: {date_str} at {payload.start_time}",
        html_content=html_content
    )

    notif_log = NotificationLog(
        recipient_email=intern.user.email,
        recipient_name=intern.user.full_name,
        notification_type="REVIEW_SCHEDULED",
        subject=f"Review Scheduled: {date_str}",
        body_html=html_content,
        provider="mock" if cal_res.is_mock else "google_meet",
        provider_message_id=send_res.message_id,
        status=DeliveryStatus.SENT if send_res.success else DeliveryStatus.FAILED,
        error_message=send_res.error
    )
    db.add(notif_log)
    db.commit()
    db.refresh(review)

    return ReviewSessionResponse(
        id=review.id,
        intern_id=review.intern_id,
        mentor_id=review.mentor_id,
        task_assignment_id=review.task_assignment_id,
        review_type=review.review_type,
        scheduled_date=review.scheduled_date,
        start_time=review.start_time,
        end_time=review.end_time,
        timezone=review.timezone,
        meeting_url=review.meeting_url,
        meeting_status=review.meeting_status,
        attendance_status=review.attendance_status,
        verification_code=review.verification_code,
        verification_used=review.verification_used,
        review_outcome=review.review_outcome,
        next_review_date=review.next_review_date,
        intern_name=intern.user.full_name,
        mentor_name=mentor.full_name,
        created_at=review.created_at
    )

@router.get("", response_model=List[ReviewSessionResponse])
def list_review_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ReviewSession)

    if current_user.role == UserRole.INTERN:
        profile = db.query(InternProfile).filter(InternProfile.user_id == current_user.id).first()
        if not profile:
            return []
        query = query.filter(ReviewSession.intern_id == profile.id)
    elif current_user.role == UserRole.MENTOR:
        query = query.filter(ReviewSession.mentor_id == current_user.id)

    reviews = query.order_by(ReviewSession.scheduled_date.desc()).all()
    results = []
    for r in reviews:
        results.append(ReviewSessionResponse(
            id=r.id,
            intern_id=r.intern_id,
            mentor_id=r.mentor_id,
            task_assignment_id=r.task_assignment_id,
            review_type=r.review_type,
            scheduled_date=r.scheduled_date,
            start_time=r.start_time,
            end_time=r.end_time,
            timezone=r.timezone,
            meeting_url=r.meeting_url,
            meeting_status=r.meeting_status,
            attendance_status=r.attendance_status,
            verification_code=r.verification_code if current_user.role != UserRole.INTERN or r.attendance_status == AttendanceStatus.VERIFIED else None,
            verification_used=r.verification_used,
            review_outcome=r.review_outcome,
            next_review_date=r.next_review_date,
            intern_name=r.intern.user.full_name if r.intern else "Unknown",
            mentor_name=r.mentor.full_name if r.mentor else "Unknown",
            notes=[{"id": n.id, "notes": n.notes, "intern_responses": n.intern_responses, "created_at": n.created_at} for n in r.notes],
            improvement_actions=[{"id": a.id, "issue_description": a.issue_description, "required_correction": a.required_correction, "learning_resources": a.learning_resources, "deadline": a.deadline, "is_resolved": a.is_resolved, "resolved_at": a.resolved_at, "created_at": a.created_at} for a in r.improvement_actions],
            created_at=r.created_at
        ))
    return results

@router.post("/{review_id}/check-in")
def check_in_review_attendance(
    review_id: int,
    payload: ReviewAttendanceCheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    review = db.query(ReviewSession).filter(ReviewSession.id == review_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review session not found.")

    if current_user.role == UserRole.INTERN:
        profile = db.query(InternProfile).filter(InternProfile.user_id == current_user.id).first()
        if not profile or review.intern_id != profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    entered_code = payload.verification_code.strip()
    if entered_code != review.verification_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code.")

    if review.verification_expires_at and datetime.utcnow() > review.verification_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code has expired.")

    review.attendance_status = AttendanceStatus.VERIFIED
    review.verification_used = True
    db.commit()

    return {
        "success": True,
        "message": "Identity verified successfully. Attendance recorded.",
        "attendance_status": "VERIFIED"
    }

@router.post("/{review_id}/ai-assist")
def live_review_ai_assist(
    review_id: int,
    query_data: Dict[str, str],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mentor)
):
    review = db.query(ReviewSession).filter(ReviewSession.id == review_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review session not found.")

    query = query_data.get("query", "Summarize key discussion points")
    context = {
        "intern_name": review.intern.user.full_name if review.intern else "Intern",
        "task_title": review.assignment.task.title if review.assignment else "Milestone Task"
    }

    advice = ai_service.live_assist_mentor(query=query, context=context)
    return {"advice": advice}

@router.post("/{review_id}/decision")
def record_review_decision(
    review_id: int,
    payload: ReviewDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mentor)
):
    review = db.query(ReviewSession).filter(ReviewSession.id == review_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review session not found.")

    # 1. Update review outcome & meeting status
    review.review_outcome = payload.review_outcome
    review.meeting_status = MeetingStatus.COMPLETED
    if payload.next_review_date:
        review.next_review_date = payload.next_review_date

    # 2. Save mentor notes
    note = ReviewNote(
        review_session_id=review.id,
        mentor_id=current_user.id,
        notes=payload.mentor_notes,
        intern_responses=payload.intern_responses
    )
    db.add(note)

    # 3. Update task assignment status accordingly
    if review.task_assignment_id:
        assignment = db.query(TaskAssignment).filter(TaskAssignment.id == review.task_assignment_id).first()
        if assignment:
            if payload.review_outcome in (ReviewOutcome.APPROVED, ReviewOutcome.APPROVED_WITH_MINOR_CHANGES):
                assignment.status = TaskStatus.APPROVED
            elif payload.review_outcome == ReviewOutcome.CHANGES_REQUIRED:
                assignment.status = TaskStatus.CHANGES_REQUIRED
            elif payload.review_outcome == ReviewOutcome.RESUBMISSION_REQUIRED:
                assignment.status = TaskStatus.ASSIGNED

    # 4. Save improvement actions
    created_improvements = []
    if payload.improvement_actions:
        for act in payload.improvement_actions:
            imp = ImprovementAction(
                review_session_id=review.id,
                intern_id=review.intern_id,
                task_assignment_id=review.task_assignment_id or 1,
                issue_description=act.get("issue_description", "Requirement revision needed"),
                required_correction=act.get("required_correction", "Refactor and update tests"),
                learning_resources=act.get("learning_resources", "Review official documentation"),
                deadline=payload.next_review_date or (datetime.utcnow() + timedelta(days=7))
            )
            db.add(imp)
            created_improvements.append(act)

    # 5. Send Improvement Plan Follow-up Email (Section 13)
    intern_user = review.intern.user
    next_deadline_str = payload.next_review_date.strftime("%B %d, %Y") if payload.next_review_date else "Prior to next review"
    html_content = EmailTemplates.improvement_plan_html(
        intern_name=intern_user.full_name,
        outcome=payload.review_outcome.value,
        mentor_notes=payload.mentor_notes,
        improvements=created_improvements,
        next_deadline=next_deadline_str
    )

    send_res = email_provider.send_email(
        recipient_email=intern_user.email,
        recipient_name=intern_user.full_name,
        subject=f"Review Decision & Action Plan: {payload.review_outcome.value}",
        html_content=html_content
    )

    notif = NotificationLog(
        recipient_email=intern_user.email,
        recipient_name=intern_user.full_name,
        notification_type="REVIEW_DECISION",
        subject=f"Review Decision: {payload.review_outcome.value}",
        body_html=html_content,
        provider="mock",
        provider_message_id=send_res.message_id,
        status=DeliveryStatus.SENT if send_res.success else DeliveryStatus.FAILED
    )
    db.add(notif)

    # Update progress
    if payload.review_outcome in (ReviewOutcome.APPROVED, ReviewOutcome.APPROVED_WITH_MINOR_CHANGES):
        review.intern.progress_percentage = min(100.0, review.intern.progress_percentage + 30.0)

    # Automatically advance workflow lifecycle
    WorkflowEngineService.queue_job(
        db=db,
        job_type=JOB_PROCESS_REVIEW_DECISION,
        intern_id=review.intern_id,
        review_session_id=review.id,
        priority=15,
        idempotency_key=f"rev_decision_{review.id}"
    )

    db.commit()

    return {
        "success": True,
        "review_id": review.id,
        "outcome": review.review_outcome.value,
        "message": "Mentor review decision and improvement plan saved successfully."
    }
