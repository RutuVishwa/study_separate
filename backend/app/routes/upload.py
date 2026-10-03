from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from sqlalchemy.orm import Session
from pathlib import Path
import uuid
import os

from app.database import get_db
from app.models import Material
from app.schemas import UploadResponse, MaterialResponse, ConfirmUploadRequest
from app.config import (
    ALLOWED_EXTENSIONS,
    ALLOWED_SUBJECTS,
    MAX_FILE_SIZE_BYTES,
    CONFIDENCE_THRESHOLD,
    TEMP_DIR,
    UPLOADS_DIR
)
from app.services.file_service import (
    is_allowed_extension,
    save_uploaded_file,
    move_temp_to_uploads,
    delete_file,
    get_file_extension
)
from app.services.extractor import extract_text
from app.services.classifier import classify_material

router = APIRouter(prefix="/api/materials", tags=["Upload"])

@router.post("/upload", response_model=UploadResponse)
async def upload_material(
    file: UploadFile = File(...),
    subject_override: str = Form(None),
    db: Session = Depends(get_db)
):
    original_filename = file.filename or "uploaded_file"
    
    # 1. Validate file extension
    if not is_allowed_extension(original_filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This file type is not supported yet."
        )

    # 2. Read bytes and validate file size
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty."
        )

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This file is too large to process."
        )

    file_ext = get_file_extension(original_filename).replace(".", "")

    # If user explicitly provided a subject override upfront
    if subject_override and subject_override in ALLOWED_SUBJECTS:
        stored_name, file_path = save_uploaded_file(
            file_bytes, original_filename, is_temp=False, subject=subject_override
        )
        material = Material(
            filename=original_filename,
            stored_filename=stored_name,
            file_path=str(file_path),
            file_type=file_ext,
            file_size=len(file_bytes),
            subject=subject_override,
            confidence=1.0
        )
        db.add(material)
        db.commit()
        db.refresh(material)

        return UploadResponse(
            needs_confirmation=False,
            material=MaterialResponse.model_validate(material),
            message=f"'{original_filename}' was arranged in folder: {subject_override}/"
        )

    # 3. Save file to TEMP for extraction & AI analysis
    temp_stored_name, temp_file_path = save_uploaded_file(file_bytes, original_filename, is_temp=True)

    # 4. Extract text
    try:
        extracted_text = extract_text(temp_file_path)
    except ValueError as err:
        delete_file(str(temp_file_path))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err)
        )
    except Exception as err:
        delete_file(str(temp_file_path))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong while analyzing the file. Your file was not added."
        )

    # 5. Send to AI Classifier
    try:
        ai_res = classify_material(extracted_text)
        classified_subject = ai_res.get("subject")
        confidence = ai_res.get("confidence", 0.0)
    except Exception as err:
        delete_file(str(temp_file_path))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We couldn't classify this material right now. Please try again."
        )

    # Validate AI returned subject
    if classified_subject not in ALLOWED_SUBJECTS:
        delete_file(str(temp_file_path))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI generated an invalid subject classification. Upload aborted."
        )

    # 6. Check Confidence Threshold
    if confidence < CONFIDENCE_THRESHOLD:
        # Low confidence: require user confirmation
        preview = extracted_text[:200] + ("..." if len(extracted_text) > 200 else "")
        return UploadResponse(
            needs_confirmation=True,
            suggested_subject=classified_subject,
            confidence=confidence,
            temp_file_id=temp_stored_name,
            extracted_preview=preview,
            message=f"We're not very confident about this classification (Confidence: {int(confidence*100)}%). AI suggests: {classified_subject}"
        )

    # High confidence: move temp file to uploads and save to DB
    _, final_path = move_temp_to_uploads(temp_stored_name, classified_subject)

    material = Material(
        filename=original_filename,
        stored_filename=temp_stored_name,
        file_path=str(final_path),
        file_type=file_ext,
        file_size=len(file_bytes),
        subject=classified_subject,
        confidence=confidence
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    return UploadResponse(
        needs_confirmation=False,
        material=MaterialResponse.model_validate(material),
        message=f"'{original_filename}' was arranged in folder: {classified_subject}/"
    )

@router.post("/confirm-upload", response_model=UploadResponse)
async def confirm_upload(
    req: ConfirmUploadRequest,
    db: Session = Depends(get_db)
):
    if req.confirmed_subject not in ALLOWED_SUBJECTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subject must be one of: {', '.join(ALLOWED_SUBJECTS)}"
        )

    temp_path = TEMP_DIR / req.temp_file_id
    if not temp_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Temporary file session expired or not found. Please upload again."
        )

    # Move temp file to permanent uploads
    stored_name, final_path = move_temp_to_uploads(req.temp_file_id, req.confirmed_subject)
    file_size = final_path.stat().st_size
    
    # Extract original filename from stored_name (e.g. uuid_filename.ext)
    parts = stored_name.split("_", 1)
    orig_filename = parts[1] if len(parts) > 1 else stored_name
    file_ext = get_file_extension(orig_filename).replace(".", "")

    material = Material(
        filename=orig_filename,
        stored_filename=stored_name,
        file_path=str(final_path),
        file_type=file_ext,
        file_size=file_size,
        subject=req.confirmed_subject,
        confidence=1.0  # User manually confirmed
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    return UploadResponse(
        needs_confirmation=False,
        material=MaterialResponse.model_validate(material),
        message=f"'{orig_filename}' was arranged in folder: {req.confirmed_subject}/"
    )
