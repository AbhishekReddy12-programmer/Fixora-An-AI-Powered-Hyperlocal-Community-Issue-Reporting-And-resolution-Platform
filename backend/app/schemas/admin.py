from typing import Optional, Dict
from uuid import UUID
from pydantic import BaseModel, Field

class AdminMetrics(BaseModel):
    total_issues: int
    awaiting_verification: int
    verified_pending_action: int
    in_progress: int
    solved_pending_confirmation: int
    reopened_disputed: int
    closed: int
    average_resolution_hours: float

class AdminOverviewResponse(BaseModel):
    ward_id: Optional[UUID] = None
    ward_name: Optional[str] = None
    metrics: AdminMetrics

class AdminIssueAssign(BaseModel):
    department_id: UUID
    assigned_worker_id: Optional[UUID] = None
    priority_level: int = Field(3, ge=1, le=5)
    internal_notes: Optional[str] = None

class AdminIssueResolve(BaseModel):
    after_image_url: str = Field(..., min_length=5)
    resolution_notes: str = Field(..., min_length=10)

class AdminUserResponse(BaseModel):
    id: UUID
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    karma_points: int
    credibility_score: float
    is_active: bool

class AdminUserRoleUpdate(BaseModel):
    role: str

