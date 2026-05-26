"""
OAuth Authentication Routes - Stateless implementation using httpx directly.
Bypasses Authlib session-based state to avoid Render proxy cookie issues.
"""
from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
import urllib.parse

from app.database import get_db
from app.models.models import User
from app.utils.auth import create_access_token, create_refresh_token
from app.config import settings

router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


@router.get("/google/login")
async def google_login():
    redirect_uri = f"{settings.backend_url}/api/v1/auth/oauth/google/callback"
    params = urllib.parse.urlencode({
        "client_id": settings.google_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    })
    return RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{params}")


@router.get("/google/callback")
async def google_callback(code: str = None, error: str = None, db: AsyncSession = Depends(get_db)):
    if error or not code:
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=oauth_failed")
    try:
        redirect_uri = f"{settings.backend_url}/api/v1/auth/oauth/google/callback"
        async with httpx.AsyncClient() as client:
            # Exchange code for token
            token_resp = await client.post(GOOGLE_TOKEN_URL, data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            })
            token_data = token_resp.json()
            access_token_google = token_data.get("access_token")
            if not access_token_google:
                return RedirectResponse(url=f"{settings.frontend_url}/login?error=oauth_failed")

            # Get user info
            userinfo_resp = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token_google}"}
            )
            user_info = userinfo_resp.json()

        email = user_info.get("email")
        if not email or not user_info.get("email_verified", False):
            return RedirectResponse(url=f"{settings.frontend_url}/login?error=oauth_failed")

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        is_new_user = False
        if not user:
            is_new_user = True
            user = User(
                email=email,
                full_name=user_info.get("name", email.split("@")[0]),
                hashed_password="",
                role="recruiter",
                is_active=True,
                avatar_url=user_info.get("picture"),
                welcome_email_sent=False,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            
            # Send welcome email asynchronously (non-blocking)
            print(f"🎯 New Google OAuth user: {user.email}")
            import asyncio
            from app.services.email_service import get_email_service
            
            async def send_welcome_async():
                try:
                    email_service = get_email_service()
                    success = email_service.send_welcome_email(
                        recruiter_email=user.email,
                        recruiter_name=user.full_name,
                        company_name=None
                    )
                    if success:
                        async with db.begin():
                            user.welcome_email_sent = True
                            await db.commit()
                        print(f"✅ Welcome email sent: {user.email}")
                    else:
                        print(f"❌ Welcome email failed: {user.email}")
                except Exception as e:
                    print(f"❌ Welcome email error: {str(e)}")
            
            # Fire and forget - don't wait for email
            asyncio.create_task(send_welcome_async())
        else:
            await db.commit()
        access_token = create_access_token({"sub": user.id})
        refresh_token = create_refresh_token({"sub": user.id})
        return RedirectResponse(
            url=f"{settings.frontend_url}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
        )
    except Exception as e:
        import logging
        logging.error(f"Google OAuth error: {e}")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=oauth_failed")


