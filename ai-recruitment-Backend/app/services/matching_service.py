"""
Advanced Matching Engine.
Hybrid scoring: semantic similarity + skill match + experience + LLM evaluation.
"""
import time
import asyncio
from typing import Optional
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.models import Candidate, Job, MatchScore, CandidateStatus
from app.services.llm_service import get_llm_service
from app.vector_store.faiss_store import get_vector_store

logger = structlog.get_logger()


# Scoring weights
WEIGHTS = {
    "semantic_similarity": 0.25,
    "skill_match": 0.35,
    "experience_match": 0.20,
    "llm_evaluation": 0.15,
    "education_match": 0.05,
}

LLM_EVALUATION_PROMPT = """You are a senior technical recruiter with 15+ years of experience. Evaluate this candidate for the job position with precision and consistency.

JOB DESCRIPTION:
Title: {job_title}
Company: {company}
Requirements:
{job_description}

Required Skills: {required_skills}
Required Experience: {required_experience} years

CANDIDATE PROFILE:
Name: {candidate_name}
Experience: {candidate_experience} years
Skills: {candidate_skills}
Summary: {candidate_summary}
Education: {candidate_education}

SCORING RUBRIC (be strict and consistent):
- 90-100: Perfect match. Exceeds all requirements. Rare.
- 75-89: Strong match. Meets most requirements with minor gaps.
- 60-74: Good match. Meets core requirements, some gaps.
- 45-59: Partial match. Meets some requirements, notable gaps.
- 30-44: Weak match. Significant skill or experience gaps.
- 0-29: Poor match. Does not meet core requirements.

Evaluate and return a JSON object:
{{
  "score": 72,
  "strengths": ["Strong Python skills matching requirement", "4 years experience meets 3-year requirement", "Relevant ML project experience"],
  "weaknesses": ["Missing AWS experience listed as required", "No team leadership experience mentioned"],
  "explanation": "Candidate demonstrates solid Python and ML foundation directly matching core requirements. Experience level is appropriate. However, the missing AWS and DevOps skills are listed as required and represent a meaningful gap that would need addressing.",
  "recommendation": "yes",
  "matched_skills": ["Python", "Machine Learning", "FastAPI"],
  "missing_skills": ["AWS", "Kubernetes", "Docker"]
}}

RECOMMENDATION THRESHOLDS:
- "strong_yes": score >= 85
- "yes": score 70-84
- "maybe": score 50-69
- "no": score < 50

Be objective, evidence-based, and consistent. Score must be an integer 0-100."""


class MatchingEngine:
    """
    Hybrid matching engine combining vector similarity, 
    rule-based skill matching, and LLM evaluation.
    """

    def __init__(self):
        self.llm = get_llm_service()
        self.vector_store = get_vector_store()

    async def match_candidates_to_job(
        self,
        job: Job,
        db: AsyncSession,
        candidate_ids: Optional[list[str]] = None,
        top_k: int = 10,
        user_id: Optional[str] = None,
    ) -> list[MatchScore]:
        """
        Run full matching pipeline for a job against all (or specified) candidates.
        Returns ranked list of MatchScore objects.
        """
        start_time = time.time()
        logger.info("Starting matching", job_id=job.id, job_title=job.title)

        # 1. Get candidates to match
        candidates = await self._get_candidates(db, candidate_ids, user_id)
        if not candidates:
            return []

        logger.info("Matching against candidates", count=len(candidates))

        # 2. Get job embedding
        job_text = self._build_job_embedding_text(job)
        job_embedding = await self.llm.get_embedding(job_text)

        # 3. Vector search to pre-filter top candidates
        candidate_doc_ids = [c.id for c in candidates]
        vector_results = await self.vector_store.search(
            query_embedding=job_embedding,
            top_k=min(top_k * 3, len(candidates)),
            filter_doc_ids=candidate_doc_ids,
        )

        # Map vector scores
        vector_score_map = {r["doc_id"]: r["score"] for r in vector_results}

        # 4. Score top candidates in parallel
        candidate_map = {c.id: c for c in candidates}
        top_candidate_ids = list(vector_score_map.keys()) or candidate_doc_ids[:top_k]

        # Score in batches to avoid overwhelming the API
        batch_size = 5
        all_scores = []

        for i in range(0, len(top_candidate_ids), batch_size):
            batch_ids = top_candidate_ids[i:i+batch_size]
            batch_candidates = [candidate_map[cid] for cid in batch_ids if cid in candidate_map]

            tasks = [
                self._score_candidate(
                    candidate=c,
                    job=job,
                    semantic_score=vector_score_map.get(c.id, 0.0),
                )
                for c in batch_candidates
            ]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in batch_results:
                if not isinstance(result, Exception):
                    all_scores.append(result)
                else:
                    logger.error("Scoring failed", error=str(result))

        # 5. Sort by overall score
        all_scores.sort(key=lambda x: x["overall_score"], reverse=True)
        top_scores = all_scores[:top_k]

        # 6. Save to database
        match_records = await self._save_scores(db, job.id, top_scores)

        elapsed = (time.time() - start_time) * 1000
        logger.info(
            "Matching complete",
            job_id=job.id,
            candidates_evaluated=len(all_scores),
            time_ms=f"{elapsed:.0f}",
        )

        return match_records

    async def _score_candidate(
        self,
        candidate: Candidate,
        job: Job,
        semantic_score: float,
    ) -> dict:
        """Compute hybrid score for a single candidate-job pair."""

        # 1. Skill match score
        skill_score = self._compute_skill_match(candidate, job)

        # 2. Experience match score
        exp_score = self._compute_experience_match(candidate, job)

        # 3. Education match score
        edu_score = self._compute_education_match(candidate, job)

        # 4. Normalize semantic score (cosine similarity is -1 to 1, map to 0-100)
        sem_score = max(0, min(100, (semantic_score + 1) * 50))

        # 5. LLM evaluation (most expensive - run last)
        llm_result = await self._llm_evaluate(candidate, job)

        # 6. Weighted hybrid score
        overall = (
            WEIGHTS["semantic_similarity"] * sem_score +
            WEIGHTS["skill_match"] * skill_score +
            WEIGHTS["experience_match"] * exp_score +
            WEIGHTS["llm_evaluation"] * llm_result.get("score", 50) +
            WEIGHTS["education_match"] * edu_score
        )

        return {
            "candidate_id": candidate.id,
            "overall_score": round(overall, 1),
            "skill_match_score": round(skill_score, 1),
            "experience_match_score": round(exp_score, 1),
            "semantic_similarity_score": round(sem_score, 1),
            "llm_evaluation_score": round(llm_result.get("score", 50), 1),
            "education_match_score": round(edu_score, 1),
            "strengths": llm_result.get("strengths", []),
            "weaknesses": llm_result.get("weaknesses", []),
            "explanation": llm_result.get("explanation", ""),
            "recommendation": llm_result.get("recommendation", "maybe"),
            "matched_skills": llm_result.get("matched_skills", []),
            "missing_skills": llm_result.get("missing_skills", []),
        }

    def _compute_skill_match(self, candidate: Candidate, job: Job) -> float:
        """Calculate skill overlap between candidate and job requirements with synonym matching."""
        if not candidate.skills or (not job.required_skills and not job.preferred_skills):
            return 50.0

        # Skill synonyms/aliases for better matching
        SKILL_ALIASES = {
            'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
            'typescript': ['ts'],
            'python': ['python3', 'py'],
            'react': ['reactjs', 'react.js'],
            'node': ['nodejs', 'node.js'],
            'postgresql': ['postgres', 'psql'],
            'mongodb': ['mongo'],
            'kubernetes': ['k8s'],
            'machine learning': ['ml', 'deep learning', 'ai'],
            'amazon web services': ['aws'],
            'google cloud': ['gcp'],
            'microsoft azure': ['azure'],
        }

        def normalize_skills(skill_data):
            skills = set()
            if isinstance(skill_data, dict):
                for skill_list in skill_data.values():
                    if isinstance(skill_list, list):
                        skills.update(str(s).lower().strip() for s in skill_list)
            elif isinstance(skill_data, list):
                skills.update(str(s).lower().strip() for s in skill_data)
            # Expand aliases
            expanded = set(skills)
            for canonical, aliases in SKILL_ALIASES.items():
                if canonical in skills:
                    expanded.update(aliases)
                for alias in aliases:
                    if alias in skills:
                        expanded.add(canonical)
            return expanded

        candidate_skills = normalize_skills(candidate.skills)
        required_skills = normalize_skills(job.required_skills or {})

        if not required_skills:
            return 60.0

        matched = candidate_skills.intersection(required_skills)
        match_ratio = len(matched) / len(required_skills)

        preferred_skills = normalize_skills(job.preferred_skills or {})
        bonus = 0
        if preferred_skills:
            pref_matched = candidate_skills.intersection(preferred_skills)
            bonus = (len(pref_matched) / len(preferred_skills)) * 10

        return min(100, match_ratio * 90 + bonus)

    def _compute_experience_match(self, candidate: Candidate, job: Job) -> float:
        """Score experience match based on years."""
        required = job.required_experience_years
        candidate_exp = candidate.experience_years

        if required is None:
            return 70.0  # No requirement

        if candidate_exp is None:
            return 40.0  # Unknown experience

        ratio = candidate_exp / required if required > 0 else 1.0

        if ratio >= 1.5:
            return 85.0  # Overqualified (slight penalty)
        elif ratio >= 1.0:
            return 100.0  # Meets or exceeds
        elif ratio >= 0.8:
            return 80.0  # Close enough
        elif ratio >= 0.6:
            return 60.0
        elif ratio >= 0.4:
            return 40.0
        else:
            return 20.0

    def _compute_education_match(self, candidate: Candidate, job: Job) -> float:
        """Score education match."""
        required = job.required_education
        if not required:
            return 75.0

        education = candidate.education or {}
        highest = education.get("highest_level", "").lower()

        edu_levels = {
            "phd": 5, "doctorate": 5,
            "master": 4, "masters": 4, "msc": 4, "mba": 4,
            "bachelor": 3, "bachelors": 3, "bsc": 3, "be": 3,
            "associate": 2, "diploma": 2,
            "high school": 1, "secondary": 1,
        }

        required_level = 0
        for key, val in edu_levels.items():
            if key in required.lower():
                required_level = val
                break

        candidate_level = 0
        for key, val in edu_levels.items():
            if key in highest:
                candidate_level = val
                break

        if required_level == 0:
            return 75.0

        if candidate_level >= required_level:
            return 100.0
        elif candidate_level == required_level - 1:
            return 70.0
        else:
            return max(30.0, 100 - (required_level - candidate_level) * 25)

    async def _llm_evaluate(self, candidate: Candidate, job: Job) -> dict:
        """Get LLM's holistic evaluation of candidate-job fit."""
        try:
            skills_data = candidate.skills or {}
            all_skills = []
            if isinstance(skills_data, dict):
                for s_list in skills_data.values():
                    if isinstance(s_list, list):
                        all_skills.extend([str(s) for s in s_list])
            elif isinstance(skills_data, list):
                all_skills = [str(s) for s in skills_data]

            req_skills = job.required_skills or {}
            req_skills_list = []
            if isinstance(req_skills, dict):
                for s_list in req_skills.values():
                    if isinstance(s_list, list):
                        req_skills_list.extend([str(s) for s in s_list])
            elif isinstance(req_skills, list):
                req_skills_list = [str(s) for s in req_skills]

            edu = candidate.education or {}
            degrees = edu.get("degrees", [])
            edu_str = "; ".join(
                f"{d.get('degree', '')} ({d.get('institution', '')})"
                for d in degrees[:2]
            ) or "Not specified"

            prompt = LLM_EVALUATION_PROMPT
            prompt = prompt.replace("{job_title}", str(job.title))
            prompt = prompt.replace("{company}", str(job.company or "Not specified"))
            prompt = prompt.replace("{job_description}", str(job.description[:1500]))
            prompt = prompt.replace("{required_skills}", str(", ".join(req_skills_list[:15])))
            prompt = prompt.replace("{required_experience}", str(job.required_experience_years or "Not specified"))
            prompt = prompt.replace("{candidate_name}", str(candidate.name))
            prompt = prompt.replace("{candidate_experience}", str(candidate.experience_years or "Unknown"))
            prompt = prompt.replace("{candidate_skills}", str(", ".join(all_skills[:20])))
            prompt = prompt.replace("{candidate_summary}", str(candidate.summary or "Not available"))
            prompt = prompt.replace("{candidate_education}", str(edu_str))

            result = await self.llm.generate_json(
                prompt=prompt,
                system_prompt="You are an expert technical recruiter. Provide precise, consistent, evidence-based evaluations. Never inflate scores.",
            )

            # Enforce recommendation thresholds based on score
            score = result.get("score", 50)
            if score >= 85:
                result["recommendation"] = "strong_yes"
            elif score >= 70:
                result["recommendation"] = "yes"
            elif score >= 50:
                result["recommendation"] = "maybe"
            else:
                result["recommendation"] = "no"

            return result

        except Exception as e:
            logger.error("LLM evaluation failed", error=str(e))
            return {
                "score": 50,
                "strengths": [],
                "weaknesses": [],
                "explanation": "Automated evaluation unavailable",
                "recommendation": "maybe",
                "matched_skills": [],
                "missing_skills": [],
            }

    async def _get_candidates(
        self,
        db: AsyncSession,
        candidate_ids: Optional[list[str]] = None,
        user_id: Optional[str] = None,
    ) -> list[Candidate]:
        """Fetch candidates scoped to the user."""
        query = select(Candidate).where(Candidate.status == CandidateStatus.ready)
        if user_id:
            query = query.where(Candidate.uploaded_by == user_id)
        if candidate_ids:
            query = query.where(Candidate.id.in_(candidate_ids))
        result = await db.execute(query)
        return result.scalars().all()

    async def _save_scores(
        self,
        db: AsyncSession,
        job_id: str,
        scores: list[dict],
    ) -> list[MatchScore]:
        """Save or update match scores in the database."""
        records = []

        for score_data in scores:
            # Delete existing score for this pair
            await db.execute(
                delete(MatchScore).where(
                    MatchScore.candidate_id == score_data["candidate_id"],
                    MatchScore.job_id == job_id,
                )
            )

            record = MatchScore(
                candidate_id=score_data["candidate_id"],
                job_id=job_id,
                overall_score=score_data["overall_score"],
                skill_match_score=score_data["skill_match_score"],
                experience_match_score=score_data["experience_match_score"],
                semantic_similarity_score=score_data["semantic_similarity_score"],
                llm_evaluation_score=score_data["llm_evaluation_score"],
                education_match_score=score_data["education_match_score"],
                strengths=score_data["strengths"],
                weaknesses=score_data["weaknesses"],
                explanation=score_data["explanation"],
                recommendation=score_data["recommendation"],
                matched_skills=score_data["matched_skills"],
                missing_skills=score_data["missing_skills"],
            )
            db.add(record)
            records.append(record)

        await db.flush()
        return records

    def _build_job_embedding_text(self, job: Job) -> str:
        """Build rich text for job embedding."""
        parts = [f"Job Title: {job.title}"]

        if job.company:
            parts.append(f"Company: {job.company}")

        parts.append(f"Description: {job.description[:2000]}")

        req_skills = job.required_skills or {}
        all_req = []
        for s_list in req_skills.values():
            if isinstance(s_list, list):
                all_req.extend(s_list)
        if all_req:
            parts.append(f"Required Skills: {', '.join(all_req)}")

        if job.required_experience_years:
            parts.append(f"Required Experience: {job.required_experience_years} years")

        return "\n".join(parts)


# Global singleton
_matching_engine: Optional[MatchingEngine] = None


def get_matching_engine() -> MatchingEngine:
    global _matching_engine
    if _matching_engine is None:
        _matching_engine = MatchingEngine()
    return _matching_engine
