from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    User, UserRole, Task, TaskAssignment, TaskStatus,
    AITaskAnalysis, InternProfile, NotificationLog, DeliveryStatus
)
from app.api.deps import get_current_user, require_admin, require_mentor
from app.integrations.ai_provider import ai_service
from app.integrations.email_provider import email_provider, EmailTemplates
from app.schemas.all_schemas import (
    TaskCreate, TaskResponse, TaskAssignmentResponse, AITaskAnalysisResponse
)

router = APIRouter(prefix="/tasks", tags=["Tasks & AI Analysis"])

@router.get("", response_model=List[TaskResponse])
def list_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tasks = db.query(Task).order_by(Task.created_at.desc()).all()
    return tasks

@router.post("", response_model=TaskResponse)
def create_task(payload: TaskCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    task = Task(
        title=payload.title.strip(),
        description=payload.description.strip(),
        raw_requirements=payload.raw_requirements.strip(),
        expected_deliverables=payload.expected_deliverables,
        required_skills=payload.required_skills,
        created_by_id=admin.id
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.get("/assignments", response_model=List[TaskAssignmentResponse])
def list_task_assignments(
    intern_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TaskAssignment)

    if current_user.role == UserRole.INTERN:
        profile = db.query(InternProfile).filter(InternProfile.user_id == current_user.id).first()
        if not profile:
            return []
        query = query.filter(TaskAssignment.intern_id == profile.id)
    elif current_user.role == UserRole.MENTOR:
        query = query.filter(TaskAssignment.mentor_id == current_user.id)
    elif intern_id:
        query = query.filter(TaskAssignment.intern_id == intern_id)

    assignments = query.order_by(TaskAssignment.created_at.desc()).all()
    results = []
    for a in assignments:
        mentor_name = a.mentor.full_name if a.mentor else None
        res = TaskAssignmentResponse(
            id=a.id,
            task_id=a.task_id,
            intern_id=a.intern_id,
            mentor_id=a.mentor_id,
            assigned_date=a.assigned_date,
            deadline=a.deadline,
            status=a.status,
            is_email_sent=a.is_email_sent,
            email_sent_at=a.email_sent_at,
            task=TaskResponse.from_orm(a.task),
            mentor_name=mentor_name
        )
        results.append(res)
    return results

@router.get("/{task_id}/ai-analysis", response_model=AITaskAnalysisResponse)
def get_or_generate_task_analysis(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    analysis = db.query(AITaskAnalysis).filter(AITaskAnalysis.task_id == task_id).first()
    if not analysis:
        # Run AI task analysis engine
        ai_output = ai_service.analyze_task(
            title=task.title,
            description=task.description,
            requirements=task.raw_requirements
        )

        analysis = AITaskAnalysis(
            task_id=task.id,
            model_name="gemini-1.5-flash",
            prompt_version="v1.0",
            objective=ai_output["objective"],
            business_purpose=ai_output.get("business_purpose"),
            prerequisites=ai_output.get("prerequisites"),
            steps_json=ai_output["steps"],
            acceptance_criteria_json=ai_output["acceptance_criteria"],
            common_mistakes_json=ai_output.get("common_mistakes", []),
            testing_requirements_json=ai_output.get("testing_requirements", []),
            submission_instructions=ai_output.get("submission_instructions", ""),
            beginner_explanation=ai_output["beginner_explanation"]
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

    return AITaskAnalysisResponse(
        id=analysis.id,
        task_id=analysis.task_id,
        model_name=analysis.model_name,
        prompt_version=analysis.prompt_version,
        objective=analysis.objective,
        business_purpose=analysis.business_purpose,
        prerequisites=analysis.prerequisites,
        steps=analysis.steps_json,
        acceptance_criteria=analysis.acceptance_criteria_json,
        common_mistakes=analysis.common_mistakes_json,
        testing_requirements=analysis.testing_requirements_json,
        submission_instructions=analysis.submission_instructions,
        beginner_explanation=analysis.beginner_explanation,
        created_at=analysis.created_at
    )

@router.post("/assignments/{assignment_id}/send-email")
def send_assignment_email(
    assignment_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    assignment = db.query(TaskAssignment).filter(TaskAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task assignment not found.")

    intern = assignment.intern
    user = intern.user
    task = assignment.task

    # Ensure analysis exists
    analysis = db.query(AITaskAnalysis).filter(AITaskAnalysis.task_id == task.id).first()
    if not analysis:
        ai_output = ai_service.analyze_task(task.title, task.description, task.raw_requirements)
        analysis = AITaskAnalysis(
            task_id=task.id,
            objective=ai_output["objective"],
            steps_json=ai_output["steps"],
            acceptance_criteria_json=ai_output["acceptance_criteria"],
            beginner_explanation=ai_output["beginner_explanation"]
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

    deadline_str = assignment.deadline.strftime("%B %d, %Y") if assignment.deadline else "Within 14 days"
    html_content = EmailTemplates.task_assigned_html(
        intern_name=user.full_name,
        task_title=task.title,
        objective=analysis.objective,
        steps=analysis.steps_json,
        deadline_str=deadline_str
    )

    send_res = email_provider.send_email(
        recipient_email=user.email,
        recipient_name=user.full_name,
        subject=f"Internship Task Assignment: {task.title}",
        html_content=html_content
    )

    log_entry = NotificationLog(
        recipient_email=user.email,
        recipient_name=user.full_name,
        notification_type="TASK_ASSIGNED",
        subject=f"Internship Task Assignment: {task.title}",
        body_html=html_content,
        provider="mock" if isinstance(email_provider, type(email_provider)) else "smtp",
        provider_message_id=send_res.message_id,
        status=DeliveryStatus.SENT if send_res.success else DeliveryStatus.FAILED,
        error_message=send_res.error
    )
    db.add(log_entry)

    if send_res.success:
        assignment.is_email_sent = True
        assignment.email_sent_at = datetime.utcnow()

    db.commit()

    return {
        "success": send_res.success,
        "message": f"Task assignment email sent to {user.email}.",
        "delivery_status": "SENT" if send_res.success else "FAILED"
    }
