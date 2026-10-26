import os
import secrets
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.entities import User, ImportBatch
from app.api.deps import require_admin
from app.services.excel_service import ExcelImportService
from app.schemas.all_schemas import ExcelPreviewResponse, ExcelConfirmImportRequest

router = APIRouter(prefix="/imports", tags=["Excel Import"])

# Temporary cache for uploaded files pending confirmation
UPLOADED_CACHE = {}

@router.get("/download-template")
def download_excel_template():
    """Download ready-to-use candidate task assignment Excel template (.xlsx)"""
    candidate_paths = [
        os.path.abspath(os.path.join(settings.BASE_DIR, "candidate_task_assignment.xlsx")),
        os.path.abspath(os.path.join(settings.BASE_DIR, "..", "candidate_task_assignment.xlsx")),
        os.path.abspath(os.path.join(os.getcwd(), "candidate_task_assignment.xlsx")),
    ]
    for path in candidate_paths:
        if os.path.exists(path):
            return FileResponse(
                path=path,
                filename="candidate_task_assignment.xlsx",
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template file not found.")

@router.get("/download-xml-template")
def download_xml_template():
    """Download candidate task assignment XML Spreadsheet (.xml)"""
    candidate_paths = [
        os.path.abspath(os.path.join(settings.BASE_DIR, "candidate_task_assignment.xml")),
        os.path.abspath(os.path.join(settings.BASE_DIR, "..", "candidate_task_assignment.xml")),
        os.path.abspath(os.path.join(os.getcwd(), "candidate_task_assignment.xml")),
    ]
    for path in candidate_paths:
        if os.path.exists(path):
            return FileResponse(
                path=path,
                filename="candidate_task_assignment.xml",
                media_type="application/xml"
            )
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="XML template file not found.")

@router.post("/preview", response_model=ExcelPreviewResponse)
async def preview_excel_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload an Excel (.xlsx) spreadsheet."
        )

    # Save to uploads directory
    safe_name = f"import_{secrets.token_hex(6)}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Spreadsheet file exceeds maximum allowed upload size (20MB)."
        )

    with open(file_path, "wb") as f:
        f.write(content)

    try:
        batch, preview_data = ExcelImportService.inspect_and_preview(
            file_path=file_path,
            filename=file.filename,
            admin_id=admin.id,
            db=db
        )
        UPLOADED_CACHE[batch.id] = file_path
        return preview_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to read and validate Excel spreadsheet: {str(e)}"
        )

@router.post("/confirm")
def confirm_excel_import(
    payload: ExcelConfirmImportRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    file_path = UPLOADED_CACHE.get(payload.batch_id)
    if not file_path or not os.path.exists(file_path):
        batch = db.query(ImportBatch).filter(ImportBatch.id == payload.batch_id).first()
        if not batch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import batch session not found.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Import file session expired. Please re-upload the spreadsheet to preview and confirm."
        )

    try:
        result = ExcelImportService.confirm_and_import(
            batch_id=payload.batch_id,
            admin_id=admin.id,
            column_mappings=payload.column_mappings,
            file_path=file_path,
            db=db
        )
        return result
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import execution failed: {str(e)}"
        )

@router.get("/batches")
def list_import_batches(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    batches = db.query(ImportBatch).order_by(ImportBatch.created_at.desc()).all()
    return batches
