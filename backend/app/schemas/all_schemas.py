from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from app.models.entities import (
    UserRole, InternStatus, TaskStatus, ReviewType, MeetingStatus,
    AttendanceStatus, ReviewOutcome, DeliveryStatus
)

# Authentication & Users
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: int
    full_name: str
    email: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    role: UserRole = UserRole.INTERN
    phone: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    phone: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Task Analysis & Tasks
class TaskCreate(BaseModel):
    title: str
    description: str
    raw_requirements: str
    expected_deliverables: Optional[str] = None
    required_skills: Optional[str] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    raw_requirements: str
    expected_deliverables: Optional[str] = None
    required_skills: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ImplementationStep(BaseModel):
    step_number: int
    title: str
    description: str
    tools: Optional[List[str]] = None

class AcceptanceCriterion(BaseModel):
    id: str
    criterion_name: str
    description: str
    is_mandatory: bool = True

class AITaskAnalysisResponse(BaseModel):
    id: int
    task_id: int
    model_name: str
    prompt_version: str
    objective: str
    business_purpose: Optional[str] = None
    prerequisites: Optional[str] = None
    steps: List[ImplementationStep]
    acceptance_criteria: List[AcceptanceCriterion]
    common_mistakes: Optional[List[str]] = None
    testing_requirements: Optional[List[str]] = None
    submission_instructions: Optional[str] = None
    beginner_explanation: str
    created_at: datetime

class TaskAssignmentResponse(BaseModel):
    id: int
    task_id: int
    intern_id: int
    mentor_id: Optional[int] = None
    assigned_date: datetime
    deadline: Optional[datetime] = None
    status: TaskStatus
    is_email_sent: bool
    email_sent_at: Optional[datetime] = None
    task: Optional[TaskResponse] = None
    mentor_name: Optional[str] = None

    class Config:
        from_attributes = True

# Submissions & AI Evaluation
class SubmissionFileResponse(BaseModel):
    id: int
    original_filename: str
    stored_filename: str
    file_size_bytes: int
    mime_type: Optional[str] = None
    scan_status: str
    created_at: datetime

    class Config:
        from_attributes = True

class EvaluationCriterionResult(BaseModel):
    criterion_name: str
    original_requirement: str
    status: str  # COMPLETED, PARTIALLY_COMPLETED, NOT_COMPLETED, UNABLE_TO_VERIFY
    evidence: str
    explanation: str
    issue: Optional[str] = None
    suggested_improvement: Optional[str] = None
    confidence: str = "HIGH"

class AIEvaluationResponse(BaseModel):
    id: int
    submission_id: int
    model_name: str
    prompt_version: str
    overall_score: float
    overall_feedback: str
    summary: str
    criteria: List[EvaluationCriterionResult]
    uncertainties: Optional[str] = None
    recommendations: Optional[List[str]] = None
    created_at: datetime

class TaskSubmissionResponse(BaseModel):
    id: int
    task_assignment_id: int
    intern_id: int
    version: int
    intern_notes: Optional[str] = None
    status: str
    created_at: datetime
    files: List[SubmissionFileResponse] = []
    ai_evaluation: Optional[AIEvaluationResponse] = None

    class Config:
        from_attributes = True

# Review & Attendance
class ReviewScheduleRequest(BaseModel):
    intern_id: int
    mentor_id: int
    task_assignment_id: Optional[int] = None
    review_type: ReviewType = ReviewType.PROGRESS
    scheduled_date: datetime
    start_time: str = "10:00"
    end_time: str = "10:30"
    timezone: str = "Asia/Kolkata"

class ReviewDecisionRequest(BaseModel):
    review_outcome: ReviewOutcome
    mentor_notes: str
    intern_responses: Optional[str] = None
    next_review_date: Optional[datetime] = None
    improvement_actions: Optional[List[Dict[str, Any]]] = None

class ReviewAttendanceCheckInRequest(BaseModel):
    verification_code: str

class ReviewNoteResponse(BaseModel):
    id: int
    notes: str
    intern_responses: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ImprovementActionResponse(BaseModel):
    id: int
    issue_description: str
    required_correction: str
    learning_resources: Optional[str] = None
    deadline: Optional[datetime] = None
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ReviewSessionResponse(BaseModel):
    id: int
    intern_id: int
    mentor_id: int
    task_assignment_id: Optional[int] = None
    review_type: ReviewType
    scheduled_date: datetime
    start_time: str
    end_time: str
    timezone: str
    meeting_url: Optional[str] = None
    meeting_status: MeetingStatus
    attendance_status: AttendanceStatus
    verification_code: Optional[str] = None
    verification_used: bool
    review_outcome: ReviewOutcome
    next_review_date: Optional[datetime] = None
    intern_name: Optional[str] = None
    mentor_name: Optional[str] = None
    notes: List[ReviewNoteResponse] = []
    improvement_actions: List[ImprovementActionResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True

# Intern Profile & Progress
class InternProfileResponse(BaseModel):
    id: int
    user_id: int
    candidate_id: str
    role_title: str
    college: Optional[str] = None
    department: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    assigned_mentor_id: Optional[int] = None
    status: InternStatus
    progress_percentage: float
    completion_eligible: bool
    completion_approved: bool
    full_name: Optional[str] = None
    email: Optional[str] = None
    mentor_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Certificates & Verification
class CertificateResponse(BaseModel):
    id: int
    certificate_id: str
    intern_id: int
    intern_name: str
    internship_role: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    completion_date: datetime
    project_summary: Optional[str] = None
    pdf_filename: str
    verification_url: str
    delivery_status: DeliveryStatus
    is_revoked: bool
    created_at: datetime

    class Config:
        from_attributes = True

class CertificateVerificationResponse(BaseModel):
    is_valid: bool
    certificate_id: str
    intern_name: Optional[str] = None
    internship_role: Optional[str] = None
    completion_date: Optional[datetime] = None
    issued_by: str = "AI-Powered Internship Mentorship Board"
    status: str  # "VERIFIED" | "REVOKED" | "NOT_FOUND"
    message: str

# Excel Import
class ExcelRowPreview(BaseModel):
    row_number: int
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    internship_role: Optional[str] = None
    assigned_task: Optional[str] = None
    task_description: Optional[str] = None
    deadline: Optional[str] = None
    mentor_email: Optional[str] = None
    is_valid: bool
    validation_errors: List[str] = []

class ExcelPreviewResponse(BaseModel):
    batch_id: int
    filename: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    column_headers: List[str]
    suggested_mappings: Dict[str, str]
    rows: List[ExcelRowPreview]

class ExcelConfirmImportRequest(BaseModel):
    batch_id: int
    column_mappings: Dict[str, str]  # e.g. {"Candidate Name": "candidate_name"}

# Dashboard Analytics
class AdminDashboardStats(BaseModel):
    total_interns: int
    active_interns: int
    completed_interns: int
    pending_submissions: int
    overdue_tasks: int
    upcoming_reviews: int
    reviews_requiring_decision: int
    pending_completion_approvals: int
    certificates_issued: int
    email_failures: int
