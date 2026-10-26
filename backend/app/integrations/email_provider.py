import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from datetime import datetime
import os
import uuid
import logging
from typing import Optional, List, Dict, Any
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

class EmailResult:
    def __init__(self, success: bool, message_id: Optional[str] = None, error: Optional[str] = None):
        self.success = success
        self.message_id = message_id or (str(uuid.uuid4()) if success else None)
        self.error = error

class BaseEmailProvider:
    def send_email(
        self, recipient_email: str, recipient_name: str, subject: str,
        html_content: str, attachment_path: Optional[str] = None
    ) -> EmailResult:
        raise NotImplementedError

class MockEmailProvider(BaseEmailProvider):
    """
    Mock email provider that simulates delivery, validates payload structure,
    logs the event, and records delivery status without requiring external SMTP credentials.
    """
    def send_email(
        self, recipient_email: str, recipient_name: str, subject: str,
        html_content: str, attachment_path: Optional[str] = None
    ) -> EmailResult:
        logger.info(
            f"[MOCK EMAIL DISPATCHED] To: {recipient_name} <{recipient_email}> | Subject: '{subject}' | "
            f"Attachment: {attachment_path or 'None'}"
        )
        return EmailResult(
            success=True,
            message_id=f"mock-msg-{uuid.uuid4().hex[:12]}",
            error=None
        )

class SMTPEmailProvider(BaseEmailProvider):
    """Real SMTP email provider for sending actual emails via Gmail/Custom SMTP."""
    def __init__(self, host: str, port: int, user: str, password: str, sender: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.sender = sender

    def send_email(
        self, recipient_email: str, recipient_name: str, subject: str,
        html_content: str, attachment_path: Optional[str] = None
    ) -> EmailResult:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Internship Office <{self.sender}>"
            msg["To"] = f"{recipient_name} <{recipient_email}>"

            part = MIMEText(html_content, "html")
            msg.attach(part)

            if attachment_path and os.path.exists(attachment_path):
                with open(attachment_path, "rb") as f:
                    attach = MIMEApplication(f.read(), _subtype="pdf")
                    attach.add_header("Content-Disposition", "attachment", filename=os.path.basename(attachment_path))
                    msg.attach(attach)

            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                if self.user and self.password:
                    server.login(self.user, self.password)
                server.sendmail(self.sender, [recipient_email], msg.as_string())

            return EmailResult(success=True, message_id=f"smtp-{uuid.uuid4().hex[:12]}")
        except Exception as e:
            logger.error(f"[SMTP Error] Failed to send email to {recipient_email}: {e}")
            return EmailResult(success=False, error=str(e))

def get_email_provider() -> BaseEmailProvider:
    if settings.EMAIL_PROVIDER == "smtp" and settings.SMTP_USER and settings.SMTP_PASSWORD:
        return SMTPEmailProvider(
            host=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            user=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            sender=settings.EMAIL_SENDER
        )
    return MockEmailProvider()

email_provider = get_email_provider()

# Professional HTML Templates
class EmailTemplates:
    @staticmethod
    def task_assigned_html(intern_name: str, task_title: str, objective: str, steps: List[Dict[str, Any]], deadline_str: str) -> str:
        steps_html = "".join([
            f"<li style='margin-bottom: 8px;'><strong>Step {s.get('step_number', i+1)}: {s.get('title', '')}</strong><br/>"
            f"<span style='color: #4b5563;'>{s.get('description', '')}</span></li>"
            for i, s in enumerate(steps)
        ])
        return f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #4f46e5, #3b82f6); padding: 20px; border-radius: 8px; color: white; text-align: center;">
                <h1 style="margin: 0; font-size: 22px;">New Internship Task Assigned</h1>
            </div>
            <p style="font-size: 16px; color: #1f2937; margin-top: 20px;">Dear <strong>{intern_name}</strong>,</p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                You have been assigned a new project milestone: <strong>{task_title}</strong>. Below is your detailed, AI-analyzed implementation roadmap to guide your development.
            </p>
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin-top: 0; color: #1e1b4b; font-size: 16px;">Core Objective:</h3>
                <p style="color: #374151; margin-bottom: 0;">{objective}</p>
            </div>
            <h3 style="color: #1e1b4b; font-size: 16px;">Recommended Implementation Plan:</h3>
            <ol style="padding-left: 20px;">
                {steps_html}
            </ol>
            <div style="border-left: 4px solid #4f46e5; padding-left: 12px; margin: 20px 0;">
                <p style="margin: 0; color: #1f2937;"><strong>Submission Deadline:</strong> <span style="color: #dc2626;">{deadline_str}</span></p>
            </div>
            <p style="color: #4b5563; font-size: 14px;">Log in to your intern portal to view full requirements, download starter materials, and submit your deliverables.</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">AI-Powered Internship Management & Mentorship System &bull; Confidential</p>
        </div>
        """

    @staticmethod
    def review_scheduled_html(intern_name: str, mentor_name: str, date_str: str, time_str: str, meeting_url: str, verification_code: str) -> str:
        return f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #0284c7, #2563eb); padding: 20px; border-radius: 8px; color: white; text-align: center;">
                <h1 style="margin: 0; font-size: 22px;">Review Session Scheduled</h1>
            </div>
            <p style="font-size: 16px; color: #1f2937; margin-top: 20px;">Hello <strong>{intern_name}</strong>,</p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                Your milestone review session with mentor <strong>{mentor_name}</strong> has been scheduled.
            </p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 4px 0; color: #166534;"><strong>Date:</strong> {date_str}</p>
                <p style="margin: 4px 0; color: #166534;"><strong>Time:</strong> {time_str} (Asia/Kolkata)</p>
                <p style="margin: 4px 0; color: #166534;"><strong>Google Meet Link:</strong> <a href="{meeting_url}" style="color: #2563eb; font-weight: bold;">{meeting_url}</a></p>
            </div>
            <div style="background-color: #fefce8; border: 1px solid #fef08a; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h4 style="margin: 0 0 6px 0; color: #854d0e;">Attendance Verification Code</h4>
                <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #a16207; margin: 0;">{verification_code}</p>
                <p style="font-size: 12px; color: #713f12; margin-top: 6px;">Enter this secure 6-digit code in your portal during the meeting to record your verified attendance.</p>
            </div>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">AI-Powered Internship Management & Mentorship System</p>
        </div>
        """

    @staticmethod
    def improvement_plan_html(intern_name: str, outcome: str, mentor_notes: str, improvements: List[Dict[str, Any]], next_deadline: str) -> str:
        items_html = "".join([
            f"<li style='margin-bottom: 8px;'><strong>Issue:</strong> {it.get('issue_description', '')}<br/>"
            f"<strong>Required Action:</strong> <span style='color: #4b5563;'>{it.get('required_correction', '')}</span></li>"
            for it in improvements
        ])
        return f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #d97706, #b45309); padding: 20px; border-radius: 8px; color: white; text-align: center;">
                <h1 style="margin: 0; font-size: 22px;">Review Outcome & Improvement Plan</h1>
            </div>
            <p style="font-size: 16px; color: #1f2937; margin-top: 20px;">Dear <strong>{intern_name}</strong>,</p>
            <p style="color: #374151; font-size: 15px;">Your mentor recorded the review decision: <strong>{outcome}</strong>.</p>
            <div style="background-color: #f3f4f6; padding: 14px; border-radius: 8px; margin: 12px 0;">
                <h4 style="margin: 0 0 6px 0; color: #1f2937;">Mentor Notes:</h4>
                <p style="margin: 0; color: #4b5563;">{mentor_notes}</p>
            </div>
            <h4 style="color: #1f2937;">Required Improvements:</h4>
            <ul style="padding-left: 20px;">
                {items_html or '<li>Address comments discussed during the live session.</li>'}
            </ul>
            <p><strong>Next Submission Deadline:</strong> <span style="color: #dc2626;">{next_deadline}</span></p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">AI-Powered Internship Management & Mentorship System</p>
        </div>
        """

    @staticmethod
    def completion_and_certificate_html(intern_name: str, role: str, cert_id: str, verify_url: str, guidance: Dict[str, Any]) -> str:
        bullets = "".join([f"<li style='margin-bottom: 6px;'>{b}</li>" for b in guidance.get("resume_bullet_points", [])])
        return f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 20px; border-radius: 8px; color: white; text-align: center;">
                <h1 style="margin: 0; font-size: 22px;">Congratulations on Internship Completion!</h1>
            </div>
            <p style="font-size: 16px; color: #1f2937; margin-top: 20px;">Dear <strong>{intern_name}</strong>,</p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                We are thrilled to announce that you have successfully fulfilled all criteria for your <strong>{role}</strong> internship program!
            </p>
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 4px 0; color: #065f46;"><strong>Certificate ID:</strong> {cert_id}</p>
                <p style="margin: 4px 0; color: #065f46;"><strong>Verification Link:</strong> <a href="{verify_url}" style="color: #059669; font-weight: bold;">{verify_url}</a></p>
                <p style="margin: 4px 0; color: #047857; font-size: 13px;">Your official PDF Certificate is attached to this email and accessible in your portal.</p>
            </div>
            <h3 style="color: #1e1b4b; font-size: 16px;">Tailored Career & Resume Guidance:</h3>
            <p style="color: #4b5563; font-size: 14px;">Here are recommended resume impact statements based on your verified project contributions:</p>
            <ul style="padding-left: 20px; color: #374151;">
                {bullets}
            </ul>
            <p style="color: #374151; font-size: 14px;">We wish you tremendous success in your professional engineering career!</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">AI-Powered Internship Management & Mentorship System &bull; Issued Officially</p>
        </div>
        """
