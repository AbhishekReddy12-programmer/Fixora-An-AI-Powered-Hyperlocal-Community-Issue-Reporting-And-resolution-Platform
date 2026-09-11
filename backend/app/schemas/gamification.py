from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

class LeaderboardUser(BaseModel):
    rank: int
    user_id: UUID
    full_name: str
    points: int
    tier: str
    badges_count: int

class LeaderboardResponse(BaseModel):
    ward_id: Optional[UUID] = None
    ward_name: str
    user_rank: int
    user_points: int
    leaderboard: List[LeaderboardUser]

class BadgeResponse(BaseModel):
    id: UUID
    code: str
    name: str
    description: str
    icon_url: Optional[str] = None
    xp_reward: Optional[int] = 100
    min_xp_required: Optional[int] = 0

    class Config:
        from_attributes = True
