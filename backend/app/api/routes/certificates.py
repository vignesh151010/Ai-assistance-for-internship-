import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import User, UserRole, Certificate, InternProfile
from app.api.deps import get_current_user
from app.schemas.all_schemas import CertificateResponse, CertificateVerificationResponse

router = APIRouter(prefix="/certificates", tags=["Certificates & Verification"])

@router.get("", response_model=List[CertificateResponse])
def list_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Certificate)
    if current_user.role == UserRole.INTERN:
        profile = db.query(InternProfile).filter(InternProfile.user_id == current_user.id).first()
        if not profile:
            return []
        query = query.filter(Certificate.intern_id == profile.id)

    certs = query.order_by(Certificate.created_at.desc()).all()
    return certs

@router.get("/{cert_id}/download")
def download_certificate(
    cert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cert = db.query(Certificate).filter(Certificate.certificate_id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found.")

    if current_user.role == UserRole.INTERN:
        profile = db.query(InternProfile).filter(InternProfile.user_id == current_user.id).first()
        if not profile or cert.intern_id != profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if not os.path.exists(cert.pdf_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate PDF file not found on server.")

    return FileResponse(
        path=cert.pdf_path,
        filename=cert.pdf_filename,
        media_type="application/pdf"
    )

@router.get("/verify/{cert_id}", response_model=CertificateVerificationResponse)
def verify_certificate_public(cert_id: str, db: Session = Depends(get_db)):
    """
    Public verification endpoint to authenticate a certificate by ID.
    Does NOT require authentication to allow external employers to verify.
    """
    clean_id = cert_id.strip()
    cert = db.query(Certificate).filter(Certificate.certificate_id == clean_id).first()
    if not cert:
        return CertificateVerificationResponse(
            is_valid=False,
            certificate_id=clean_id,
            status="NOT_FOUND",
            message="No active credential matches this Certificate ID."
        )

    if cert.is_revoked:
        return CertificateVerificationResponse(
            is_valid=False,
            certificate_id=clean_id,
            intern_name=cert.intern_name,
            internship_role=cert.internship_role,
            completion_date=cert.completion_date,
            status="REVOKED",
            message=f"This certificate was revoked. Reason: {cert.revocation_reason or 'Policy non-compliance'}."
        )

    return CertificateVerificationResponse(
        is_valid=True,
        certificate_id=clean_id,
        intern_name=cert.intern_name,
        internship_role=cert.internship_role,
        completion_date=cert.completion_date,
        status="VERIFIED",
        message="This is an official, verified certificate issued by the AI-Powered Internship Mentorship Board."
    )
