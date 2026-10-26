# Security, Privacy & Integrity Policies

## 1. Password Hashing & Authentication
- Passwords are encrypted using native **Bcrypt** with dynamic salt generation. Plaintext passwords are never logged or stored.
- User sessions utilize **JWT Bearer tokens** signed with HMAC-SHA256 and subject to expiration intervals.

## 2. Server-Side Role-Based Access Control (RBAC)
- All privileged endpoints enforce server-side dependency checks:
  - `require_admin`: Strictly limited to users with `ADMIN` role.
  - `require_mentor`: Accessible to `MENTOR` and `ADMIN`.
  - `require_intern`: Limited to `INTERN` and `ADMIN`.
- Data isolation: Interns can only view their own submissions, task assignments, reviews, and certificates.

## 3. Secure File Upload & Storage
- Uploaded files are assigned random filenames (e.g. `sub_1_a4b9c1_project.py`) to prevent path traversal attacks.
- File extensions are restricted to an explicit whitelist (`.py`, `.js`, `.pdf`, `.zip`, `.png`, etc.).
- File size is bounded to 20MB per upload.
- Uploaded source files are treated as untrusted input and are never executed directly on the host server.

## 4. Prompt Injection & AI Safety
- Prompts are structured with strict output format requirements (JSON schemas).
- Submitted user notes and files are passed as contextual data fields rather than system prompt overrides.
- All AI responses are validated via Pydantic schemas before being saved into the database.

## 5. External Operations & Idempotency
- Email dispatch and meeting generation verify duplicate avoidance keys before triggering requests.
- Failed operations are logged with detailed error stacks in `notification_logs` for auditable inspection and bounded retry.
