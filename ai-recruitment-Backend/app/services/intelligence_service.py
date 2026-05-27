"""
Role Intelligence Service.
Handles role classification, domain knowledge base, and JD validation.
"""
from typing import Dict, List, Optional, Any
import structlog
import json

logger = structlog.get_logger()

# Step 1 & 2: Role Knowledge Base
DOMAIN_KNOWLEDGE_BASE = {
    "Software Engineering": {
        "core_skills": ["Python", "JavaScript", "TypeScript", "Java", "C++", "Go", "Rust", "SQL", "Git", "System Design"],
        "preferred_skills": ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "Microservices", "Unit Testing"],
        "forbidden_skills": ["Sales Closing", "Recruitment", "Payroll", "Lead Generation", "Prospecting"],
        "responsibilities": [
            "Design and implement scalable software solutions",
            "Write clean, maintainable, and efficient code",
            "Collaborate with cross-functional teams to define and ship new features",
            "Troubleshoot, debug, and upgrade existing software",
            "Participate in code reviews and maintain code quality"
        ]
    },
    "Sales": {
        "core_skills": ["Lead Generation", "Prospecting", "Communication", "CRM", "Negotiation", "Client Relationship Management", "Sales Closing", "B2B Sales"],
        "preferred_skills": ["Enterprise Sales", "Public Speaking", "Market Research", "Strategic Planning", "Presentation Skills"],
        "forbidden_skills": ["Python", "Java", "Kubernetes", "TensorFlow", "React", "Machine Learning", "Software Development", "C++"],
        "responsibilities": [
            "Identify and develop new business opportunities",
            "Manage the entire sales cycle from prospecting to closing",
            "Build and maintain strong, long-lasting customer relationships",
            "Meet or exceed sales targets and performance metrics",
            "Conduct market research to identify new trends and customer needs"
        ]
    },
    "Human Resources": {
        "core_skills": ["Recruitment", "Employee Relations", "Onboarding", "Payroll", "Performance Management", "HR Compliance", "Talent Acquisition"],
        "preferred_skills": ["HRIS", "Conflict Resolution", "Organizational Development", "Benefits Administration"],
        "forbidden_skills": ["Python", "Java", "Kubernetes", "C++", "System Design", "Back-end Development", "Data Engineering"],
        "responsibilities": [
            "Manage the recruitment and selection process",
            "Develop and implement HR strategies and initiatives",
            "Bridge management and employee relations by addressing demands, grievances, or other issues",
            "Support current and future business needs through the development, engagement, and motivation of human capital",
            "Oversee and manage a performance appraisal system that drives high performance"
        ]
    },
    "Data & AI": {
        "core_skills": ["Machine Learning", "Data Analysis", "Python", "R", "SQL", "Statistics", "Data Visualization", "TensorFlow", "PyTorch"],
        "preferred_skills": ["Deep Learning", "NLP", "Computer Vision", "Big Data", "Spark", "Hadoop", "MLOps"],
        "forbidden_skills": ["Sales Closing", "Recruitment", "Payroll", "Lead Generation"],
        "responsibilities": [
            "Develop and implement machine learning models",
            "Clean and analyze large datasets to extract actionable insights",
            "Collaborate with engineering teams to deploy models into production",
            "Communicate complex data findings to non-technical stakeholders",
            "Keep abreast of the latest developments in AI and machine learning"
        ]
    },
    "Design": {
        "core_skills": ["UI/UX Design", "Figma", "Adobe Creative Suite", "Prototyping", "User Research", "Wireframing", "Interaction Design"],
        "preferred_skills": ["Motion Design", "Frontend Basics (HTML/CSS)", "Typography", "Visual Communication"],
        "forbidden_skills": ["Backend Development", "Kubernetes", "SQL", "Recruitment", "Sales Closing"],
        "responsibilities": [
            "Create user-centered designs by understanding business requirements",
            "Develop UI mockups and prototypes that clearly illustrate how sites function",
            "Conduct user research and evaluate user feedback",
            "Collaborate with product managers and engineers to implement design solutions",
            "Maintain and evolve the company's design system"
        ]
    },
    "Infrastructure": {
        "core_skills": ["DevOps", "Kubernetes", "Docker", "Terraform", "CI/CD", "AWS", "Azure", "GCP", "Linux Administration", "Networking"],
        "preferred_skills": ["Python (Scripting)", "Bash", "Monitoring (Prometheus/Grafana)", "Security Best Practices", "Cloud Architecture"],
        "forbidden_skills": ["UI/UX Design", "Sales Closing", "Recruitment", "Payroll", "B2B Sales"],
        "responsibilities": [
            "Manage and automate cloud infrastructure",
            "Implement and maintain CI/CD pipelines",
            "Ensure system security, reliability, and scalability",
            "Monitor system performance and troubleshoot issues",
            "Collaborate with development teams to optimize application deployment"
        ]
    },
    "Product": {
        "core_skills": ["Product Strategy", "Roadmapping", "Market Research", "Agile/Scrum", "User Stories", "Stakeholder Management", "Data-Driven Decision Making"],
        "preferred_skills": ["Technical Background", "A/B Testing", "Product Analytics", "Customer Discovery"],
        "forbidden_skills": ["Kubernetes", "C++", "System Administration", "Payroll"],
        "responsibilities": [
            "Define the product vision and strategy",
            "Create and manage the product roadmap",
            "Gather and prioritize product and customer requirements",
            "Work closely with engineering, design, and marketing to deliver products",
            "Analyze product performance and user feedback to drive improvements"
        ]
    },
    "Marketing": {
        "core_skills": ["Digital Marketing", "SEO", "Content Strategy", "Social Media Management", "Email Marketing", "Copywriting", "Analytics"],
        "preferred_skills": ["PPC", "Brand Management", "Growth Hacking", "Public Relations"],
        "forbidden_skills": ["Python", "Java", "Kubernetes", "System Design", "Recruitment", "Payroll"],
        "responsibilities": [
            "Develop and execute marketing campaigns",
            "Create engaging content for various channels",
            "Analyze marketing data and optimize campaign performance",
            "Manage the company's social media presence",
            "Collaborate with sales and product teams to align marketing efforts"
        ]
    }
}

# Role to Domain Mapping for Classification
ROLE_TO_DOMAIN_MAP = {
    "sales executive": "Sales",
    "business development executive": "Sales",
    "account manager": "Sales",
    "hr executive": "Human Resources",
    "hr manager": "Human Resources",
    "recruiter": "Human Resources",
    "python developer": "Software Engineering",
    "software engineer": "Software Engineering",
    "backend developer": "Software Engineering",
    "frontend developer": "Software Engineering",
    "fullstack developer": "Software Engineering",
    "data scientist": "Data & AI",
    "data analyst": "Data & AI",
    "ml engineer": "Data & AI",
    "ui ux designer": "Design",
    "product designer": "Design",
    "devops engineer": "Infrastructure",
    "site reliability engineer": "Infrastructure",
    "product manager": "Product",
    "marketing executive": "Marketing",
    "marketing manager": "Marketing",
    "content writer": "Marketing"
}

class IntelligenceService:
    def __init__(self, llm_service=None):
        self.llm = llm_service

    def classify_role(self, role_title: str) -> str:
        """Classify a role title into a domain."""
        role_lower = role_title.lower().strip()
        
        # 1. Direct match
        if role_lower in ROLE_TO_DOMAIN_MAP:
            return ROLE_TO_DOMAIN_MAP[role_lower]
        
        # 2. Keyword match
        keywords = {
            "Sales": ["sales", "account", "business development", "prospecting"],
            "Human Resources": ["hr", "human resources", "recruitment", "talent", "people"],
            "Software Engineering": ["developer", "engineer", "fullstack", "backend", "frontend", "programmer", "software"],
            "Data & AI": ["data", "ai", "machine learning", "ml", "scientist", "analytics"],
            "Design": ["design", "ui", "ux", "creative", "artist"],
            "Infrastructure": ["devops", "sre", "cloud", "infrastructure", "sysadmin", "network"],
            "Product": ["product", "roadmap", "owner"],
            "Marketing": ["marketing", "seo", "content", "social media", "brand"]
        }
        
        for domain, domain_keywords in keywords.items():
            if any(kw in role_lower for kw in domain_keywords):
                # Specific overrides for overlap
                if domain == "Software Engineering" and "data" in role_lower:
                    return "Data & AI"
                if domain == "Software Engineering" and "devops" in role_lower:
                    return "Infrastructure"
                return domain
                
        return "Software Engineering"  # Default

    def get_role_intelligence(self, role_title: str) -> Dict[str, Any]:
        """Get core, preferred, and forbidden skills for a role."""
        domain = self.classify_role(role_title)
        intel = DOMAIN_KNOWLEDGE_BASE.get(domain, DOMAIN_KNOWLEDGE_BASE["Software Engineering"])
        return {
            "role": role_title,
            "domain": domain,
            **intel
        }

    async def validate_jd(self, role_title: str, jd_text: str) -> str:
        """Step 4: AI Validation Layer to remove irrelevant skills."""
        if not self.llm:
            from app.services.llm_service import get_llm_service
            self.llm = get_llm_service()
            
        intel = self.get_role_intelligence(role_title)
        
        validation_prompt = f"""Role: {role_title}
Domain: {intel['domain']}

Review the generated Job Description below.

Tasks:
1. Remove irrelevant skills that do not belong to the {intel['domain']} domain.
2. Remove technologies unrelated to the role (e.g., NO Software Engineering skills in Sales roles).
3. Ensure the core skills: {', '.join(intel['core_skills'])} are prioritized.
4. Strictly REMOVE any of these Forbidden Skills if present: {', '.join(intel['forbidden_skills'])}.
5. Ensure every responsibility and qualification belongs strictly to the target role.

Generated Job Description:
---
{jd_text}
---

Return the corrected Job Description in Markdown format. Ensure it remains professional and complete."""

        corrected_jd = await self.llm.generate(
            prompt=validation_prompt,
            system_prompt="You are an expert HR auditor. Your job is to ensure job descriptions are accurate and free of role-mixing or hallucinations. Be strict and precise.",
            temperature=0.3 # Low temperature for consistency
        )
        
        return corrected_jd

_intelligence_service: Optional[IntelligenceService] = None

def get_intelligence_service() -> IntelligenceService:
    global _intelligence_service
    if _intelligence_service is None:
        _intelligence_service = IntelligenceService()
    return _intelligence_service
