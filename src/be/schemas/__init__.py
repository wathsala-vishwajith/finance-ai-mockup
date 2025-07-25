from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, validator
import re

from be.core.config import PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH

# Request Models
class UserRegisterRequest(BaseModel):
    username: str = Field(
        min_length=USERNAME_MIN_LENGTH,
        max_length=USERNAME_MAX_LENGTH,
        pattern="^[a-zA-Z0-9_]+$"
    )
    email: EmailStr
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    full_name: Optional[str] = Field(None, max_length=100)

    @validator('password')
    def validate_password_strength(cls, v):
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[@$!%*?&]", v):
            raise ValueError("Password must contain at least one special character (@$!%*?&)")
        return v

class UserLoginRequest(BaseModel):
    username: str
    password: str

class TokenRefreshRequest(BaseModel):
    refresh_token: str

# User Management Models
class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, description="Current password")
    new_password: str = Field(min_length=8, max_length=128, description="New password")
    
    @validator('new_password')
    def validate_new_password_strength(cls, v):
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[@$!%*?&]", v):
            raise ValueError("Password must contain at least one special character (@$!%*?&)")
        return v

class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1, description="Current password for confirmation")
    confirmation: str = Field(description="Must be 'DELETE' to confirm")
    
    @validator('confirmation')
    def validate_confirmation(cls, v):
        if v != "DELETE":
            raise ValueError("Confirmation must be exactly 'DELETE'")
        return v

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100, description="Full name")

# Chat WebSocket Models
class ChatMessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    timestamp: Optional[datetime] = None

class ChatMessageOut(BaseModel):
    message: str
    sender: str  # "user" or "assistant"
    timestamp: datetime
    is_complete: bool = True  # For streaming responses

# Profit Data Models
class ProfitRecord(BaseModel):
    id: int
    company: str
    year: int
    month: int
    profit: float
    month_name: str = ""

    class Config:
        from_attributes = True

class ProfitFilters(BaseModel):
    company: Optional[str] = Field(None, description="Filter by company name")
    year: Optional[int] = Field(None, ge=2020, le=2030, description="Filter by year")
    search: Optional[str] = Field(None, max_length=100, description="Search in company name")

class ProfitPage(BaseModel):
    data: list[ProfitRecord]
    total: int
    page: int
    per_page: int
    total_pages: int
    has_next: bool
    has_prev: bool

# Chart WebSocket Models
class ChartSubscribe(BaseModel):
    interval_ms: Optional[int] = Field(default=2000, ge=500, le=60000)

class ChartDataPoint(BaseModel):
    timestamp: datetime
    value: float
    label: Optional[str] = None

class LineChartData(BaseModel):
    timestamp: datetime
    data_points: list[float]

class LineChartPoint(BaseModel):
    """Single point data for animated line charts"""
    timestamp: datetime
    value: float
    index: int  # Time progression index (increments with each interval)

class PieChartSlice(BaseModel):
    label: str
    value: float
    color: Optional[str] = None

class PieChartData(BaseModel):
    timestamp: datetime
    slices: list[PieChartSlice]

class BarChartBar(BaseModel):
    label: str
    value: float
    color: Optional[str] = None

class BarChartData(BaseModel):
    timestamp: datetime
    bars: list[BarChartBar]

# Response Models
class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class UserProfileResponse(BaseModel):
    user: UserOut

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None

class ValidationErrorResponse(BaseModel):
    detail: str
    errors: list

__all__ = [
    "UserRegisterRequest",
    "UserLoginRequest",
    "TokenRefreshRequest",
    "ChangePasswordRequest",
    "DeleteAccountRequest",
    "UpdateProfileRequest",
    "ChatMessageIn",
    "ChatMessageOut",
    "ProfitRecord",
    "ProfitFilters",
    "ProfitPage",
    "ChartSubscribe",
    "ChartDataPoint",
    "LineChartData",
    "LineChartPoint",
    "PieChartSlice",
    "PieChartData",
    "BarChartBar",
    "BarChartData",
    "UserOut",
    "TokenResponse",
    "UserProfileResponse",
    "ErrorResponse",
    "ValidationErrorResponse",
] 