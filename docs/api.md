# REST API Reference

The FastAPI backend provides interactive OpenAPI documentation available at `http://localhost:8000/docs`.

## Key Endpoint Groups

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate with email and password; returns JWT token with role.
- `GET /api/auth/me`: Retrieve current session user details.
- `POST /api/auth/register`: Create a new user account.

### Dashboard Analytics (`/api/dashboard`)
- `GET /api/dashboard/admin-stats`: Live metrics from database records (Admin only).
- `GET /api/dashboard/mentor-stats`: Intern and review counts for mentor.
- `GET /api/dashboard/intern-stats`: Milestone progress and completion status for intern.

### Excel Ingestion (`/api/imports`)
- `POST /api/imports/preview`: Upload `.xlsx` spreadsheet, parse headers, validate rows, check duplicates.
- `POST /api/imports/confirm`: Confirm mapped columns and persist validated candidates into database.
- `GET /api/imports/batches`: List previous import batches.

### Tasks & AI Analysis (`/api/tasks`)
- `GET /api/tasks`: List approved task specifications.
- `POST /api/tasks`: Create new task specification (Admin only).
- `GET /api/tasks/assignments`: List task assignments for intern or mentor.
- `GET /api/tasks/{task_id}/ai-analysis`: Generate or fetch AI task roadmap and acceptance criteria.
- `POST /api/tasks/assignments/{id}/send-email`: Send personalized task assignment onboarding email.

### Submissions & AI Evaluation (`/api/submissions`)
- `POST /api/submissions/upload`: Upload multi-file deliverable archive; triggers AI Evaluation Engine.
- `GET /api/submissions/by-assignment/{id}`: Retrieve version history and evaluation report.

### Review Meetings & Attendance (`/api/reviews`)
- `POST /api/reviews/schedule`: Create Google Meet meeting with 6-digit OTP verification code.
- `GET /api/reviews`: List scheduled and completed reviews.
- `POST /api/reviews/{id}/check-in`: Intern submits 6-digit verification code to confirm attendance.
- `POST /api/reviews/{id}/ai-assist`: Ask AI assistant for technical explanation or probing questions.
- `POST /api/reviews/{id}/decision`: Record mentor decision, notes, and assign improvement action plan.

### Completion & Certificates (`/api/completion` & `/api/certificates`)
- `GET /api/completion/eligibility/{intern_id}`: Check tasks, reviews, and attendance criteria.
- `POST /api/completion/approve/{intern_id}`: Admin approves completion and generates ReportLab PDF certificate.
- `GET /api/certificates`: List issued certificates.
- `GET /api/certificates/{cert_id}/download`: Download high-resolution vector PDF certificate.
- `GET /api/certificates/verify/{cert_id}`: Public certificate verification endpoint (no authentication required).
