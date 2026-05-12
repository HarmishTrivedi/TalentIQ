"""
AI Chat Service.
Maintains conversation memory, uses CV + JD context for screening.
"""
import uuid
from typing import Optional
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Candidate, Job, ChatSession, ChatMessage, MatchScore
from app.services.llm_service import get_llm_service

logger = structlog.get_logger()


SCREENING_SYSTEM_PROMPT = """You are an expert AI recruitment assistant and technical interviewer.

{context}

Your responsibilities:
1. Answer questions about the candidate's profile, skills, and experience
2. Ask intelligent screening questions based on the job requirements
3. Evaluate candidate fit based on their responses
4. Provide insights about candidate strengths and weaknesses
5. Suggest follow-up questions for areas needing clarification

Guidelines:
- Be professional and thorough
- Ask one question at a time when interviewing
- Reference specific details from the candidate's CV
- Connect candidate experience to job requirements
- Be objective and fair in assessments
- Use structured interview techniques (behavioral, situational, technical)

Maintain context from the entire conversation history."""


GENERAL_SYSTEM_PROMPT = """You are TalentIQ, an advanced AI recruitment intelligence assistant with comprehensive access to the entire recruitment platform.

You are an expert in:
- Talent acquisition and candidate evaluation
- Technical skill assessment across all domains
- Job matching and fit analysis
- Interview strategy and question generation
- Recruitment best practices and market insights

PLATFORM CONTEXT:
{platform_stats}

Your capabilities:
1. **Candidate Intelligence**: Deep analysis of any candidate's profile, skills, experience, education, and career trajectory
2. **Smart Matching**: Identify best-fit candidates for any role based on comprehensive criteria
3. **Skill Analysis**: Evaluate technical and soft skills, identify gaps, and suggest development areas
4. **Interview Preparation**: Generate tailored interview questions and evaluation frameworks
5. **Market Insights**: Provide data-driven recruitment strategies and talent market analysis
6. **Comparative Analysis**: Compare multiple candidates objectively with detailed reasoning

Communication Style:
- Be professional, insightful, and data-driven
- Provide specific evidence from candidate profiles when making recommendations
- Use structured formatting (bullet points, numbered lists) for clarity
- Highlight key insights with **bold text**
- Be concise yet comprehensive
- Always explain your reasoning

When analyzing candidates or jobs:
- Reference specific details from their profiles
- Provide actionable insights
- Consider both technical fit and cultural alignment
- Identify strengths, concerns, and opportunities
- Suggest next steps or follow-up actions

You have real-time access to all candidate CVs, job descriptions, and matching scores in the database."""


class ChatService:
    """
    AI chat service with conversation memory and candidate/job context.
    """

    def __init__(self):
        self.llm = get_llm_service()

    async def create_session(
        self,
        db: AsyncSession,
        candidate_id: Optional[str] = None,
        job_id: Optional[str] = None,
        user_id: Optional[str] = None,
        title: Optional[str] = None,
    ) -> ChatSession:
        """Create a new chat session."""
        # Auto-generate title
        if not title:
            if candidate_id and job_id:
                title = "Candidate Screening Session"
            elif candidate_id:
                title = "Candidate Analysis"
            elif job_id:
                title = "Job Matching Discussion"
            else:
                title = "Recruitment Assistant"

        session = ChatSession(
            user_id=user_id,
            candidate_id=candidate_id,
            job_id=job_id,
            title=title,
        )
        db.add(session)
        await db.flush()

        # Add system message
        system_prompt = await self._build_system_prompt(db, candidate_id, job_id)
        system_msg = ChatMessage(
            session_id=session.id,
            role="system",
            content=system_prompt,
        )
        db.add(system_msg)
        await db.flush()

        # Add initial greeting
        greeting = await self._generate_greeting(db, candidate_id, job_id)
        if greeting:
            ai_msg = ChatMessage(
                session_id=session.id,
                role="assistant",
                content=greeting,
            )
            db.add(ai_msg)
            await db.flush()

        return session

    async def send_message(
        self,
        db: AsyncSession,
        session_id: str,
        user_content: str,
    ) -> ChatMessage:
        """Process user message and generate AI response."""

        # Get session and history
        session = await self._get_session(db, session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Save user message
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=user_content,
        )
        db.add(user_msg)
        await db.flush()

        # Build message history for LLM
        history = await self._get_message_history(db, session_id)
        llm_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in history
            if msg.role in ("system", "user", "assistant")
        ]

        # Add current user message
        llm_messages.append({"role": "user", "content": user_content})

        # Generate response with enhanced parameters
        response_text = await self.llm.generate_chat(
            messages=llm_messages,
            temperature=0.8,
            max_tokens=1200,
        )

        # Save assistant response
        ai_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=response_text,
        )
        db.add(ai_msg)
        await db.flush()

        return ai_msg

    async def _build_system_prompt(
        self,
        db: AsyncSession,
        candidate_id: Optional[str],
        job_id: Optional[str],
    ) -> str:
        """Build context-aware system prompt with comprehensive data access."""
        # Fetch platform-wide stats for all prompts
        from sqlalchemy import func
        cand_count = (await db.execute(select(func.count(Candidate.id)))).scalar() or 0
        job_count = (await db.execute(select(func.count(Job.id)))).scalar() or 0
        
        # Get comprehensive candidate data for context
        all_candidates = (await db.execute(select(Candidate).order_by(Candidate.created_at.desc()).limit(50))).scalars().all()
        top_skills = set()
        for c in all_candidates:
            if c.skills and isinstance(c.skills, dict):
                top_skills.update(c.skills.get('technical', [])[:5])
        
        platform_stats = (
            f"- Total Candidates in Database: {cand_count}\n"
            f"- Active Job Postings: {job_count}\n"
            f"- Top Skills in Talent Pool: {', '.join(list(top_skills)[:15])}\n"
            f"- You have access to ALL candidate CVs, full profiles, skills, experience, education, and match scores"
        )

        if not candidate_id and not job_id:
            return GENERAL_SYSTEM_PROMPT.replace("{platform_stats}", platform_stats)

        context_parts = [f"GLOBAL PLATFORM STATS:\n{platform_stats}\n"]

        if candidate_id:
            candidate = await self._get_candidate(db, candidate_id)
            if candidate:
                context_parts.append("CANDIDATE PROFILE:")
                context_parts.append(f"Name: {candidate.name}")
                if candidate.summary:
                    context_parts.append(f"Summary: {candidate.summary}")
                if candidate.experience_years:
                    context_parts.append(f"Years of Experience: {candidate.experience_years}")

                if candidate.skills:
                    skills = candidate.skills
                    all_skills = []
                    if isinstance(skills, dict):
                        all_skills = (
                            skills.get("technical", []) +
                            skills.get("frameworks", []) +
                            skills.get("tools", [])
                        )
                    elif isinstance(skills, list):
                        all_skills = skills
                    
                    if all_skills:
                        context_parts.append(f"Technical Skills: {', '.join(str(s) for s in all_skills[:20])}")

                if candidate.experience_details:
                    positions = candidate.experience_details.get("positions", [])
                    if positions:
                        context_parts.append("Work History:")
                        for pos in positions[:3]:
                            context_parts.append(
                                f"  - {pos.get('title')} at {pos.get('company')} "
                                f"({pos.get('duration', '')})"
                            )

                if candidate.education:
                    degrees = candidate.education.get("degrees", [])
                    for deg in degrees[:2]:
                        context_parts.append(
                            f"Education: {deg.get('degree')} from {deg.get('institution')}"
                        )

        if job_id:
            job = await self._get_job(db, job_id)
            if job:
                context_parts.append("\nJOB REQUIREMENTS:")
                context_parts.append(f"Title: {job.title}")
                if job.company:
                    context_parts.append(f"Company: {job.company}")
                context_parts.append(f"Description: {job.description[:1000]}")

                if job.required_skills:
                    req_skills = []
                    for s_list in job.required_skills.values():
                        if isinstance(s_list, list):
                            req_skills.extend(s_list)
                    if req_skills:
                        context_parts.append(f"Required Skills: {', '.join(req_skills[:15])}")

                if job.required_experience_years:
                    context_parts.append(
                        f"Required Experience: {job.required_experience_years} years"
                    )

        # Check if there's a match score
        if candidate_id and job_id:
            result = await db.execute(
                select(MatchScore).where(
                    MatchScore.candidate_id == candidate_id,
                    MatchScore.job_id == job_id,
                ).order_by(MatchScore.created_at.desc())
            )
            score = result.scalar_one_or_none()
            if score:
                context_parts.append(f"\nMATCH ANALYSIS:")
                context_parts.append(f"Overall Score: {score.overall_score}/100")
                context_parts.append(f"Recommendation: {score.recommendation}")
                if score.strengths:
                    context_parts.append(f"Strengths: {', '.join(score.strengths[:3])}")
                if score.weaknesses:
                    context_parts.append(f"Concerns: {', '.join(score.weaknesses[:3])}")

        context = "\n".join(context_parts)
        # Use .replace to avoid issues with curly braces in context
        return SCREENING_SYSTEM_PROMPT.replace("{context}", context)

    async def _generate_greeting(
        self,
        db: AsyncSession,
        candidate_id: Optional[str],
        job_id: Optional[str],
    ) -> Optional[str]:
        """Generate contextual greeting for new session."""
        if candidate_id:
            candidate = await self._get_candidate(db, candidate_id)
            if candidate:
                job = await self._get_job(db, job_id) if job_id else None
                job_str = f" for the {job.title} position" if job else ""
                return (
                    f"Hello! I'm TalentIQ, your AI recruitment assistant. "
                    f"I've analyzed **{candidate.name}'s** profile{job_str} and I'm ready to help you. "
                    f"I can answer questions about their experience, run a screening interview, "
                    f"or provide an in-depth fit analysis. What would you like to explore?"
                )
        return (
            "Hello! I'm TalentIQ, your AI recruitment assistant. "
            "I can help you analyze candidates, match skills to job requirements, "
            "generate interview questions, or discuss hiring strategies. "
            "How can I assist you today?"
        )

    async def _get_session(self, db: AsyncSession, session_id: str) -> Optional[ChatSession]:
        result = await db.execute(
            select(ChatSession).where(ChatSession.id == session_id)
        )
        return result.scalar_one_or_none()

    async def _get_message_history(
        self,
        db: AsyncSession,
        session_id: str,
        limit: int = 20,
    ) -> list[ChatMessage]:
        """Get recent message history."""
        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
        )
        return result.scalars().all()

    async def _get_candidate(self, db: AsyncSession, candidate_id: str) -> Optional[Candidate]:
        result = await db.execute(
            select(Candidate).where(Candidate.id == candidate_id)
        )
        return result.scalar_one_or_none()

    async def _get_job(self, db: AsyncSession, job_id: str) -> Optional[Job]:
        result = await db.execute(
            select(Job).where(Job.id == job_id)
        )
        return result.scalar_one_or_none()

    async def get_sessions(
        self,
        db: AsyncSession,
        user_id: Optional[str] = None,
        candidate_id: Optional[str] = None,
    ) -> list[ChatSession]:
        query = select(ChatSession).order_by(ChatSession.updated_at.desc())
        if user_id:
            query = query.where(ChatSession.user_id == user_id)
        if candidate_id:
            query = query.where(ChatSession.candidate_id == candidate_id)
        result = await db.execute(query.limit(50))
        return result.scalars().all()


# Global singleton
_chat_service: Optional[ChatService] = None


def get_chat_service() -> ChatService:
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatService()
    return _chat_service
