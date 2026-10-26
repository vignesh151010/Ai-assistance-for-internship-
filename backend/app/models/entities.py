import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum, Float, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MENTOR = "MENTOR"
    INTERN = "INTERN"

class InternStatus(str, enum.Enum):
    REGISTERED = "REGISTERED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    DROPPED = "DROPPED"

class TaskStatus(str, enum.Enum):
    ASSIGNED = "ASSIGNED"
    SUBMITTED = "SUBMITTED"
    IN_REVIEW = "IN_REVIEW"
    CHANGES_REQUIRED = "CHANGES_REQUIRED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class ReviewType(str, enum.Enum):
    INITIAL = "INITIAL"
    PROGRESS = "PROGRESS"
    FINAL = "FINAL"

class MeetingStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    RESCHEDULED = "RESCHEDULED"

class AttendanceStatus(str, enum.Enum):
    PENDING = "PENDING"
    CHECKED_IN = "CHECKED_IN"
    VERIFIED = "VERIFIED"
    ABSENT = "ABSENT"

class ReviewOutcome(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    APPROVED_WITH_MINOR_CHANGES = "APPROVED_WITH_MINOR_CHANGES"
    CHANGES_REQUIRED = "CHANGES_REQUIRED"
    RESUBMISSION_REQUIRED = "RESUBMISSION_REQUIRED"
    ESCALATED = "ESCALATED"

class DeliveryStatus(str, enum.Enum):
    GENERATED = "GENERATED"
    QUEUED = "QUEUED"
    SENT = "SENT"
    FAILED = "FAILED"
    DELIVERED = "DELIVERED"

class WorkflowStage(str, enum.Enum):
    IMPORTED = "IMPORTED"
    ONBOARDING_PENDING = "ONBOARDING_PENDING"
    ONBOARDING_SENT = "ONBOARDING_SENT"
    TASK_ASSIGNED = "TASK_ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    SUBMISSION_PENDING = "SUBMISSION_PENDING"
    SUBMITTED = "SUBMITTED"
    AI_EVALUATION_PENDING = "AI_EVALUATION_PENDING"
    AI_EVALUATION_COMPLETE = "AI_EVALUATION_COMPLETE"
    REVIEW_SCHEDULED = "REVIEW_SCHEDULED"
    REVIEW_IN_PROGRESS = "REVIEW_IN_PROGRESS"
    CHANGES_REQUIRED = "CHANGES_REQUIRED"
    RESUBMISSION_PENDING = "RESUBMISSION_PENDING"
    REVIEW_APPROVED = "REVIEW_APPROVED"
    NEXT_REVIEW_PENDING = "NEXT_REVIEW_PENDING"
    COMPLETION_CHECK = "COMPLETION_CHECK"
    COMPLETED = "COMPLETED"
    CERTIFICATE_PENDING = "CERTIFICATE_PENDING"
    CERTIFICATE_ISSUED = "CERTIFICATE_ISSUED"
    FINAL_EMAIL_SENT = "FINAL_EMAIL_SENT"
    CLOSED = "CLOSED"
    PAUSED = "PAUSED"
    NEEDS_ADMIN_ATTENTION = "NEEDS_ADMIN_ATTENTION"
    FAILED = "FAILED"
    # Legacy alias support
    ONBOARDING = "ONBOARDING"
    UNDER_EVALUATION = "UNDER_EVALUATION"
    REVIEW_COMPLETED = "REVIEW_COMPLETED"
    IMPROVEMENT_CYCLE = "IMPROVEMENT_CYCLE"
    COMPLETION_ELIGIBLE = "COMPLETION_ELIGIBLE"
    PAUSED_EXCEPTION = "PAUSED_EXCEPTION"
    DROPPED = "DROPPED"

class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    RETRY_SCHEDULED = "RETRY_SCHEDULED"
    PAUSED_EXCEPTION = "PAUSED_EXCEPTION"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.INTERN, nullable=False)
    is_active = Column(Boolean, default=True)
    phone = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    intern_profile = relationship("InternProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", foreign_keys="[InternProfile.user_id]")
    mentor_profile = relationship("MentorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", foreign_keys="[MentorProfile.user_id]")
    audit_logs = relationship("AuditLog", back_populates="user")

class InternProfile(Base):
    __tablename__ = "intern_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    candidate_id = Column(String(50), unique=True, index=True, nullable=False)
    role_title = Column(String(255), nullable=False)
    college = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    assigned_mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(InternStatus), default=InternStatus.REGISTERED, nullable=False)
    progress_percentage = Column(Float, default=0.0)
    completion_eligible = Column(Boolean, default=False)
    completion_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="intern_profile")
    mentor = relationship("User", foreign_keys=[assigned_mentor_id])
    task_assignments = relationship("TaskAssignment", back_populates="intern", cascade="all, delete-orphan")
    submissions = relationship("TaskSubmission", back_populates="intern")
    reviews = relationship("ReviewSession", back_populates="intern")
    certificates = relationship("Certificate", back_populates="intern")
    improvement_actions = relationship("ImprovementAction", back_populates="intern")
    workflow = relationship("InternWorkflow", back_populates="intern", uselist=False, cascade="all, delete-orphan")

class MentorProfile(Base):
    __tablename__ = "mentor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    department = Column(String(255), nullable=True)
    designation = Column(String(255), nullable=True)
    max_interns = Column(Integer, default=10)
    expertise = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="mentor_profile")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    raw_requirements = Column(Text, nullable=False)
    expected_deliverables = Column(Text, nullable=True)
    required_skills = Column(String(500), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    assignments = relationship("TaskAssignment", back_populates="task")
    analyses = relationship("AITaskAnalysis", back_populates="task")

class TaskAssignment(Base):
    __tablename__ = "task_assignments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    intern_id = Column(Integer, ForeignKey("intern_profiles.id"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_date = Column(DateTime, default=datetime.utcnow)
    deadline = Column(DateTime, nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.ASSIGNED, nullable=False)
    is_email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    task = relationship("Task", back_populates="assignments")
    intern = relationship("InternProfile", back_populates="task_assignments")
    mentor = relationship("User", foreign_keys=[mentor_id])
    analyses = relationship("AITaskAnalysis", back_populates="assignment")
    submissions = relationship("TaskSubmission", back_populates="assignment")
    reviews = relationship("ReviewSession", back_populates="assignment")
    improvement_actions = relationship("ImprovementAction", back_populates="assignment")

class AITaskAnalysis(Base):
    __tablename__ = "ai_task_analyses"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    task_assignment_id = Column(Integer, ForeignKey("task_assignments.id"), nullable=True)
    model_name = Column(String(100), default="gemini-1.5-flash")
    prompt_version = Column(String(50), default="v1.0")
    objective = Column(Text, nullable=False)
    business_purpose = Column(Text, nullable=True)
    prerequisites = Column(Text, nullable=True)
    steps_json = Column(JSON, nullable=False)  # List of {step_number, title, description, tools}
    acceptance_criteria_json = Column(JSON, nullable=False)  # List of criteria
    common_mistakes_json = Column(JSON, nullable=True)  # List of common mistakes
    testing_requirements_json = Column(JSON, nullable=True)
    submission_instructions = Column(Text, nullable=True)
    beginner_explanation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="analyses")
    assignment = relationship("TaskAssignment", back_populates="analyses")

class TaskSubmission(Base):
    __tablename__ = "task_submissions"

    id = Column(Integer, primary_key=True, index=True)
    task_assignment_id = Column(Integer, ForeignKey("task_assignments.id"), nullable=False)
    intern_id = Column(Integer, ForeignKey("intern_profiles.id"), nullable=False)
    version = Column(Integer, default=1)
    intern_notes = Column(Text, nullable=True)
    status = Column(String(50), default="SUBMITTED")  # SUBMITTED, EVALUATED, REVIEWED
    created_at = Column(DateTime, default=datetime.utcnow)

    assignment = relationship("TaskAssignment", back_populates="submissions")
    intern = relationship("InternProfile", back_populates="submissions")
    files = relationship("SubmissionFile", back_populates="submission", cascade="all, delete-orphan")
    ai_evaluation = relationship("AIEvaluation", back_populates="submission", uselist=False, cascade="all, delete-orphan")

class SubmissionFile(Base):
    __tablename__ = "submission_files"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("task_submissions.id"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=True)
    file_hash = Column(String(64), nullable=True)
    scan_status = Column(String(50), default="CLEAN")  # CLEAN, PENDING, FLAGGED
    created_at = Column(DateTime, default=datetime.utcnow)

    submission = relationship("TaskSubmission", back_populates="files")

class AIEvaluation(Base):
    __tablename__ = "ai_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("task_submissions.id"), unique=True, nullable=False)
    model_name = Column(String(100), default="gemini-1.5-flash")
    prompt_version = Column(String(50), default="v1.0")
    overall_score = Column(Float, default=0.0)  # e.g., 0-100
    overall_feedback = Column(Text, nullable=False)
    summary = Column(Text, nullable=False)
    criteria_json = Column(JSON, nullable=False)
    # Each criterion: {
    #   "criterion_name": str,
    #   "original_requirement": str,
    #   "status": "COMPLETED"|"PARTIALLY_COMPLETED"|"NOT_COMPLETED"|"UNABLE_TO_VERIFY",
    #   "evidence": str,
    #   "explanation": str,
    #   "issue": str,
    #   "suggested_improvement": str,
    #   "confidence": str
    # }
    uncertainties = Column(Text, nullable=True)
    recommendations_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    submission = relationship("TaskSubmission", back_populates="ai_evaluation")

class ReviewSession(Base):
    __tablename__ = "review_sessions"

    id = Column(Integer, primary_key=True, index=True)
    intern_id = Column(Integer, ForeignKey("intern_profiles.id"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_assignment_id = Column(Integer, ForeignKey("task_assignments.id"), nullable=True)
    review_type = Column(Enum(ReviewType), default=ReviewType.PROGRESS, nullable=False)
    scheduled_date = Column(DateTime, nullable=False)
    start_time = Column(String(20), nullable=False)  # HH:MM
    end_time = Column(String(20), nullable=False)    # HH:MM
    timezone = Column(String(50), default="Asia/Kolkata")
    meeting_url = Column(String(500), nullable=True)
    calendar_event_id = Column(String(255), nullable=True)
    meeting_status = Column(Enum(MeetingStatus), default=MeetingStatus.SCHEDULED, nullable=False)
    attendance_status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PENDING, nullable=False)
    verification_code = Column(String(10), nullable=True)
    verification_expires_at = Column(DateTime, nullable=True)
    verification_used = Column(Boolean, default=False)
    review_outcome = Column(Enum(ReviewOutcome), default=ReviewOutcome.PENDING, nullable=False)
    next_review_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    intern = relationship("InternProfile", back_populates="reviews")
    mentor = relationship("User", foreign_keys=[mentor_id])
    assignment = relationship("TaskAssignment", back_populates="reviews")
    notes = relationship("ReviewNote", back_populates="review_session", cascade="all, delete-orphan")
    improvement_actions = relationship("ImprovementAction", back_populates="review_session")

class ReviewNote(Base):
    __tablename__ = "review_notes"

    id = Column(Integer, primary_key=True, index=True)
    review_session_id = Column(Integer, ForeignKey("review_sessions.id"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(Text, nullable=False)
    intern_responses = Column(Text, nullable=True)
    discussion_points_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    review_session = relationship("ReviewSession", back_populates="notes")
    mentor = relationship("User", foreign_keys=[mentor_id])

class ImprovementAction(Base):
    __tablename__ = "improvement_actions"

    id = Column(Integer, primary_key=True, index=True)
    review_session_id = Column(Integer, ForeignKey("review_sessions.id"), nullable=True)
    intern_id = Column(Integer, ForeignKey("intern_profiles.id"), nullable=False)
    task_assignment_id = Column(Integer, ForeignKey("task_assignments.id"), nullable=False)
    issue_description = Column(Text, nullable=False)
    required_correction = Column(Text, nullable=False)
    learning_resources = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    review_session = relationship("ReviewSession", back_populates="improvement_actions")
    intern = relationship("InternProfile", back_populates="improvement_actions")
    assignment = relationship("TaskAssignment", back_populates="improvement_actions")

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    certificate_id = Column(String(50), unique=True, index=True, nullable=False)
    intern_id = Column(Integer, ForeignKey("intern_profiles.id"), nullable=False)
    intern_name = Column(String(255), nullable=False)
    internship_role = Column(String(255), nullable=False)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    completion_date = Column(DateTime, default=datetime.utcnow)
    project_summary = Column(Text, nullable=True)
    template_version = Column(String(50), default="v1.0")
    pdf_filename = Column(String(255), nullable=False)
    pdf_path = Column(String(500), nullable=False)
    verification_url = Column(String(500), nullable=False)
    approved_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    delivery_status = Column(Enum(DeliveryStatus), default=DeliveryStatus.GENERATED, nullable=False)
    delivered_at = Column(DateTime, nullable=True)
    is_revoked = Column(Boolean, default=False)
    revocation_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    intern = relationship("InternProfile", back_populates="certificates")
    approved_by = relationship("User", foreign_keys=[approved_by_admin_id])

class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String(255), nullable=False, index=True)
    recipient_name = Column(String(255), nullable=False)
    notification_type = Column(String(50), nullable=False)  # TASK_ASSIGNED, REVIEW_SCHEDULED, etc.
    subject = Column(String(255), nullable=False)
    body_html = Column(Text, nullable=False)
    provider = Column(String(50), default="mock")
    provider_message_id = Column(String(255), nullable=True)
    status = Column(Enum(DeliveryStatus), default=DeliveryStatus.QUEUED, nullable=False)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    last_attempt_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    total_rows = Column(Integer, default=0)
    valid_rows = Column(Integer, default=0)
    invalid_rows = Column(Integer, default=0)
    imported_count = Column(Integer, default=0)
    status = Column(String(50), default="PREVIEW")  # PREVIEW, IMPORTED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow)

    errors = relationship("ImportError", back_populates="batch", cascade="all, delete-orphan")

class ImportError(Base):
    __tablename__ = "import_errors"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"), nullable=False)
    row_index = Column(Integer, nullable=False)
    candidate_name = Column(String(255), nullable=True)
    candidate_email = Column(String(255), nullable=True)
    error_reason = Column(Text, nullable=False)
    raw_data_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("ImportBatch", back_populates="errors")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # EXCEL_IMPORT, TASK_APPROVED, CERT_ISSUED, etc.
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    details_json = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")

class InternWorkflow(Base):
    __tablename__ = "intern_workflows"

    id = Column(Integer, primary_key=True, index=True)
    intern_id = Column(Integer, ForeignKey("intern_profiles.id"), unique=True, nullable=False)
    current_stage = Column(Enum(WorkflowStage), default=WorkflowStage.ONBOARDING, nullable=False)
    is_active = Column(Boolean, default=True)
    auto_pilot = Column(Boolean, default=True)
    last_action = Column(String(255), nullable=True)
    last_action_at = Column(DateTime, nullable=True)
    next_scheduled_action = Column(String(255), nullable=True)
    next_scheduled_run_at = Column(DateTime, nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=5)
    last_error = Column(Text, nullable=True)
    error_category = Column(String(50), nullable=True)  # RECOVERABLE, PERMANENT, CREDENTIAL_REQUIRED, HUMAN_APPROVAL_REQUIRED
    history_json = Column(JSON, default=list)  # list of {timestamp, stage, action, status, details, execution_id}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    intern = relationship("InternProfile", back_populates="workflow")

class WorkflowJob(Base):
    __tablename__ = "workflow_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String(100), index=True, nullable=False)
    intern_id = Column(Integer, ForeignKey("intern_profiles.id"), nullable=True)
    task_assignment_id = Column(Integer, ForeignKey("task_assignments.id"), nullable=True)
    submission_id = Column(Integer, ForeignKey("task_submissions.id"), nullable=True)
    review_session_id = Column(Integer, ForeignKey("review_sessions.id"), nullable=True)
    status = Column(Enum(JobStatus), default=JobStatus.QUEUED, index=True, nullable=False)
    priority = Column(Integer, default=0)
    payload_json = Column(JSON, default=dict)
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=4)
    backoff_seconds = Column(Integer, default=10)
    next_run_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    idempotency_key = Column(String(120), unique=True, index=True, nullable=True)
    last_error = Column(Text, nullable=True)
    error_category = Column(String(50), nullable=True)
    external_reference_id = Column(String(255), nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    intern = relationship("InternProfile")
    task_assignment = relationship("TaskAssignment")
    submission = relationship("TaskSubmission")
    review_session = relationship("ReviewSession")

class AutomationPolicy(Base):
    __tablename__ = "automation_policies"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    enabled = Column(Boolean, default=True, nullable=False)
    parameters_json = Column(JSON, default=dict)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value_json = Column(JSON, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


