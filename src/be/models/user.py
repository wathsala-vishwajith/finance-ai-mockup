from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True, min_length=3, max_length=30)
    email: str = Field(unique=True, index=True)
    password_hash: str
    full_name: Optional[str] = Field(default=None, max_length=100)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)

    # Relationship to refresh tokens
    refresh_tokens: List["RefreshToken"] = Relationship(back_populates="user")

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .token import RefreshToken 