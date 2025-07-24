from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

from be.core.database import get_session
from be.models import User
from be.schemas import (
    UserRegisterRequest, 
    UserLoginRequest, 
    TokenRefreshRequest,
    UserOut, 
    TokenResponse, 
    UserProfileResponse,
    ErrorResponse
)
from be.core.security import (
    hash_password,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    store_refresh_token,
    verify_refresh_token,
    revoke_refresh_token,
    get_current_active_user
)
from be.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    RATE_LIMIT_REGISTER,
    RATE_LIMIT_LOGIN,
    RATE_LIMIT_REFRESH
)

router = APIRouter(prefix="/auth", tags=["authentication"])
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        409: {"model": ErrorResponse, "description": "User already exists"},
        422: {"model": ErrorResponse, "description": "Validation Error"}
    }
)
@limiter.limit(RATE_LIMIT_REGISTER)
async def register(
    request: Request,
    user_data: UserRegisterRequest,
    session: Annotated[Session, Depends(get_session)]
):
    """
    Register a new user account.
    
    - **username**: Unique username (3-30 chars, alphanumeric + underscore)
    - **email**: Valid email address
    - **password**: Strong password (8+ chars with upper, lower, number, special char)
    - **full_name**: Optional full name
    """
    # Check if username already exists
    existing_user_by_username = session.exec(
        select(User).where(User.username == user_data.username)
    ).first()
    if existing_user_by_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_user_by_email = session.exec(
        select(User).where(User.email == user_data.email)
    ).first()
    if existing_user_by_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        full_name=user_data.full_name
    )
    
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    
    return UserOut.from_orm(db_user)


@router.post(
    "/login",
    response_model=TokenResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid credentials"},
        422: {"model": ErrorResponse, "description": "Validation Error"}
    }
)
@limiter.limit(RATE_LIMIT_LOGIN)
async def login(
    request: Request,
    user_credentials: UserLoginRequest,
    session: Annotated[Session, Depends(get_session)]
):
    """
    Authenticate user and return JWT tokens.
    
    - **username**: User's username
    - **password**: User's password
    
    Returns access token (15 min) and refresh token (7 days).
    """
    # Authenticate user
    user = authenticate_user(session, user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password"
        )
    
    # Create tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=access_token_expires
    )
    
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "username": user.username}
    )
    
    # Store refresh token in database
    store_refresh_token(session, user.id, refresh_token)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid refresh token"},
        422: {"model": ErrorResponse, "description": "Validation Error"}
    }
)
@limiter.limit(RATE_LIMIT_REFRESH)
async def refresh_token(
    request: Request,
    token_data: TokenRefreshRequest,
    session: Annotated[Session, Depends(get_session)]
):
    """
    Refresh access token using refresh token.
    
    - **refresh_token**: Valid refresh token
    
    Returns new access token and optionally new refresh token.
    """
    # Verify refresh token
    user = verify_refresh_token(session, token_data.refresh_token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=access_token_expires
    )
    
    # Optionally rotate refresh token (for enhanced security)
    # For simplicity, we'll reuse the same refresh token
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=token_data.refresh_token,  # Reuse existing refresh token
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.get(
    "/me",
    response_model=UserProfileResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        403: {"model": ErrorResponse, "description": "Inactive user"}
    }
)
async def get_profile(
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Get current user profile.
    
    Requires valid JWT access token in Authorization header.
    """
    return UserProfileResponse(user=UserOut.from_orm(current_user))


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"}
    }
)
async def logout(
    token_data: TokenRefreshRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[Session, Depends(get_session)]
):
    """
    Logout user by revoking refresh token.
    
    - **refresh_token**: Refresh token to revoke
    """
    # Revoke the refresh token
    revoked = revoke_refresh_token(session, token_data.refresh_token)
    
    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid refresh token"
        )
    
    return {"detail": "Successfully logged out"} 