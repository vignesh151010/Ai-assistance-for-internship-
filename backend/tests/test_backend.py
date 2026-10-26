import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from openpyxl import Workbook

from app.core.database import Base, get_db
from app.main import app
from app.models.entities import User, UserRole, InternProfile, Task, TaskAssignment, TaskStatus, ReviewSession, Certificate
from app.core.security import get_password_hash
from app.integrations.certificate_generator import certificate_generator

# Use in-memory SQLite for high-speed isolated tests
TEST_DB_URL = "sqlite:///./test_internship_system.db"
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
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Seed Admin
    admin = User(
        email="test_admin@techcorp.com",
        password_hash=get_password_hash("TestAdmin123!"),
        full_name="Dr. Test Director",
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)

    # Seed Mentor
    mentor = User(
        email="test_mentor@techcorp.com",
        password_hash=get_password_hash("TestMentor123!"),
        full_name="Alex River (Lead Mentor)",
        role=UserRole.MENTOR,
        is_active=True
    )
    db.add(mentor)

    # Seed Intern
    intern_user = User(
        email="test_intern@techcorp.com",
        password_hash=get_password_hash("TestIntern123!"),
        full_name="Priya Tester",
        role=UserRole.INTERN,
        is_active=True
    )
    db.add(intern_user)
    db.flush()

    intern_profile = InternProfile(
        user_id=intern_user.id,
        candidate_id="INT-TEST-0001",
        role_title="Software Intern",
        assigned_mentor_id=mentor.id
    )
    db.add(intern_profile)
    db.commit()
    db.close()

    yield

    # Teardown
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_internship_system.db"):
        try:
            os.remove("./test_internship_system.db")
        except Exception:
            pass


def get_token(email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def test_auth_and_rbac():
    # Invalid password
    bad_res = client.post("/api/auth/login", json={"email": "test_admin@techcorp.com", "password": "WrongPassword"})
    assert bad_res.status_code == 401

    # Valid Admin Login
    admin_token = get_token("test_admin@techcorp.com", "TestAdmin123!")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin access dashboard
    stats_res = client.get("/api/dashboard/admin-stats", headers=headers)
    assert stats_res.status_code == 200
    assert "total_interns" in stats_res.json()

    # Intern Login and RBAC check
    intern_token = get_token("test_intern@techcorp.com", "TestIntern123!")
    intern_headers = {"Authorization": f"Bearer {intern_token}"}

    # Intern trying to access admin stats should get 403 Forbidden
    forbidden_res = client.get("/api/dashboard/admin-stats", headers=intern_headers)
    assert forbidden_res.status_code == 403


def test_task_creation_and_ai_analysis():
    admin_token = get_token("test_admin@techcorp.com", "TestAdmin123!")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create task
    task_res = client.post("/api/tasks", headers=headers, json={
        "title": "Build Secure REST Authentication",
        "description": "Develop JWT-based authentication with bcrypt password hashing.",
        "raw_requirements": "Implement login, register, token refresh, and unit tests.",
        "expected_deliverables": "Python FastAPI router and test files.",
        "required_skills": "Python, FastAPI, JWT"
    })
    assert task_res.status_code == 200
    task_data = task_res.json()
    task_id = task_data["id"]

    # Request AI task analysis
    ai_res = client.get(f"/api/tasks/{task_id}/ai-analysis", headers=headers)
    assert ai_res.status_code == 200
    ai_data = ai_res.json()

    assert "objective" in ai_data
    assert len(ai_data["steps"]) >= 4
    assert len(ai_data["acceptance_criteria"]) >= 2
    assert "beginner_explanation" in ai_data


def test_excel_preview_and_duplicate_detection(tmp_path):
    admin_token = get_token("test_admin@techcorp.com", "TestAdmin123!")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Build temporary test Excel
    excel_path = tmp_path / "test_import.xlsx"
    wb = Workbook()
    ws = wb.active
    ws.append(["Candidate Name", "Candidate Email", "Internship Role", "Assigned Task", "Task Description"])
    # Row with valid candidate
    ws.append(["Kiran Patel", "kiran.patel@testcorp.com", "Full Stack Intern", "Microservice Task", "Build service"])
    # Row with duplicate of already seeded email
    ws.append(["Duplicate Person", "test_intern@techcorp.com", "DevOps Intern", "Pipeline Task", "Build pipeline"])
    wb.save(excel_path)

    with open(excel_path, "rb") as f:
        res = client.post("/api/imports/preview", headers=headers, files={"file": ("test_import.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})

    assert res.status_code == 200
    preview = res.json()
    assert preview["total_rows"] == 2
    assert preview["valid_rows"] == 1
    assert preview["invalid_rows"] == 1
    assert any("already registered" in err for row in preview["rows"] for err in row["validation_errors"])


def test_review_scheduling_otp_and_attendance():
    mentor_token = get_token("test_mentor@techcorp.com", "TestMentor123!")
    headers = {"Authorization": f"Bearer {mentor_token}"}

    # Schedule review
    db = TestingSessionLocal()
    intern = db.query(InternProfile).first()
    mentor = db.query(User).filter(User.role == UserRole.MENTOR).first()
    db.close()

    schedule_payload = {
        "intern_id": intern.id,
        "mentor_id": mentor.id,
        "review_type": "PROGRESS",
        "scheduled_date": "2026-11-10T10:00:00",
        "start_time": "10:00",
        "end_time": "10:30",
        "timezone": "Asia/Kolkata"
    }

    sched_res = client.post("/api/reviews/schedule", headers=headers, json=schedule_payload)
    assert sched_res.status_code == 200
    review_data = sched_res.json()
    review_id = review_data["id"]
    otp_code = review_data["verification_code"]
    assert len(otp_code) == 6
    assert "meet.google.com" in review_data["meeting_url"]

    # Intern Check-in with valid OTP code
    intern_token = get_token("test_intern@techcorp.com", "TestIntern123!")
    intern_headers = {"Authorization": f"Bearer {intern_token}"}

    checkin_res = client.post(
        f"/api/reviews/{review_id}/check-in",
        headers=intern_headers,
        json={"verification_code": otp_code}
    )
    assert checkin_res.status_code == 200
    assert checkin_res.json()["attendance_status"] == "VERIFIED"

    # Mentor Decision Recording
    decision_payload = {
        "review_outcome": "APPROVED",
        "mentor_notes": "Exceeded expectations on architectural modularity and test coverage.",
        "intern_responses": "Understood and agreed with the caching advice."
    }
    dec_res = client.post(f"/api/reviews/{review_id}/decision", headers=headers, json=decision_payload)
    assert dec_res.status_code == 200
    assert dec_res.json()["outcome"] == "APPROVED"


def test_completion_approval_and_certificate_generation():
    admin_token = get_token("test_admin@techcorp.com", "TestAdmin123!")
    headers = {"Authorization": f"Bearer {admin_token}"}

    db = TestingSessionLocal()
    intern = db.query(InternProfile).first()
    db.close()

    # Check eligibility endpoint
    elig_res = client.get(f"/api/completion/eligibility/{intern.id}", headers=headers)
    assert elig_res.status_code == 200

    # Admin approve and issue certificate
    issue_res = client.post(f"/api/completion/approve/{intern.id}", headers=headers)
    assert issue_res.status_code == 200
    issue_data = issue_res.json()
    cert_id = issue_data["certificate_id"]
    assert cert_id.startswith("CERT-")

    # Public Verification Portal (No Auth required)
    verify_res = client.get(f"/api/certificates/verify/{cert_id}")
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["is_valid"] == True
    assert verify_data["status"] == "VERIFIED"
    assert verify_data["certificate_id"] == cert_id
