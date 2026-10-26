from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.database import get_db
from app.core.config import settings
from app.models.entities import (
    User, UserRole, InternProfile, InternWorkflow, WorkflowJob,
    WorkflowStage, JobStatus, SystemSetting
)
from app.api.deps import get_current_user, require_admin
from app.services.workflow_engine import (
    WorkflowEngineService, workflow_scheduler,
    MODE_ACTIVE, MODE_TEST, MODE_PAUSED, MODE_EMERGENCY_STOP, MODE_DISABLED
)

router = APIRouter(prefix="/automation", tags=["Automation Center"])

class ModeUpdateRequest(BaseModel):
    mode: str

@router.get("/status")
def get_automation_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns comprehensive health, mode, and workflow metrics for the Automation Center."""
    mode = WorkflowEngineService.get_automation_mode(db)

    # Workflow metrics
    total_wf = db.query(InternWorkflow).count()
    active_wf = db.query(InternWorkflow).filter(
        InternWorkflow.is_active == True,
        InternWorkflow.current_stage.notin_([WorkflowStage.COMPLETED, WorkflowStage.CLOSED, WorkflowStage.DROPPED])
    ).count()
    completed_wf = db.query(InternWorkflow).filter(InternWorkflow.current_stage == WorkflowStage.COMPLETED).count()
    needs_attn_wf = db.query(InternWorkflow).filter(
        or_(
            InternWorkflow.current_stage == WorkflowStage.NEEDS_ADMIN_ATTENTION,
            InternWorkflow.current_stage == WorkflowStage.FAILED
        )
    ).count()

    # Job metrics
    queued_jobs = db.query(WorkflowJob).filter(
        or_(
            WorkflowJob.status == JobStatus.QUEUED,
            WorkflowJob.status == JobStatus.RETRY_SCHEDULED
        )
    ).count()
    running_jobs = db.query(WorkflowJob).filter(WorkflowJob.status == JobStatus.RUNNING).count()
    success_jobs = db.query(WorkflowJob).filter(WorkflowJob.status == JobStatus.SUCCESS).count()
    failed_jobs = db.query(WorkflowJob).filter(WorkflowJob.status == JobStatus.FAILED).count()
    total_jobs = db.query(WorkflowJob).count()

    success_rate = round((success_jobs / max(success_jobs + failed_jobs, 1)) * 100, 1)

    # Integrations health
    ai_configured = bool(settings.AI_API_KEY) if settings.AI_PROVIDER != "mock" else True
    email_configured = bool(settings.SMTP_USER and settings.SMTP_PASSWORD) if settings.EMAIL_PROVIDER == "smtp" else True
    calendar_configured = bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)

    return {
        "mode": mode,
        "is_active": mode in (MODE_ACTIVE, MODE_TEST),
        "is_test_mode": mode == MODE_TEST,
        "summary": {
            "total_workflows": total_wf,
            "active_workflows": active_wf,
            "completed_workflows": completed_wf,
            "failed_workflows": needs_attn_wf,
            "queued_jobs": queued_jobs,
            "running_jobs": running_jobs,
            "success_jobs": success_jobs,
            "failed_jobs": failed_jobs,
            "total_jobs": total_jobs,
            "automation_success_rate": success_rate
        },
        "integrations": {
            "ai": {
                "name": "AI Task & Evaluation Engine",
                "provider": settings.AI_PROVIDER,
                "model": settings.AI_MODEL,
                "configured": ai_configured,
                "status": "Operational (Live)" if settings.AI_API_KEY else "Operational (Deterministic Sandbox)"
            },
            "email": {
                "name": "Transactional Email Dispatcher",
                "provider": settings.EMAIL_PROVIDER,
                "sender": settings.EMAIL_SENDER,
                "configured": email_configured,
                "status": "Operational (Live SMTP)" if settings.EMAIL_PROVIDER == "smtp" else "Operational (Audit Log Sandbox)"
            },
            "calendar": {
                "name": "Google Calendar & Meet Provisioner",
                "provider": "Google Meet",
                "configured": calendar_configured,
                "status": "Connected (Google Workspace OAuth)" if calendar_configured else "Operational (Secure Sandbox Rooms)"
            },
            "certificate": {
                "name": "Vector PDF Certificate Engine",
                "provider": "ReportLab Vector Engine",
                "configured": True,
                "status": "Operational"
            }
        }
    }

@router.post("/mode")
def update_automation_mode(
    payload: ModeUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Updates master automation mode: ACTIVE, TEST_MODE, PAUSED, EMERGENCY_STOP, DISABLED."""
    try:
        new_mode = WorkflowEngineService.set_automation_mode(db, payload.mode.upper(), admin.id)
        return {
            "success": True,
            "mode": new_mode,
            "message": f"Master automation mode updated to '{new_mode}'."
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/workflows")
def list_workflows(
    stage: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all intern workflow state machines with step history and status."""
    query = db.query(InternWorkflow)
    if stage:
        query = query.filter(InternWorkflow.current_stage == stage)

    workflows = query.order_by(InternWorkflow.updated_at.desc()).all()
    results = []
    for wf in workflows:
        intern = wf.intern
        results.append({
            "id": wf.id,
            "intern_id": wf.intern_id,
            "candidate_id": intern.candidate_id if intern else "N/A",
            "intern_name": intern.user.full_name if (intern and intern.user) else "Unknown",
            "intern_email": intern.user.email if (intern and intern.user) else "Unknown",
            "role_title": intern.role_title if intern else "Unknown",
            "current_stage": wf.current_stage.value if hasattr(wf.current_stage, "value") else str(wf.current_stage),
            "is_active": wf.is_active,
            "auto_pilot": wf.auto_pilot,
            "last_action": wf.last_action,
            "last_action_at": wf.last_action_at,
            "next_scheduled_action": wf.next_scheduled_action,
            "next_scheduled_run_at": wf.next_scheduled_run_at,
            "retry_count": wf.retry_count,
            "last_error": wf.last_error,
            "history_count": len(wf.history_json or []),
            "history": wf.history_json or [],
            "updated_at": wf.updated_at
        })
    return results

@router.get("/jobs")
def list_workflow_jobs(
    status_filter: Optional[str] = Query(None, alias="status"),
    job_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Lists background queue jobs with filter and pagination."""
    query = db.query(WorkflowJob)
    if status_filter:
        query = query.filter(WorkflowJob.status == status_filter)
    if job_type:
        query = query.filter(WorkflowJob.job_type == job_type)

    total = query.count()
    jobs = query.order_by(WorkflowJob.id.desc()).offset(offset).limit(limit).all()

    items = []
    for j in jobs:
        intern_name = j.intern.user.full_name if (j.intern and j.intern.user) else None
        items.append({
            "id": j.id,
            "job_type": j.job_type,
            "intern_id": j.intern_id,
            "intern_name": intern_name,
            "status": j.status.value if hasattr(j.status, "value") else str(j.status),
            "priority": j.priority,
            "attempt_count": j.attempt_count,
            "max_attempts": j.max_attempts,
            "next_run_at": j.next_run_at,
            "idempotency_key": j.idempotency_key,
            "last_error": j.last_error,
            "error_category": j.error_category,
            "started_at": j.started_at,
            "completed_at": j.completed_at,
            "created_at": j.created_at
        })

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "jobs": items
    }

@router.post("/jobs/{job_id}/retry")
def retry_failed_job(
    job_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Resets a failed or paused job back into the QUEUED state for immediate re-execution."""
    job = db.query(WorkflowJob).filter(WorkflowJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow job not found.")

    job.status = JobStatus.QUEUED
    job.attempt_count = 0
    job.next_run_at = datetime.utcnow()
    job.last_error = None
    job.error_category = None
    db.commit()

    return {
        "success": True,
        "job_id": job.id,
        "message": f"Job #{job.id} ({job.job_type}) reset to QUEUED for execution."
    }

@router.post("/workflows/{workflow_id}/pause")
def pause_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    wf = db.query(InternWorkflow).filter(InternWorkflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found.")

    wf.is_active = False
    wf.auto_pilot = False
    WorkflowEngineService.append_workflow_history(
        wf, wf.current_stage, "WORKFLOW_PAUSED", "PAUSED", "Administrator manually paused automation."
    )
    db.commit()
    return {"success": True, "message": f"Workflow #{wf.id} paused."}

@router.post("/workflows/{workflow_id}/resume")
def resume_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    wf = db.query(InternWorkflow).filter(InternWorkflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found.")

    wf.is_active = True
    wf.auto_pilot = True
    WorkflowEngineService.append_workflow_history(
        wf, wf.current_stage, "WORKFLOW_RESUMED", "ACTIVE", "Administrator manually resumed automation."
    )
    db.commit()
    return {"success": True, "message": f"Workflow #{wf.id} resumed."}

@router.post("/run-now")
def trigger_automation_cycle_now(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Forces an immediate cycle pass of the workflow engine and returns execution results."""
    result = WorkflowEngineService.process_pending_jobs(db, max_jobs=25)
    return {
        "success": True,
        "result": result
    }
