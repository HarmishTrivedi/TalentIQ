"""Authentication routes: register, login, refresh token, profile management."""
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
import os, uuid, shutil

from app.database import get_db
from app.models.models import User
from app.models.schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from app.utils.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_current_user,
)
from app.config import settings


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    role_in_company: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user with email domain validation."""
    # Validate email domain
    email = user_data.email.lower()
    domain = email.split('@')[1] if '@' in email else ''
    
    # Allowed domains for security
    allowed_domains = [
        'gmail.com', 'googlemail.com',  # Google
        'outlook.com', 'hotmail.com', 'live.com', 'msn.com',  # Microsoft
        'yahoo.com', 'ymail.com',  # Yahoo
        'icloud.com', 'me.com',  # Apple
        'protonmail.com', 'proton.me',  # ProtonMail
    ]
    
    # Check if it's a company domain (has at least 2 parts after @)
    is_company_domain = len(domain.split('.')) >= 2 and domain not in ['gmail.com', 'yahoo.com', 'hotmail.com']
    
    # Allow if it's a known provider OR a company domain
    if domain not in allowed_domains and not is_company_domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please use a valid email from Gmail, Outlook, Yahoo, or your company domain",
        )
    
    # Check if email exists
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=email,
        full_name=user_data.full_name,
        hashed_password=hash_password(user_data.password),
        role=user_data.role,
        age=user_data.age,
        gender=user_data.gender,
        phone=user_data.phone,
    )
    db.add(user)
    await db.flush()
    return user


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login with email domain validation."""
    email = credentials.email.lower()
    domain = email.split('@')[1] if '@' in email else ''
    
    # Validate email domain for security
    allowed_domains = [
        'gmail.com', 'googlemail.com',
        'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
        'yahoo.com', 'ymail.com',
        'icloud.com', 'me.com',
        'protonmail.com', 'proton.me',
    ]
    
    is_company_domain = len(domain.split('.')) >= 2 and domain not in ['gmail.com', 'yahoo.com', 'hotmail.com']
    
    if domain not in allowed_domains and not is_company_domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please use a valid email from Gmail, Outlook, Yahoo, or your company domain",
        )
    
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    # Auto-seed demo user if missing
    if not user and email == "demo@talentiq.ai":
        user = User(
            email="demo@talentiq.ai",
            full_name="Demo User",
            hashed_password=hash_password("demo1234"),
            role="admin",
        )
        db.add(user)
        await db.flush()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_expire_minutes * 60,
        user=user,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token."""
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token({"sub": user.id})
    new_refresh = create_refresh_token({"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        expires_in=settings.access_token_expire_minutes * 60,
        user=user,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    data: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user profile fields."""
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.phone is not None:
        current_user.phone = data.phone
    if data.company_name is not None:
        current_user.company_name = data.company_name
    if data.role_in_company is not None:
        current_user.role_in_company = data.role_in_company
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/change-password")
async def change_password(
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change current user password after verifying current password."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    current_user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"message": "Password updated successfully"}


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload profile avatar image."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 5MB")

    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    upload_path = os.path.join(settings.upload_dir, filename)

    with open(upload_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    current_user.avatar_url = f"/uploads/{filename}"
    await db.commit()
    return {"avatar_url": current_user.avatar_url}
