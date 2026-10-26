import csv
import io
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.entities import (
    User, UserRole, InternProfile, InternStatus, TaskAssignment, TaskStatus,
    TaskSubmission, ReviewSession, ReviewOutcome, Certificate,
    NotificationLog, DeliveryStatus, WorkflowJob, JobStatus, AuditLog
)
from app.api.deps import require_admin

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/analytics")
def get_system_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Compiles comprehensive analytical metrics across all internship lifecycle activities."""
    # 1. Intern Enrollment by Domain/Role
    role_counts = db.query(
        InternProfile.role_title, func.count(InternProfile.id)
    ).group_by(InternProfile.role_title).all()
    enrollment_by_role = [{"role": r[0], "count": r[1]} for r in role_counts]

    # 2. Progress Distribution
    profiles = db.query(InternProfile.progress_percentage).all()
    progress_buckets = {"0_25": 0, "26_50": 0, "51_75": 0, "76_100": 0}
    for p in profiles:
        pct = p[0] or 0.0
        if pct <= 25:
            progress_buckets["0_25"] += 1
        elif pct <= 50:
            progress_buckets["26_50"] += 1
        elif pct <= 75:
            progress_buckets["51_75"] += 1
        else:
            progress_buckets["76_100"] += 1

    # 3. Submissions On-time vs Overdue
    total_assignments = db.query(TaskAssignment).count()
    submitted_assignments = db.query(TaskAssignment).filter(
        TaskAssignment.status.in_([TaskStatus.SUBMITTED, TaskStatus.APPROVED, TaskStatus.IN_REVIEW])
    ).count()
    now = datetime.utcnow()
    overdue_assignments = db.query(TaskAssignment).filter(
        TaskAssignment.deadline != None,
        TaskAssignment.deadline < now,
        TaskAssignment.status == TaskStatus.ASSIGNED
    ).count()

    # 4. Review Outcomes Breakdown
    outcome_rows = db.query(
        ReviewSession.review_outcome, func.count(ReviewSession.id)
    ).group_by(ReviewSession.review_outcome).all()
    review_outcomes = {str(r[0].value if hasattr(r[0], "value") else r[0]): r[1] for r in outcome_rows}

    # 5. Certificates Issued
    total_certs = db.query(Certificate).filter(Certificate.is_revoked == False).count()
    revoked_certs = db.query(Certificate).filter(Certificate.is_revoked == True).count()

    # 6. Notifications Breakdown
    notif_rows = db.query(
        NotificationLog.status, func.count(NotificationLog.id)
    ).group_by(NotificationLog.status).all()
    email_delivery = {str(r[0].value if hasattr(r[0], "value") else r[0]): r[1] for r in notif_rows}

    # 7. Automation Engine Reliability
    job_success = db.query(WorkflowJob).filter(WorkflowJob.status == JobStatus.SUCCESS).count()
    job_failed = db.query(WorkflowJob).filter(WorkflowJob.status == JobStatus.FAILED).count()
    job_queued = db.query(WorkflowJob).filter(WorkflowJob.status.in_([JobStatus.QUEUED, JobStatus.RETRY_SCHEDULED])).count()
    job_rate = round((job_success / max(job_success + job_failed, 1)) * 100, 1)

    return {
        "enrollment": {
            "total_interns": len(profiles),
            "by_role": enrollment_by_role
        },
        "progress_distribution": progress_buckets,
        "submissions": {
            "total_tasks": total_assignments,
            "submitted_count": submitted_assignments,
            "overdue_count": overdue_assignments,
            "on_time_rate": round((submitted_assignments / max(total_assignments, 1)) * 100, 1)
        },
        "reviews": {
            "total_reviews": db.query(ReviewSession).count(),
            "outcomes": review_outcomes
        },
        "certificates": {
            "total_issued": total_certs,
            "revoked": revoked_certs
        },
        "notifications": email_delivery,
        "automation_reliability": {
            "total_jobs": db.query(WorkflowJob).count(),
            "success_count": job_success,
            "failed_count": job_failed,
            "pending_count": job_queued,
            "success_rate_percentage": job_rate
        }
    }

@router.get("/export/{entity_type}")
def export_report_csv(
    entity_type: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Exports structured data to CSV format for download."""
    entity_type = entity_type.lower().strip()
    output = io.StringIO()
    writer = csv.writer(output)

    if entity_type == "interns":
        writer.writerow(["Candidate ID", "Full Name", "Email", "Role", "Status", "Progress %", "Start Date", "End Date", "Eligible"])
        interns = db.query(InternProfile).all()
        for i in interns:
            writer.writerow([
                i.candidate_id,
                i.user.full_name if i.user else "",
                i.user.email if i.user else "",
                i.role_title,
                i.status.value if hasattr(i.status, "value") else str(i.status),
                i.progress_percentage,
                i.start_date.strftime("%Y-%m-%d") if i.start_date else "",
                i.end_date.strftime("%Y-%m-%d") if i.end_date else "",
                "Yes" if i.completion_eligible else "No"
            ])
        filename = "interns_report.csv"

    elif entity_type == "reviews":
        writer.writerow(["Review ID", "Intern Name", "Mentor Name", "Scheduled Date", "Time", "Status", "Attendance", "Outcome", "Meet Link"])
        reviews = db.query(ReviewSession).all()
        for r in reviews:
            writer.writerow([
                r.id,
                r.intern.user.full_name if (r.intern and r.intern.user) else "",
                r.mentor.full_name if r.mentor else "",
                r.scheduled_date.strftime("%Y-%m-%d") if r.scheduled_date else "",
                f"{r.start_time} - {r.end_time}",
                r.meeting_status.value if hasattr(r.meeting_status, "value") else str(r.meeting_status),
                r.attendance_status.value if hasattr(r.attendance_status, "value") else str(r.attendance_status),
                r.review_outcome.value if hasattr(r.review_outcome, "value") else str(r.review_outcome),
                r.meeting_url or ""
            ])
        filename = "reviews_report.csv"

    elif entity_type == "certificates":
        writer.writerow(["Certificate ID", "Intern Name", "Role", "Issue Date", "Verification URL", "Delivery Status"])
        certs = db.query(Certificate).all()
        for c in certs:
            writer.writerow([
                c.certificate_id,
                c.intern_name,
                c.internship_role,
                c.completion_date.strftime("%Y-%m-%d") if c.completion_date else "",
                c.verification_url,
                c.delivery_status.value if hasattr(c.delivery_status, "value") else str(c.delivery_status)
            ])
        filename = "certificates_report.csv"

    elif entity_type == "jobs":
        writer.writerow(["Job ID", "Job Type", "Intern ID", "Status", "Attempts", "Next Run At", "Last Error"])
        jobs = db.query(WorkflowJob).order_by(WorkflowJob.id.desc()).limit(500).all()
        for j in jobs:
            writer.writerow([
                j.id,
                j.job_type,
                j.intern_id,
                j.status.value if hasattr(j.status, "value") else str(j.status),
                j.attempt_count,
                j.next_run_at.isoformat() if j.next_run_at else "",
                j.last_error or ""
            ])
        filename = "automation_jobs_report.csv"

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown export entity '{entity_type}'. Allowed: interns, reviews, certificates, jobs."
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
