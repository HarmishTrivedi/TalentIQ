"""
Async database engine and session management.
Uses SQLAlchemy 2.0 async patterns.
"""
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData, text
from app.config import settings
import structlog

logger = structlog.get_logger()

# Naming convention for constraints
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata = MetaData(naming_convention=convention)


class Base(DeclarativeBase):
    metadata = metadata


# Create async engine
engine = create_async_engine(
    settings.database_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_pre_ping=True,
    echo=settings.debug,
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncSession:
    """Dependency for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables and run lightweight migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Lightweight migrations: add missing columns if they don't exist
        migrations = [
            "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(36) REFERENCES users(id)",
            "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS processing_error TEXT",
            "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS faiss_doc_ids JSON",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS role_in_company VARCHAR(255)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)",
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_access_token VARCHAR(100)",
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_interviews_candidate_access_token ON interviews(candidate_access_token)",
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interview_types JSON",
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS meeting_url VARCHAR(500)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT FALSE",
        ]
        for sql in migrations:
            try:
                await conn.execute(text(sql))
            except Exception:
                pass  # column may already exist or table not yet created

    logger.info("Database initialized successfully")


async def drop_db():
    """Drop all tables (use with caution!)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    logger.warning("All database tables dropped")
