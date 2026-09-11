from fastapi import APIRouter

from app.api.v1.endpoints import auth, issues, admin, notifications, gamification

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(issues.router, prefix="/issues", tags=["Issues"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(gamification.router, prefix="/gamification", tags=["Gamification"])
