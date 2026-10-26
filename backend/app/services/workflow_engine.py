import logging
import threading
import time
import os
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.core.database import SessionLocal
from app.core.config import settings
from app.core.security import generate_verification_code, generate_certificate_id
from app.models.entities import (
    User, UserRole, InternProfile, InternStatus, Task, TaskAssignment, TaskStatus,
    AITaskAnalysis, TaskSubmission, SubmissionFile, AIEvaluation,
    ReviewSession, ReviewType, MeetingStatus, AttendanceStatus, ReviewOutcome,
    ImprovementAction, Certificate, DeliveryStatus, NotificationLog,
    AuditLog, InternWorkflow, WorkflowJob, WorkflowStage, JobStatus,
    AutomationPolicy, SystemSetting
)
from app.integrations.ai_provider import ai_service
from app.integrations.email_provider import email_provider, EmailTemplates
from app.integrations.google_calendar import calendar_service
from app.integrations.certificate_generator import certificate_generator

logger = logging.getLogger("uvicorn.error")

# Job Types
JOB_ONBOARD_INTERN = "ONBOARD_INTERN"
JOB_EVALUATE_SUBMISSION = "EVALUATE_SUBMISSION"
JOB_PROCESS_REVIEW_DECISION = "PROCESS_REVIEW_DECISION"
JOB_CHECK_COMPLETION = "CHECK_COMPLETION"
JOB_ISSUE_CERTIFICATE = "ISSUE_CERTIFICATE"
JOB_DEADLINE_REMINDER = "DEADLINE_REMINDER"
JOB_REVIEW_REMINDER = "REVIEW_REMINDER"

# Automation Modes
MODE_ACTIVE = "ACTIVE"
MODE_TEST = "TEST_MODE"
MODE_PAUSED = "PAUSED"
MODE_EMERGENCY_STOP = "EMERGENCY_STOP"
MODE_DISABLED = "DISABLED"

# Default System Configuration values
DEFAULT_COMPANY_SETTINGS = {
    "company_name": "TechCorp Global Technologies",
    "official_email": "internships@techcorp.com",
    "website": "https://techcorp.example.com",
    "logo_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
    "timezone": "Asia/Kolkata",
    "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "working_hours_start": "09:00",
    "working_hours_end": "18:00"
}

DEFAULT_AUTOMATION_POLICIES = {
    "default_internship_duration_days": 30,
    "default_review_interval_days": 7,
    "deadline_reminder_hours": 24,
    "review_reminder_hours": 24,
    "auto_issue_certificate": True,
    "career_guidance_email_enabled": True,
    "max_job_retries": 4,
    "retry_backoff_seconds": 15,
    "stalled_job_timeout_minutes": 5
}


class WorkflowEngineService:
    """
    Central persistent event-driven workflow engine coordinating the entire internship lifecycle.
    Operates with full idempotency protection, exponential retry backoff, database-backed state,
    and automatic lifecycle transitions.
    """

    @staticmethod
    def get_automation_mode(db: Session) -> str:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "automation_mode").first()
        if not setting:
            setting = SystemSetting(
                key="automation_mode",
                value_json={"mode": MODE_TEST},
                description="Master automation control: ACTIVE, TEST_MODE, PAUSED, EMERGENCY_STOP, DISABLED"
            )
            db.add(setting)
            db.commit()
            return MODE_TEST
        return setting.value_json.get("mode", MODE_TEST)

    @staticmethod
    def set_automation_mode(db: Session, mode: str, admin_id: Optional[int] = None) -> str:
        valid_modes = [MODE_ACTIVE, MODE_TEST, MODE_PAUSED, MODE_EMERGENCY_STOP, MODE_DISABLED]
        if mode not in valid_modes:
            raise ValueError(f"Invalid automation mode '{mode}'. Allowed: {', '.join(valid_modes)}")

        setting = db.query(SystemSetting).filter(SystemSetting.key == "automation_mode").first()
        if not setting:
            setting = SystemSetting(
                key="automation_mode",
                value_json={"mode": mode},
                description="Master automation control"
            )
            db.add(setting)
        else:
            setting.value_json = {"mode": mode}
            setting.updated_at = datetime.utcnow()

        audit = AuditLog(
            user_id=admin_id,
            action="AUTOMATION_MODE_CHANGED",
            resource_type="SystemSetting",
            resource_id="automation_mode",
            details_json={"new_mode": mode}
        )
        db.add(audit)
        db.commit()
        logger.info(f"[WorkflowEngine] Master automation mode updated to: {mode}")
        return mode

    @staticmethod
    def get_company_settings(db: Session) -> Dict[str, Any]:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "company_profile").first()
        if not setting:
            setting = SystemSetting(
                key="company_profile",
                value_json=DEFAULT_COMPANY_SETTINGS,
                description="Company branding, contact email, and working schedule"
            )
            db.add(setting)
            db.commit()
            return DEFAULT_COMPANY_SETTINGS
        return setting.value_json

    @staticmethod
    def update_company_settings(db: Session, data: Dict[str, Any], admin_id: Optional[int] = None) -> Dict[str, Any]:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "company_profile").first()
        if not setting:
            setting = SystemSetting(key="company_profile", value_json=data)
            db.add(setting)
        else:
            current = setting.value_json or {}
            current.update(data)
            setting.value_json = current
            setting.updated_at = datetime.utcnow()
        
        audit = AuditLog(
            user_id=admin_id,
            action="COMPANY_SETTINGS_UPDATED",
            resource_type="SystemSetting",
            resource_id="company_profile",
            details_json=data
        )
        db.add(audit)
        db.commit()
        return setting.value_json

    @staticmethod
    def get_policy_settings(db: Session) -> Dict[str, Any]:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "automation_policies").first()
        if not setting:
            setting = SystemSetting(
                key="automation_policies",
                value_json=DEFAULT_AUTOMATION_POLICIES,
                description="Internship duration, review intervals, completion criteria, and auto-issue rules"
            )
            db.add(setting)
            db.commit()
            return DEFAULT_AUTOMATION_POLICIES
        return setting.value_json

    @staticmethod
    def update_policy_settings(db: Session, data: Dict[str, Any], admin_id: Optional[int] = None) -> Dict[str, Any]:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "automation_policies").first()
        if not setting:
            setting = SystemSetting(key="automation_policies", value_json=data)
            db.add(setting)
        else:
            current = setting.value_json or {}
            current.update(data)
            setting.value_json = current
            setting.updated_at = datetime.utcnow()

        audit = AuditLog(
            user_id=admin_id,
            action="AUTOMATION_POLICIES_UPDATED",
            resource_type="SystemSetting",
            resource_id="automation_policies",
            details_json=data
        )
        db.add(audit)
        db.commit()
        return setting.value_json

    @staticmethod
    def queue_job(
        db: Session,
        job_type: str,
        intern_id: Optional[int] = None,
        task_assignment_id: Optional[int] = None,
        submission_id: Optional[int] = None,
        review_session_id: Optional[int] = None,
        priority: int = 0,
        payload: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        run_at: Optional[datetime] = None
    ) -> WorkflowJob:
        """
        Durable queue insertion with strict idempotency verification.
        If an existing job matches the idempotency_key, returns the existing job.
        """
        if idempotency_key:
            existing = db.query(WorkflowJob).filter(WorkflowJob.idempotency_key == idempotency_key).first()
            if existing:
                logger.info(f"[WorkflowEngine] Idempotency match: job '{idempotency_key}' already queued (id={existing.id}).")
                return existing

        policies = WorkflowEngineService.get_policy_settings(db)
        max_attempts = policies.get("max_job_retries", 4)
        backoff = policies.get("retry_backoff_seconds", 15)

        job = WorkflowJob(
            job_type=job_type,
            intern_id=intern_id,
            task_assignment_id=task_assignment_id,
            submission_id=submission_id,
            review_session_id=review_session_id,
            status=JobStatus.QUEUED,
            priority=priority,
            payload_json=payload or {},
            attempt_count=0,
            max_attempts=max_attempts,
            backoff_seconds=backoff,
            next_run_at=run_at or datetime.utcnow(),
            idempotency_key=idempotency_key
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        logger.info(f"[WorkflowEngine] Queued job #{job.id} [{job_type}] for Intern #{intern_id} (key: {idempotency_key})")
        return job

    @staticmethod
    def get_or_create_workflow(db: Session, intern_id: int) -> InternWorkflow:
        wf = db.query(InternWorkflow).filter(InternWorkflow.intern_id == intern_id).first()
        if not wf:
            wf = InternWorkflow(
                intern_id=intern_id,
                current_stage=WorkflowStage.IMPORTED,
                is_active=True,
                auto_pilot=True,
                history_json=[]
            )
            db.add(wf)
            db.commit()
            db.refresh(wf)
        return wf

    @staticmethod
    def append_workflow_history(
        wf: InternWorkflow, stage: WorkflowStage, action: str, status: str, details: str
    ):
        history = list(wf.history_json or [])
        history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "stage": stage.value,
            "action": action,
            "status": status,
            "details": details
        })
        wf.history_json = history
        wf.current_stage = stage
        wf.last_action = action
        wf.last_action_at = datetime.utcnow()
        wf.updated_at = datetime.utcnow()

    # =========================================================================
    # JOB HANDLERS
    # =========================================================================

    @staticmethod
    def handle_onboard_intern(db: Session, job: WorkflowJob, mode: str) -> str:
        """
        Stage 1-9: Auto Onboarding:
        1. AI analysis & personalized explanation for assigned task.
        2. Dispatch onboarding & task explanation email.
        3. Automatically schedule first review (Google Calendar / Google Meet with OTP).
        4. Dispatch review scheduling invitation email.
        5. Transition workflow to SUBMISSION_PENDING / TASK_ASSIGNED.
        """
        intern = db.query(InternProfile).filter(InternProfile.id == job.intern_id).first()
        if not intern:
            raise ValueError(f"Intern profile #{job.intern_id} not found.")

        wf = WorkflowEngineService.get_or_create_workflow(db, intern.id)
        assignment = db.query(TaskAssignment).filter(
            TaskAssignment.intern_id == intern.id
        ).order_by(TaskAssignment.id.asc()).first()

        if not assignment or not assignment.task:
            raise ValueError(f"No task assigned for intern #{intern.id}.")

        task = assignment.task
        mentor = assignment.mentor or db.query(User).filter(User.role == UserRole.MENTOR).first()
        if not mentor:
            mentor = db.query(User).filter(User.role == UserRole.ADMIN).first()

        # 1. AI Task Analysis & Personalized Explanation
        analysis = db.query(AITaskAnalysis).filter(AITaskAnalysis.task_id == task.id).first()
        if not analysis:
            ai_output = ai_service.analyze_task(
                title=task.title,
                description=task.description,
                requirements=task.raw_requirements
            )
            analysis = AITaskAnalysis(
                task_id=task.id,
                task_assignment_id=assignment.id,
                model_name=settings.AI_MODEL,
                prompt_version="v1.0",
                objective=ai_output["objective"],
                business_purpose=ai_output.get("business_purpose", ""),
                prerequisites=ai_output.get("prerequisites", ""),
                steps_json=ai_output.get("steps", []),
                acceptance_criteria_json=ai_output.get("acceptance_criteria", []),
                common_mistakes_json=ai_output.get("common_mistakes", []),
                testing_requirements_json=ai_output.get("testing_requirements", []),
                submission_instructions=ai_output.get("submission_instructions", ""),
                beginner_explanation=ai_output.get("beginner_explanation", "")
            )
            db.add(analysis)
            db.flush()

        # 2. Send Onboarding & Task Assignment Email
        deadline_str = assignment.deadline.strftime("%B %d, %Y") if assignment.deadline else "Within 14 days"
        onboard_html = EmailTemplates.task_assigned_html(
            intern_name=intern.user.full_name,
            task_title=task.title,
            objective=f"{analysis.objective} - {analysis.beginner_explanation}",
            steps=analysis.steps_json or [],
            deadline_str=deadline_str
        )

        test_tag = "[TEST MODE] " if mode == MODE_TEST else ""
        send_res = email_provider.send_email(
            recipient_email=intern.user.email,
            recipient_name=intern.user.full_name,
            subject=f"{test_tag}Welcome to Internship: Personalized Task Assignment — {task.title}",
            html_content=onboard_html
        )

        notif_log = NotificationLog(
            recipient_email=intern.user.email,
            recipient_name=intern.user.full_name,
            notification_type="ONBOARDING_TASK_ASSIGNED",
            subject=f"{test_tag}Personalized Task Assignment: {task.title}",
            body_html=onboard_html,
            provider="mock" if mode == MODE_TEST else settings.EMAIL_PROVIDER,
            provider_message_id=send_res.message_id,
            status=DeliveryStatus.SENT if send_res.success else DeliveryStatus.FAILED,
            error_message=send_res.error
        )
        db.add(notif_log)
        assignment.is_email_sent = True
        assignment.email_sent_at = datetime.utcnow()

        # 3. Automatically schedule first review (e.g. 7 days from start)
        policies = WorkflowEngineService.get_policy_settings(db)
        review_interval = policies.get("default_review_interval_days", 7)
        review_date = (intern.start_date or datetime.utcnow()) + timedelta(days=review_interval)
        # Ensure it is at standard review time (e.g., 10:00 AM)
        review_date = review_date.replace(hour=10, minute=0, second=0, microsecond=0)

        # Check if review already exists
        existing_review = db.query(ReviewSession).filter(
            ReviewSession.intern_id == intern.id,
            ReviewSession.task_assignment_id == assignment.id
        ).first()

        if not existing_review:
            otp_code = generate_verification_code()
            summary = f"{test_tag}Initial Review: {intern.user.full_name} ({task.title})"
            desc = f"Initial progress review meeting. Mandatory OTP Check-In code: {otp_code}."
            
            cal_res = calendar_service.create_meeting(
                summary=summary,
                description=desc,
                start_dt=review_date,
                end_dt=review_date + timedelta(minutes=45),
                attendee_emails=[intern.user.email, mentor.email],
                timezone=settings.TIMEZONE
            )

            review = ReviewSession(
                intern_id=intern.id,
                mentor_id=mentor.id,
                task_assignment_id=assignment.id,
                review_type=ReviewType.INITIAL,
                scheduled_date=review_date,
                start_time="10:00",
                end_time="10:45",
                timezone=settings.TIMEZONE,
                meeting_url=cal_res.meeting_url,
                calendar_event_id=cal_res.event_id,
                meeting_status=MeetingStatus.SCHEDULED,
                attendance_status=AttendanceStatus.PENDING,
                verification_code=otp_code,
                verification_expires_at=review_date + timedelta(hours=48),
                verification_used=False,
                review_outcome=ReviewOutcome.PENDING
            )
            db.add(review)
            db.flush()

            # Send Review Scheduling Email
            date_str = review_date.strftime("%B %d, %Y")
            review_html = EmailTemplates.review_scheduled_html(
                intern_name=intern.user.full_name,
                mentor_name=mentor.full_name,
                date_str=date_str,
                time_str="10:00 AM - 10:45 AM",
                meeting_url=cal_res.meeting_url,
                verification_code=otp_code
            )

            send_rev_res = email_provider.send_email(
                recipient_email=intern.user.email,
                recipient_name=intern.user.full_name,
                subject=f"{test_tag}Review Scheduled: {date_str} at 10:00 AM (Google Meet)",
                html_content=review_html
            )

            notif_rev = NotificationLog(
                recipient_email=intern.user.email,
                recipient_name=intern.user.full_name,
                notification_type="REVIEW_SCHEDULED",
                subject=f"{test_tag}Review Scheduled: {date_str}",
                body_html=review_html,
                provider="mock" if cal_res.is_mock else "google_meet",
                provider_message_id=send_rev_res.message_id,
                status=DeliveryStatus.SENT if send_rev_res.success else DeliveryStatus.FAILED
            )
            db.add(notif_rev)

        # 4. Advance Workflow Stage
        WorkflowEngineService.append_workflow_history(
            wf,
            WorkflowStage.TASK_ASSIGNED,
            "ONBOARDING_COMPLETED",
            "SUCCESS",
            f"AI task analysis generated, onboarding email delivered, and first review scheduled for {review_date.strftime('%Y-%m-%d')}."
        )
        wf.next_scheduled_action = "SUBMISSION_MONITORING"
        wf.next_scheduled_run_at = assignment.deadline

        intern.status = InternStatus.ACTIVE
        intern.progress_percentage = max(intern.progress_percentage, 15.0)

        db.commit()
        return f"Successfully onboarded intern '{intern.user.full_name}' with AI task roadmap and first review."

    @staticmethod
    def handle_evaluate_submission(db: Session, job: WorkflowJob, mode: str) -> str:
        """
        Stage 10-13: Process submission and perform evidence-based AI evaluation.
        """
        submission = db.query(TaskSubmission).filter(TaskSubmission.id == job.submission_id).first()
        if not submission:
            raise ValueError(f"Submission #{job.submission_id} not found.")

        assignment = submission.assignment
        intern = submission.intern
        wf = WorkflowEngineService.get_or_create_workflow(db, intern.id)
        task = assignment.task

        # Retrieve acceptance criteria from AI task analysis
        analysis = db.query(AITaskAnalysis).filter(AITaskAnalysis.task_id == task.id).first()
        acceptance_criteria = analysis.acceptance_criteria_json if analysis else [
            {"criterion_name": "Functional Completeness", "description": task.raw_requirements}
        ]

        files_info = [
            {
                "original_filename": f.original_filename,
                "file_size_bytes": f.file_size_bytes,
                "mime_type": f.mime_type
            } for f in submission.files
        ]

        # Execute AI evaluation
        ai_result = ai_service.evaluate_submission(
            task_title=task.title,
            requirements=task.raw_requirements,
            acceptance_criteria=acceptance_criteria,
            submission_notes=submission.intern_notes or "",
            files_info=files_info
        )

        evaluation = db.query(AIEvaluation).filter(AIEvaluation.submission_id == submission.id).first()
        if not evaluation:
            evaluation = AIEvaluation(
                submission_id=submission.id,
                model_name=settings.AI_MODEL,
                prompt_version="v1.0",
                overall_score=ai_result["overall_score"],
                overall_feedback=ai_result["overall_feedback"],
                summary=ai_result["summary"],
                criteria_json=ai_result["criteria"],
                uncertainties=ai_result.get("uncertainties"),
                recommendations_json=ai_result.get("recommendations", [])
            )
            db.add(evaluation)
        else:
            evaluation.overall_score = ai_result["overall_score"]
            evaluation.overall_feedback = ai_result["overall_feedback"]
            evaluation.summary = ai_result["summary"]
            evaluation.criteria_json = ai_result["criteria"]
            evaluation.uncertainties = ai_result.get("uncertainties")
            evaluation.recommendations_json = ai_result.get("recommendations", [])

        submission.status = "EVALUATED"
        assignment.status = TaskStatus.IN_REVIEW
        intern.progress_percentage = min(100.0, intern.progress_percentage + 20.0)

        # Notify mentor that submission is ready for live review
        test_tag = "[TEST MODE] " if mode == MODE_TEST else ""
        mentor = assignment.mentor or intern.mentor
        if mentor:
            mentor_subject = f"{test_tag}Deliverables Ready for Review: {intern.user.full_name} (v{submission.version})"
            mentor_body = f"""
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
                <h2 style="color: #ea580c;">Deliverables Submitted by {intern.user.full_name}</h2>
                <p><strong>Task:</strong> {task.title} (Submission Version {submission.version})</p>
                <p><strong>AI Evaluation Score:</strong> {ai_result['overall_score']}/100</p>
                <p><strong>AI Summary:</strong> {ai_result['summary']}</p>
                <p>Open the Mentor Review Workspace to review submitted source files and confirm final decision.</p>
            </div>
            """
            send_res = email_provider.send_email(
                recipient_email=mentor.email,
                recipient_name=mentor.full_name,
                subject=mentor_subject,
                html_content=mentor_body
            )
            db.add(NotificationLog(
                recipient_email=mentor.email,
                recipient_name=mentor.full_name,
                notification_type="SUBMISSION_READY_FOR_REVIEW",
                subject=mentor_subject,
                body_html=mentor_body,
                provider="mock" if mode == MODE_TEST else settings.EMAIL_PROVIDER,
                provider_message_id=send_res.message_id,
                status=DeliveryStatus.SENT if send_res.success else DeliveryStatus.FAILED
            ))

        WorkflowEngineService.append_workflow_history(
            wf,
            WorkflowStage.AI_EVALUATION_COMPLETE,
            "SUBMISSION_EVALUATED",
            "SUCCESS",
            f"Submission v{submission.version} evaluated (Score: {ai_result['overall_score']}). Evidence checklist compiled for mentor review."
        )

        db.commit()
        return f"Evaluated submission #{submission.id} for intern '{intern.user.full_name}' with score {ai_result['overall_score']}."

    @staticmethod
    def handle_process_review_decision(db: Session, job: WorkflowJob, mode: str) -> str:
        """
        Stage 14-15: Automatically coordinate next lifecycle step after mentor decision.
        """
        review = db.query(ReviewSession).filter(ReviewSession.id == job.review_session_id).first()
        if not review:
            raise ValueError(f"Review session #{job.review_session_id} not found.")

        intern = review.intern
        wf = WorkflowEngineService.get_or_create_workflow(db, intern.id)
        outcome = review.review_outcome

        if outcome in (ReviewOutcome.APPROVED, ReviewOutcome.APPROVED_WITH_MINOR_CHANGES):
            # Queue completion check or next task
            WorkflowEngineService.append_workflow_history(
                wf,
                WorkflowStage.REVIEW_APPROVED,
                "REVIEW_APPROVED",
                "SUCCESS",
                f"Review approved with outcome: {outcome.value}. Proceeding to completion evaluation."
            )
            # Queue completion eligibility check
            WorkflowEngineService.queue_job(
                db,
                job_type=JOB_CHECK_COMPLETION,
                intern_id=intern.id,
                priority=10,
                idempotency_key=f"check_comp_{intern.id}_{review.id}"
            )
            db.commit()
            return f"Review approved for '{intern.user.full_name}'. Queued completion check."

        elif outcome in (ReviewOutcome.CHANGES_REQUIRED, ReviewOutcome.RESUBMISSION_REQUIRED):
            # Automatically schedule follow-up review if next_review_date specified
            policies = WorkflowEngineService.get_policy_settings(db)
            interval_days = policies.get("default_review_interval_days", 7)
            follow_up_date = review.next_review_date or (datetime.utcnow() + timedelta(days=interval_days))
            follow_up_date = follow_up_date.replace(hour=11, minute=0, second=0, microsecond=0)

            otp_code = generate_verification_code()
            test_tag = "[TEST MODE] " if mode == MODE_TEST else ""
            summary = f"{test_tag}Follow-up Review: {intern.user.full_name}"
            desc = f"Revision progress review meeting. Mandatory OTP Check-In code: {otp_code}."

            cal_res = calendar_service.create_meeting(
                summary=summary,
                description=desc,
                start_dt=follow_up_date,
                end_dt=follow_up_date + timedelta(minutes=30),
                attendee_emails=[intern.user.email, review.mentor.email],
                timezone=review.timezone
            )

            new_review = ReviewSession(
                intern_id=intern.id,
                mentor_id=review.mentor_id,
                task_assignment_id=review.task_assignment_id,
                review_type=ReviewType.PROGRESS,
                scheduled_date=follow_up_date,
                start_time="11:00",
                end_time="11:30",
                timezone=review.timezone,
                meeting_url=cal_res.meeting_url,
                calendar_event_id=cal_res.event_id,
                meeting_status=MeetingStatus.SCHEDULED,
                attendance_status=AttendanceStatus.PENDING,
                verification_code=otp_code,
                verification_expires_at=follow_up_date + timedelta(hours=48),
                verification_used=False,
                review_outcome=ReviewOutcome.PENDING
            )
            db.add(new_review)

            WorkflowEngineService.append_workflow_history(
                wf,
                WorkflowStage.RESUBMISSION_PENDING,
                "FOLLOW_UP_SCHEDULED",
                "PENDING",
                f"Changes requested. Follow-up review scheduled for {follow_up_date.strftime('%Y-%m-%d')}."
            )
            db.commit()
            return f"Scheduled follow-up review for '{intern.user.full_name}' on {follow_up_date.strftime('%Y-%m-%d')}."

        return f"Processed review #{review.id} with outcome: {outcome.value}."

    @staticmethod
    def handle_check_completion(db: Session, job: WorkflowJob, mode: str) -> str:
        """
        Stage 16: Verify all completion criteria from stored records.
        If all criteria met and auto-issue enabled, queues certificate issuance.
        """
        intern = db.query(InternProfile).filter(InternProfile.id == job.intern_id).first()
        if not intern:
            raise ValueError(f"Intern profile #{job.intern_id} not found.")

        wf = WorkflowEngineService.get_or_create_workflow(db, intern.id)
        assignments = db.query(TaskAssignment).filter(TaskAssignment.intern_id == intern.id).all()
        reviews = db.query(ReviewSession).filter(ReviewSession.intern_id == intern.id).all()
        improvements = db.query(ImprovementAction).filter(ImprovementAction.intern_id == intern.id).all()

        total_tasks = len(assignments)
        approved_tasks = sum(1 for a in assignments if a.status == TaskStatus.APPROVED)
        tasks_satisfied = total_tasks > 0 and (approved_tasks == total_tasks)

        completed_reviews = sum(1 for r in reviews if r.meeting_status == MeetingStatus.COMPLETED)
        reviews_satisfied = completed_reviews > 0

        unresolved_improvements = sum(1 for imp in improvements if not imp.is_resolved)
        improvements_satisfied = unresolved_improvements == 0

        eligible = tasks_satisfied and reviews_satisfied and improvements_satisfied
        intern.completion_eligible = eligible

        policies = WorkflowEngineService.get_policy_settings(db)
        auto_issue = policies.get("auto_issue_certificate", True)

        if eligible:
            WorkflowEngineService.append_workflow_history(
                wf,
                WorkflowStage.COMPLETION_CHECK,
                "COMPLETION_CRITERIA_SATISFIED",
                "SUCCESS",
                f"Verified: {approved_tasks}/{total_tasks} tasks approved, {completed_reviews} reviews completed, 0 unresolved improvements."
            )
            if auto_issue or intern.completion_approved:
                # Automatically issue certificate
                WorkflowEngineService.queue_job(
                    db,
                    job_type=JOB_ISSUE_CERTIFICATE,
                    intern_id=intern.id,
                    priority=20,
                    idempotency_key=f"issue_cert_{intern.id}"
                )
                db.commit()
                return f"Intern #{intern.id} eligible. Queued automatic certificate generation."
            else:
                wf.current_stage = WorkflowStage.NEEDS_ADMIN_ATTENTION
                wf.last_action = "AWAITING_ADMIN_CERTIFICATE_APPROVAL"
                db.commit()
                return f"Intern #{intern.id} eligible. Awaiting administrator approval policy."
        else:
            WorkflowEngineService.append_workflow_history(
                wf,
                wf.current_stage,
                "COMPLETION_CHECK_NOT_SATISFIED",
                "PENDING",
                f"Criteria not yet met: {approved_tasks}/{total_tasks} tasks approved, {completed_reviews} reviews completed, {unresolved_improvements} unresolved items."
            )
            db.commit()
            return f"Intern #{intern.id} is not yet eligible for completion."

    @staticmethod
    def handle_issue_certificate(db: Session, job: WorkflowJob, mode: str) -> str:
        """
        Stage 16-19: Generate vector PDF certificate, send email with attachment,
        generate AI career recommendations, and send final encouragement email.
        """
        intern = db.query(InternProfile).filter(InternProfile.id == job.intern_id).first()
        if not intern:
            raise ValueError(f"Intern profile #{job.intern_id} not found.")

        wf = WorkflowEngineService.get_or_create_workflow(db, intern.id)

        # Idempotency: Prevent duplicate certificates
        cert = db.query(Certificate).filter(
            Certificate.intern_id == intern.id,
            Certificate.is_revoked == False
        ).first()

        now = datetime.utcnow()
        test_tag = "[TEST MODE] " if mode == MODE_TEST else ""

        if not cert:
            cert_id = generate_certificate_id()
            verify_url = f"{settings.FRONTEND_URL}/verify-certificate/{cert_id}"

            assignments = db.query(TaskAssignment).filter(TaskAssignment.intern_id == intern.id).all()
            task_titles = [a.task.title for a in assignments if a.task]
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

            admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
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
                approved_by_admin_id=admin_user.id if admin_user else None,
                delivery_status=DeliveryStatus.GENERATED
            )
            db.add(cert)
            db.flush()

        # Generate AI Career Recommendations
        assignments = db.query(TaskAssignment).filter(TaskAssignment.intern_id == intern.id).all()
        task_titles = [a.task.title for a in assignments if a.task]
        guidance = ai_service.generate_career_guidance(
            intern_name=intern.user.full_name,
            role=intern.role_title,
            tasks_completed=task_titles
        )

        # Send Certificate & Career Development Email
        html_content = EmailTemplates.completion_and_certificate_html(
            intern_name=intern.user.full_name,
            role=intern.role_title,
            cert_id=cert.certificate_id,
            verify_url=cert.verification_url,
            guidance=guidance
        )

        send_res = email_provider.send_email(
            recipient_email=intern.user.email,
            recipient_name=intern.user.full_name,
            subject=f"{test_tag}Internship Completion Certificate & Career Guidance — {intern.role_title}",
            html_content=html_content,
            attachment_path=cert.pdf_path
        )

        if send_res.success:
            cert.delivery_status = DeliveryStatus.SENT
            cert.delivered_at = now

        notif = NotificationLog(
            recipient_email=intern.user.email,
            recipient_name=intern.user.full_name,
            notification_type="CERTIFICATE_AND_CAREER_DELIVERED",
            subject=f"{test_tag}Internship Completion Certificate & Career Guidance",
            body_html=html_content,
            provider="mock" if mode == MODE_TEST else settings.EMAIL_PROVIDER,
            provider_message_id=send_res.message_id,
            status=DeliveryStatus.SENT if send_res.success else DeliveryStatus.FAILED
        )
        db.add(notif)

        # Update intern and workflow records
        intern.completion_approved = True
        intern.status = InternStatus.COMPLETED
        intern.progress_percentage = 100.0

        WorkflowEngineService.append_workflow_history(
            wf,
            WorkflowStage.COMPLETED,
            "CERTIFICATE_AND_CAREER_DELIVERED",
            "SUCCESS",
            f"Issued accredited certificate #{cert.certificate_id} and delivered tailored AI career development email."
        )

        db.commit()
        return f"Issued certificate {cert.certificate_id} and delivered career guidance for '{intern.user.full_name}'."

    @staticmethod
    def handle_deadline_reminder(db: Session, job: WorkflowJob, mode: str) -> str:
        """
        Automated submission reminder for approaching deadlines.
        """
        assignment = db.query(TaskAssignment).filter(TaskAssignment.id == job.task_assignment_id).first()
        if not assignment or assignment.status in (TaskStatus.SUBMITTED, TaskStatus.APPROVED):
            return "Submission already made or approved. Skipping reminder."

        intern = assignment.intern
        test_tag = "[TEST MODE] " if mode == MODE_TEST else ""
        deadline_str = assignment.deadline.strftime("%B %d, %Y") if assignment.deadline else "Soon"

        subject = f"{test_tag}Reminder: Task Submission Approaching Deadline — {assignment.task.title}"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #ea580c;">Upcoming Task Submission Deadline</h2>
            <p>Dear {intern.user.full_name},</p>
            <p>This is an automated reminder that your milestone task <strong>'{assignment.task.title}'</strong> is due on <strong>{deadline_str}</strong>.</p>
            <p>Please log in to your Intern Dashboard to upload your project files and documentation before the scheduled review.</p>
            <a href="{settings.FRONTEND_URL}/intern/tasks" style="display: inline-block; background-color: #ea580c; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Go to My Tasks</a>
        </div>
        """

        send_res = email_provider.send_email(
            recipient_email=intern.user.email,
            recipient_name=intern.user.full_name,
            subject=subject,
            html_content=body_html
        )

        db.add(NotificationLog(
            recipient_email=intern.user.email,
            recipient_name=intern.user.full_name,
            notification_type="DEADLINE_REMINDER",
            subject=subject,
            body_html=body_html,
            provider="mock" if mode == MODE_TEST else settings.EMAIL_PROVIDER,
            provider_message_id=send_res.message_id,
            status=DeliveryStatus.SENT if send_res.success else DeliveryStatus.FAILED
        ))
        db.commit()
        return f"Dispatched deadline reminder to '{intern.user.full_name}' for task '{assignment.task.title}'."

    @staticmethod
    def handle_review_reminder(db: Session, job: WorkflowJob, mode: str) -> str:
        """
        Automated meeting reminder before review session with OTP verification code.
        """
        review = db.query(ReviewSession).filter(ReviewSession.id == job.review_session_id).first()
        if not review or review.meeting_status != MeetingStatus.SCHEDULED:
            return "Review session not active. Skipping reminder."

        intern = review.intern
        test_tag = "[TEST MODE] " if mode == MODE_TEST else ""
        date_str = review.scheduled_date.strftime("%B %d, %Y")

        subject = f"{test_tag}Review Meeting Reminder Today: {date_str} at {review.start_time}"
        body_html = EmailTemplates.review_scheduled_html(
            intern_name=intern.user.full_name,
            mentor_name=review.mentor.full_name,
            date_str=date_str,
            time_str=f"{review.start_time} - {review.end_time}",
            meeting_url=review.meeting_url,
            verification_code=review.verification_code
        )

        send_res = email_provider.send_email(
            recipient_email=intern.user.email,
            recipient_name=intern.user.full_name,
            subject=subject,
            html_content=body_html
        )

        db.add(NotificationLog(
            recipient_email=intern.user.email,
            recipient_name=intern.user.full_name,
            notification_type="REVIEW_REMINDER",
            subject=subject,
            body_html=body_html,
            provider="mock" if mode == MODE_TEST else settings.EMAIL_PROVIDER,
            provider_message_id=send_res.message_id,
            status=DeliveryStatus.SENT if send_res.success else DeliveryStatus.FAILED
        ))
        db.commit()
        return f"Dispatched review reminder to '{intern.user.full_name}' for review on {date_str}."

    # =========================================================================
    # CORE DISPATCHER
    # =========================================================================

    @staticmethod
    def execute_job(db: Session, job: WorkflowJob, mode: str) -> Tuple[bool, str]:
        """
        Executes a single workflow job with error handling, status transitions,
        and exponential backoff calculations.
        """
        job.status = JobStatus.RUNNING
        job.started_at = datetime.utcnow()
        job.attempt_count += 1
        db.commit()

        try:
            if job.job_type == JOB_ONBOARD_INTERN:
                result_msg = WorkflowEngineService.handle_onboard_intern(db, job, mode)
            elif job.job_type == JOB_EVALUATE_SUBMISSION:
                result_msg = WorkflowEngineService.handle_evaluate_submission(db, job, mode)
            elif job.job_type == JOB_PROCESS_REVIEW_DECISION:
                result_msg = WorkflowEngineService.handle_process_review_decision(db, job, mode)
            elif job.job_type == JOB_CHECK_COMPLETION:
                result_msg = WorkflowEngineService.handle_check_completion(db, job, mode)
            elif job.job_type == JOB_ISSUE_CERTIFICATE:
                result_msg = WorkflowEngineService.handle_issue_certificate(db, job, mode)
            elif job.job_type == JOB_DEADLINE_REMINDER:
                result_msg = WorkflowEngineService.handle_deadline_reminder(db, job, mode)
            elif job.job_type == JOB_REVIEW_REMINDER:
                result_msg = WorkflowEngineService.handle_review_reminder(db, job, mode)
            else:
                raise ValueError(f"Unknown job type: '{job.job_type}'")

            job.status = JobStatus.SUCCESS
            job.completed_at = datetime.utcnow()
            job.last_error = None
            db.commit()
            return True, result_msg

        except Exception as e:
            error_str = str(e)
            logger.error(f"[WorkflowEngine] Job #{job.id} failed (attempt {job.attempt_count}): {error_str}")
            job.last_error = error_str

            if job.attempt_count >= job.max_attempts:
                job.status = JobStatus.FAILED
                job.error_category = "PERMANENT"
                if job.intern_id:
                    wf = db.query(InternWorkflow).filter(InternWorkflow.intern_id == job.intern_id).first()
                    if wf:
                        wf.current_stage = WorkflowStage.NEEDS_ADMIN_ATTENTION
                        wf.last_error = error_str
            else:
                # Exponential backoff: backoff_seconds * 2^(attempt - 1)
                backoff_mult = 2 ** max(0, job.attempt_count - 1)
                delay_sec = job.backoff_seconds * backoff_mult
                job.status = JobStatus.RETRY_SCHEDULED
                job.next_run_at = datetime.utcnow() + timedelta(seconds=delay_sec)
                job.error_category = "RECOVERABLE"

            db.commit()
            return False, error_str

    @staticmethod
    def process_pending_jobs(db: Session, max_jobs: int = 10) -> Dict[str, Any]:
        """
        Picks up ready jobs and executes them.
        """
        mode = WorkflowEngineService.get_automation_mode(db)
        if mode in (MODE_PAUSED, MODE_EMERGENCY_STOP, MODE_DISABLED):
            return {"mode": mode, "processed_count": 0, "message": f"Automation engine is {mode}."}

        now = datetime.utcnow()

        # 1. Recover stalled RUNNING jobs (> 5 minutes)
        stalled_cutoff = now - timedelta(minutes=5)
        stalled_jobs = db.query(WorkflowJob).filter(
            WorkflowJob.status == JobStatus.RUNNING,
            WorkflowJob.started_at < stalled_cutoff
        ).all()
        for sj in stalled_jobs:
            logger.warning(f"[WorkflowEngine] Reclaiming stalled job #{sj.id} [{sj.job_type}]")
            sj.status = JobStatus.RETRY_SCHEDULED
            sj.next_run_at = now
        if stalled_jobs:
            db.commit()

        # 2. Fetch and execute ready jobs (supporting cascaded job steps)
        results = []
        for _ in range(5):
            ready_jobs = db.query(WorkflowJob).filter(
                or_(
                    WorkflowJob.status == JobStatus.QUEUED,
                    WorkflowJob.status == JobStatus.RETRY_SCHEDULED
                ),
                WorkflowJob.next_run_at <= datetime.utcnow()
            ).order_by(WorkflowJob.priority.desc(), WorkflowJob.id.asc()).limit(max_jobs).all()

            if not ready_jobs:
                break

            for job in ready_jobs:
                success, msg = WorkflowEngineService.execute_job(db, job, mode)
                results.append({
                    "job_id": job.id,
                    "job_type": job.job_type,
                    "success": success,
                    "detail": msg
                })

        # 3. Routine Scheduled Monitor (Deadlines & Review Reminders)
        WorkflowEngineService.check_deadlines_and_schedule_reminders(db, now)

        return {
            "mode": mode,
            "processed_count": len(results),
            "jobs": results
        }

    @staticmethod
    def check_deadlines_and_schedule_reminders(db: Session, now: datetime):
        """
        Periodic scanner for upcoming deadlines (e.g. within 24h) and upcoming reviews.
        Ensures idempotent queuing so no duplicate reminders are sent.
        """
        policies = WorkflowEngineService.get_policy_settings(db)
        reminder_hours = policies.get("deadline_reminder_hours", 24)
        reminder_window = now + timedelta(hours=reminder_hours)

        # 1. Upcoming assignment deadlines with no submission
        imp_assignments = db.query(TaskAssignment).filter(
            TaskAssignment.deadline != None,
            TaskAssignment.deadline <= reminder_window,
            TaskAssignment.deadline >= now,
            TaskAssignment.status == TaskStatus.ASSIGNED
        ).all()

        for a in imp_assignments:
            idemp_key = f"deadline_rem_{a.id}_{a.deadline.strftime('%Y%m%d')}"
            WorkflowEngineService.queue_job(
                db,
                job_type=JOB_DEADLINE_REMINDER,
                intern_id=a.intern_id,
                task_assignment_id=a.id,
                priority=5,
                idempotency_key=idemp_key
            )

        # 2. Upcoming reviews within 24h
        review_window = now + timedelta(hours=24)
        upcoming_reviews = db.query(ReviewSession).filter(
            ReviewSession.scheduled_date <= review_window,
            ReviewSession.scheduled_date >= now,
            ReviewSession.meeting_status == MeetingStatus.SCHEDULED
        ).all()

        for r in upcoming_reviews:
            idemp_key = f"review_rem_{r.id}_{r.scheduled_date.strftime('%Y%m%d')}"
            WorkflowEngineService.queue_job(
                db,
                job_type=JOB_REVIEW_REMINDER,
                intern_id=r.intern_id,
                review_session_id=r.id,
                priority=5,
                idempotency_key=idemp_key
            )


# =============================================================================
# PERSISTENT BACKGROUND SCHEDULER THREAD
# =============================================================================

class WorkflowScheduler:
    """
    Background worker thread running continuously to process queued workflow jobs,
    reconcile deadlines, recover failures, and manage lifecycle automation.
    """
    def __init__(self, tick_seconds: int = 5):
        self.tick_seconds = tick_seconds
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, name="WorkflowSchedulerThread", daemon=True)
        self._thread.start()
        logger.info("[WorkflowScheduler] Background automation thread started.")

    def stop(self):
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=3)
        logger.info("[WorkflowScheduler] Background automation thread stopped.")

    def trigger_cycle_now(self) -> Dict[str, Any]:
        """Executes a pass immediately and returns results."""
        db = SessionLocal()
        try:
            return WorkflowEngineService.process_pending_jobs(db, max_jobs=25)
        finally:
            db.close()

    def _run_loop(self):
        while not self._stop_event.is_set():
            db = SessionLocal()
            try:
                WorkflowEngineService.process_pending_jobs(db, max_jobs=10)
            except Exception as e:
                logger.error(f"[WorkflowScheduler Error] {e}")
            finally:
                db.close()

            # Sleep in small increments for prompt shutdown
            for _ in range(self.tick_seconds * 2):
                if self._stop_event.is_set():
                    break
                time.sleep(0.5)


# Global Scheduler Instance
workflow_scheduler = WorkflowScheduler(tick_seconds=5)
