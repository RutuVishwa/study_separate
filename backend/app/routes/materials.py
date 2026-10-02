from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pathlib import Path
from typing import List, Optional

from app.database import get_db
from app.models import Material
from app.schemas import MaterialResponse, DashboardStatsResponse
from app.config import ALLOWED_SUBJECTS
from app.services.file_service import delete_file

router = APIRouter(prefix="/api/materials", tags=["Materials"])

@router.get("", response_model=List[MaterialResponse])
def get_materials(
    subject: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Material)
    if subject:
        if subject not in ALLOWED_SUBJECTS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid subject. Must be one of: {', '.join(ALLOWED_SUBJECTS)}"
            )
        query = query.filter(Material.subject == subject)
    
    materials = query.order_by(Material.uploaded_at.desc()).all()
    return [MaterialResponse.model_validate(m) for m in materials]

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    # Initialize counts for all 5 subjects to 0
    counts = {s: 0 for s in ALLOWED_SUBJECTS}
    
    rows = db.query(Material.subject, func.count(Material.id)).group_by(Material.subject).all()
    total = 0
    for subj, cnt in rows:
        if subj in counts:
            counts[subj] = cnt
            total += cnt

    return DashboardStatsResponse(
        total_materials=total,
        subject_counts=counts
    )

@router.get("/{material_id}", response_model=MaterialResponse)
def get_material_by_id(
    material_id: int,
    db: Session = Depends(get_db)
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study material not found."
        )
    return MaterialResponse.model_validate(material)

@router.get("/{material_id}/download")
def download_material(
    material_id: int,
    db: Session = Depends(get_db)
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study material not found."
        )

    file_path = Path(material.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The file does not exist on the server storage."
        )

    # Set disposition header so browser can preview or download cleanly
    return FileResponse(
        path=str(file_path),
        filename=material.filename,
        media_type="application/octet-stream"
    )

@router.delete("/{material_id}", status_code=status.HTTP_200_OK)
def delete_material(
    material_id: int,
    db: Session = Depends(get_db)
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study material not found."
        )

    # Delete physical file
    delete_file(material.file_path)

    # Delete database record
    db.delete(material)
    db.commit()

    return {"message": f"Successfully deleted '{material.filename}'."}
