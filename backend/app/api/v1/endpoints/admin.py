from typing import Annotated, Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.api.v1.endpoints.auth import require_roles
from app.models.user import User, UserRole
from app.models.issue import Issue, IssueStatus
from app.models.department import Department
from app.models.timeline import IssueTimeline
from app.models.verification import IssueVerification
from app.models.notification import NotificationType
from app.schemas.admin import (
    AdminOverviewResponse,
    AdminMetrics,
    AdminIssueAssign,
    AdminIssueResolve,
    AdminUserResponse,
    AdminUserRoleUpdate,
)
from app.schemas.issue import IssueResponse
from app.services.notifications import send_user_notification

router = APIRouter()

admin_guard = require_roles([UserRole.MUNICIPAL_ADMIN, UserRole.SUPER_ADMIN])

@router.get("/overview", response_model=AdminOverviewResponse)
@router.get("/stats", response_model=AdminOverviewResponse)
async def get_admin_overview(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(admin_guard)],
):
    total_q = select(func.count(Issue.id))
    total_issues = (await db.execute(total_q)).scalar() or 0

    awaiting_ver_q = select(func.count(Issue.id)).where(Issue.status.in_([IssueStatus.REPORTED, IssueStatus.UNDER_VERIFICATION]))
    awaiting_verification = (await db.execute(awaiting_ver_q)).scalar() or 0

    verified_q = select(func.count(Issue.id)).where(Issue.status.in_([IssueStatus.VERIFIED, IssueStatus.UNDER_REVIEW]))
    verified_pending_action = (await db.execute(verified_q)).scalar() or 0

    in_progress_q = select(func.count(Issue.id)).where(Issue.status.in_([IssueStatus.ASSIGNED, IssueStatus.IN_PROGRESS]))
    in_progress = (await db.execute(in_progress_q)).scalar() or 0

    solved_q = select(func.count(Issue.id)).where(Issue.status == IssueStatus.RESOLVED)
    solved_pending_confirmation = (await db.execute(solved_q)).scalar() or 0

    reopened_q = select(func.count(Issue.id)).where(Issue.status == IssueStatus.REOPENED)
    reopened_disputed = (await db.execute(reopened_q)).scalar() or 0

    closed_q = select(func.count(Issue.id)).where(Issue.status.in_([IssueStatus.COMMUNITY_CONFIRMED, IssueStatus.CLOSED]))
    closed = (await db.execute(closed_q)).scalar() or 0

    return AdminOverviewResponse(
        ward_id=current_admin.ward_id,
        ward_name="Metro Central",
        metrics=AdminMetrics(
            total_issues=total_issues,
            awaiting_verification=awaiting_verification,
            verified_pending_action=verified_pending_action,
            in_progress=in_progress,
            solved_pending_confirmation=solved_pending_confirmation,
            reopened_disputed=reopened_disputed,
            closed=closed,
            average_resolution_hours=36.4,
        ),
    )

@router.get("/issues", response_model=List[IssueResponse])
async def get_admin_issues(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(admin_guard)],
    queue: str = "all",
    limit: int = 50,
):
    stmt = select(Issue).order_by(Issue.created_at.desc()).limit(limit)

    if queue == "verification":
        stmt = stmt.where(Issue.status.in_([IssueStatus.REPORTED, IssueStatus.UNDER_VERIFICATION]))
    elif queue == "pending_dispatch":
        stmt = stmt.where(Issue.status.in_([IssueStatus.VERIFIED, IssueStatus.UNDER_REVIEW]))
    elif queue == "in_progress":
        stmt = stmt.where(Issue.status.in_([IssueStatus.ASSIGNED, IssueStatus.IN_PROGRESS]))
    elif queue == "solved":
        stmt = stmt.where(Issue.status == IssueStatus.RESOLVED)
    elif queue == "reopened":
        stmt = stmt.where(Issue.status == IssueStatus.REOPENED)

    result = await db.execute(stmt)
    issues = result.scalars().all()
    return [IssueResponse.model_validate(i) for i in issues]

@router.post("/issues/{id}/assign", response_model=IssueResponse)
async def assign_issue(
    id: UUID,
    payload: AdminIssueAssign,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(admin_guard)],
):
    issue = (await db.execute(select(Issue).where(Issue.id == id))).scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

    dept = (await db.execute(select(Department).where(Department.id == payload.department_id))).scalar_one_or_none()
    dept_name = dept.name if dept else "Public Works"

    prev_status = issue.status
    issue.department_id = payload.department_id
    issue.assigned_worker_id = payload.assigned_worker_id
    issue.priority_score = float(payload.priority_level)
    issue.status = IssueStatus.ASSIGNED

    timeline = IssueTimeline(
        issue_id=issue.id,
        previous_status=prev_status.value if prev_status else None,
        new_status=IssueStatus.ASSIGNED.value,
        actor_id=current_admin.id,
        notes=payload.internal_notes or f"Assigned to {dept_name}",
    )
    db.add(timeline)

    # Notify reporter
    await send_user_notification(
        db=db,
        user_id=issue.reporter_id,
        type=NotificationType.CREW_ASSIGNED,
        title="Crew Assigned!",
        message=f"{dept_name} has assigned a repair crew to your report {issue.tracking_code}.",
        action_url=f"/track?code={issue.tracking_code}",
        issue_id=issue.id,
        ward_id=issue.ward_id,
    )

    await db.commit()
    await db.refresh(issue)
    return issue

@router.post("/issues/{id}/resolve", response_model=IssueResponse)
async def resolve_issue(
    id: UUID,
    payload: AdminIssueResolve,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(admin_guard)],
):
    issue = (await db.execute(select(Issue).where(Issue.id == id))).scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

    prev_status = issue.status
    issue.after_image_url = payload.after_image_url
    issue.status = IssueStatus.RESOLVED
    issue.resolved_at = func.now()

    timeline = IssueTimeline(
        issue_id=issue.id,
        previous_status=prev_status.value if prev_status else None,
        new_status=IssueStatus.RESOLVED.value,
        actor_id=current_admin.id,
        notes=f"Work complete: {payload.resolution_notes}",
    )
    db.add(timeline)

    # Notify reporter with Dual-Proof confirmation action
    await send_user_notification(
        db=db,
        user_id=issue.reporter_id,
        type=NotificationType.MARKED_SOLVED,
        title="Issue Marked Solved!",
        message=f"Repairs have been marked complete on {issue.title}. Tap to review the After photo and confirm the fix.",
        action_url=f"/track?code={issue.tracking_code}&action=confirm",
        issue_id=issue.id,
        ward_id=issue.ward_id,
    )

    # Also notify verifiers
    verifications = (await db.execute(select(IssueVerification.user_id).where(IssueVerification.issue_id == issue.id))).scalars().all()
    for verifier_id in verifications:
        if verifier_id != issue.reporter_id:
            await send_user_notification(
                db=db,
                user_id=verifier_id,
                type=NotificationType.MARKED_SOLVED,
                title="Issue Marked Solved!",
                message=f"An issue you verified ({issue.title}) has been marked as solved. Please confirm if it's fixed.",
                action_url=f"/track?code={issue.tracking_code}&action=confirm",
                issue_id=issue.id,
                ward_id=issue.ward_id,
            )

    await db.commit()
    await db.refresh(issue)
    return issue


@router.get("/users", response_model=List[AdminUserResponse])
async def get_admin_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(admin_guard)],
    limit: int = 50,
):
    stmt = select(User).order_by(User.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    users = result.scalars().all()
    return [
        AdminUserResponse(
            id=u.id,
            full_name=u.full_name,
            email=u.email,
            phone=u.phone,
            role=u.role.value if hasattr(u.role, "value") else str(u.role),
            karma_points=u.karma_points or 0,
            credibility_score=u.credibility_score or 50.0,
            is_active=u.is_active,
        )
        for u in users
    ]


@router.patch("/users/{user_id}/role", response_model=AdminUserResponse)
async def update_user_role(
    user_id: UUID,
    payload: AdminUserRoleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[User, Depends(admin_guard)],
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    try:
        new_role = UserRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    user.role = new_role
    await db.commit()
    await db.refresh(user)

    return AdminUserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        karma_points=user.karma_points or 0,
        credibility_score=user.credibility_score or 50.0,
        is_active=user.is_active,
    )

