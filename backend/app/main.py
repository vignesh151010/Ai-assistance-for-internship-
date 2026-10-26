import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models.entities import User, UserRole, InternProfile, MentorProfile, Task
from app.core.security import get_password_hash

# Routers
from app.api.routes import (
    auth, dashboard, imports, tasks, submissions,
    reviews, completion, certificates, interns, mentors, notifications, audit
)

logger = logging.getLogger("uvicorn.error")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise-grade AI-Powered Internship Management & Mentorship System API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(imports.router, prefix=settings.API_V1_STR)
app.include_router(tasks.router, prefix=settings.API_V1_STR)
app.include_router(submissions.router, prefix=settings.API_V1_STR)
app.include_router(reviews.router, prefix=settings.API_V1_STR)
app.include_router(completion.router, prefix=settings.API_V1_STR)
app.include_router(certificates.router, prefix=settings.API_V1_STR)
app.include_router(interns.router, prefix=settings.API_V1_STR)
app.include_router(mentors.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    logger.info("[System] Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # Seed initial Admin and Mentor accounts if empty
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == "admin@techcorp.com").first()
        if not admin_user:
            admin_user = User(
                email="admin@techcorp.com",
                password_hash=get_password_hash("Admin@2026Secure!"),
                full_name="Dr. Elena Vance (Program Director)",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin_user)
            logger.info("[Seed] Created default Administrator: admin@techcorp.com")

        mentor_user = db.query(User).filter(User.email == "mentor@techcorp.com").first()
        if not mentor_user:
            mentor_user = User(
                email="mentor@techcorp.com",
                password_hash=get_password_hash("Mentor@2026Secure!"),
                full_name="Marcus Sterling (Lead Architect)",
                role=UserRole.MENTOR,
                is_active=True
            )
            db.add(mentor_user)
            db.flush()

            mentor_profile = MentorProfile(
                user_id=mentor_user.id,
                department="Platform Engineering",
                designation="Principal Software Engineer & Lead Mentor",
                expertise="Cloud Native, React, Distributed Systems"
            )
            db.add(mentor_profile)
            logger.info("[Seed] Created default Mentor: mentor@techcorp.com")

        intern_user = db.query(User).filter(User.email == "intern@techcorp.com").first()
        if not intern_user:
            intern_user = User(
                email="intern@techcorp.com",
                password_hash=get_password_hash("Intern@2026Secure!"),
                full_name="Aarav Sharma",
                role=UserRole.INTERN,
                is_active=True
            )
            db.add(intern_user)
            db.flush()

            intern_prof = InternProfile(
                user_id=intern_user.id,
                candidate_id="INT-2026-0001",
                role_title="Full-Stack Engineering Intern",
                college="National Institute of Technology",
                department="Computer Science",
                assigned_mentor_id=mentor_user.id
            )
            db.add(intern_prof)
            logger.info("[Seed] Created default Intern: intern@techcorp.com")

        db.commit()
    except Exception as e:
        logger.error(f"[Seed Error] {e}")
        db.rollback()
    finally:
        db.close()

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
