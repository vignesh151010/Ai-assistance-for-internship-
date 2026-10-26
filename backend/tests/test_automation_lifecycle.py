import os
import sys
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend root in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base, get_db
from app.main import app
from app.models.entities import (
    User, UserRole, InternProfile, Task, TaskAssignment, TaskStatus,
    ReviewSession, ReviewOutcome, Certificate, InternWorkflow, WorkflowJob,
    WorkflowStage, JobStatus, NotificationLog
)
from app.core.security import get_password_hash
from app.services.workflow_engine import (
    WorkflowEngineService, JOB_ONBOARD_INTERN, JOB_EVALUATE_SUBMISSION,
    JOB_PROCESS_REVIEW_DECISION, JOB_CHECK_COMPLETION, JOB_ISSUE_CERTIFICATE,
    MODE_TEST, MODE_ACTIVE, MODE_PAUSED
)

TEST_DB_URL = "sqlite:///./test_automation_lifecycle.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Seed Admin
    admin = User(
        email="auto_admin@techcorp.com",
        password_hash=get_password_hash("AdminPass123!"),
        full_name="Director Auto",
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)

    # Seed Mentor
    mentor = User(
        email="auto_mentor@techcorp.com",
        password_hash=get_password_hash("MentorPass123!"),
        full_name="Lead Mentor Auto",
        role=UserRole.MENTOR,
        is_active=True
    )
    db.add(mentor)

    # Set Automation Mode to TEST_MODE
    WorkflowEngineService.set_automation_mode(db, MODE_TEST)

    db.commit()
    db.close()
    yield
    # Teardown
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_automation_lifecycle.db"):
        try:
            os.remove("./test_automation_lifecycle.db")
        except Exception:
            pass

def get_admin_token():
    res = client.post("/api/auth/login", json={"email": "auto_admin@techcorp.com", "password": "AdminPass123!"})
    return res.json()["access_token"]

def get_mentor_token():
    res = client.post("/api/auth/login", json={"email": "auto_mentor@techcorp.com", "password": "MentorPass123!"})
    return res.json()["access_token"]

def test_automation_status_and_mode_switching():
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Fetch Status
    res = client.get("/api/automation/status", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == MODE_TEST
    assert data["is_test_mode"] is True
    assert "integrations" in data

    # 2. Switch mode to ACTIVE
    res_mode = client.post("/api/automation/mode", json={"mode": "ACTIVE"}, headers=headers)
    assert res_mode.status_code == 200
    assert res_mode.json()["mode"] == "ACTIVE"

    # Switch back to TEST_MODE
    client.post("/api/automation/mode", json={"mode": "TEST_MODE"}, headers=headers)

def test_full_lifecycle_automation():
    admin_token = get_admin_token()
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    db = TestingSessionLocal()
    mentor = db.query(User).filter(User.role == UserRole.MENTOR).first()

    # 1. Create Candidate & Task Assignment
    intern_user = User(
        email="lifecycle_intern@techcorp.com",
        password_hash=get_password_hash("InternPass123!"),
        full_name="Rohan Varma",
        role=UserRole.INTERN,
        is_active=True
    )
    db.add(intern_user)
    db.flush()

    intern_prof = InternProfile(
        user_id=intern_user.id,
        candidate_id="INT-LIFE-001",
        role_title="Distributed Systems Intern",
        assigned_mentor_id=mentor.id,
        start_date=datetime.utcnow()
    )
    db.add(intern_prof)
    db.flush()

    task = Task(
        title="Microservice Resiliency Gateway",
        description="Design a distributed API gateway with circuit breaking and rate limiting.",
        raw_requirements="Implement token bucket rate limiter, fallback circuit breaker, and health check probes.",
        expected_deliverables="Source code repository, Postman collection, benchmark report."
    )
    db.add(task)
    db.flush()

    assignment = TaskAssignment(
        task_id=task.id,
        intern_id=intern_prof.id,
        mentor_id=mentor.id,
        deadline=datetime.utcnow() + timedelta(days=14),
        status=TaskStatus.ASSIGNED
    )
    db.add(assignment)
    db.flush()

    # Initialize workflow and queue onboarding job
    wf = WorkflowEngineService.get_or_create_workflow(db, intern_prof.id)
    job = WorkflowEngineService.queue_job(
        db=db,
        job_type=JOB_ONBOARD_INTERN,
        intern_id=intern_prof.id,
        task_assignment_id=assignment.id,
        priority=10,
        idempotency_key=f"onboard_test_{intern_prof.id}"
    )
    db.commit()

    # 2. Trigger Automation Engine Cycle
    run_res = client.post("/api/automation/run-now", headers=admin_headers)
    assert run_res.status_code == 200
    assert run_res.json()["success"] is True

    # 3. Verify Auto-Onboarding Results:
    db.refresh(wf)
    db.refresh(assignment)
    assert wf.current_stage == WorkflowStage.TASK_ASSIGNED
    assert assignment.is_email_sent is True

    # Check review was automatically scheduled with Google Meet URL & OTP
    review = db.query(ReviewSession).filter(ReviewSession.intern_id == intern_prof.id).first()
    assert review is not None
    assert review.meeting_url is not None
    assert "meet.google.com" in review.meeting_url
    assert review.verification_code is not None
    assert len(review.verification_code) == 6

    # 4. Verify Idempotency: Queuing the same job again does NOT create duplicate reviews
    job_dup = WorkflowEngineService.queue_job(
        db=db,
        job_type=JOB_ONBOARD_INTERN,
        intern_id=intern_prof.id,
        task_assignment_id=assignment.id,
        idempotency_key=f"onboard_test_{intern_prof.id}"
    )
    assert job_dup.id == job.id  # Same job returned
    review_count = db.query(ReviewSession).filter(ReviewSession.intern_id == intern_prof.id).count()
    assert review_count == 1  # No duplicate review created

    # 5. Intern checks in attendance using OTP
    intern_token = client.post("/api/auth/login", json={"email": "lifecycle_intern@techcorp.com", "password": "InternPass123!"}).json()["access_token"]
    intern_headers = {"Authorization": f"Bearer {intern_token}"}

    checkin_res = client.post(
        f"/api/reviews/{review.id}/check-in",
        json={"verification_code": review.verification_code},
        headers=intern_headers
    )
    assert checkin_res.status_code == 200
    assert checkin_res.json()["attendance_status"] == "VERIFIED"

    # 6. Mentor records Approval Decision
    mentor_token = get_mentor_token()
    mentor_headers = {"Authorization": f"Bearer {mentor_token}"}

    decision_res = client.post(
        f"/api/reviews/{review.id}/decision",
        json={
            "review_outcome": "APPROVED",
            "mentor_notes": "Exceeded expectations on circuit breaker resilience.",
            "intern_responses": "Walked through fallback and retry simulation."
        },
        headers=mentor_headers
    )
    assert decision_res.status_code == 200
    assert decision_res.json()["outcome"] == "APPROVED"

    # 7. Execute Automation Cycle to process decision & completion
    run_res2 = client.post("/api/automation/run-now", headers=admin_headers)
    assert run_res2.status_code == 200

    # 8. Verify Automatic Completion & Certificate Issuance
    db.refresh(intern_prof)
    cert = db.query(Certificate).filter(Certificate.intern_id == intern_prof.id).first()
    assert cert is not None
    assert cert.certificate_id.startswith("CERT-")
    assert cert.pdf_filename.endswith(".pdf")
    assert os.path.exists(cert.pdf_path)

    # 9. Verify Public Certificate Verification Portal
    verify_res = client.get(f"/api/certificates/verify/{cert.certificate_id}")
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["is_valid"] is True
    assert verify_data["intern_name"] == "Rohan Varma"

    # 10. Verify Career Guidance
    career_res = client.get(f"/api/career-guidance/{intern_prof.id}", headers=intern_headers)
    assert career_res.status_code == 200
    guidance_data = career_res.json()
    assert "guidance" in guidance_data
    assert len(guidance_data["guidance"]["resume_bullet_points"]) > 0

    db.close()

def test_settings_readiness_checklist():
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/settings/readiness", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "readiness_score" in data
    assert data["readiness_score"] >= 80
    assert len(data["checklist"]) >= 5

def test_reports_analytics_and_csv_export():
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Analytics metrics
    res_analytics = client.get("/api/reports/analytics", headers=headers)
    assert res_analytics.status_code == 200
    data = res_analytics.json()
    assert "enrollment" in data
    assert "progress_distribution" in data
    assert "automation_reliability" in data

    # CSV Export
    res_csv = client.get("/api/reports/export/interns", headers=headers)
    assert res_csv.status_code == 200
    assert "Candidate ID" in res_csv.text
