from typing import Optional
from sqlmodel import SQLModel, Field

class Profit(SQLModel, table=True):
    __tablename__ = "profits"

    id: Optional[int] = Field(default=None, primary_key=True)
    company: str = Field(index=True)
    year: int = Field(index=True)
    month: int = Field(ge=1, le=12)
    profit: float = Field(ge=0) 