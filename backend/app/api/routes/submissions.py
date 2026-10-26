import os
import secrets
import hashlib
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.entities import (
    User, UserRole, InternProfile, TaskAssignment, TaskStatus,
    TaskSubmission, SubmissionFile, AIEvaluation, AITaskAnalysis
)
from app.api.deps import get_current_user
from app.integrations.ai_provider import ai_service
from app.schemas.all_schemas import TaskSubmissionResponse, AIEvaluationResponse, EvaluationCriterionResult

router = APIRouter(prefix="/submissions", tags=["Submissions & AI Evaluation"])

ALLOWED_EXTENSIONS = {
    ".pdf", ".txt", ".docx", ".zip", ".png", ".jpg", ".jpeg",
    ".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json", ".md"
}

@router.post("/upload", response_model=TaskSubmissionResponse)
async def upload_task_submission(
    assignment_id: int = Form(...),
    intern_notes: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignment = db.query(TaskAssignment).filter(TaskAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task assignment not found.")

    # Permissions check
    if current_user.role == UserRole.INTERN:
        profile = db.query(InternProfile).filter(InternProfile.user_id == current_user.id).first()
        if not profile or assignment.intern_id != profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only submit tasks assigned to you.")
    else:
        profile = assignment.intern

    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one file deliverable must be uploaded.")

    # Determine submission version
    prev_submissions = db.query(TaskSubmission).filter(
        TaskSubmission.task_assignment_id == assignment.id
    ).all()
    version = len(prev_submissions) + 1

    submission = TaskSubmission(
        task_assignment_id=assignment.id,
        intern_id=profile.id,
        version=version,
        intern_notes=intern_notes or "",
        status="SUBMITTED"
    )
    db.add(submission)
    db.flush()

    files_info = []

    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension '{ext}' is not permitted. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )

        content = await file.read()
        file_size = len(content)
        if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{file.filename}' exceeds size limit (20MB)."
            )

        # Hash for integrity
        file_hash = hashlib.sha256(content).hexdigest()
        stored_filename = f"sub_{submission.id}_{secrets.token_hex(4)}_{file.filename}"
        file_path = os.path.join(settings.UPLOAD_DIR, stored_filename)

        with open(file_path, "wb") as f:
            f.write(content)

        sub_file = SubmissionFile(
            submission_id=submission.id,
            original_filename=file.filename,
            stored_filename=stored_filename,
            file_path=file_path,
            file_size_bytes=file_size,
            mime_type=file.content_type,
            file_hash=file_hash,
            scan_status="CLEAN"
        )
        db.add(sub_file)

        files_info.append({
            "original_filename": file.filename,
            "file_size_bytes": file_size,
            "mime_type": file.content_type
        })

    # Update assignment status
    assignment.status = TaskStatus.SUBMITTED

    # Trigger AI Evaluation Engine
    task = assignment.task
    analysis = db.query(AITaskAnalysis).filter(AITaskAnalysis.task_id == task.id).first()
    acceptance_criteria = analysis.acceptance_criteria_json if analysis else [
        {"criterion_name": "Functional Completeness", "description": task.raw_requirements}
    ]

    ai_result = ai_service.evaluate_submission(
        task_title=task.title,
        requirements=task.raw_requirements,
        acceptance_criteria=acceptance_criteria,
        submission_notes=intern_notes or "",
        files_info=files_info
    )

    evaluation = AIEvaluation(
        submission_id=submission.id,
        model_name="gemini-1.5-flash",
        prompt_version="v1.0",
        overall_score=ai_result["overall_score"],
        overall_feedback=ai_result["overall_feedback"],
        summary=ai_result["summary"],
        criteria_json=ai_result["criteria"],
        uncertainties=ai_result.get("uncertainties"),
        recommendations_json=ai_result.get("recommendations", [])
    )
    db.add(evaluation)
    submission.status = "EVALUATED"

    # Update intern progress
    profile.progress_percentage = min(100.0, profile.progress_percentage + 25.0)

    db.commit()
    db.refresh(submission)

    return submission

@router.get("/by-assignment/{assignment_id}", response_model=List[TaskSubmissionResponse])
def get_submissions_for_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignment = db.query(TaskAssignment).filter(TaskAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    if current_user.role == UserRole.INTERN:
        profile = db.query(InternProfile).filter(InternProfile.user_id == current_user.id).first()
        if not profile or assignment.intern_id != profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden.")

    submissions = db.query(TaskSubmission).filter(
        TaskSubmission.task_assignment_id == assignment_id
    ).order_by(TaskSubmission.version.desc()).all()

    return submissions
