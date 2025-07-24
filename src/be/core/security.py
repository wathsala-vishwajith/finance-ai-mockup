import hashlib
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from be.models import User, RefreshToken
from be.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
from be.core.database import get_session

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme
security_scheme = HTTPBearer()


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain password against its hash"""
    return pwd_context.verify(plain, hashed)


def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow(), "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires: Optional[timedelta] = None) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "iat": datetime.utcnow(), "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _hash_token(token: str) -> str:
    """Hash a token for secure storage"""
    return hashlib.sha256(token.encode()).hexdigest()


def verify_token(token: str, expected_type: str = "access") -> Optional[dict]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_type = payload.get("type")
        if token_type != expected_type:
            return None
        return payload
    except JWTError:
        return None


def authenticate_user(session: Session, username: str, password: str) -> Optional[User]:
    """Authenticate a user by username and password"""
    user = session.exec(select(User).where(User.username == username)).first()
    if user and user.is_active and verify_password(password, user.password_hash):
        return user
    return None


def store_refresh_token(session: Session, user_id: int, refresh_token: str):
    """Store a refresh token in the database"""
    payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
    session.add(RefreshToken(user_id=user_id, token_hash=_hash_token(refresh_token), expires_at=datetime.fromtimestamp(payload["exp"])) )
    session.commit()


def verify_refresh_token(session: Session, refresh_token: str) -> Optional[User]:
    """Verify a refresh token and return the associated user"""
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            return None
    except JWTError:
        return None
    db_token = session.exec(select(RefreshToken).where(
        RefreshToken.token_hash == _hash_token(refresh_token),
        RefreshToken.is_revoked == False,
        RefreshToken.expires_at > datetime.utcnow()
    )).first()
    if not db_token:
        return None
    return session.exec(select(User).where(User.id == db_token.user_id)).first()


def revoke_refresh_token(session: Session, refresh_token: str) -> bool:
    """Revoke a refresh token"""
    db_token = session.exec(select(RefreshToken).where(RefreshToken.token_hash == _hash_token(refresh_token))).first()
    if db_token:
        db_token.is_revoked = True
        session.commit()
        return True
    return False


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme), session: Session = Depends(get_session)) -> User:
    """Dependency to get the current authenticated user"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = session.exec(select(User).where(User.id == int(payload.get("sub")))).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to get the current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user 