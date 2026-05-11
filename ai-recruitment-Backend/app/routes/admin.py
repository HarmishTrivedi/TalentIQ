"""Admin-only routes: user management, platform stats, create admin, usage analytics, pricing."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

from app.database import get_db
from app.models.models import User, Candidate, Job, MatchScore, ChatSession, ChatMessage
from app.models.schemas import UserResponse
from app.utils.auth import get_current_user, hash_password

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


class CreateAdminRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2)
    password: str = Field(min_length=8)


class UpdateUserRequest(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None


class PricingPlanRequest(BaseModel):
    name: str = Field(min_length=2)
    price_monthly: float = Field(ge=0)
    price_yearly: float = Field(ge=0)
    max_candidates: int = Field(ge=-1)
    max_jobs: int = Field(ge=-1)
    max_ai_matches: int = Field(ge=-1)
    max_chat_sessions: int = Field(ge=-1)
    features: List[str] = []
    is_active: bool = True


# In-memory pricing store (replace with DB model in production)
_pricing_plans = [
    {
        "id": "free",
        "name": "Free",
        "price_monthly": 0,
        "price_yearly": 0,
        "max_candidates": 10,
        "max_jobs": 3,
        "max_ai_matches": 20,
        "max_chat_sessions": 5,
        "features": ["Basic CV parsing", "3 job postings", "20 AI matches"],
        "is_active": True,
    },
    {
        "id": "pro",
        "name": "Pro",
        "price_monthly": 49,
        "price_yearly": 470,
        "max_candidates": 200,
        "max_jobs": 50,
        "max_ai_matches": 500,
        "max_chat_sessions": 100,
        "features": ["Advanced CV parsing", "50 job postings", "500 AI matches", "Priority support"],
        "is_active": True,
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "price_monthly": 199,
        "price_yearly": 1990,
        "max_candidates": -1,
        "max_jobs": -1,
        "max_ai_matches": -1,
        "max_chat_sessions": -1,
        "features": ["Unlimited everything", "Custom integrations", "Dedicated support", "SLA guarantee"],
        "is_active": True,
    },
]


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List all registered users."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("/users/create-admin", response_model=UserResponse, status_code=201)
async def create_admin(
    data: CreateAdminRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Create a new admin user."""
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role="admin",
    )
    db.add(user)
    await db.flush()
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Enable/disable user or change role."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.role is not None:
        user.role = data.role
    await db.flush()
    return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Delete a user account."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin" and user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    await db.delete(user)


@router.get("/platform-stats")
async def platform_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Full platform statistics for admin."""
    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    total_admins = (await db.execute(select(func.count(User.id)).where(User.role == "admin"))).scalar()
    total_recruiters = (await db.execute(select(func.count(User.id)).where(User.role == "recruiter"))).scalar()
    total_candidates = (await db.execute(select(func.count(Candidate.id)))).scalar()
    total_jobs = (await db.execute(select(func.count(Job.id)))).scalar()
    total_matches = (await db.execute(select(func.count(MatchScore.id)))).scalar()
    total_chats = (await db.execute(select(func.count(ChatSession.id)))).scalar()
    avg_score = (await db.execute(select(func.avg(MatchScore.overall_score)))).scalar()

    # Recent users
    recent_users_result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(5)
    )
    recent_users = [
        {"id": u.id, "name": u.full_name, "email": u.email, "role": u.role,
         "is_active": u.is_active, "joined": u.created_at.isoformat()}
        for u in recent_users_result.scalars()
    ]

    return {
        "users": {"total": total_users, "admins": total_admins, "recruiters": total_recruiters},
        "platform": {
            "total_candidates": total_candidates,
            "total_jobs": total_jobs,
            "total_matches": total_matches,
            "total_chats": total_chats,
            "avg_match_score": round(float(avg_score or 0), 1),
        },
        "recent_users": recent_users,
    }


@router.get("/usage-stats")
async def usage_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Per-user usage analytics (privacy-safe: counts only, no content)."""
    users_result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = users_result.scalars().all()

    usage = []
    for u in users:
        jobs_count = (await db.execute(
            select(func.count(Job.id)).where(Job.created_by == u.id)
        )).scalar() or 0

        matches_count = (await db.execute(
            select(func.count(MatchScore.id))
            .join(Job, MatchScore.job_id == Job.id)
            .where(Job.created_by == u.id)
        )).scalar() or 0

        chats_count = (await db.execute(
            select(func.count(ChatSession.id)).where(ChatSession.user_id == u.id)
        )).scalar() or 0

        messages_count = (await db.execute(
            select(func.count(ChatMessage.id))
            .join(ChatSession, ChatMessage.session_id == ChatSession.id)
            .where(ChatSession.user_id == u.id)
        )).scalar() or 0

        last_active_result = await db.execute(
            select(func.max(ChatSession.updated_at)).where(ChatSession.user_id == u.id)
        )
        last_active = last_active_result.scalar()

        usage.append({
            "user_id": u.id,
            "name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "joined": u.created_at.isoformat(),
            "jobs_created": jobs_count,
            "ai_matches_run": matches_count,
            "chat_sessions": chats_count,
            "chat_messages": messages_count,
            "last_active": last_active.isoformat() if last_active else None,
        })

    return {"usage": usage, "total_users": len(usage)}


@router.get("/pricing")
async def get_pricing(
    admin: User = Depends(require_admin),
):
    """Get all pricing plans."""
    return {"plans": _pricing_plans}


@router.post("/pricing", status_code=201)
async def create_pricing_plan(
    data: PricingPlanRequest,
    admin: User = Depends(require_admin),
):
    """Create a new pricing plan."""
    import uuid
    plan = {"id": str(uuid.uuid4())[:8], **data.model_dump()}
    _pricing_plans.append(plan)
    return plan


@router.put("/pricing/{plan_id}")
async def update_pricing_plan(
    plan_id: str,
    data: PricingPlanRequest,
    admin: User = Depends(require_admin),
):
    """Update an existing pricing plan."""
    for i, plan in enumerate(_pricing_plans):
        if plan["id"] == plan_id:
            _pricing_plans[i] = {"id": plan_id, **data.model_dump()}
            return _pricing_plans[i]
    raise HTTPException(status_code=404, detail="Plan not found")


@router.delete("/pricing/{plan_id}", status_code=204)
async def delete_pricing_plan(
    plan_id: str,
    admin: User = Depends(require_admin),
):
    """Delete a pricing plan."""
    global _pricing_plans
    original_len = len(_pricing_plans)
    _pricing_plans = [p for p in _pricing_plans if p["id"] != plan_id]
    if len(_pricing_plans) == original_len:
        raise HTTPException(status_code=404, detail="Plan not found")


# ─── Subscriptions ────────────────────────────────────────────────────────────

_subscriptions: list = []


class SubscriptionRequest(BaseModel):
    plan_id: str
    billing_cycle: str = "monthly"  # monthly | yearly


class SubscriptionStatusRequest(BaseModel):
    status: str  # active | cancelled | pending


@router.post("/subscribe", status_code=201)
async def subscribe_to_plan(
    data: SubscriptionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """User subscribes to a plan."""
    import uuid
    plan = next((p for p in _pricing_plans if p["id"] == data.plan_id), None)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if not plan["is_active"]:
        raise HTTPException(status_code=400, detail="Plan is not available")

    price = plan["price_yearly"] if data.billing_cycle == "yearly" else plan["price_monthly"]

    subscription = {
        "id": str(uuid.uuid4())[:12],
        "user_id": current_user.id,
        "user_name": current_user.full_name,
        "user_email": current_user.email,
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "billing_cycle": data.billing_cycle,
        "price": price,
        "status": "pending",
        "subscribed_at": datetime.utcnow().isoformat(),
        "features": plan["features"],
        "max_candidates": plan["max_candidates"],
        "max_jobs": plan["max_jobs"],
        "max_ai_matches": plan["max_ai_matches"],
        "max_chat_sessions": plan["max_chat_sessions"],
    }
    _subscriptions.append(subscription)
    return subscription


@router.get("/subscriptions")
async def list_subscriptions(
    admin: User = Depends(require_admin),
):
    """Admin: list all subscription entries."""
    total_revenue = sum(s["price"] for s in _subscriptions if s["status"] == "active")
    active   = sum(1 for s in _subscriptions if s["status"] == "active")
    pending  = sum(1 for s in _subscriptions if s["status"] == "pending")
    cancelled = sum(1 for s in _subscriptions if s["status"] == "cancelled")
    return {
        "subscriptions": sorted(_subscriptions, key=lambda x: x["subscribed_at"], reverse=True),
        "summary": {
            "total": len(_subscriptions),
            "active": active,
            "pending": pending,
            "cancelled": cancelled,
            "total_revenue": round(total_revenue, 2),
        },
    }


@router.patch("/subscriptions/{sub_id}")
async def update_subscription_status(
    sub_id: str,
    data: SubscriptionStatusRequest,
    admin: User = Depends(require_admin),
):
    """Admin: approve, cancel, or update a subscription."""
    if data.status not in ("active", "cancelled", "pending"):
        raise HTTPException(status_code=400, detail="Invalid status")
    for sub in _subscriptions:
        if sub["id"] == sub_id:
            sub["status"] = data.status
            return sub
    raise HTTPException(status_code=404, detail="Subscription not found")
