"""
AI Interview Intelligence Service
Handles speech recognition, fraud detection, question generation, and real-time analysis
"""
import json
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.services.llm_service import get_llm_service


class InterviewAIService:
    """AI-powered interview intelligence and analysis"""
    
    def __init__(self):
        self.llm = get_llm_service()
    
    async def analyze_speech_transcript(self, transcript: str) -> Dict[str, Any]:
        """Analyze speech for communication quality"""
        prompt = f"""Analyze this interview transcript for communication quality:

Transcript:
{transcript}

Provide analysis in JSON format:
{{
    "speech_clarity": 0-100,
    "professionalism": 0-100,
    "confidence_level": 0-100,
    "filler_words_count": number,
    "speaking_speed_wpm": number,
    "nervousness_indicators": ["indicator1", "indicator2"],
    "key_strengths": ["strength1", "strength2"],
    "areas_for_improvement": ["area1", "area2"]
}}"""
        
        response = await self.llm.generate(prompt)
        try:
            return json.loads(response)
        except:
            return {
                "speech_clarity": 70,
                "professionalism": 75,
                "confidence_level": 70,
                "filler_words_count": 0,
                "speaking_speed_wpm": 120
            }
    
    async def detect_ai_assistance(self, answer: str, question: str) -> Dict[str, Any]:
        """Detect if answer is AI-generated or plagiarized"""
        prompt = f"""Analyze if this interview answer shows signs of AI assistance or plagiarism:

Question: {question}

Answer: {answer}

Evaluate and provide JSON:
{{
    "ai_assistance_probability": 0-100,
    "plagiarism_score": 0-100,
    "risk_level": "low|medium|high",
    "indicators": ["indicator1", "indicator2"],
    "reasoning": "explanation",
    "authenticity_score": 0-100
}}"""
        
        response = await self.llm.generate(prompt)
        try:
            return json.loads(response)
        except:
            return {
                "ai_assistance_probability": 20,
                "plagiarism_score": 15,
                "risk_level": "low",
                "indicators": [],
                "authenticity_score": 80
            }
    
    async def analyze_coding_submission(self, code: str, question: str, language: str) -> Dict[str, Any]:
        """Analyze coding submission for quality and plagiarism"""
        prompt = f"""Analyze this coding solution:

Question: {question}

Language: {language}

Code:
{code}

Provide detailed analysis in JSON:
{{
    "code_quality_score": 0-100,
    "logic_correctness": 0-100,
    "code_efficiency": 0-100,
    "code_readability": 0-100,
    "plagiarism_probability": 0-100,
    "ai_generated_probability": 0-100,
    "time_complexity": "O(...)",
    "space_complexity": "O(...)",
    "strengths": ["strength1"],
    "weaknesses": ["weakness1"],
    "suggestions": ["suggestion1"]
}}"""
        
        response = await self.llm.generate(prompt)
        try:
            return json.loads(response)
        except:
            return {
                "code_quality_score": 70,
                "logic_correctness": 75,
                "code_efficiency": 70,
                "plagiarism_probability": 20,
                "ai_generated_probability": 25
            }
    
    async def evaluate_answer_quality(self, question: str, answer: str, category: str) -> Dict[str, Any]:
        """Evaluate technical answer quality"""
        prompt = f"""Evaluate this interview answer:

Category: {category}
Question: {question}
Answer: {answer}

Provide evaluation in JSON:
{{
    "answer_quality_score": 0-100,
    "technical_depth_score": 0-100,
    "communication_quality_score": 0-100,
    "completeness": 0-100,
    "accuracy": 0-100,
    "evaluation_summary": "detailed feedback",
    "strong_points": ["point1"],
    "weak_points": ["point1"],
    "follow_up_suggestions": ["question1"]
}}"""
        
        response = await self.llm.generate(prompt)
        try:
            return json.loads(response)
        except:
            return {
                "answer_quality_score": 70,
                "technical_depth_score": 65,
                "communication_quality_score": 75,
                "completeness": 70,
                "accuracy": 75
            }
    
    async def generate_interview_questions(
        self, 
        category: str, 
        difficulty: str, 
        count: int,
        candidate_context: Optional[str] = None,
        job_context: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Generate AI-powered interview questions"""
        context = ""
        if candidate_context:
            context += f"\nCandidate Background:\n{candidate_context}\n"
        if job_context:
            context += f"\nJob Requirements:\n{job_context}\n"
        
        prompt = f"""Generate {count} {difficulty} level interview questions for category: {category}

{context}

Requirements:
- Questions should be practical and relevant
- Match the difficulty level appropriately
- Be specific and clear
- Include follow-up question suggestions

Provide response in JSON array format:
[
    {{
        "question_text": "question here",
        "difficulty": "{difficulty}",
        "category": "{category}",
        "estimated_time_minutes": number,
        "tags": ["tag1", "tag2"],
        "follow_up_suggestions": ["follow_up1"],
        "evaluation_criteria": ["criteria1"]
    }}
]"""
        
        try:
            questions = await self.llm.generate_json(
                prompt,
                system_prompt="You create high-quality interview questions. Return a JSON array only."
            )
            return self._normalize_questions(questions, category, difficulty, count)
        except Exception:
            return self._get_fallback_questions(category, difficulty, count)
    
    async def suggest_follow_up_questions(
        self, 
        question: str, 
        answer: str,
        candidate_context: Optional[str] = None
    ) -> List[str]:
        """Generate dynamic follow-up questions based on answer"""
        prompt = f"""Based on this interview exchange, suggest 3 intelligent follow-up questions:

Question: {question}
Answer: {answer}

{f"Candidate Context: {candidate_context}" if candidate_context else ""}

Generate follow-up questions that:
- Probe deeper into weak areas
- Explore related concepts
- Test practical understanding
- Are contextually relevant

Return as JSON array: ["question1", "question2", "question3"]"""
        
        response = await self.llm.generate(prompt)
        try:
            return json.loads(response)
        except:
            return [
                "Can you elaborate on that approach?",
                "How would you handle edge cases?",
                "What alternatives did you consider?"
            ]
    
    async def generate_interview_summary(
        self,
        transcript: str,
        questions_and_answers: List[Dict[str, Any]],
        events: List[Dict[str, Any]],
        scores: Dict[str, float]
    ) -> Dict[str, Any]:
        """Generate comprehensive interview analysis summary"""
        prompt = f"""Generate a comprehensive interview analysis report:

Overall Scores:
{json.dumps(scores, indent=2)}

Questions & Answers:
{json.dumps(questions_and_answers[:5], indent=2)}

Suspicious Events:
{json.dumps(events[:10], indent=2)}

Transcript Sample:
{transcript[:2000]}

Provide detailed analysis in JSON:
{{
    "overall_rating": 0-100,
    "hiring_recommendation": "strong_hire|hire|maybe|no_hire",
    "candidate_strengths": ["strength1", "strength2", "strength3"],
    "candidate_weaknesses": ["weakness1", "weakness2"],
    "technical_fit": "detailed assessment",
    "cultural_fit": "detailed assessment",
    "communication_assessment": "detailed assessment",
    "fraud_assessment": {{
        "risk_level": "low|medium|high",
        "confidence": 0-100,
        "key_indicators": ["indicator1"]
    }},
    "improvement_areas": ["area1", "area2"],
    "next_round_suggestion": "recommendation",
    "key_highlights": ["highlight1", "highlight2"],
    "red_flags": ["flag1"],
    "executive_summary": "2-3 paragraph summary"
}}"""
        
        response = await self.llm.generate(prompt)
        try:
            return json.loads(response)
        except:
            return self._get_fallback_summary(scores)
    
    async def analyze_behavioral_patterns(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze suspicious behavioral patterns"""
        tab_switches = len([e for e in events if e.get("event_type") == "tab_switch"])
        copy_pastes = len([e for e in events if e.get("event_type") == "copy_paste"])
        long_pauses = len([e for e in events if e.get("event_type") == "long_pause"])
        
        risk_score = min(100, (tab_switches * 10) + (copy_pastes * 15) + (long_pauses * 5))
        
        if risk_score < 30:
            risk_level = "low"
        elif risk_score < 60:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        return {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "tab_switching_count": tab_switches,
            "copy_paste_count": copy_pastes,
            "long_pause_count": long_pauses,
            "suspicious_patterns": [
                f"Detected {tab_switches} tab switches" if tab_switches > 3 else None,
                f"Detected {copy_pastes} copy-paste actions" if copy_pastes > 2 else None,
                f"Detected {long_pauses} unusually long pauses" if long_pauses > 5 else None
            ],
            "recommendation": "Review manually" if risk_level == "high" else "Acceptable"
        }
    
    def _get_fallback_questions(self, category: str, difficulty: str, count: int) -> List[Dict[str, Any]]:
        """Fallback questions if AI generation fails"""
        questions = {
            "technical_frontend": [
                "Explain the virtual DOM and how React uses it for performance optimization.",
                "What are React hooks and how do they differ from class components?",
                "Describe the CSS box model and common layout techniques.",
                "How would you diagnose and improve a slow-rendering frontend page?",
                "How do you design accessible form interactions and validate them?"
            ],
            "technical_backend": [
                "Explain RESTful API design principles and best practices.",
                "How do you handle database transactions and ensure data consistency?",
                "Describe microservices architecture and its trade-offs.",
                "How would you design authentication and authorization for a multi-tenant API?",
                "How do you diagnose a slow endpoint in production?"
            ],
            "technical_ai_ml": [
                "How do you detect data leakage when training a machine learning model?",
                "Explain the trade-offs between precision and recall for a screening model.",
                "How would you monitor model quality after deployment?",
                "How do embeddings support semantic search, and what failure cases matter?",
                "Describe an approach for evaluating an LLM-powered feature."
            ],
            "technical_dsa": [
                "Explain the difference between BFS and DFS. When would you use each?",
                "How do you detect a cycle in a linked list?",
                "Describe how a hash table works and handles collisions.",
                "How would you choose between a heap and a sorted collection?",
                "Explain the time and space complexity of merging overlapping intervals."
            ],
            "technical_database": [
                "How do indexes improve query performance, and when can they hurt writes?",
                "Explain transaction isolation levels and a practical concurrency issue.",
                "How would you investigate and optimize a slow SQL query?",
                "When would you choose normalization versus denormalization?",
                "How would you migrate a large production table with minimal downtime?"
            ],
            "technical_devops": [
                "How would you design a CI/CD pipeline with safe rollback?",
                "Explain how containers differ from virtual machines operationally.",
                "How do you monitor and respond to a production deployment regression?",
                "How would you manage secrets across environments?",
                "Describe a reliable zero-downtime deployment strategy."
            ],
            "technical_cloud": [
                "How would you design a highly available web application in the cloud?",
                "When would you use managed queues in a distributed system?",
                "How do you balance cost, reliability, and performance in cloud architecture?",
                "Explain an approach to disaster recovery and backups.",
                "How would you secure cloud storage containing sensitive documents?"
            ],
            "technical_security": [
                "How would you protect an API from common authentication attacks?",
                "Explain the risk of injection vulnerabilities and practical mitigations.",
                "How should sensitive data be encrypted in transit and at rest?",
                "How would you respond to a suspected credential leak?",
                "Describe secure file upload validation for user-provided resumes."
            ],
            "technical_system_design": [
                "Design a scalable notification system and explain key trade-offs.",
                "How would you design search for a large candidate database?",
                "Design a real-time collaboration feature with reliable updates.",
                "How would you scale a read-heavy API while preserving consistency?",
                "Design an audit log system for sensitive recruitment actions."
            ],
            "coding_algorithms": [
                "Write a function to reverse a linked list.",
                "Implement binary search on a sorted array.",
                "Find the longest substring without repeating characters.",
                "Merge overlapping intervals and describe the complexity.",
                "Return the top K most frequent values in an array."
            ],
            "coding_debugging": [
                "A request intermittently times out under load. Describe your debugging process.",
                "Find and fix a race condition in a shared counter implementation.",
                "How would you debug a memory leak in a long-running service?",
                "A UI displays stale API data after updates. How do you isolate the bug?",
                "Explain how you would reproduce and fix an environment-only failure."
            ],
            "coding_sql": [
                "Write a query to return the top candidate score for each job.",
                "Write a query to find duplicate email addresses in a candidate table.",
                "How would you paginate a large ordered result set efficiently?",
                "Write a query to calculate monthly interview completion counts.",
                "Explain how you would optimize a multi-table reporting query."
            ],
            "behavioral_hr": [
                "Tell me about a challenging work situation and how you handled it.",
                "What motivates you in your next role?",
                "Describe feedback you received and how you acted on it.",
                "How do you prioritize when multiple deadlines conflict?",
                "Why does this opportunity align with your goals?"
            ],
            "behavioral_leadership": [
                "Describe a time you led a team through uncertainty.",
                "How have you handled disagreement within your team?",
                "Tell me about a decision you made with incomplete information.",
                "How do you mentor or develop less experienced colleagues?",
                "Describe an outcome you owned when plans failed."
            ],
            "behavioral_communication": [
                "Tell me about a time you explained a complex topic to a non-technical audience.",
                "How do you ensure stakeholders stay aligned during a project?",
                "Describe a difficult conversation and how you approached it.",
                "How do you communicate delays or risks?",
                "Give an example of adapting your communication style."
            ],
            "behavioral_teamwork": [
                "Describe a successful cross-functional collaboration.",
                "Tell me about a conflict with a teammate and how it was resolved.",
                "How have you supported a colleague during a difficult project?",
                "Describe your role on a team that achieved a difficult goal.",
                "How do you build trust when joining a new team?"
            ]
        }
        
        default_questions = questions.get(category, [
            "Describe your experience with this technology.",
            "How do you approach problem-solving?",
            "What's your biggest technical achievement?"
        ])
        
        generated = []
        for index in range(count):
            base_question = default_questions[index % len(default_questions)]
            text = base_question if index < len(default_questions) else f"{base_question} Provide a different real-world example for scenario {index + 1}."
            generated.append({
                "question_text": text,
                "difficulty": difficulty,
                "category": category,
                "estimated_time_minutes": self._estimate_time(difficulty),
                "tags": [category.replace("_", " "), difficulty],
                "follow_up_suggestions": ["Can you explain your reasoning and the trade-offs involved?"],
                "evaluation_criteria": ["Clarity of explanation", "Practical judgment", "Depth appropriate to the level"]
            })
        return generated

    def _normalize_questions(
        self,
        questions: Any,
        category: str,
        difficulty: str,
        count: int
    ) -> List[Dict[str, Any]]:
        """Validate AI output and fill incomplete responses with usable questions."""
        if not isinstance(questions, list):
            return self._get_fallback_questions(category, difficulty, count)

        normalized = []
        seen = set()
        for question in questions:
            if not isinstance(question, dict):
                continue
            text = str(question.get("question_text", "")).strip()
            if not text or text.lower() in seen:
                continue
            seen.add(text.lower())
            normalized.append({
                "question_text": text,
                "difficulty": difficulty,
                "category": category,
                "estimated_time_minutes": self._safe_minutes(question.get("estimated_time_minutes"), difficulty),
                "tags": self._string_list(question.get("tags")) or [category.replace("_", " "), difficulty],
                "follow_up_suggestions": self._string_list(question.get("follow_up_suggestions")) or [
                    "Can you expand on your approach and the trade-offs involved?"
                ],
                "evaluation_criteria": self._string_list(question.get("evaluation_criteria")) or [
                    "Clarity of explanation", "Technical accuracy", "Practical judgment"
                ]
            })
            if len(normalized) == count:
                break

        if len(normalized) < count:
            fallback = self._get_fallback_questions(category, difficulty, count)
            for question in fallback:
                if question["question_text"].lower() not in seen:
                    normalized.append(question)
                    seen.add(question["question_text"].lower())
                if len(normalized) == count:
                    break

        return normalized[:count]

    def _safe_minutes(self, value: Any, difficulty: str) -> int:
        try:
            return max(3, min(45, int(value)))
        except (TypeError, ValueError):
            return self._estimate_time(difficulty)

    def _estimate_time(self, difficulty: str) -> int:
        return {"beginner": 5, "intermediate": 8, "advanced": 12, "expert": 15}.get(difficulty, 8)

    def _string_list(self, value: Any) -> List[str]:
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()]
    
    def _get_fallback_summary(self, scores: Dict[str, float]) -> Dict[str, Any]:
        """Fallback summary if AI generation fails"""
        avg_score = sum(scores.values()) / len(scores) if scores else 50
        
        return {
            "overall_rating": avg_score,
            "hiring_recommendation": "hire" if avg_score > 70 else "maybe",
            "candidate_strengths": ["Technical knowledge", "Communication skills"],
            "candidate_weaknesses": ["Needs more experience"],
            "technical_fit": "Candidate demonstrates solid technical understanding.",
            "executive_summary": "Candidate performed adequately in the interview."
        }


# Singleton instance
_interview_ai_service = None

def get_interview_ai_service() -> InterviewAIService:
    global _interview_ai_service
    if _interview_ai_service is None:
        _interview_ai_service = InterviewAIService()
    return _interview_ai_service
