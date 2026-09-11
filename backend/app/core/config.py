from typing import List
from pathlib import Path
from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Fixora API"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"
    
    DATABASE_URL: str
    REDIS_URL: str
    
    GROQ_API_KEY: str
    
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    BACKEND_CORS_ORIGINS: List[str] = []
    
    UPLOAD_DIR: str = "uploads"
    MEDIA_BASE_URL: str = "/uploads"

    class Config:
        env_file = (str(ENV_FILE), ".env")
        extra = "ignore"

settings = Settings()
