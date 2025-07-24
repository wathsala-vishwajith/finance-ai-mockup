import random
from decimal import Decimal
import pandas as pd
from datetime import datetime
from sqlmodel import SQLModel, create_engine, Session, select
from passlib.context import CryptContext
from sqlalchemy.pool import StaticPool

from be.models import User, Profit
from be.core.config import DATABASE_URL

# Create engine
engine = create_engine(
    DATABASE_URL, 
    echo=False,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    pool_pre_ping=True
)

# Password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_db_and_tables():
    """Create all database tables"""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Dependency to get database session"""
    with Session(engine) as session:
        yield session


async def seed_db():
    """Seed the database with initial data"""
    with Session(engine) as session:
        # Check if demo user already exists
        if session.exec(select(User).where(User.username == "demo")).first():
            return
            
        # Create demo user with secure password
        demo_pwd = pwd_context.hash("SecureDemo123!")
        demo_user = User(
            username="demo", 
            email="demo@example.com",
            password_hash=demo_pwd,
            full_name="Demo User"
        )
        session.add(demo_user)
        session.commit()
        session.refresh(demo_user)

        # Insert synthetic profit data for 5 companies × 24 months
        companies = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"]
        date_range = pd.period_range("2022-01", "2023-12", freq="M")
        
        for company in companies:
            for dt in date_range:
                profit_amount = round(random.uniform(50_000, 250_000), 2)
                session.add(Profit(company=company, year=dt.year, month=dt.month, profit=profit_amount))
        
        session.commit() 