"""
Pydantic schemas for API request/response validation.
Separate from SQLAlchemy models for clean separation of concerns.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, field_validator
import enum


# ─── Base ─────────────────────────────────────────────────────────────────────

class BaseResponse(BaseModel):
    model_config = {"from_attributes": True}


# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8)
    phone: Optional[str] = None
    company_name: Optional[str] = None
    role_in_company: Optional[str] = None
    # kept for backward compat (OAuth users may still send these)
    age: Optional[int] = None
    gender: Optional[str] = None
    role: str = "recruiter"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseResponse):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    role_in_company: Optional[str] = None
    avatar_url: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


# ─── Candidate Schemas ────────────────────────────────────────────────────────

class SkillSet(BaseModel):
    technical: List[str] = []
    soft: List[str] = []
    tools: List[str] = []
    frameworks: List[str] = []


class ExperienceDetail(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None


class EducationDetail(BaseModel):
    degree: Optional[str] = None
    institution: Optional[str] = None
    year: Optional[str] = None
    field: Optional[str] = None


class CandidateResponse(BaseResponse):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    cv_filename: str
    skills: Optional[Dict[str, Any]] = None
    experience_years: Optional[float] = None
    experience_details: Optional[Dict[str, Any]] = None
    education: Optional[Dict[str, Any]] = None
    certifications: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    summary: Optional[str] = None
    status: str
    created_at: datetime


class CandidateListResponse(BaseModel):
    candidates: List[CandidateResponse]
    total: int
    page: int
    page_size: int


# ─── Job Schemas ──────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    company: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    description: str = Field(min_length=50)
    required_experience_years: Optional[float] = None


class JobUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class JobResponse(BaseResponse):
    id: str
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    description: str
    required_skills: Optional[Dict[str, Any]] = None
    preferred_skills: Optional[Dict[str, Any]] = None
    required_experience_years: Optional[float] = None
    required_education: Optional[str] = None
    status: str
    created_at: datetime


class JobListResponse(BaseModel):
    jobs: List[JobResponse]
    total: int


# ─── Matching Schemas ─────────────────────────────────────────────────────────

class MatchRequest(BaseModel):
    job_id: str
    candidate_ids: Optional[List[str]] = None  # None = match all candidates
    top_k: int = Field(default=10, ge=1, le=100)


class MatchScoreResponse(BaseResponse):
    id: str
    candidate_id: str
    job_id: str
    overall_score: float
    skill_match_score: float
    experience_match_score: float
    semantic_similarity_score: float
    llm_evaluation_score: float
    education_match_score: float
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    explanation: Optional[str] = None
    recommendation: Optional[str] = None
    matched_skills: Optional[List[str]] = None
    missing_skills: Optional[List[str]] = None
    candidate: Optional[CandidateResponse] = None
    created_at: datetime


class MatchResultResponse(BaseModel):
    job: JobResponse
    results: List[MatchScoreResponse]
    total_candidates: int
    processing_time_ms: float


# ─── Chat Schemas ─────────────────────────────────────────────────────────────

class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1)
    session_id: Optional[str] = None


class ChatMessageResponse(BaseResponse):
    id: str
    session_id: str
    role: str
    content: str
    created_at: datetime


class ChatSessionCreate(BaseModel):
    candidate_id: Optional[str] = None
    job_id: Optional[str] = None
    title: Optional[str] = None


class ChatSessionResponse(BaseResponse):
    id: str
    candidate_id: Optional[str] = None
    job_id: Optional[str] = None
    title: Optional[str] = None
    messages: List[ChatMessageResponse] = []
    created_at: datetime


class ChatResponse(BaseModel):
    session_id: str
    message: ChatMessageResponse
    candidate_context: Optional[str] = None


# ─── Dashboard Schemas ────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_candidates: int
    total_jobs: int
    total_matches: int
    avg_match_score: float
    top_candidates: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]
    candidates_by_status: Dict[str, int]
    jobs_by_status: Dict[str, int]
    weekly_activity: List[Dict[str, Any]] = []


# ─── Error Schemas ────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


class SuccessResponse(BaseModel):
    message: str
    data: Optional[Dict[str, Any]] = None
