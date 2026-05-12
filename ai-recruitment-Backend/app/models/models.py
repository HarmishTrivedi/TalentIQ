"""
SQLAlchemy ORM Models for AI Recruitment Platform.
Includes: Users, Candidates, Jobs, MatchScores, ChatHistory
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Text, Float, Integer, Boolean, DateTime, 
    ForeignKey, JSON, Enum as SAEnum, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.database.session import Base


def generate_uuid():
    return str(uuid.uuid4())


# ─── Enums ───────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    recruiter = "recruiter"


class CandidateStatus(str, enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    ready = "ready"
    error = "error"


class JobStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    closed = "closed"


# ─── User Model ──────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.recruiter)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role_in_company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    jobs: Mapped[list["Job"]] = relationship("Job", back_populates="created_by_user", lazy="select")
    chat_sessions: Mapped[list["ChatSession"]] = relationship("ChatSession", back_populates="user", lazy="select")

    def __repr__(self):
        return f"<User {self.email}>"


# ─── Candidate Model ─────────────────────────────────────────────────────────

class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # CV Storage
    cv_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    cv_file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    cv_raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # AI-extracted structured data
    skills: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # {technical: [], soft: []}
    experience_years: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    experience_details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    education: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    certifications: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    languages: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Vector store reference
    faiss_doc_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Status
    status: Mapped[CandidateStatus] = mapped_column(
        SAEnum(CandidateStatus), default=CandidateStatus.uploaded
    )
    processing_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    uploaded_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    match_scores: Mapped[list["MatchScore"]] = relationship("MatchScore", back_populates="candidate", lazy="select")
    chat_sessions: Mapped[list["ChatSession"]] = relationship("ChatSession", back_populates="candidate", lazy="select")

    def __repr__(self):
        return f"<Candidate {self.name}>"


# ─── Job Model ───────────────────────────────────────────────────────────────

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    job_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # full-time, part-time, contract
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # AI-extracted requirements
    required_skills: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    preferred_skills: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    required_experience_years: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    required_education: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    salary_range: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Vector store reference
    faiss_doc_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    status: Mapped[JobStatus] = mapped_column(SAEnum(JobStatus), default=JobStatus.active)
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    created_by_user: Mapped[Optional["User"]] = relationship("User", back_populates="jobs")
    match_scores: Mapped[list["MatchScore"]] = relationship("MatchScore", back_populates="job", lazy="select")

    def __repr__(self):
        return f"<Job {self.title}>"


# ─── Match Score Model ───────────────────────────────────────────────────────

class MatchScore(Base):
    __tablename__ = "match_scores"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    candidate_id: Mapped[str] = mapped_column(String(36), ForeignKey("candidates.id"), nullable=False, index=True)
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False, index=True)

    # Scoring components
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    skill_match_score: Mapped[float] = mapped_column(Float, default=0.0)
    experience_match_score: Mapped[float] = mapped_column(Float, default=0.0)
    semantic_similarity_score: Mapped[float] = mapped_column(Float, default=0.0)
    llm_evaluation_score: Mapped[float] = mapped_column(Float, default=0.0)
    education_match_score: Mapped[float] = mapped_column(Float, default=0.0)

    # AI-generated analysis
    strengths: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    weaknesses: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommendation: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # strong_yes, yes, maybe, no

    # Matched/missing skills
    matched_skills: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    missing_skills: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="match_scores")
    job: Mapped["Job"] = relationship("Job", back_populates="match_scores")

    def __repr__(self):
        return f"<MatchScore {self.candidate_id} -> {self.job_id}: {self.overall_score}>"


# ─── Chat Session Model ──────────────────────────────────────────────────────

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    candidate_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("candidates.id"), nullable=True)
    job_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="chat_sessions")
    candidate: Mapped[Optional["Candidate"]] = relationship("Candidate", back_populates="chat_sessions")
    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="session", 
        order_by="ChatMessage.created_at", lazy="select",
        cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    # Relationship
    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")

    def __repr__(self):
        return f"<ChatMessage {self.role}: {self.content[:50]}>"
