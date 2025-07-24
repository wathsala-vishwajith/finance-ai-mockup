import os
from typing import List

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-please")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Security Configuration
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128
USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 30

# Rate Limiting
RATE_LIMIT_REGISTER = "5/hour"
RATE_LIMIT_LOGIN = "10/15minutes"
RATE_LIMIT_REFRESH = "20/hour"

# CORS Configuration
ALLOWED_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:80",  # Docker container communication
    "http://localhost:80", # Frontend container port mapping
]

# Database Configuration
DATABASE_URL = "sqlite:///:memory:"

# Request Limits
MAX_REQUEST_SIZE = 1024 * 1024  # 1MB 