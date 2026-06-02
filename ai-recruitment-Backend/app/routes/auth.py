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
from app.services.new_email_service import get_new_email_service


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
        welcome_email_sent=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Send Welcome Email (First time only)
    try:
        email_service = get_new_email_service()
        await email_service.send_welcome_email(user.email, user.full_name, related_id=user.id)
        user.welcome_email_sent = True
        await db.commit()
    except Exception as e:
        print(f"⚠️ Failed to send welcome email during registration: {e}")
    
    print(f"✅ New user registered: {email}")
    
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

    from datetime import datetime, timezone, timedelta
    # Use naive UTC datetime to match database column type (TIMESTAMP WITHOUT TIME ZONE)
    now_naive = datetime.utcnow()
    user.last_login = now_naive
    
    # Check if welcome email needs to be sent
    if not user.welcome_email_sent and user.role == 'recruiter':
        # Ensure comparison uses naive datetimes
        created_at_naive = user.created_at
        if created_at_naive:
            # Handle if created_at is aware for some reason
            if created_at_naive.tzinfo:
                created_at_naive = created_at_naive.replace(tzinfo=None)
                
            just_created = (now_naive - created_at_naive) < timedelta(minutes=10)
            
            if just_created:
                try:
                    email_service = get_new_email_service()
                    await email_service.send_welcome_email(user.email, user.full_name, related_id=user.id)
                    user.welcome_email_sent = True
                except Exception as e:
                    print(f"⚠️ Failed to send welcome email during login: {e}")

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


@router.post("/forgot-password")
async def forgot_password(data: dict, db: AsyncSession = Depends(get_db)):
    """Request a password reset."""
    email = data.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        # For security, don't reveal if user exists, but here we'll be helpful for now
        raise HTTPException(status_code=404, detail="User not found")
    
    # In a real app, generate a secure token. 
    # For this implementation, we'll redirect to reset page with email (simplified as requested)
    return {"message": "Reset request received", "email": email}


@router.post("/reset-password")
async def reset_password(data: dict, db: AsyncSession = Depends(get_db)):
    """Reset password for a user."""
    email = data.get("email", "").lower().strip()
    new_password = data.get("password")
    
    if not email or not new_password:
        raise HTTPException(status_code=400, detail="Email and password are required")
        
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.hashed_password = hash_password(new_password)
    await db.commit()
    
    return {"message": "Password reset successfully"}


@router.post("/send-welcome-email")
async def send_welcome_email_manually(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Manually send welcome email to current user (for testing/resend)"""
    try:
        email_service = get_new_email_service()
        result = await email_service.send_welcome_email(
            user_email=current_user.email,
            user_name=current_user.full_name,
            related_id=current_user.id
        )
        
        if result.get("status") == "sent":
            current_user.welcome_email_sent = True
            await db.commit()
            return {
                "message": "Welcome email sent successfully",
                "email": current_user.email,
                "success": True
            }
        else:
            return {
                "message": "Failed to send welcome email",
                "email": current_user.email,
                "success": False,
                "error": result.get("error_message")
            }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error sending welcome email: {error_details}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {str(e)}"
        )
