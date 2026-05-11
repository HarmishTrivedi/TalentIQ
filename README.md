# 🧠 TalentIQ — AI Recruitment Intelligence Platform

> Production-ready, full-stack AI recruitment system with CV parsing, intelligent matching, and AI-powered screening chat.

![TalentIQ](https://img.shields.io/badge/TalentIQ-AI%20Recruitment-5b72f5?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=for-the-badge)

---

## 🎯 Features

| Feature | Description |
|---|---|
| 📄 **CV Processing** | Upload PDFs/DOCX → AI extracts skills, experience, education into structured JSON |
| 🤖 **AI Matching** | Hybrid scoring: semantic similarity + skill match + experience + LLM evaluation |
| 💬 **AI Chat** | Context-aware screening assistant with candidate/job memory |
| 📊 **Dashboard** | Live stats, activity charts, top candidates overview |
| 🔐 **JWT Auth** | Role-based access (admin/recruiter) with secure token refresh |
| 🔎 **Vector Search** | FAISS-powered semantic candidate search |
| 🔄 **Multi-Provider AI** | Switch between OpenAI, Groq, or Ollama with one env var |

---

## 🏗️ Architecture

```
TalentIQ Platform
├── ai-recruitment-service/          # FastAPI Backend
│   ├── app/
│   │   ├── main.py                  # App entry + middleware
│   │   ├── config.py                # Pydantic settings
│   │   ├── database/                # Async SQLAlchemy
│   │   │   └── session.py
│   │   ├── models/
│   │   │   ├── models.py            # ORM models (User, Candidate, Job, MatchScore, Chat)
│   │   │   └── schemas.py           # Pydantic request/response schemas
│   │   ├── routes/
│   │   │   ├── auth.py              # JWT login, register, refresh
│   │   │   ├── candidates.py        # CV upload, list, get, delete
│   │   │   ├── jobs.py              # Job CRUD
│   │   │   ├── matching.py          # AI matching endpoints
│   │   │   ├── chat.py              # AI chat sessions & messages
│   │   │   └── dashboard.py         # Aggregated stats
│   │   ├── services/
│   │   │   ├── llm_service.py       # OpenAI/Groq/Ollama abstraction
│   │   │   ├── cv_service.py        # CV extraction pipeline
│   │   │   ├── job_service.py       # Job processing + embedding
│   │   │   ├── matching_service.py  # Hybrid scoring engine
│   │   │   └── chat_service.py      # Conversation memory + AI
│   │   ├── utils/
│   │   │   ├── auth.py              # JWT utils, password hashing
│   │   │   └── pdf_extractor.py     # PDF/DOCX text extraction
│   │   └── vector_store/
│   │       └── faiss_store.py       # FAISS persistent vector store
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
└── ai-recruitment-frontend/         # React + Vite Frontend
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.jsx        # Stats + charts
    │   │   ├── UploadCV.jsx         # Drag & drop CV upload
    │   │   ├── Candidates.jsx       # Candidate list
    │   │   ├── CandidateDetail.jsx  # Full profile + analysis
    │   │   ├── Jobs.jsx             # Job listings + create
    │   │   ├── JobDetail.jsx        # Job + match results
    │   │   ├── Matching.jsx         # AI matching interface
    │   │   ├── ChatPage.jsx         # AI screening chat
    │   │   └── Login.jsx            # Auth page
    │   ├── components/
    │   │   ├── layout/              # Sidebar, Layout
    │   │   └── ui/                  # ScoreRing, StatCard, TagList, etc.
    │   ├── services/api.js          # Axios API client
    │   ├── store/index.js           # Zustand state
    │   └── utils/helpers.js         # Formatters, color utils
    ├── package.json
    ├── tailwind.config.js
    └── Dockerfile
```

---

## ⚡ Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone and configure
git clone <repo-url>
cd ai-recruitment-system

# 2. Set up environment
cp ai-recruitment-service/.env.example ai-recruitment-service/.env
# Edit .env and add your OPENAI_API_KEY

# 3. Start everything
docker-compose up -d

# Access:
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/api/docs
```

### Option 2: Manual Setup

#### Backend
```bash
cd ai-recruitment-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env - set DATABASE_URL, OPENAI_API_KEY, SECRET_KEY

# Start PostgreSQL (or use SQLite for testing)
# Update DATABASE_URL in .env

# Run migrations / init DB
python -c "import asyncio; from app.database import init_db; asyncio.run(init_db())"

# Start server
python run.py
# OR
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd ai-recruitment-frontend

# Install dependencies
npm install

# Configure
cp .env.example .env.local
# Edit VITE_API_URL if needed

# Start dev server
npm run dev
# → http://localhost:5173
```

---

## 🔑 Environment Variables

### Backend `.env`

```env
# Required
SECRET_KEY=your-32-char-secret-key-here
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/ai_recruitment
OPENAI_API_KEY=sk-your-openai-api-key

# AI Provider (openai | groq | ollama)
AI_PROVIDER=openai
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Optional: Groq (faster, cheaper)
# AI_PROVIDER=groq
# GROQ_API_KEY=gsk_your-groq-api-key
# GROQ_MODEL=llama3-70b-8192

# Optional: Ollama (local, free)
# AI_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3

# Auth
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 🤖 AI Matching Algorithm

The hybrid scoring engine computes a weighted score from 5 components:

```
Final Score = 
  0.25 × Semantic Similarity (FAISS cosine similarity)
+ 0.35 × Skill Match (required skills overlap %)
+ 0.20 × Experience Match (years ratio scoring)
+ 0.15 × LLM Evaluation (GPT holistic assessment 0-100)
+ 0.05 × Education Match (degree level comparison)
```

Each match returns:
```json
{
  "overall_score": 82.5,
  "skill_match_score": 91.0,
  "experience_match_score": 80.0,
  "semantic_similarity_score": 75.0,
  "llm_evaluation_score": 78.0,
  "education_match_score": 100.0,
  "strengths": ["Strong React skills", "5 years relevant experience"],
  "weaknesses": ["No AWS experience", "Lacks backend skills"],
  "explanation": "Candidate shows strong frontend expertise...",
  "recommendation": "yes",
  "matched_skills": ["React", "TypeScript", "Node.js"],
  "missing_skills": ["AWS", "Python", "Docker"]
}
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login → JWT tokens |
| GET | `/api/v1/auth/me` | Current user |
| POST | `/api/v1/candidates/upload` | Upload + process CV |
| GET | `/api/v1/candidates` | List candidates |
| GET | `/api/v1/candidates/{id}` | Candidate details |
| POST | `/api/v1/jobs` | Create job with AI extraction |
| GET | `/api/v1/jobs` | List jobs |
| POST | `/api/v1/matching/run` | Run AI matching |
| GET | `/api/v1/matching/job/{id}` | Get job match results |
| POST | `/api/v1/chat/sessions` | Create chat session |
| POST | `/api/v1/chat/sessions/{id}/messages` | Send message |
| GET | `/api/v1/dashboard/stats` | Dashboard statistics |

Full interactive docs: **http://localhost:8000/api/docs**

---

## 🎨 UI Components

- **Dark glassmorphism** design with brand blue (#5b72f5) accent
- **Syne** font for premium SaaS aesthetic
- **Animated score rings** with color-coded thresholds
- **Drag & drop** CV upload with real-time progress
- **Multi-step upload** flow with AI status indicators
- **Recharts** for activity visualization
- **Framer Motion** for smooth page transitions
- **Staggered animations** on list items

---

## 🛠️ Tech Stack

**Backend**
- FastAPI 0.111 — Async web framework
- SQLAlchemy 2.0 — Async ORM
- PostgreSQL — Primary database
- FAISS — Vector similarity search
- LangChain — LLM orchestration
- OpenAI API — LLM + embeddings
- JWT + Bcrypt — Authentication
- Pydantic v2 — Validation
- Structlog — Structured logging

**Frontend**
- React 18 + Vite — UI framework
- Tailwind CSS — Utility-first styles
- Zustand — State management
- Axios — HTTP client
- Recharts — Data visualization
- React Dropzone — File upload
- React Hot Toast — Notifications

---

## 📝 Demo Credentials

```
Email: demo@talentiq.ai
Password: demo1234
```

Or click **"Continue as Demo User"** on the login page.

---

## 📄 License

MIT License — Free for commercial and personal use.
