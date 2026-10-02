from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class MaterialBase(BaseModel):
    filename: str
    subject: str

class MaterialResponse(BaseModel):
    id: int
    filename: str
    stored_filename: str
    file_type: str
    file_size: int
    subject: str
    confidence: float
    uploaded_at: Optional[str] = None

    class Config:
        from_attributes = True

class UploadResponse(BaseModel):
    needs_confirmation: bool
    material: Optional[MaterialResponse] = None
    suggested_subject: Optional[str] = None
    confidence: Optional[float] = None
    temp_file_id: Optional[str] = None
    extracted_preview: Optional[str] = None
    message: str

class ConfirmUploadRequest(BaseModel):
    temp_file_id: str
    confirmed_subject: str

class SubjectStats(BaseModel):
    subject: str
    count: int

class DashboardStatsResponse(BaseModel):
    total_materials: int
    subject_counts: dict[str, int]
