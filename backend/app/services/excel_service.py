import re
from datetime import datetime
from typing import List, Dict, Any, Tuple
import openpyxl
from sqlalchemy.orm import Session
from app.models.entities import User, UserRole, InternProfile, Task, TaskAssignment, TaskStatus, ImportBatch, ImportError, AuditLog
from app.core.security import get_password_hash

EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"

class ExcelImportService:
    EXPECTED_FIELDS = {
        "candidate_name": ["candidate name", "name", "full name", "intern name", "student name"],
        "candidate_email": ["candidate email", "email", "email address", "intern email"],
        "internship_role": ["internship role", "role", "position", "domain", "track"],
        "assigned_task": ["assigned task", "task", "task title", "task name", "project title"],
        "task_description": ["task description", "description", "details", "overview"],
        "task_requirements": ["task requirements", "requirements", "acceptance criteria", "specs"],
        "expected_deliverables": ["expected deliverables", "deliverables", "outputs"],
        "required_skills": ["required skills", "skills", "technologies", "tech stack"],
        "deadline": ["deadline", "due date", "submission deadline", "task deadline"],
        "start_date": ["start date", "internship start date", "commencement date"],
        "end_date": ["end date", "internship end date", "completion deadline"],
        "mentor_email": ["assigned mentor", "mentor email", "mentor", "reviewer email"]
    }

    @staticmethod
    def inspect_and_preview(file_path: str, filename: str, admin_id: int, db: Session) -> Tuple[ImportBatch, Dict[str, Any]]:
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb.active

        headers = []
        for cell in sheet[1]:
            val = str(cell.value).strip() if cell.value is not None else ""
            if val:
                headers.append(val)

        # Detect suggested mappings
        suggested_mappings = {}
        for canonical, aliases in ExcelImportService.EXPECTED_FIELDS.items():
            for h in headers:
                clean_h = h.lower().strip()
                if clean_h in aliases:
                    suggested_mappings[h] = canonical
                    break

        # Read rows
        rows_data = []
        valid_count = 0
        invalid_count = 0

        # Query existing emails in DB for duplicate detection
        existing_emails = set(e[0].lower() for e in db.query(User.email).all())
        seen_sheet_emails = set()

        batch = ImportBatch(
            admin_id=admin_id,
            original_filename=filename,
            status="PREVIEW"
        )
        db.add(batch)
        db.flush()

        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if not any(row):
                continue  # skip completely blank rows

            row_dict = {}
            for h_idx, h in enumerate(headers):
                if h_idx < len(row):
                    row_dict[h] = row[h_idx]

            # Map to canonical
            c_name = str(row_dict.get(ExcelImportService._find_header(suggested_mappings, "candidate_name"), "") or "").strip()
            c_email = str(row_dict.get(ExcelImportService._find_header(suggested_mappings, "candidate_email"), "") or "").strip().lower()
            c_role = str(row_dict.get(ExcelImportService._find_header(suggested_mappings, "internship_role"), "") or "Software Engineering Intern").strip()
            c_task = str(row_dict.get(ExcelImportService._find_header(suggested_mappings, "assigned_task"), "") or "").strip()
            c_desc = str(row_dict.get(ExcelImportService._find_header(suggested_mappings, "task_description"), "") or "").strip()
            c_deadline = str(row_dict.get(ExcelImportService._find_header(suggested_mappings, "deadline"), "") or "").strip()

            errors = []
            if not c_name:
                errors.append("Candidate Name is required.")
            if not c_email:
                errors.append("Candidate Email is required.")
            elif not re.match(EMAIL_REGEX, c_email):
                errors.append(f"Invalid email address: '{c_email}'.")
            elif c_email in existing_emails:
                errors.append(f"Candidate email '{c_email}' is already registered in the system.")
            elif c_email in seen_sheet_emails:
                errors.append(f"Duplicate email '{c_email}' appears multiple times in this spreadsheet.")
            else:
                seen_sheet_emails.add(c_email)

            if not c_task:
                errors.append("Assigned Task title is required.")

            is_valid = len(errors) == 0
            if is_valid:
                valid_count += 1
            else:
                invalid_count += 1
                imp_err = ImportError(
                    batch_id=batch.id,
                    row_index=row_idx,
                    candidate_name=c_name,
                    candidate_email=c_email,
                    error_reason="; ".join(errors),
                    raw_data_json={k: str(v) for k, v in row_dict.items() if v is not None}
                )
                db.add(imp_err)

            rows_data.append({
                "row_number": row_idx,
                "candidate_name": c_name,
                "candidate_email": c_email,
                "internship_role": c_role,
                "assigned_task": c_task,
                "task_description": c_desc,
                "deadline": c_deadline,
                "is_valid": is_valid,
                "validation_errors": errors
            })

        batch.total_rows = len(rows_data)
        batch.valid_rows = valid_count
        batch.invalid_rows = invalid_count
        db.commit()

        return batch, {
            "batch_id": batch.id,
            "filename": filename,
            "total_rows": len(rows_data),
            "valid_rows": valid_count,
            "invalid_rows": invalid_count,
            "column_headers": headers,
            "suggested_mappings": suggested_mappings,
            "rows": rows_data
        }

    @staticmethod
    def _find_header(mappings: Dict[str, str], canonical: str) -> str:
        for header, can in mappings.items():
            if can == canonical:
                return header
        return ""

    @staticmethod
    def confirm_and_import(
        batch_id: int,
        admin_id: int,
        column_mappings: Dict[str, str],
        file_path: str,
        db: Session
    ) -> Dict[str, Any]:
        batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
        if not batch:
            raise ValueError("Import batch not found.")

        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb.active

        headers = [str(cell.value).strip() if cell.value is not None else "" for cell in sheet[1]]

        imported_count = 0
        existing_emails = set(e[0].lower() for e in db.query(User.email).all())

        # Find or create a default mentor if none assigned
        default_mentor = db.query(User).filter(User.role == UserRole.MENTOR).first()

        for row in sheet.iter_rows(min_row=2, values_only=True):
            if not any(row):
                continue

            row_dict = {headers[i]: row[i] for i in range(min(len(headers), len(row)))}

            # Extract fields according to admin confirmed mapping
            name = str(row_dict.get(ExcelImportService._find_header(column_mappings, "candidate_name"), "") or "").strip()
            email = str(row_dict.get(ExcelImportService._find_header(column_mappings, "candidate_email"), "") or "").strip().lower()
            role = str(row_dict.get(ExcelImportService._find_header(column_mappings, "internship_role"), "") or "Software Engineering Intern").strip()
            task_title = str(row_dict.get(ExcelImportService._find_header(column_mappings, "assigned_task"), "") or "").strip()
            task_desc = str(row_dict.get(ExcelImportService._find_header(column_mappings, "task_description"), "") or "Implement and test assigned deliverables.").strip()
            task_req = str(row_dict.get(ExcelImportService._find_header(column_mappings, "task_requirements"), "") or "Deliver functional, clean, well-tested code.").strip()
            deliverables = str(row_dict.get(ExcelImportService._find_header(column_mappings, "expected_deliverables"), "") or "Source files, documentation, and test logs.").strip()
            skills = str(row_dict.get(ExcelImportService._find_header(column_mappings, "required_skills"), "") or "Python, React, Git, Testing").strip()

            if not name or not email or not re.match(EMAIL_REGEX, email) or email in existing_emails or not task_title:
                continue

            # 1. Create Intern User
            default_password = "Intern@2026Secure!"
            user = User(
                email=email,
                password_hash=get_password_hash(default_password),
                full_name=name,
                role=UserRole.INTERN,
                is_active=True
            )
            db.add(user)
            db.flush()
            existing_emails.add(email)

            # 2. Create Intern Profile
            candidate_id = f"INT-{datetime.utcnow().year}-{user.id:04d}"
            mentor_id = default_mentor.id if default_mentor else None
            intern_profile = InternProfile(
                user_id=user.id,
                candidate_id=candidate_id,
                role_title=role,
                assigned_mentor_id=mentor_id,
                start_date=datetime.utcnow()
            )
            db.add(intern_profile)
            db.flush()

            # 3. Create Task
            task = Task(
                title=task_title,
                description=task_desc,
                raw_requirements=task_req,
                expected_deliverables=deliverables,
                required_skills=skills,
                created_by_id=admin_id
            )
            db.add(task)
            db.flush()

            # 4. Create Task Assignment
            deadline_dt = datetime.utcnow()
            # Default 14-day deadline
            from datetime import timedelta
            deadline_dt = deadline_dt + timedelta(days=14)

            assignment = TaskAssignment(
                task_id=task.id,
                intern_id=intern_profile.id,
                mentor_id=mentor_id,
                deadline=deadline_dt,
                status=TaskStatus.ASSIGNED
            )
            db.add(assignment)
            db.flush()

            imported_count += 1

        batch.status = "IMPORTED"
        batch.imported_count = imported_count

        audit = AuditLog(
            user_id=admin_id,
            action="EXCEL_IMPORT_CONFIRMED",
            resource_type="ImportBatch",
            resource_id=str(batch.id),
            details_json={"imported_count": imported_count, "filename": batch.original_filename}
        )
        db.add(audit)
        db.commit()

        return {
            "batch_id": batch.id,
            "status": "IMPORTED",
            "imported_count": imported_count,
            "message": f"Successfully registered {imported_count} interns and created assigned tasks."
        }
