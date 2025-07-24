from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship

class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    token_hash: str = Field(index=True)
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_revoked: bool = Field(default=False)

    # Relationship to user
    user: Optional["User"] = Relationship(back_populates="refresh_tokens")

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .user import User 