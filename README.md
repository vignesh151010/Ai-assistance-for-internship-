# AI-Powered Internship Management & Mentorship System

An enterprise-grade, secure, database-driven web application designed to automate the entire internship lifecycle: candidate registration, Excel batch ingestion, AI task analysis, automated email notifications, Google Meet scheduling with OTP attendance verification, project deliverables versioning, evidence-based AI evaluations, live mentor review assistance, completion approvals, and vector PDF certificate generation.

---

## 🌟 Key Features

### 1. Excel Batch Ingestion & Validation
- **Spreadsheet Parsing**: Upload `.xlsx` spreadsheets with candidate names, emails, roles, tasks, deadlines, and mentor assignments.
- **Dynamic Column Mapping**: Intelligent header recognition with interactive mapping selector.
- **Row-Level Validation**: Real-time detection of missing required fields, malformed emails, and duplicate candidates (within sheet & database).
- **Explicit Confirmation**: Preview modal with error breakdown before committing records to the database.

### 2. AI Task Analysis Engine
- **Structured Decomposition**: Breaks down assigned tasks into technical objectives, business context, prerequisites, and a beginner-friendly roadmap.
- **Strict Acceptance Criteria**: Separates mandatory requirements from recommended enhancements.
- **Modular AI Interface**: Seamlessly switch between Google Gemini (`gemini-1.5-flash` / `gemini-1.5-pro`), OpenAI, or a high-fidelity deterministic Mock provider.

### 3. Automated Personalized Email Notifications
- **Automated Dispatch**: Personalized task assignment emails with full step-by-step roadmaps, deadlines, and deliverable instructions.
- **Review Scheduling Notices**: Invitations with confirmed Google Meet URLs and 6-digit OTP identity check-in codes.
- **Improvement Action Plans**: Post-review summaries detailing mentor notes, required corrections, and new deadlines.
- **Graduation & Credentials**: Completion emails with vector PDF certificate attachments and tailored career impact statements.
- **Reliability & Queue**: Full delivery status tracking (`QUEUED`, `SENT`, `FAILED`, `DELIVERED`) with idempotent retry controls.

### 4. Google Meet Review Scheduling & Secure Attendance
- **Calendar & Meet Integration**: Creates Google Calendar conferences with Google Meet links, supporting custom timezones (`Asia/Kolkata` default).
- **Fallback Sandbox Mode**: When Google Cloud OAuth credentials are unconfigured, safely provisions sandbox meet rooms with actionable setup instructions.
- **OTP Identity Check-In**: Generates time-limited 6-digit verification codes for interns to verify identity upon meeting entry.

### 5. Multi-File Project Submissions & AI Evaluation
- **Deliverables Vault**: Upload multi-file submissions (`.py`, `.js`, `.pdf`, `.zip`, `.png`, etc.) with randomized filenames, SHA-256 hashes, and size limits.
- **Submission Versioning**: Preserves complete history (`v1`, `v2`, etc.).
- **Evidence-Based AI Evaluation**: Compares submitted deliverables against acceptance criteria, yielding criterion-by-criterion status (`COMPLETED`, `PARTIALLY_COMPLETED`, `NOT_COMPLETED`), evidence citations, explanations, and suggested improvements.

### 6. Live Mentor Review Assistant & Decision Workspace
- **Side-by-Side Review Workspace**: View intern profile, submitted files, AI evaluation report, and previous history simultaneously.
- **Live AI Assistant**: Ask AI to clarify technical issues or formulate probing questions during the meeting.
- **Authoritative Human Authority**: Mentors explicitly choose outcomes (`APPROVED`, `APPROVED_WITH_MINOR_CHANGES`, `CHANGES_REQUIRED`, `RESUBMISSION_REQUIRED`) and assign structured improvement actions.

### 7. Accredited PDF Certificates & Public Verification
- **Vector PDF Generator**: ReportLab engine generating vector landscape certificates with corporate branding, recipient details, gold security seal emblem, and unique verification hashes (`CERT-YYYY-XXXX-XXXX`).
- **Public Verification Portal**: Accessible at `/verify-certificate/:certId` allowing employers to verify credentials without authentication.

---

## 🛠 Technology Stack

- **Frontend**: React 18, Vite, React Router v6, Axios, Lucide Icons, Vanilla CSS Design System.
- **Backend**: Python 3.10, FastAPI, Pydantic v2, SQLAlchemy 2.0 ORM.
- **Database**: MySQL 8.0 (with automatic zero-config SQLite fallback for instant local evaluation).
- **Security**: Direct Bcrypt password hashing, JWT Bearer tokens, Role-Based Access Control (`ADMIN`, `MENTOR`, `INTERN`).
- **Document & PDF**: OpenPyXL, ReportLab.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- (Optional) MySQL 8.0 service

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be live at: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
# Open a new terminal in the frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite development server
npm run dev
```
Frontend web application will be accessible at: `http://localhost:5173`

---

## 🔑 Default Evaluation Accounts

The system automatically initializes default accounts upon first startup:

| Role | Email | Password | Full Name |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@techcorp.com` | `Admin@2026Secure!` | Dr. Elena Vance |
| **Technical Mentor** | `mentor@techcorp.com` | `Mentor@2026Secure!` | Marcus Sterling |
| **Intern** | `intern@techcorp.com` | `Intern@2026Secure!` | Aarav Sharma |

*Tip: The login page includes 1-click quick evaluation buttons to log in as any role instantly!*

---

## 🧪 Running Automated Tests

Run the backend Pytest test suite:
```bash
cd backend
venv\Scripts\pytest tests/test_backend.py -v
```

All 5 core suites verify:
- Authentication & RBAC guards
- Task creation & AI task analysis schemas
- Excel preview, duplicate candidate detection & validation
- Review scheduling with Google Meet links & OTP check-in
- Internship completion approval & vector PDF certificate generation

---

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/routes/          # FastAPI routers (auth, tasks, reviews, etc.)
│   │   ├── core/                # Database engine, security, config
│   │   ├── models/              # SQLAlchemy relational models
│   │   ├── schemas/             # Pydantic v2 validation models
│   │   ├── services/            # Excel parser & validation services
│   │   ├── integrations/        # AI provider, email dispatch, PDF generator
│   │   └── main.py              # Application entrypoint
│   ├── tests/                   # Pytest automated test suite
│   └── venv/                    # Virtual environment
├── frontend/
│   ├── src/
│   │   ├── components/          # Navbar, Sidebar, ProtectedRoute
│   │   ├── context/             # AuthContext session management
│   │   ├── pages/               # Admin, Mentor, Intern, and Public views
│   │   ├── services/            # Axios API client
│   │   └── index.css            # Modern CSS tokens & design system
│   └── package.json
├── docs/                        # Setup, architecture, API, security guides
├── scripts/
│   ├── generate_sample_excel.py # Generates sample .xlsx for candidate ingestion
│   ├── create_admin.py          # CLI admin creation tool
│   └── database_setup.py        # MySQL synchronization script
├── .env.example                 # Configuration template
└── sample_interns_tasks.xlsx    # Sample candidate batch spreadsheet
```

---

## 📄 License
Confidential enterprise software &bull; All rights reserved.
