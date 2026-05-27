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


# ─── Email Activity Log Model ────────────────────────────────────────────────

class EmailActivityLog(Base):
    __tablename__ = "email_activity_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    recipient_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email_type: Mapped[str] = mapped_column(String(100), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # sent, failed, pending
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    related_entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    def __repr__(self):
        return f"<EmailActivityLog {self.email_type} to {self.recipient_email}: {self.status}>"


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
    welcome_email_sent: Mapped[bool] = mapped_column(Boolean, default=False)  # Track if welcome email was sent
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
    domain: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

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
    projects: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
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
    domain: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

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


# ─── Interview System Models ─────────────────────────────────────────────────

class InterviewStatus(str, enum.Enum):
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class QuestionDifficulty(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"
    expert = "expert"


class QuestionCategory(str, enum.Enum):
    technical_frontend = "technical_frontend"
    technical_backend = "technical_backend"
    technical_ai_ml = "technical_ai_ml"
    technical_dsa = "technical_dsa"
    technical_database = "technical_database"
    technical_devops = "technical_devops"
    technical_cloud = "technical_cloud"
    technical_security = "technical_security"
    technical_system_design = "technical_system_design"
    behavioral_hr = "behavioral_hr"
    behavioral_leadership = "behavioral_leadership"
    behavioral_communication = "behavioral_communication"
    behavioral_teamwork = "behavioral_teamwork"
    coding_algorithms = "coding_algorithms"
    coding_debugging = "coding_debugging"
    coding_sql = "coding_sql"


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    candidate_id: Mapped[str] = mapped_column(String(36), ForeignKey("candidates.id"), nullable=False, index=True)
    job_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=True, index=True)
    recruiter_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[InterviewStatus] = mapped_column(SAEnum(InterviewStatus), default=InterviewStatus.scheduled)
    
    # Candidate Access
    candidate_access_token: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True, index=True)
    meeting_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # Permanent meeting URL for candidate
    interview_types: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)  # ["Technical", "HR", "Coding"]
    
    # Scheduling
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Recording & Transcript
    recording_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # AI Analysis Results
    overall_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    technical_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    communication_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    coding_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Fraud Detection
    fraud_risk_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # low, medium, high
    ai_assistance_probability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    plagiarism_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    suspicious_activities: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    
    # AI Generated Summary
    strengths: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    weaknesses: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    hiring_recommendation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Metadata
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    candidate: Mapped["Candidate"] = relationship("Candidate", foreign_keys=[candidate_id])
    job: Mapped[Optional["Job"]] = relationship("Job", foreign_keys=[job_id])
    recruiter: Mapped["User"] = relationship("User", foreign_keys=[recruiter_id])
    questions: Mapped[list["InterviewQuestion"]] = relationship("InterviewQuestion", back_populates="interview", cascade="all, delete-orphan")
    events: Mapped[list["InterviewEvent"]] = relationship("InterviewEvent", back_populates="interview", cascade="all, delete-orphan")
    analysis: Mapped[Optional["InterviewAnalysis"]] = relationship("InterviewAnalysis", back_populates="interview", uselist=False, cascade="all, delete-orphan")


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    interview_id: Mapped[str] = mapped_column(String(36), ForeignKey("interviews.id"), nullable=False, index=True)
    
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[QuestionCategory] = mapped_column(SAEnum(QuestionCategory), nullable=False)
    difficulty: Mapped[QuestionDifficulty] = mapped_column(SAEnum(QuestionDifficulty), nullable=False)
    
    # Answer & Evaluation
    candidate_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    answer_duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # AI Evaluation
    answer_quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    technical_depth_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    communication_quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_evaluation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Coding Question Specific
    code_submitted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    code_language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    code_execution_result: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    code_quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    code_plagiarism_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Metadata
    asked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    answered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    # Relationship
    interview: Mapped["Interview"] = relationship("Interview", back_populates="questions")


class InterviewEvent(Base):
    __tablename__ = "interview_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    interview_id: Mapped[str] = mapped_column(String(36), ForeignKey("interviews.id"), nullable=False, index=True)
    
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)  # tab_switch, copy_paste, pause, eye_movement, etc.
    event_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    severity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # low, medium, high
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    # Relationship
    interview: Mapped["Interview"] = relationship("Interview", back_populates="events")


class InterviewAnalysis(Base):
    __tablename__ = "interview_analysis"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    interview_id: Mapped[str] = mapped_column(String(36), ForeignKey("interviews.id"), nullable=False, unique=True, index=True)
    
    # Comprehensive Scores
    overall_rating: Mapped[float] = mapped_column(Float, nullable=False)
    technical_rating: Mapped[float] = mapped_column(Float, default=0.0)
    communication_rating: Mapped[float] = mapped_column(Float, default=0.0)
    coding_rating: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_rating: Mapped[float] = mapped_column(Float, default=0.0)
    problem_solving_rating: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Communication Analysis
    speech_clarity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    professionalism: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    filler_words_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    speaking_speed_wpm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    nervousness_indicators: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    
    # Fraud Analysis
    fraud_risk_level: Mapped[str] = mapped_column(String(50), default="low")
    ai_assistance_probability: Mapped[float] = mapped_column(Float, default=0.0)
    plagiarism_indicators: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    suspicious_behavior_timeline: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    tab_switching_count: Mapped[int] = mapped_column(Integer, default=0)
    copy_paste_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # AI Generated Insights
    candidate_strengths: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    candidate_weaknesses: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    hiring_recommendation: Mapped[str] = mapped_column(String(100), nullable=False)
    technical_fit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cultural_fit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    improvement_areas: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    next_round_suggestion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Timeline
    important_moments: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    strong_answers: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    weak_responses: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    
    # Full AI Summary
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationship
    interview: Mapped["Interview"] = relationship("Interview", back_populates="analysis")


class QuestionTemplate(Base):
    __tablename__ = "question_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[QuestionCategory] = mapped_column(SAEnum(QuestionCategory), nullable=False, index=True)
    difficulty: Mapped[QuestionDifficulty] = mapped_column(SAEnum(QuestionDifficulty), nullable=False, index=True)
    
    # For coding questions
    starter_code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    test_cases: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    expected_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Metadata
    tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    estimated_time_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
