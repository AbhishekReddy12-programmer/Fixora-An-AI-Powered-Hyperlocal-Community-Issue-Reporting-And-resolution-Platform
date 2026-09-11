import enum
import uuid
from sqlalchemy import Column, String, Text, SmallInteger, Float, Integer, DateTime, ForeignKey, Enum as SQLEnum, Index, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
from app.core.database import Base

class IssueCategory(str, enum.Enum):
    POTHOLE = "POTHOLE"
    ILLEGAL_DUMP = "ILLEGAL_DUMP"
    BROKEN_STREETLIGHT = "BROKEN_STREETLIGHT"
    WATER_LEAK = "WATER_LEAK"
    DAMAGED_SIDEWALK = "DAMAGED_SIDEWALK"
    FALLEN_TREE = "FALLEN_TREE"
    OPEN_MANHOLE = "OPEN_MANHOLE"
    DRAINAGE = "DRAINAGE"
    ROAD_DAMAGE = "ROAD_DAMAGE"
    OTHER = "OTHER"

class IssueStatus(str, enum.Enum):
    REPORTED = "REPORTED"
    UNDER_VERIFICATION = "UNDER_VERIFICATION"
    VERIFIED = "VERIFIED"
    UNDER_REVIEW = "UNDER_REVIEW"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    COMMUNITY_CONFIRMED = "COMMUNITY_CONFIRMED"
    CLOSED = "CLOSED"
    REOPENED = "REOPENED"

class Issue(Base):
    __tablename__ = "issues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tracking_code = Column(String(30), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(SQLEnum(IssueCategory), nullable=False)
    severity = Column(SmallInteger, CheckConstraint('severity >= 1 AND severity <= 5'), default=3)
    status = Column(SQLEnum(IssueStatus), nullable=False, default=IssueStatus.REPORTED, index=True)
    location = Column(Geometry("POINT", srid=4326), nullable=False, index=True)
    address_text = Column(String(255), nullable=True)
    before_image_url = Column(String(500), nullable=False)
    after_image_url = Column(String(500), nullable=True)
    ai_metadata = Column(JSONB, default={})
    verification_count = Column(Integer, default=0)
    report_count = Column(Integer, default=1, nullable=False)
    confidence_score = Column(Float, default=50.0)
    priority_score = Column(Float, default=0.0)
    reopened_count = Column(Integer, default=0)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    assigned_worker_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    ward_id = Column(UUID(as_uuid=True), ForeignKey("wards.id"), nullable=True, index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def latitude(self) -> float | None:
        if self.location is not None:
            try:
                return float(to_shape(self.location).y)
            except Exception:
                return None
        return None

    @property
    def longitude(self) -> float | None:
        if self.location is not None:
            try:
                return float(to_shape(self.location).x)
            except Exception:
                return None
        return None

    __table_args__ = (
        Index("ix_issues_category", "category"),
        Index("ix_issues_created_at_desc", created_at.desc()),
    )
