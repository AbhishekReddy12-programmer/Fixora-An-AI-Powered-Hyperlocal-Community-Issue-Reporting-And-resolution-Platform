import enum
import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class NotificationType(str, enum.Enum):
    NEW_ISSUE_NEARBY = "NEW_ISSUE_NEARBY"
    VERIFICATION_MILESTONE = "VERIFICATION_MILESTONE"
    CREW_ASSIGNED = "CREW_ASSIGNED"
    WORK_STARTED = "WORK_STARTED"
    MARKED_SOLVED = "MARKED_SOLVED"
    COMMUNITY_CONFIRMED = "COMMUNITY_CONFIRMED"
    ISSUE_REOPENED = "ISSUE_REOPENED"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_id = Column(UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=True)
    ward_id = Column(UUID(as_uuid=True), ForeignKey("wards.id", ondelete="CASCADE"), nullable=True, index=True)
    type = Column(SQLEnum(NotificationType), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    action_url = Column(String(255), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_notifications_user_unread", "user_id", "is_read", created_at.desc()),
    )
