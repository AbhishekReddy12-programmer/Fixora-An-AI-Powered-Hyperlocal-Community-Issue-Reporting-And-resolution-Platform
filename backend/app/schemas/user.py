from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

class UserRegister(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=100)

    @model_validator(mode='after')
    def check_email_or_phone(self) -> 'UserRegister':
        if not self.email and not self.phone:
            raise ValueError('At least one of email or phone must be provided')
        return self

class UserResponse(BaseModel):
    id: UUID
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: str
    role: str
    karma_points: int
    credibility_score: float
    ward_id: Optional[UUID] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = 'bearer'

class RefreshTokenRequest(BaseModel):
    refresh_token: str
