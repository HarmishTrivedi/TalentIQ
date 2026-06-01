"""
Interview Management Routes
Handles interview CRUD, real-time WebSocket, AI analysis, and question generation
"""
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import List, Optional
from datetime import datetime
import json
import os
import secrets
import httpx
from app.config import settings

from app.database import get_db
from app.models.models import (
    Interview, InterviewQuestion, InterviewEvent, InterviewAnalysis,
    QuestionTemplate, Candidate, Job, User, InterviewStatus
)
from app.models.schemas import (
    InterviewCreate, InterviewUpdate, InterviewResponse,
    InterviewAnalysisResponse, QuestionGenerateRequest,
    InterviewRoundGenerateRequest, InterviewQuestionResponse,
    GeneratedQuestionResponse, LiveAnalysisUpdate, SpeechTranscriptChunk,
    CodingSubmission, InterviewEventCreate, SuccessResponse
)
from app.utils.auth import get_current_user
from app.services.interview_ai_service import get_interview_ai_service
from app.services.new_email_service import get_new_email_service
from app.services.reminder_scheduler import check_and_send_reminders

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
        print(f"[WS] Client connected to room {interview_id}. Total: {len(self.active_connections[interview_id])}")

    def disconnect(self, websocket: WebSocket, interview_id: str):
        if interview_id in self.active_connections:
            if websocket in self.active_connections[interview_id]:
                self.active_connections[interview_id].remove(websocket)
        print(f"[WS] Client disconnected from room {interview_id}. Remaining: {len(self.active_connections.get(interview_id, []))}")

    async def broadcast(self, interview_id: str, message: dict, exclude_websocket: WebSocket = None):
        """Send message to all connections in a room, optionally excluding the sender."""
        if interview_id not in self.active_connections:
            return
        dead = []
        for connection in self.active_connections[interview_id]:
            if exclude_websocket is not None and connection is exclude_websocket:
                continue
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        # Clean up dead connections
        for d in dead:
            if d in self.active_connections.get(interview_id, []):
                self.active_connections[interview_id].remove(d)

manager = ConnectionManager()


# ─── Interview CRUD ───────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_interview(
    data: InterviewCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new interview and send invitation emails"""
    try:
        # Verify candidate exists
        candidate = await db.get(Candidate, data.candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Update candidate info if provided during scheduling
        updated_candidate = False
        if data.candidate_name and data.candidate_name != candidate.name:
            candidate.name = data.candidate_name
            updated_candidate = True
        if data.candidate_email and data.candidate_email != candidate.email:
            candidate.email = data.candidate_email
            updated_candidate = True
            
        if updated_candidate:
            await db.flush()
            print(f"✅ Updated candidate {candidate.id} info during scheduling")

        # Verify job exists if provided
        job = None
        if data.job_id:
            job = await db.get(Job, data.job_id)
            if not job:
                raise HTTPException(status_code=404, detail="Job not found")
        
        # Generate unique candidate access token
        candidate_token = secrets.token_urlsafe(32)
        
        # Handle datetime conversion
        scheduled_at_naive = data.scheduled_at
        if scheduled_at_naive and hasattr(scheduled_at_naive, 'tzinfo') and scheduled_at_naive.tzinfo:
            scheduled_at_naive = scheduled_at_naive.replace(tzinfo=None)
            
        # ─── CALL NEW INTERVIEW SERVICE ───
        interview_id = str(secrets.token_hex(8)) # Generate a clean ID for the room
        
        # Default fallbacks
        frontend_url = settings.frontend_url.rstrip('/')
        candidate_meeting_link = f"{frontend_url}/join/{interview_id}?token={candidate_token}"
        recruiter_meeting_link = f"{frontend_url}/interview-prejoin/{interview_id}"
        
        # Ensure OS URL is clean and uses https if in production
        os_base_url = settings.interview_os_url.rstrip('/')
        if 'localhost' not in os_base_url and not os_base_url.startswith('https://'):
            os_base_url = os_base_url.replace('http://', 'https://')
        
        try:
            print(f"🔗 Attempting to create room in Interview OS: {os_base_url}")
            async with httpx.AsyncClient() as client:
                room_res = await client.post(
                    f"{os_base_url}/api/rooms/create",
                    json={
                        "interviewId": interview_id,
                        "recruiterId": current_user.id,
                        "candidateId": candidate.id,
                        "candidateName": candidate.name,
                        "recruiterName": current_user.full_name,
                        "jobTitle": job.title if job else data.title,
                        "jobId": job.id if job else None,
                        "scheduledAt": scheduled_at_naive.isoformat() if scheduled_at_naive else None,
                        "apiKey": settings.talentiq_api_key
                    },
                    timeout=5.0 # Shorter timeout for faster fallback
                )
                
                if room_res.status_code == 200:
                    room_data = room_res.json()
                    if room_data.get("success"):
                        candidate_meeting_link = room_data.get("candidateUrl", candidate_meeting_link)
                        recruiter_meeting_link = room_data.get("recruiterUrl", recruiter_meeting_link)
                        print(f"✅ Interview OS room created: {interview_id}")
                    else:
                        print(f"⚠️ Interview OS returned success:false: {room_data}")
                else:
                    print(f"⚠️ Interview OS returned status {room_res.status_code}")
        except Exception as os_err:
            print(f"❌ Interview OS Connection Error (Using Fallback): {str(os_err)}")

        # Create interview record
        interview = Interview(
            id=interview_id,
            candidate_id=data.candidate_id,
            job_id=data.job_id,
            recruiter_id=current_user.id,
            title=data.title,
            scheduled_at=scheduled_at_naive,
            duration_minutes=data.duration_minutes or 60,
            status=InterviewStatus.scheduled,
            candidate_access_token=candidate_token,
            interview_types=data.interview_types or [],
            meeting_url=candidate_meeting_link,
            recruiter_meeting_url=recruiter_meeting_link
        )
        
        db.add(interview)
        await db.commit()
        await db.refresh(interview)
        
        # Prepare response data
        response_data = {
            "id": interview.id,
            "candidate_id": interview.candidate_id,
            "job_id": interview.job_id,
            "recruiter_id": interview.recruiter_id,
            "title": interview.title,
            "status": interview.status,
            "scheduled_at": interview.scheduled_at,
            "duration_minutes": interview.duration_minutes,
            "meeting_url": interview.meeting_url,
            "recruiter_meeting_url": interview.recruiter_meeting_url,
            "created_at": interview.created_at,
        }
        
        # Send emails in background thread (non-blocking)
        async def send_emails_background():
            try:
                email_service = get_new_email_service()
                
                # Send candidate email
                if candidate.email:
                    try:
                        await email_service.send_interview_invitation_candidate(
                            candidate_email=candidate.email,
                            candidate_name=candidate.name,
                            role_title=interview.title,
                            scheduled_at=interview.scheduled_at,
                            duration=interview.duration_minutes or 60,
                            magic_link=candidate_meeting_link,
                            recruiter_name=current_user.full_name,
                            related_id=interview.id
                        )
                    except Exception as e:
                        print(f"❌ Exception sending candidate invitation: {e}")
                
                # Send recruiter email
                if current_user.email:
                    try:
                        await email_service.send_interview_invitation_recruiter(
                            recruiter_email=current_user.email,
                            recruiter_name=current_user.full_name,
                            candidate_name=candidate.name,
                            role_title=interview.title,
                            scheduled_at=interview.scheduled_at,
                            duration=interview.duration_minutes or 60,
                            dashboard_link=recruiter_meeting_link,
                            related_id=interview.id
                        )
                    except Exception as e:
                        print(f"❌ Exception sending recruiter confirmation: {e}")
                    
            except Exception as e:
                print(f"⚠️ Email service error (non-critical): {e}")
        
        background_tasks.add_task(send_emails_background)
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating interview: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def list_interviews(
    status: Optional[str] = None,
    candidate_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List interviews with filters"""
    from sqlalchemy.orm import selectinload
    
    query = select(Interview).where(Interview.recruiter_id == current_user.id)
    
    if status:
        query = query.where(Interview.status == status)
    if candidate_id:
        query = query.where(Interview.candidate_id == candidate_id)
    
    # Eagerly load relationships
    query = query.options(
        selectinload(Interview.candidate),
        selectinload(Interview.job)
    ).order_by(Interview.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    interviews = result.scalars().all()
    
    # Convert to dict to avoid lazy loading
    interviews_data = []
    for interview in interviews:
        interview_dict = {
            "id": interview.id,
            "candidate_id": interview.candidate_id,
            "job_id": interview.job_id,
            "recruiter_id": interview.recruiter_id,
            "title": interview.title,
            "status": interview.status,
            "scheduled_at": interview.scheduled_at,
            "started_at": interview.started_at,
            "ended_at": interview.ended_at,
            "duration_minutes": interview.duration_minutes,
            "interview_types": interview.interview_types,
            "meeting_url": interview.meeting_url,
            "recruiter_meeting_url": interview.recruiter_meeting_url,
            "overall_score": interview.overall_score,
            "technical_score": interview.technical_score,
            "communication_score": interview.communication_score,
            "confidence_score": interview.confidence_score,
            "fraud_risk_level": interview.fraud_risk_level,
            "ai_assistance_probability": interview.ai_assistance_probability,
            "created_at": interview.created_at,
            "candidate": {
                "id": interview.candidate.id,
                "name": interview.candidate.name,
                "email": interview.candidate.email,
            } if interview.candidate else None,
            "job": {
                "id": interview.job.id,
                "title": interview.job.title,
                "company": interview.job.company,
            } if interview.job else None
        }
        interviews_data.append(interview_dict)
    
    return interviews_data


@router.get("/{interview_id}")
async def get_interview(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get interview details"""
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.candidate))
        .options(selectinload(Interview.job))
        .where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview.recruiter_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Return dict to avoid lazy loading
    return {
        "id": interview.id,
        "candidate_id": interview.candidate_id,
        "job_id": interview.job_id,
        "recruiter_id": interview.recruiter_id,
        "title": interview.title,
        "status": interview.status,
        "scheduled_at": interview.scheduled_at,
        "started_at": interview.started_at,
        "ended_at": interview.ended_at,
        "duration_minutes": interview.duration_minutes,
        "interview_types": interview.interview_types,
        "candidate_access_token": interview.candidate_access_token,
        "meeting_url": interview.meeting_url,
        "recruiter_meeting_url": interview.recruiter_meeting_url,
        "created_at": interview.created_at,
        "candidate": {
            "id": interview.candidate.id,
            "name": interview.candidate.name,
            "email": interview.candidate.email,
        } if interview.candidate else None,
        "job": {
            "id": interview.job.id,
            "title": interview.job.title,
            "company": interview.job.company,
        } if interview.job else None
    }


@router.get("/join/{interview_id}")
async def get_interview_by_token(
    interview_id: str,
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Get interview details using candidate access token (no auth required)"""
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(Interview)
        .options(
            selectinload(Interview.candidate),
            selectinload(Interview.job)
        )
        .where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview.candidate_access_token != token:
        raise HTTPException(status_code=403, detail="Invalid access token")
    
    # Return dict to avoid lazy loading
    return {
        "id": interview.id,
        "candidate_id": interview.candidate_id,
        "job_id": interview.job_id,
        "recruiter_id": interview.recruiter_id,
        "title": interview.title,
        "status": interview.status,
        "scheduled_at": interview.scheduled_at,
        "started_at": interview.started_at,
        "ended_at": interview.ended_at,
        "duration_minutes": interview.duration_minutes,
        "interview_types": interview.interview_types,
        "candidate_access_token": interview.candidate_access_token,
        "meeting_url": interview.meeting_url,
        "recruiter_meeting_url": interview.recruiter_meeting_url,
        "created_at": interview.created_at,
        "candidate": {
            "id": interview.candidate.id,
            "name": interview.candidate.name,
            "email": interview.candidate.email,
        } if interview.candidate else None,
        "job": {
            "id": interview.job.id,
            "title": interview.job.title,
            "company": interview.job.company,
        } if interview.job else None
    }


@router.patch("/{interview_id}")
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
        interview.scheduled_at = data.scheduled_at.replace(tzinfo=None) if data.scheduled_at.tzinfo else data.scheduled_at
    
    await db.commit()
    await db.refresh(interview)
    
    # Return dict to avoid lazy loading
    return {
        "id": interview.id,
        "candidate_id": interview.candidate_id,
        "job_id": interview.job_id,
        "recruiter_id": interview.recruiter_id,
        "title": interview.title,
        "status": interview.status,
        "scheduled_at": interview.scheduled_at,
        "started_at": interview.started_at,
        "ended_at": interview.ended_at,
        "duration_minutes": interview.duration_minutes,
        "interview_types": interview.interview_types,
        "created_at": interview.created_at,
        "message": "Interview updated successfully"
    }


@router.delete("/{interview_id}")
async def delete_interview(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permanently delete an interview"""
    interview = await db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview.recruiter_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.delete(interview)
    await db.commit()
    
    print(f"✅ Interview deleted permanently: {interview_id}")
    return {"message": "Interview deleted successfully", "id": interview_id}


@router.post("/{interview_id}/recording")
async def save_recording_url(
    interview_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Called by Interview OS after recording is saved — updates recording_url on the interview"""
    interview = await db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    interview.recording_url = data.get("recording_url")
    if interview.status != InterviewStatus.completed:
        interview.status = InterviewStatus.completed
        interview.ended_at = interview.ended_at or datetime.utcnow()

    await db.commit()
    print(f"✅ Recording URL saved for interview {interview_id}: {interview.recording_url}")
    return {"message": "Recording URL saved", "recording_url": interview.recording_url}


@router.post("/{interview_id}/start")
async def start_interview(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start an interview"""
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.candidate))
        .options(selectinload(Interview.job))
        .where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    interview.status = InterviewStatus.in_progress
    interview.started_at = datetime.utcnow()
    
    await db.commit()
    
    await manager.broadcast(interview_id, {
        "type": "interview_started",
        "interview_id": interview_id,
        "started_at": interview.started_at.isoformat()
    })
    
    # Return dict to avoid lazy loading
    return {
        "id": interview.id,
        "candidate_id": interview.candidate_id,
        "job_id": interview.job_id,
        "recruiter_id": interview.recruiter_id,
        "title": interview.title,
        "status": interview.status,
        "scheduled_at": interview.scheduled_at,
        "started_at": interview.started_at,
        "ended_at": interview.ended_at,
        "duration_minutes": interview.duration_minutes,
        "interview_types": interview.interview_types,
        "created_at": interview.created_at,
        "message": "Interview started successfully"
    }


@router.post("/{interview_id}/end")
async def end_interview(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """End an interview and trigger AI analysis"""
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.candidate))
        .options(selectinload(Interview.job))
        .where(Interview.id == interview_id)
    )
    interview = result.scalar_one_or_none()
    
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
    
    # Return dict to avoid lazy loading
    return {
        "id": interview.id,
        "candidate_id": interview.candidate_id,
        "job_id": interview.job_id,
        "recruiter_id": interview.recruiter_id,
        "title": interview.title,
        "status": interview.status,
        "scheduled_at": interview.scheduled_at,
        "started_at": interview.started_at,
        "ended_at": interview.ended_at,
        "duration_minutes": interview.duration_minutes,
        "interview_types": interview.interview_types,
        "created_at": interview.created_at,
        "message": "Interview ended successfully"
    }


# ─── Question Management ──────────────────────────────────────────────────────

@router.post("/questions/generate", response_model=List[GeneratedQuestionResponse])
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
            msg_type = data.get("type", "")
            print(f"[WS] Room {interview_id} received: {msg_type}")

            if msg_type == "transcript":
                await manager.broadcast(interview_id, {
                    "type": "transcript",
                    "text": data["text"],
                    "speaker": data["speaker"]
                })

            elif msg_type == "analysis_update":
                await manager.broadcast(interview_id, {
                    "type": "analysis",
                    "scores": data["scores"]
                })

            elif msg_type in ["offer", "answer", "ice-candidate", "participant_joined", "participant_left", "chat_message", "hand_raised"]:
                # All signaling and room events: relay to everyone EXCEPT the sender
                await manager.broadcast(interview_id, data, exclude_websocket=websocket)

            else:
                # Unknown message type — relay to others anyway
                await manager.broadcast(interview_id, data, exclude_websocket=websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, interview_id)



# ─── Email Notifications ──────────────────────────────────────────────────────

@router.post("/reminders/process")
async def process_due_reminders(x_reminder_secret: str = Header(default="")):
    """Run due reminders for an external scheduler on sleeping deployments."""
    expected_secret = os.getenv("REMINDER_CRON_SECRET", "")
    if not expected_secret or not secrets.compare_digest(x_reminder_secret, expected_secret):
        raise HTTPException(status_code=401, detail="Invalid reminder scheduler secret")
    await check_and_send_reminders()
    return {"message": "Due reminders processed"}


@router.post("/send-invitation")
async def send_interview_invitation(
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Send interview invitation email"""
    email_service = get_new_email_service()
    
    try:
        await email_service.send_interview_invitation_candidate(
            candidate_email=data["candidate_email"],
            candidate_name=data["candidate_name"],
            role_title=data.get("interview_title", "Interview"),
            scheduled_at=datetime.fromisoformat(data["scheduled_at"].replace('Z', '+00:00')),
            duration=data.get("duration", 60),
            magic_link=data["meeting_link"],
            recruiter_name=data.get("recruiter_name", "TalentIQ Team")
        )
        return {"message": "Invitation sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send invitation: {str(e)}")


@router.post("/send-reminder/{interview_id}")
async def send_interview_reminder(
    interview_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Send interview reminder manually (30 min before as default)"""
    interview = await db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    candidate = await db.get(Candidate, interview.candidate_id)
    recruiter = await db.get(User, interview.recruiter_id)
    
    if not candidate:
        raise HTTPException(status_code=400, detail="Candidate not found")
    
    email_service = get_new_email_service()
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    candidate_link = interview.meeting_url or f"{frontend_url}/join/{interview_id}?token={interview.candidate_access_token}"
    recruiter_link = f"{frontend_url}/interview-prejoin/{interview_id}"
    
    # Send reminder to candidate
    if candidate.email:
        await email_service.send_interview_reminder(
            to_email=candidate.email,
            name=candidate.name,
            role_title=interview.title,
            time_remaining_str="30 minutes",
            link=candidate_link,
            is_candidate=True,
            related_id=interview.id
        )
    
    # Send reminder to recruiter
    if recruiter and recruiter.email:
        await email_service.send_interview_reminder(
            to_email=recruiter.email,
            name=recruiter.full_name,
            role_title=interview.title,
            time_remaining_str="30 minutes",
            link=recruiter_link,
            is_candidate=False,
            related_id=interview.id
        )
    
    return {"message": "Reminders sent"}
