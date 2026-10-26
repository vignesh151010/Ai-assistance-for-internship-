# Architecture & Technical Design

## 1. System Architecture Overview

The **AI-Powered Internship Management & Mentorship System** is built with a decoupled client-server architecture:

```
[ React 18 + Vite SPA Client ]
       |  (REST API / JWT Bearer)
       v
[ FastAPI Python Backend ]
  ├── Security & RBAC Guards (Admin, Mentor, Intern)
  ├── Excel Ingestion & Validation Pipeline
  ├── AI Task Analysis & Evidence Evaluation Engine
  ├── Notification & Idempotent Email Queue
  ├── Google Calendar & Meet Conference Service
  └── ReportLab PDF Certificate Generation Engine
       |
       +---> [ MySQL 8.0 Relational Database / SQLite Fallback ]
       +---> [ Secure File Vault (Uploads & Deliverables) ]
       +---> [ External Cloud APIs (Gemini / SMTP / Google OAuth) ]
```

---

## 2. Relational Database Design

The relational schema is normalized and adheres to strict referential integrity across MySQL 8.0:

- **Identity & RBAC**: `users`, `intern_profiles`, `mentor_profiles`
- **Curriculum & Tasks**: `tasks`, `task_assignments`, `ai_task_analyses`
- **Deliverables & Versioning**: `task_submissions`, `submission_files`
- **AI Evaluation**: `ai_evaluations` (stores criterion-by-criterion status, evidence, explanations)
- **Review & Attendance**: `review_sessions`, `review_notes`, `improvement_actions`
- **Credentials & Public Registry**: `certificates` (PDF storage references, unique SHA hashes)
- **Operational Auditing**: `notification_logs`, `import_batches`, `import_errors`, `audit_logs`

---

## 3. AI Integration Boundaries & Safety Controls

1. **Configurable Provider Interface**: Supports Google Gemini, OpenAI, or a deterministic offline Mock provider.
2. **Strict Schema Validation**: Outputs from AI are parsed into Pydantic models before saving to the database.
3. **Requirement Integrity**: The system strictly separates company-defined requirements from AI-suggested recommendations.
4. **Human Authority**: AI evaluation scores and suggested review outcomes are treated as decision support; mentors retain authoritative decision power.
