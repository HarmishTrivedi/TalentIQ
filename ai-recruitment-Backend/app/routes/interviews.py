"""
Interview Management Routes
Handles interview CRUD, real-time WebSocket, AI analysis, and question generation
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import List, Optional
from datetime import datetime
import json
import os
import secrets
import threading

from app.database import get_db
from app.models.models import (
    Interview, InterviewQuestion, InterviewEvent, InterviewAnalysis,
    QuestionTemplate, Candidate, Job, User, InterviewStatus
)
from app.models.schemas import (
    InterviewCreate, InterviewUpdate, InterviewResponse,
    InterviewAnalysisResponse, QuestionGenerateRequest,
    InterviewRoundGenerateRequest, InterviewQuestionResponse,
    QuestionTemplateResponse, LiveAnalysisUpdate, SpeechTranscriptChunk,
    CodingSubmission, InterviewEventCreate, SuccessResponse
)
from app.utils.auth import get_current_user
from app.services.interview_ai_service import get_interview_ai_service
from app.services.email_service import get_email_service

router = APIRouter(prefix="/interviews", tags=["Interviews"])


# ─── WebSocket Connection Manager ────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, interview_id: str):
        await websocket.accept()
        if interview_id not in self.active_connections:
            self.active_connections[interview_id] = []
        self.active_connections[interview_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, interview_id: str):
        if interview_id in self.active_connections:
            self.active_connections[interview_id].remove(websocket)
    
    async def broadcast(self, interview_id: str, message: dict):
        if interview_id in self.active_connections:
            for connection in self.active_connections[interview_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()


# ─── Interview CRUD ───────────────────────────────────────────────────────────

@router.post("", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
async def create_interview(
    data: InterviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new interview and send invitation emails"""
    # Verify candidate exists
    candidate = await db.get(Candidate, data.candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Verify job exists if provided
    job = None
    if data.job_id:
        job = await db.get(Job, data.job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
    
    # Generate unique candidate access token
    candidate_token = secrets.token_urlsafe(32)
    
    # Convert timezone-aware datetime to timezone-naive (remove timezone info)
    scheduled_at_naive = data.scheduled_at.replace(tzinfo=None) if data.scheduled_at and data.scheduled_at.tzinfo else data.scheduled_at
    
    interview = Interview(
        candidate_id=data.candidate_id,
        job_id=data.job_id,
        recruiter_id=current_user.id,
        title=data.title,
        scheduled_at=scheduled_at_naive,
        duration_minutes=data.duration_minutes if hasattr(data, 'duration_minutes') else 60,
        status=InterviewStatus.scheduled,
        candidate_access_token=candidate_token,
        interview_types=data.interview_types if hasattr(data, 'interview_types') else [],
        metadata_={"meeting_link": data.meeting_link if hasattr(data, 'meeting_link') else None}
    )
    
    db.add(interview)
    await db.commit()
    await db.refresh(interview)
    
    # Eagerly load relationships to avoid lazy loading issues
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.candidate))
        .options(selectinload(Interview.questions))
        .where(Interview.id == interview.id)
    )
    interview = result.scalar_one()
    
    # Send invitation emails in background (non-blocking)
    # Don't wait for email sending to complete - return success immediately
    try:
        email_service = get_email_service()
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        
        # Candidate gets special join link with token (no auth required)
        candidate_meeting_link = f"{frontend_url}/join/{interview.id}?token={candidate_token}"
        
        # Recruiter gets normal interview room link
        recruiter_meeting_link = f"{frontend_url}/interview-room/{interview.id}"
        
        # Send to candidate (with timeout protection)
        if candidate.email:
            try:
                def send_candidate_email():
                    try:
                        email_service.send_interview_invitation(
                            candidate_email=candidate.email,
                            candidate_name=candidate.name,
                            interview_title=interview.title,
                            scheduled_at=interview.scheduled_at,
                            duration=interview.duration_minutes or 60,
                            meeting_link=candidate_meeting_link,
                            recruiter_name=current_user.full_name,
                            description=job.description[:200] if job else ""
                        )
                    except Exception as e:
                        print(f"Failed to send candidate invitation: {e}")
                
                # Send email in background thread
                thread = threading.Thread(target=send_candidate_email, daemon=True)
                thread.start()
            except Exception as e:
                print(f"Failed to start email thread: {e}")
        
        # Send confirmation to recruiter (with timeout protection)
        try:
            def send_recruiter_email():
                try:
                    email_service.send_recruiter_confirmation(
                        recruiter_email=current_user.email,
                        recruiter_name=current_user.full_name,
                        candidate_name=candidate.name,
                        interview_title=interview.title,
                        scheduled_at=interview.scheduled_at,
                        meeting_link=recruiter_meeting_link
                    )
                except Exception as e:
                    print(f"Failed to send recruiter confirmation: {e}")
            
            # Send email in background thread
            thread = threading.Thread(target=send_recruiter_email, daemon=True)
            thread.start()
        except Exception as e:
            print(f"Failed to start recruiter email thread: {e}")
    except Exception as e:
        print(f"Email service error (non-critical): {e}")
    
    # Return immediately without waiting for emails
    return interview


@router.get("", response_model=List[InterviewResponse])
async def list_interviews(
    status: Optional[str] = None,
    candidate_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List interviews with filters"""
    query = select(Interview).where(Interview.recruiter_id == current_user.id)
    
    if status:
        query = query.where(Interview.status == status)
    if candidate_id:
        query = query.where(Interview.candidate_id == candidate_id)
    
    query = query.order_by(Interview.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    interviews = result.scalars().all()
    
    return interviews


@router.get("/{interview_id}", response_model=InterviewResponse)
async def get_interview(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get interview details"""
    interview = await db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview.recruiter_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return interview


@router.get("/join/{interview_id}", response_model=InterviewResponse)
async def get_interview_by_token(
    interview_id: str,
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Get interview details using candidate access token (no auth required)"""
    interview = await db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview.candidate_access_token != token:
        raise HTTPException(status_code=403, detail="Invalid access token")
    
    return interview


@router.patch("/{interview_id}", response_model=InterviewResponse)
async def update_interview(
    interview_id: str,
    data: InterviewUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update interview"""
    interview = await db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview.recruiter_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    if data.title:
        interview.title = data.title
    if data.status:
        interview.status = data.status
    if data.scheduled_at:
        # Convert timezone-aware datetime to timezone-naive
        interview.scheduled_at = data.scheduled_at.replace(tzinfo=None) if data.scheduled_at.tzinfo else data.scheduled_at
    
    await db.commit()
    await db.refresh(interview)
    
    return interview


@router.post("/{interview_id}/start", response_model=InterviewResponse)
async def start_interview(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start an interview"""
    interview = await db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    interview.status = InterviewStatus.in_progress
    interview.started_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(interview)
    
    await manager.broadcast(interview_id, {
        "type": "interview_started",
        "interview_id": interview_id,
        "started_at": interview.started_at.isoformat()
    })
    
    return interview


@router.post("/{interview_id}/end", response_model=InterviewResponse)
async def end_interview(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """End an interview and trigger AI analysis"""
    interview = await db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    interview.status = InterviewStatus.completed
    interview.ended_at = datetime.utcnow()
    
    if interview.started_at:
        duration = (interview.ended_at - interview.started_at).total_seconds() / 60
        interview.duration_minutes = int(duration)
    
    await db.commit()
    
    # Trigger AI analysis in background
    await generate_interview_analysis(interview_id, db)
    
    await manager.broadcast(interview_id, {
        "type": "interview_ended",
        "interview_id": interview_id,
        "ended_at": interview.ended_at.isoformat()
    })
    
    return interview


# ─── Question Management ──────────────────────────────────────────────────────

@router.post("/questions/generate", response_model=List[QuestionTemplateResponse])
async def generate_questions(
    data: QuestionGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI-powered interview questions"""
    ai_service = get_interview_ai_service()
    
    # Get context
    candidate_context = None
    job_context = None
    
    if data.candidate_id:
        candidate = await db.get(Candidate, data.candidate_id)
        if candidate:
            candidate_context = f"Skills: {candidate.skills}, Experience: {candidate.experience_years} years"
    
    if data.job_id:
        job = await db.get(Job, data.job_id)
        if job:
            job_context = f"Title: {job.title}, Requirements: {job.required_skills}"
    
    questions = await ai_service.generate_interview_questions(
        category=data.category,
        difficulty=data.difficulty,
        count=data.count,
        candidate_context=candidate_context,
        job_context=job_context
    )
    
    return questions


@router.post("/rounds/generate")
async def generate_interview_round(
    data: InterviewRoundGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a complete interview round with multiple questions"""
    ai_service = get_interview_ai_service()
    
    all_questions = []
    
    # Generate questions for each difficulty level
    for difficulty, count in [
        ("beginner", data.beginner_count),
        ("intermediate", data.intermediate_count),
        ("advanced", data.advanced_count),
        ("expert", data.expert_count)
    ]:
        if count > 0:
            for category in data.categories or ["technical_backend"]:
                questions = await ai_service.generate_interview_questions(
                    category=category,
                    difficulty=difficulty,
                    count=count
                )
                all_questions.extend(questions)
    
    total_time = sum(q.get("estimated_time_minutes", 10) for q in all_questions)
    
    return {
        "questions": all_questions,
        "total_questions": len(all_questions),
        "estimated_duration_minutes": total_time,
        "difficulty_distribution": {
            "beginner": data.beginner_count,
            "intermediate": data.intermediate_count,
            "advanced": data.advanced_count,
            "expert": data.expert_count
        }
    }


@router.post("/{interview_id}/questions", response_model=InterviewQuestionResponse)
async def add_question_to_interview(
    interview_id: str,
    question_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a question to an interview"""
    interview = await db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    question = InterviewQuestion(
        interview_id=interview_id,
        question_text=question_data["question_text"],
        category=question_data["category"],
        difficulty=question_data["difficulty"],
        order_index=question_data.get("order_index", 0)
    )
    
    db.add(question)
    await db.commit()
    await db.refresh(question)
    
    return question


# ─── Real-time Analysis ───────────────────────────────────────────────────────

@router.post("/{interview_id}/events", response_model=SuccessResponse)
async def log_interview_event(
    interview_id: str,
    event: InterviewEventCreate,
    db: AsyncSession = Depends(get_db)
):
    """Log interview event (tab switch, copy-paste, etc.)"""
    interview_event = InterviewEvent(
        interview_id=interview_id,
        event_type=event.event_type,
        event_data=event.event_data,
        severity=event.severity
    )
    
    db.add(interview_event)
    await db.commit()
    
    # Broadcast to connected clients
    await manager.broadcast(interview_id, {
        "type": "event",
        "event_type": event.event_type,
        "severity": event.severity,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    return {"message": "Event logged"}


@router.post("/{interview_id}/transcript")
async def add_transcript_chunk(
    interview_id: str,
    chunk: SpeechTranscriptChunk,
    db: AsyncSession = Depends(get_db)
):
    """Add speech transcript chunk"""
    interview = await db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Append to transcript
    current_transcript = interview.transcript or ""
    interview.transcript = current_transcript + f"\n[{chunk.speaker}]: {chunk.text}"
    
    await db.commit()
    
    # Broadcast to connected clients
    await manager.broadcast(interview_id, {
        "type": "transcript",
        "speaker": chunk.speaker,
        "text": chunk.text,
        "timestamp": chunk.timestamp.isoformat()
    })
    
    return {"message": "Transcript updated"}


@router.post("/{interview_id}/coding")
async def submit_coding_solution(
    interview_id: str,
    submission: CodingSubmission,
    db: AsyncSession = Depends(get_db)
):
    """Submit and analyze coding solution"""
    question = await db.get(InterviewQuestion, submission.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Store code
    question.code_submitted = submission.code
    question.code_language = submission.language
    question.answered_at = datetime.utcnow()
    
    # AI analysis
    ai_service = get_interview_ai_service()
    analysis = await ai_service.analyze_coding_submission(
        code=submission.code,
        question=question.question_text,
        language=submission.language
    )
    
    question.code_quality_score = analysis.get("code_quality_score", 0)
    question.code_plagiarism_score = analysis.get("plagiarism_probability", 0)
    question.code_execution_result = analysis
    
    await db.commit()
    
    return {
        "message": "Code analyzed",
        "analysis": analysis
    }


# ─── Interview Analysis ───────────────────────────────────────────────────────

@router.get("/{interview_id}/analysis", response_model=InterviewAnalysisResponse)
async def get_interview_analysis(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive interview analysis"""
    result = await db.execute(
        select(InterviewAnalysis).where(InterviewAnalysis.interview_id == interview_id)
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return analysis


async def generate_interview_analysis(interview_id: str, db: AsyncSession):
    """Generate comprehensive AI analysis for completed interview"""
    interview = await db.get(Interview, interview_id)
    if not interview:
        return
    
    # Get questions and answers
    result = await db.execute(
        select(InterviewQuestion).where(InterviewQuestion.interview_id == interview_id)
    )
    questions = result.scalars().all()
    
    # Get events
    result = await db.execute(
        select(InterviewEvent).where(InterviewEvent.interview_id == interview_id)
    )
    events = result.scalars().all()
    
    # Prepare data
    qa_data = [
        {
            "question": q.question_text,
            "answer": q.candidate_answer,
            "category": q.category,
            "score": q.answer_quality_score
        }
        for q in questions
    ]
    
    event_data = [
        {
            "type": e.event_type,
            "severity": e.severity,
            "timestamp": e.timestamp.isoformat()
        }
        for e in events
    ]
    
    scores = {
        "technical": interview.technical_score or 0,
        "communication": interview.communication_score or 0,
        "confidence": interview.confidence_score or 0,
        "coding": interview.coding_score or 0
    }
    
    # Generate AI summary
    ai_service = get_interview_ai_service()
    summary = await ai_service.generate_interview_summary(
        transcript=interview.transcript or "",
        questions_and_answers=qa_data,
        events=event_data,
        scores=scores
    )
    
    # Analyze behavioral patterns
    behavior_analysis = await ai_service.analyze_behavioral_patterns(event_data)
    
    # Create or update analysis
    result = await db.execute(
        select(InterviewAnalysis).where(InterviewAnalysis.interview_id == interview_id)
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        analysis = InterviewAnalysis(interview_id=interview_id)
        db.add(analysis)
    
    # Update analysis
    analysis.overall_rating = summary.get("overall_rating", 50)
    analysis.technical_rating = scores["technical"]
    analysis.communication_rating = scores["communication"]
    analysis.coding_rating = scores["coding"]
    analysis.confidence_rating = scores["confidence"]
    
    analysis.fraud_risk_level = behavior_analysis["risk_level"]
    analysis.ai_assistance_probability = behavior_analysis["risk_score"]
    analysis.tab_switching_count = behavior_analysis["tab_switching_count"]
    analysis.copy_paste_count = behavior_analysis["copy_paste_count"]
    
    analysis.candidate_strengths = summary.get("candidate_strengths", [])
    analysis.candidate_weaknesses = summary.get("candidate_weaknesses", [])
    analysis.hiring_recommendation = summary.get("hiring_recommendation", "maybe")
    analysis.technical_fit = summary.get("technical_fit", "")
    analysis.ai_summary = summary.get("executive_summary", "")
    
    await db.commit()


# ─── WebSocket for Real-time Updates ─────────────────────────────────────────

@router.websocket("/{interview_id}/live")
async def interview_websocket(
    websocket: WebSocket,
    interview_id: str,
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for real-time interview updates"""
    await manager.connect(websocket, interview_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            # Handle different message types
            if data["type"] == "transcript":
                # Process speech transcript
                await manager.broadcast(interview_id, {
                    "type": "transcript",
                    "text": data["text"],
                    "speaker": data["speaker"]
                })
            
            elif data["type"] == "analysis_update":
                # Broadcast live analysis
                await manager.broadcast(interview_id, {
                    "type": "analysis",
                    "scores": data["scores"]
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, interview_id)



# ─── Email Notifications ──────────────────────────────────────────────────────

@router.post("/send-invitation")
async def send_interview_invitation(
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Send interview invitation email"""
    email_service = get_email_service()
    
    success = email_service.send_interview_invitation(
        candidate_email=data["candidate_email"],
        candidate_name=data["candidate_name"],
        interview_title=data.get("interview_title", "Interview"),
        scheduled_at=datetime.fromisoformat(data["scheduled_at"].replace('Z', '+00:00')),
        duration=data.get("duration", 60),
        meeting_link=data["meeting_link"],
        recruiter_name=data.get("recruiter_name", "TalentIQ Team"),
        description=data.get("description", "")
    )
    
    if success:
        return {"message": "Invitation sent successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send invitation")


@router.post("/send-reminder/{interview_id}")
async def send_interview_reminder(
    interview_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Send interview reminder to both candidate and recruiter (30 min before)"""
    interview = await db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    candidate = await db.get(Candidate, interview.candidate_id)
    recruiter = await db.get(User, interview.recruiter_id)
    
    if not candidate:
        raise HTTPException(status_code=400, detail="Candidate not found")
    
    email_service = get_email_service()
    meeting_link = interview.metadata_.get("meeting_link") if interview.metadata_ else f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/interview-room/{interview_id}"
    
    results = {"candidate": False, "recruiter": False}
    
    # Send reminder to candidate
    if candidate.email:
        try:
            results["candidate"] = email_service.send_interview_reminder(
                candidate_email=candidate.email,
                candidate_name=candidate.name,
                interview_title=interview.title,
                scheduled_at=interview.scheduled_at,
                meeting_link=meeting_link,
                recruiter_name=recruiter.full_name if recruiter else "TalentIQ Team"
            )
        except Exception as e:
            print(f"Failed to send candidate reminder: {e}")
    
    # Send reminder to recruiter
    if recruiter and recruiter.email:
        try:
            results["recruiter"] = email_service.send_recruiter_interview_reminder(
                recruiter_email=recruiter.email,
                recruiter_name=recruiter.full_name,
                candidate_name=candidate.name,
                interview_title=interview.title,
                scheduled_at=interview.scheduled_at,
                meeting_link=meeting_link,
                candidate_email=candidate.email
            )
        except Exception as e:
            print(f"Failed to send recruiter reminder: {e}")
    
    if results["candidate"] or results["recruiter"]:
        return {
            "message": "Reminders sent",
            "candidate_sent": results["candidate"],
            "recruiter_sent": results["recruiter"]
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to send reminders")
