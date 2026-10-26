from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import NotificationLog, DeliveryStatus, User
from app.api.deps import require_admin
from app.integrations.email_provider import email_provider

router = APIRouter(prefix="/notifications", tags=["Notifications & Queue"])

@router.get("")
def list_notification_logs(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    logs = db.query(NotificationLog).order_by(NotificationLog.created_at.desc()).limit(100).all()
    return logs

@router.post("/{log_id}/retry")
def retry_notification(
    log_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    log_entry = db.query(NotificationLog).filter(NotificationLog.id == log_id).first()
    if not log_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification log not found.")

    res = email_provider.send_email(
        recipient_email=log_entry.recipient_email,
        recipient_name=log_entry.recipient_name,
        subject=log_entry.subject,
        html_content=log_entry.body_html
    )

    log_entry.retry_count += 1
    log_entry.last_attempt_at = datetime.utcnow()
    if res.success:
        log_entry.status = DeliveryStatus.SENT
        log_entry.error_message = None
        log_entry.provider_message_id = res.message_id
    else:
        log_entry.status = DeliveryStatus.FAILED
        log_entry.error_message = res.error

    db.commit()

    return {
        "success": res.success,
        "status": log_entry.status.value,
        "retry_count": log_entry.retry_count,
        "message": "Retry executed successfully." if res.success else f"Retry failed: {res.error}"
    }
