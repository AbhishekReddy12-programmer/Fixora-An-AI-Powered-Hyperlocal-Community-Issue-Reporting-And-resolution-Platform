from uuid import UUID
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.notification import Notification, NotificationType
from app.models.user import User

async def send_user_notification(
    db: AsyncSession,
    user_id: UUID,
    type: NotificationType,
    title: str,
    message: str,
    action_url: str,
    issue_id: Optional[UUID] = None,
    ward_id: Optional[UUID] = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        issue_id=issue_id,
        ward_id=ward_id,
        type=type,
        title=title,
        message=message,
        action_url=action_url,
        is_read=False,
    )
    db.add(notification)
    return notification

async def broadcast_ward_notification(
    db: AsyncSession,
    ward_id: UUID,
    type: NotificationType,
    title: str,
    message: str,
    action_url: str,
    issue_id: Optional[UUID] = None,
    exclude_user_id: Optional[UUID] = None,
) -> List[Notification]:
    query = select(User.id).where(User.is_active == True)
    if ward_id:
        query = query.where(User.ward_id == ward_id)
    if exclude_user_id:
        query = query.where(User.id != exclude_user_id)

    result = await db.execute(query)
    user_ids = result.scalars().all()

    notifications = []
    for uid in user_ids:
        notif = Notification(
            user_id=uid,
            issue_id=issue_id,
            ward_id=ward_id,
            type=type,
            title=title,
            message=message,
            action_url=action_url,
            is_read=False,
        )
        db.add(notif)
        notifications.append(notif)

    return notifications
