from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

class IssueCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    category: str
    severity: int = Field(3, ge=1, le=5)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address_text: Optional[str] = None
    before_image_url: str
    ai_metadata: Optional[dict] = None

class IssueResponse(BaseModel):
    id: UUID
    tracking_code: str
    title: str
    description: Optional[str] = None
    category: str
    severity: int
    status: str
    address_text: Optional[str] = None
    before_image_url: str
    after_image_url: Optional[str] = None
    ai_metadata: Optional[dict] = None
    verification_count: int
    report_count: int = 1
    confidence_score: float
    priority_score: float
    reporter_id: UUID
    department_id: Optional[UUID] = None
    reopened_count: int = 0
    assigned_worker_id: Optional[UUID] = None
    ward_id: Optional[UUID] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_duplicate: Optional[bool] = False
    duplicate_message: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class IssueNearbyResponse(IssueResponse):
    distance_meters: float

class IssueStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class VerificationCreate(BaseModel):
    response: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class IssueResolutionConfirmCreate(BaseModel):
    is_satisfactory: bool
    dispute_reason: Optional[str] = None
    dispute_image_url: Optional[str] = None
