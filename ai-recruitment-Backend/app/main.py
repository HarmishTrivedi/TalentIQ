"""
AI Recruitment Intelligence Platform - FastAPI Application
Production-ready with async DB, FAISS, LangChain, JWT Auth
"""
import os
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db
from app.routes import auth, candidates, jobs, matching, chat, dashboard, admin, oauth, interviews

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.dev.ConsoleRenderer() if settings.debug else structlog.processors.JSONRenderer(),
    ],
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle events."""
    logger.info("🚀 Starting AI Recruitment Platform", version=settings.app_version)

    # Initialize database
    try:
        await init_db()
        logger.info("✅ Database initialized")
    except Exception as e:
        logger.error("❌ Database initialization failed", error=str(e))

    # Initialize vector store
    try:
        from app.vector_store.faiss_store import get_vector_store
        vs = get_vector_store()
        await vs.initialize()
        stats = vs.get_stats()
        logger.info("✅ FAISS vector store ready", **stats)
    except Exception as e:
        logger.warning("⚠️  FAISS initialization warning", error=str(e))

    # Ensure upload directory exists
    os.makedirs(settings.upload_dir, exist_ok=True)

    # Seed users
    try:
        from app.database import AsyncSessionLocal
        from app.models.models import User
        from app.utils.auth import hash_password
        from sqlalchemy import select
        async with AsyncSessionLocal() as db:
            # Seed admin user
            result = await db.execute(select(User).where(User.email == "harmish@gmail.com"))
            if not result.scalar_one_or_none():
                db.add(User(
                    email="harmish@gmail.com",
                    full_name="Harmish",
                    hashed_password=hash_password("Harmish@1234"),
                    role="admin",
                ))
                logger.info("✅ Admin user created")
            # Seed demo user
            result2 = await db.execute(select(User).where(User.email == "demo@talentiq.ai"))
            if not result2.scalar_one_or_none():
                db.add(User(
                    email="demo@talentiq.ai",
                    full_name="Demo User",
                    hashed_password=hash_password("demo1234"),
                    role="admin",
                ))
                logger.info("✅ Demo user created")
            # Seed demo recruiter (Jonathan Byers)
            result3 = await db.execute(select(User).where(User.email == "jonathan@talentiq.ai"))
            if not result3.scalar_one_or_none():
                db.add(User(
                    email="jonathan@talentiq.ai",
                    full_name="Jonathan Byers",
                    hashed_password=hash_password("Jonathan@1234"),
                    role="recruiter",
                ))
                logger.info("✅ Jonathan Byers recruiter created")
            await db.commit()
            logger.info("✅ Users seeded")
    except Exception as e:
        logger.warning("⚠️  User seed failed", error=str(e))

    logger.info("✅ All systems ready. Platform is live.")
    
    # Start welcome email worker
    try:
        from app.services.welcome_email_worker import start_welcome_email_worker
        start_welcome_email_worker()
        logger.info("✅ Welcome email worker started")
    except Exception as e:
        logger.warning("⚠️  Welcome email worker failed to start", error=str(e))
    
    # Start reminder scheduler
    try:
        from app.services.reminder_scheduler import start_reminder_scheduler
        start_reminder_scheduler()
        logger.info("✅ Interview reminder scheduler started")
    except Exception as e:
        logger.warning("⚠️  Reminder scheduler failed to start", error=str(e))
    
    yield

    logger.info("🛑 Shutting down AI Recruitment Platform")


# ─── App Instance ──────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
## AI Recruitment Intelligence Platform

A production-ready AI-powered recruitment system featuring:
- **CV Processing**: Extract structured data from resumes with LLM
- **Job Matching**: Hybrid AI scoring (semantic + skills + experience)
- **AI Screening Chat**: Context-aware interview assistant
- **JWT Authentication**: Secure role-based access control

### Tech Stack
FastAPI · LangChain · OpenAI · FAISS · PostgreSQL · SQLAlchemy
    """,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Mount uploads directory for static file serving
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── CORS Middleware (MUST BE LAST/OUTERMOST) ────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ─── Exception Handlers ───────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " -> ".join(str(x) for x in error["loc"]),
            "message": error["msg"],
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "Validation failed", "details": errors},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error", "detail": str(exc) if settings.debug else "An error occurred"},
    )


# ─── Routes ───────────────────────────────────────────────────────────────────

API_V1 = "/api/v1"

app.include_router(auth.router, prefix=API_V1)
app.include_router(oauth.router, prefix=API_V1)
app.include_router(candidates.router, prefix=API_V1)
app.include_router(jobs.router, prefix=API_V1)
app.include_router(matching.router, prefix=API_V1)
app.include_router(chat.router, prefix=API_V1)
app.include_router(dashboard.router, prefix=API_V1)
app.include_router(admin.router, prefix=API_V1)
app.include_router(interviews.router, prefix=API_V1)


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for load balancers."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "provider": settings.ai_provider,
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/api/docs",
        "health": "/health",
    }
