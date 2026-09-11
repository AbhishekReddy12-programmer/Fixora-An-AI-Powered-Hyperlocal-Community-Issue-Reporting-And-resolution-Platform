from datetime import datetime
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    issue_id: Optional[UUID] = None
    ward_id: Optional[UUID] = None
    type: str
    title: str
    message: str
    action_url: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NotificationListResponse(BaseModel):
    unread_count: int
    items: List[NotificationResponse]
