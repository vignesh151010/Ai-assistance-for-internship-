from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import AuditLog, User
from app.api.deps import require_admin

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("")
def list_audit_logs(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(150).all()
    results = []
    for l in logs:
        results.append({
            "id": l.id,
            "user_id": l.user_id,
            "user_email": l.user.email if l.user else "System",
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "details": l.details_json,
            "ip_address": l.ip_address,
            "created_at": l.created_at
        })
    return results
