from typing import Annotated, Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_optional_current_user
from app.models.user import User
from app.models.ward import Ward
from app.models.badge import Badge, UserBadge
from app.schemas.gamification import LeaderboardResponse, LeaderboardUser, BadgeResponse

router = APIRouter()

def calculate_tier(points: int) -> str:
    if points >= 1500:
        return "Civic Hero"
    elif points >= 600:
        return "Community Champion"
    elif points >= 200:
        return "Community Helper"
    return "Civic Scout"

@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_community_leaderboard(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)] = None,
    limit: int = 25,
):
    # Query top users
    stmt = (
        select(User)
        .where(User.is_active == True)
        .order_by(User.karma_points.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    top_users = result.scalars().all()

    leaderboard = []
    user_rank = 1
    found_user = False

    for idx, u in enumerate(top_users, start=1):
        if current_user and u.id == current_user.id:
            user_rank = idx
            found_user = True

        badges_count = (
            await db.execute(
                select(func.count(UserBadge.id)).where(UserBadge.user_id == u.id)
            )
        ).scalar() or 0

        leaderboard.append(
            LeaderboardUser(
                rank=idx,
                user_id=u.id,
                full_name=u.full_name,
                points=u.karma_points or 0,
                tier=calculate_tier(u.karma_points or 0),
                badges_count=badges_count,
            )
        )

    # Ward name
    ward_name = "Metro Central"
    ward_id = None
    user_points = 0

    if current_user:
        ward_id = current_user.ward_id
        user_points = current_user.karma_points or 0
        if current_user.ward_id:
            ward = (await db.execute(select(Ward).where(Ward.id == current_user.ward_id))).scalar_one_or_none()
            if ward:
                ward_name = ward.name

    return LeaderboardResponse(
        ward_id=ward_id,
        ward_name=ward_name,
        user_rank=user_rank if (found_user and current_user) else (len(top_users) + 1 if current_user else 0),
        user_points=user_points,
        leaderboard=leaderboard,
    )

@router.get("/badges", response_model=List[BadgeResponse])
async def get_badges(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    stmt = select(Badge).order_by(Badge.min_xp_required.asc())
    result = await db.execute(stmt)
    badges = result.scalars().all()
    return badges
