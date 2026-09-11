from uuid import uuid4, UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast
from geoalchemy2 import Geography

from app.services.server_storage import save_uploaded_bytes, generate_file_key
from app.services.groq_ai import analyze_civic_image, generate_issue_description

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user, require_roles
from app.models.issue import Issue, IssueStatus, IssueCategory
from app.models.user import User, UserRole
from app.models.verification import IssueVerification
from app.models.timeline import IssueTimeline
from app.models.confirmation import IssueResolutionConfirmation
from app.models.notification import NotificationType
from app.services.notifications import send_user_notification, broadcast_ward_notification
from app.schemas.issue import (
    IssueCreate,
    IssueResponse,
    IssueNearbyResponse,
    IssueStatusUpdate,
    VerificationCreate,
    IssueResolutionConfirmCreate,
)

router = APIRouter()

@router.post("/", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    issue_in: IssueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        category_enum = IssueCategory(issue_in.category)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid category")

    tracking_code = f"FIXORA-{uuid4().hex[:6].upper()}"
    
    user_geom = func.ST_SetSRID(func.ST_MakePoint(issue_in.longitude, issue_in.latitude), 4326)

    # 1. Smart Duplicate Detection: Check if same category was reported within 35 meters
    dup_stmt = (
        select(Issue)
        .where(
            Issue.category == category_enum,
            Issue.status.notin_([IssueStatus.CLOSED, IssueStatus.RESOLVED]),
            func.ST_DWithin(
                func.cast(Issue.location, Geography),
                func.cast(user_geom, Geography),
                35.0  # 35-meter duplicate threshold
            )
        )
        .order_by(
            func.ST_Distance(
                func.cast(Issue.location, Geography),
                func.cast(user_geom, Geography)
            )
        )
        .limit(1)
    )
    dup_result = await db.execute(dup_stmt)
    existing_issue = dup_result.scalar_one_or_none()

    # If duplicate defect exists, reinforce it and increment report count
    if existing_issue:
        existing_issue.report_count = (existing_issue.report_count or 1) + 1
        existing_issue.verification_count = (existing_issue.verification_count or 0) + 1
        existing_issue.priority_score = (existing_issue.priority_score or 0.0) + 25.0

        # Auto-upgrade to VERIFIED if confirmed by multiple citizens
        if existing_issue.report_count >= 3 and existing_issue.status in [IssueStatus.REPORTED, IssueStatus.UNDER_VERIFICATION]:
            existing_issue.status = IssueStatus.VERIFIED

        # Audit timeline record for the reinforced report
        timeline = IssueTimeline(
            issue_id=existing_issue.id,
            previous_status=existing_issue.status.value,
            new_status=existing_issue.status.value,
            actor_id=current_user.id,
            notes=f"Reinforced report by {current_user.full_name}. Defect reported count increased to {existing_issue.report_count}."
        )
        db.add(timeline)

        # Record verification entry if user has not verified yet
        verif_check = await db.execute(
            select(IssueVerification).where(
                IssueVerification.issue_id == existing_issue.id,
                IssueVerification.user_id == current_user.id
            )
        )
        if not verif_check.scalar_one_or_none():
            verification = IssueVerification(
                issue_id=existing_issue.id,
                user_id=current_user.id,
                response="YES",
                is_on_site=True
            )
            db.add(verification)

        # Award Karma for reinforcing existing report
        current_user.karma_points = (current_user.karma_points or 0) + 35
        db.add(current_user)

        await db.commit()
        await db.refresh(existing_issue)

        # Attach response flags
        resp_data = IssueResponse.model_validate(existing_issue)
        resp_data.is_duplicate = True
        resp_data.duplicate_message = (
            f"This {category_enum.value.lower().replace('_', ' ')} was already reported! "
            f"Your report has reinforced it (Reported {existing_issue.report_count} times). Priority boosted!"
        )
        return resp_data
    
    # 2. Fresh Issue Creation (First time reported)
    tracking_code = f"FIXORA-{uuid4().hex[:6].upper()}"
    issue = Issue(
        tracking_code=tracking_code,
        title=issue_in.title,
        description=issue_in.description,
        category=category_enum,
        severity=issue_in.severity,
        location=user_geom,
        address_text=issue_in.address_text,
        before_image_url=issue_in.before_image_url,
        ai_metadata=issue_in.ai_metadata,
        reporter_id=current_user.id,
        status=IssueStatus.REPORTED,
        report_count=1,
        verification_count=0,
    )
    db.add(issue)
    await db.flush()

    timeline = IssueTimeline(
        issue_id=issue.id,
        new_status=IssueStatus.REPORTED,
        actor_id=current_user.id,
        notes="Issue reported for the first time.",
    )
    db.add(timeline)
    
    current_user.karma_points = (current_user.karma_points or 0) + 50
    db.add(current_user)

    await broadcast_ward_notification(
        db=db,
        ward_id=issue.ward_id,
        type=NotificationType.NEW_ISSUE_NEARBY,
        title="New Issue Reported!",
        message=f"{issue.category.value} reported: {issue.title}. Tap to verify.",
        action_url=f"/track?code={issue.tracking_code}",
        issue_id=issue.id,
        exclude_user_id=current_user.id,
    )
    
    await db.commit()
    await db.refresh(issue)
    
    return issue


@router.get("/my-reports", response_model=list[IssueResponse])
async def get_my_reported_issues(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Issue)
        .where(Issue.reporter_id == current_user.id)
        .order_by(Issue.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/verify-feed", response_model=list[IssueResponse])
async def get_issues_to_verify(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Issues in REPORTED or UNDER_VERIFICATION that current_user has not verified and did not report
    verified_subquery = (
        select(IssueVerification.issue_id)
        .where(IssueVerification.user_id == current_user.id)
    )
    stmt = (
        select(Issue)
        .where(
            Issue.reporter_id != current_user.id,
            Issue.status.in_([IssueStatus.REPORTED, IssueStatus.UNDER_VERIFICATION]),
            Issue.id.not_in(verified_subquery),
        )
        .order_by(Issue.created_at.desc())
        .limit(30)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/nearby", response_model=list[IssueNearbyResponse])
async def get_nearby_issues(
    latitude: float,
    longitude: float,
    radius_meters: float = 1500,
    db: AsyncSession = Depends(get_db),
):
    if radius_meters > 5000000:
        radius_meters = 5000000

    user_geom = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)
    
    distance_col = func.ST_Distance(
        func.cast(Issue.location, Geography),
        func.cast(user_geom, Geography)
    ).label("distance_meters")
    
    stmt = (
        select(Issue, distance_col)
        .where(
            Issue.status != IssueStatus.CLOSED,
            func.ST_DWithin(
                func.cast(Issue.location, Geography),
                func.cast(user_geom, Geography),
                radius_meters
            )
        )
        .order_by("distance_meters")
        .limit(50)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    responses = []
    for issue, distance in rows:
        issue_dict = issue.__dict__.copy()
        issue_dict["distance_meters"] = distance
        issue_dict["latitude"] = issue.latitude
        issue_dict["longitude"] = issue.longitude
        responses.append(IssueNearbyResponse.model_validate(issue_dict))
        
    return responses


@router.get("/recent", response_model=list[IssueResponse])
async def get_recent_issues(
    limit: int = 25,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Issue)
        .order_by(Issue.created_at.desc())
        .limit(min(limit, 50))
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/track/{tracking_code}", response_model=IssueResponse)
async def track_issue(tracking_code: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Issue).where(Issue.tracking_code == tracking_code)
    result = await db.execute(stmt)
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(issue_id: UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(Issue).where(Issue.id == issue_id)
    result = await db.execute(stmt)
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@router.post("/{issue_id}/verify")
async def verify_issue(
    issue_id: UUID,
    verify_in: VerificationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if verify_in.response not in ["YES", "NO", "NOT_SURE"]:
        raise HTTPException(status_code=400, detail="Invalid verification response")

    stmt = select(Issue).where(Issue.id == issue_id)
    result = await db.execute(stmt)
    issue = result.scalar_one_or_none()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    if issue.status == IssueStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Cannot verify closed issues")

    stmt = select(IssueVerification).where(
        IssueVerification.issue_id == issue.id,
        IssueVerification.user_id == current_user.id
    )
    result = await db.execute(stmt)
    existing_verification = result.scalar_one_or_none()
    
    if existing_verification:
        raise HTTPException(status_code=400, detail="Already verified this issue")

    geom = None
    if verify_in.latitude is not None and verify_in.longitude is not None:
        geom = func.ST_SetSRID(func.ST_MakePoint(verify_in.longitude, verify_in.latitude), 4326)

    verification = IssueVerification(
        issue_id=issue.id,
        user_id=current_user.id,
        response=verify_in.response,
        verification_location=geom,
    )
    db.add(verification)

    if verify_in.response == "YES":
        issue.verification_count += 1
        issue.confidence_score = min(issue.confidence_score + 10.0, 100.0)
        current_user.karma_points += 15
        db.add(current_user)

    if issue.verification_count >= 3 and issue.status in [IssueStatus.REPORTED, IssueStatus.UNDER_VERIFICATION]:
        issue.status = IssueStatus.VERIFIED
        timeline = IssueTimeline(
            issue_id=issue.id,
            previous_status=IssueStatus.REPORTED if issue.verification_count == 3 else IssueStatus.UNDER_VERIFICATION,
            new_status=IssueStatus.VERIFIED,
            actor_id=current_user.id,
            notes="Auto-verified by community",
        )
        db.add(timeline)

        await send_user_notification(
            db=db,
            user_id=issue.reporter_id,
            type=NotificationType.VERIFICATION_MILESTONE,
            title="Issue Verified!",
            message=f"Your reported issue '{issue.title}' was verified by {issue.verification_count} neighbors! Confidence: {int(issue.confidence_score)}%.",
            action_url=f"/track?code={issue.tracking_code}",
            issue_id=issue.id,
            ward_id=issue.ward_id,
        )

    await db.commit()
    await db.refresh(issue)
    
    return {"verification_count": issue.verification_count, "status": issue.status}


@router.post("/{issue_id}/confirm-resolution", response_model=IssueResponse)
async def confirm_issue_resolution(
    issue_id: UUID,
    confirm_in: IssueResolutionConfirmCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Issue).where(Issue.id == issue_id)
    result = await db.execute(stmt)
    issue = result.scalar_one_or_none()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    if issue.status != IssueStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Only issues in RESOLVED state can be confirmed or disputed")

    existing = (
        await db.execute(
            select(IssueResolutionConfirmation).where(
                IssueResolutionConfirmation.issue_id == issue.id,
                IssueResolutionConfirmation.user_id == current_user.id
            )
        )
    ).scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted confirmation for this issue")

    conf = IssueResolutionConfirmation(
        issue_id=issue.id,
        user_id=current_user.id,
        is_satisfactory=confirm_in.is_satisfactory,
        dispute_reason=confirm_in.dispute_reason,
        dispute_image_url=confirm_in.dispute_image_url,
    )
    db.add(conf)

    prev_status = issue.status

    if confirm_in.is_satisfactory:
        is_reporter = current_user.id == issue.reporter_id
        satisfactory_count = (
            await db.execute(
                select(func.count(IssueResolutionConfirmation.id)).where(
                    IssueResolutionConfirmation.issue_id == issue.id,
                    IssueResolutionConfirmation.is_satisfactory == True
                )
            )
        ).scalar() or 0

        if is_reporter or satisfactory_count >= 1:
            issue.status = IssueStatus.COMMUNITY_CONFIRMED
            timeline = IssueTimeline(
                issue_id=issue.id,
                previous_status=prev_status.value if prev_status else None,
                new_status=IssueStatus.COMMUNITY_CONFIRMED.value,
                actor_id=current_user.id,
                notes="Community confirmed repair is complete and satisfactory.",
            )
            db.add(timeline)

            current_user.karma_points += 20
            db.add(current_user)

            if not is_reporter:
                await send_user_notification(
                    db=db,
                    user_id=issue.reporter_id,
                    type=NotificationType.COMMUNITY_CONFIRMED,
                    title="Fix Confirmed by Community!",
                    message=f"Neighbors confirmed repair on '{issue.title}'. Issue officially closed.",
                    action_url=f"/track?code={issue.tracking_code}",
                    issue_id=issue.id,
                    ward_id=issue.ward_id,
                )
    else:
        issue.status = IssueStatus.REOPENED
        issue.reopened_count = (issue.reopened_count or 0) + 1
        issue.priority_score = min((issue.priority_score or 0.0) + 1.5, 5.0)

        timeline = IssueTimeline(
            issue_id=issue.id,
            previous_status=prev_status.value if prev_status else None,
            new_status=IssueStatus.REOPENED.value,
            actor_id=current_user.id,
            notes=f"Resolution disputed: {confirm_in.dispute_reason or 'Community reported defect still exists.'}",
        )
        db.add(timeline)

        await broadcast_ward_notification(
            db=db,
            ward_id=issue.ward_id,
            type=NotificationType.ISSUE_REOPENED,
            title="Repair Disputed!",
            message=f"Defect '{issue.title}' was reported as still unresolved. Issue reopened for administrative review.",
            action_url=f"/track?code={issue.tracking_code}",
            issue_id=issue.id,
        )

    await db.commit()
    await db.refresh(issue)
    return issue


@router.patch("/{issue_id}/status", response_model=IssueResponse)
async def update_issue_status(
    issue_id: UUID,
    status_in: IssueStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MUNICIPAL_ADMIN, UserRole.SUPER_ADMIN])),
):
    try:
        new_status = IssueStatus(status_in.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")

    stmt = select(Issue).where(Issue.id == issue_id)
    result = await db.execute(stmt)
    issue = result.scalar_one_or_none()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    previous_status = issue.status
    issue.status = new_status
    
    if new_status == IssueStatus.RESOLVED:
        issue.resolved_at = func.now()

    timeline = IssueTimeline(
        issue_id=issue.id,
        previous_status=previous_status.value if previous_status else None,
        new_status=new_status.value,
        actor_id=current_user.id,
        notes=status_in.notes,
    )
    db.add(timeline)
    
    await db.commit()
    await db.refresh(issue)
    
    return issue


@router.post("/upload")
async def upload_issue_image(
    file: UploadFile = File(...),
):
    extension = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    file_key = generate_file_key("direct", "photo", ext=extension)
    content = await file.read()
    
    public_url = save_uploaded_bytes(content, file_key)
    
    # Run AI triage via Groq
    triage = await analyze_civic_image(
        image_bytes=content,
        mime_type=file.content_type or "image/jpeg"
    )
    
    return {
        "public_url": public_url,
        "file_key": file_key,
        "filename": file.filename,
        "size_bytes": len(content),
        "ai_triage": triage.model_dump()
    }


from pydantic import BaseModel
from typing import Optional

class DescriptionGenerateRequest(BaseModel):
    category: str
    title: Optional[str] = ""
    address: Optional[str] = ""
    severity: Optional[int] = 3

@router.post("/generate-description")
async def generate_description_endpoint(
    req: DescriptionGenerateRequest,
):
    desc = await generate_issue_description(
        category=req.category,
        title=req.title or "",
        address=req.address or "",
        severity=req.severity or 3
    )
    return {"description": desc}
