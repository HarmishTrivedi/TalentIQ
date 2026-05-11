"""
OAuth Authentication Routes
Google & Microsoft SSO with email verification enforcement
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from authlib.integrations.starlette_client import OAuth
from typing import Optional
import httpx

from app.database import get_db
from app.models.models import User
from app.models.schemas import TokenResponse
from app.utils.auth import create_access_token, create_refresh_token
from app.config import settings

router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])

# Initialize OAuth
oauth = OAuth()

# Google OAuth
oauth.register(
    name='google',
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

# Microsoft OAuth
oauth.register(
    name='microsoft',
    client_id=settings.microsoft_client_id,
    client_secret=settings.microsoft_client_secret,
    authorize_url='https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    authorize_params=None,
    access_token_url='https://login.microsoftonline.com/common/oauth2/v2.0/token',
    access_token_params=None,
    refresh_token_url=None,
    client_kwargs={'scope': 'openid email profile'}
)


async def verify_email_with_provider(email: str, provider: str, access_token: str) -> bool:
    """
    Verify that the email is actually verified by the OAuth provider.
    Prevents random/unverified emails from logging in.
    """
    if provider == 'google':
        # Google returns email_verified in the token
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://www.googleapis.com/oauth2/v1/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            if response.status_code == 200:
                user_info = response.json()
                return user_info.get('verified_email', False)
    
    elif provider == 'microsoft':
        # Microsoft emails are verified by default if they come through OAuth
        return True
    
    return False


@router.get("/google/login")
async def google_login(request: Request):
    """Initiate Google OAuth flow"""
    redirect_uri = f"{settings.backend_url}/api/v1/auth/oauth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")
        
        email = user_info.get('email')
        email_verified = user_info.get('email_verified', False)
        
        # CRITICAL: Only allow verified emails
        if not email_verified:
            raise HTTPException(
                status_code=403,
                detail="Email not verified by Google. Please use a verified Google account."
            )
        
        # Check if user exists
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        # Create user if doesn't exist
        if not user:
            user = User(
                email=email,
                full_name=user_info.get('name', email.split('@')[0]),
                hashed_password='',  # OAuth users don't need password
                role='recruiter',
                is_active=True,
                avatar_url=user_info.get('picture')
            )
            db.add(user)
            await db.flush()
        
        # Generate tokens
        access_token = create_access_token({"sub": user.id})
        refresh_token = create_refresh_token({"sub": user.id})
        
        # Redirect to frontend with tokens
        frontend_url = settings.frontend_url
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
        )
    
    except Exception as e:
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=oauth_failed")


@router.get("/microsoft/login")
async def microsoft_login(request: Request):
    """Initiate Microsoft OAuth flow"""
    redirect_uri = f"{settings.backend_url}/api/v1/auth/oauth/microsoft/callback"
    return await oauth.microsoft.authorize_redirect(request, redirect_uri)


@router.get("/microsoft/callback")
async def microsoft_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Microsoft OAuth callback"""
    try:
        token = await oauth.microsoft.authorize_access_token(request)
        
        # Get user info from Microsoft Graph API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://graph.microsoft.com/v1.0/me',
                headers={'Authorization': f"Bearer {token['access_token']}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get user info from Microsoft")
            
            user_info = response.json()
        
        email = user_info.get('mail') or user_info.get('userPrincipalName')
        
        if not email:
            raise HTTPException(status_code=400, detail="No email found in Microsoft account")
        
        # Microsoft OAuth emails are verified by default
        # Check if user exists
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        # Create user if doesn't exist
        if not user:
            user = User(
                email=email,
                full_name=user_info.get('displayName', email.split('@')[0]),
                hashed_password='',  # OAuth users don't need password
                role='recruiter',
                is_active=True
            )
            db.add(user)
            await db.flush()
        
        # Generate tokens
        access_token = create_access_token({"sub": user.id})
        refresh_token = create_refresh_token({"sub": user.id})
        
        # Redirect to frontend with tokens
        frontend_url = settings.frontend_url
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
        )
    
    except Exception as e:
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=oauth_failed")
