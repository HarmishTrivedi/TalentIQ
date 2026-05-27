# TalentIQ Interview OS

Enterprise-grade AI Interview Platform — Google Meet quality video calls with a silent AI copilot for recruiters.

---

## What It Does

**Candidate sees:** A clean Google Meet-style video call. Camera, mic, chat, screen share. Nothing else.

**Recruiter sees:** The same video call **plus** a full AI Copilot panel:
- Live transcript with speaker identification
- Real-time skill detection
- Topic coverage tracker
- Contradiction detection with timestamps
- Communication quality scores
- AI-suggested follow-up questions
- Interview timeline
- Notes exporter

The AI never interrupts. The candidate never sees it.

---

## Quick Start (Local)

```bash
git clone <your-repo>
cd talentiq-interview-os
npm install
cp .env.example .env
# Edit .env — set BASE_URL=http://localhost:3000
node server.js
```

Open `http://localhost:3000` — click **Recruiter** or **Candidate** to test.

---

## Deploy to Render (Your existing portal is already there)

### Option A — New Render Web Service

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Render auto-detects `render.yaml`
5. Add environment variables in the Render dashboard:
   - `BASE_URL` → your Render service URL (e.g. `https://talentiq-xxx.onrender.com`)
   - `ALLOWED_ORIGINS` → your recruitment portal domain
6. Deploy

### Option B — Add to existing Render service

If you want TalentIQ running on the **same server** as your recruitment portal:

```js
// In your portal's main server file (Express):
const talentiq = require('./talentiq/server'); // Not needed — see below
```

Actually, the easiest approach is to run TalentIQ as a **separate Render service** and link them via the SDK (see Integration below). Two services on the free tier = fine.

---

## Integrate with Your Recruitment Portal

### Step 1 — Install the SDK

Copy `talentiq-sdk.js` into your portal project.

### Step 2 — Create a room when scheduling an interview

```js
import TalentIQSDK from './talentiq-sdk.js';

const talentiq = new TalentIQSDK({
  baseUrl: 'https://your-talentiq-service.onrender.com',
  apiKey: 'your-optional-secret-key'   // matches TALENTIQ_API_KEY in .env
});

// Call this when a recruiter schedules an interview
async function scheduleInterview(interview) {
  const room = await talentiq.createRoom({
    interviewId: interview.id,          // your DB interview ID
    recruiterId: interview.recruiterId,
    recruiterName: interview.recruiterName,
    candidateId: interview.candidateId,
    candidateName: interview.candidateName,
    jobTitle: interview.jobTitle,
    jobId: interview.jobId,
    scheduledAt: interview.scheduledAt
  });

  // Save these URLs to your database
  await db.interviews.update(interview.id, {
    recruiterInterviewUrl: room.recruiterUrl,
    candidateInterviewUrl: room.candidateUrl,
    talentiqRoomId: room.roomId
  });

  // Send candidate their link via email
  const email = talentiq.generateInviteEmail({
    candidateName: interview.candidateName,
    recruiterName: interview.recruiterName,
    jobTitle: interview.jobTitle,
    candidateUrl: room.candidateUrl,
    scheduledAt: interview.scheduledAt
  });
  await sendEmail(interview.candidateEmail, email.subject, email.body);

  return room;
}
```

### Step 3 — "Join Interview" button in your portal

```jsx
// React example
function InterviewCard({ interview }) {
  const joinInterview = () => {
    // Recruiter clicks "Start Interview" in your portal
    window.location.href = interview.recruiterInterviewUrl;
  };

  return (
    <button onClick={joinInterview}>
      Start Interview
    </button>
  );
}
```

### Step 4 — Candidate receives email

The candidate gets a plain link like:
```
https://your-talentiq-service.onrender.com/interview/abc123?role=candidate&name=Alex+Kumar
```

They click it, go through the lobby, and join. They see a clean video call. No AI. No scores.

---

## API Reference

### `POST /api/rooms/create`

Create a new interview room.

**Body:**
```json
{
  "interviewId": "optional-your-id",
  "recruiterId": "rec_123",
  "recruiterName": "Sarah Chen",
  "candidateId": "cand_456",
  "candidateName": "Alex Kumar",
  "jobTitle": "Senior Backend Engineer",
  "jobId": "job_789",
  "scheduledAt": "2025-09-15T14:00:00Z",
  "apiKey": "your-optional-api-key"
}
```

**Response:**
```json
{
  "success": true,
  "roomId": "abc123",
  "recruiterUrl": "https://your-service.onrender.com/interview/abc123?role=recruiter&name=Sarah+Chen",
  "candidateUrl": "https://your-service.onrender.com/interview/abc123?role=candidate&name=Alex+Kumar",
  "room": { ... }
}
```

### `GET /api/rooms/:roomId`

Get room status and participant info.

### `POST /api/rooms/:roomId/end`

End an interview room (disconnects all participants).

### `GET /api/health`

Health check endpoint for Render.

---

## AI Copilot — How It Works

The AI analysis runs **in the recruiter's browser** using:

1. **Web Speech API** — captures live audio and converts to text
2. **Speaker detection** — identifies recruiter vs candidate speech
3. **Anthropic Claude API** — every 20 seconds, sends the transcript to Claude for analysis
4. **Real-time UI updates** — analysis renders instantly in the AI panel

**To enable AI analysis:**
- The recruiter's browser must have microphone access
- Claude API is called directly from the browser (or you can proxy through your server)
- No API key = heuristic fallback analysis still works

**For production:** Proxy the Anthropic API call through your server to protect the API key:
```js
// In your portal's server, add:
app.post('/api/ai-analyze', async (req, res) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(req.body)
  });
  const data = await response.json();
  res.json(data);
});
```
Then in `ai-engine.js`, change the fetch URL from `https://api.anthropic.com/v1/messages` to `/api/ai-analyze`.

---

## WebRTC Architecture

```
Recruiter Browser  ←──── Socket.IO Signaling ────→  Candidate Browser
       │                    (Your Server)                    │
       │                                                     │
       └─────────────── Direct P2P WebRTC ─────────────────┘
                    (No video goes through server)
```

Video/audio travels **peer-to-peer** — your server only handles signaling (tiny JSON messages). This means:
- No bandwidth cost for video on your server
- Scales to thousands of concurrent interviews
- Low latency

---

## Project Structure

```
talentiq-interview-os/
├── server.js              # Express + Socket.IO server
├── render.yaml            # One-click Render deployment
├── talentiq-sdk.js        # Drop into your portal
├── .env.example           # Environment config
├── package.json
└── public/
    ├── index.html
    ├── styles/
    │   └── main.css       # Full design system
    └── js/
        ├── app.js         # Router
        ├── lobby.js       # Pre-join lobby
        ├── interview.js   # Interview room (recruiter + candidate)
        ├── ai-engine.js   # AI analysis engine
        ├── webrtc.js      # WebRTC peer connections
        └── ui.js          # Utilities
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `PORT` | Server port (Render sets this automatically) | No (default 3000) |
| `BASE_URL` | Your full service URL | Yes (for correct room URLs) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | Yes (your portal domain) |
| `TALENTIQ_API_KEY` | Optional secret for API auth | No |

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| WebRTC Video | ✅ | ✅ | ✅ | ✅ |
| Screen Share | ✅ | ✅ | ✅ | ✅ |
| Speech Recognition | ✅ | ❌ | ❌ | ✅ |
| AI Copilot | ✅ | ✅* | ✅* | ✅ |

*AI Copilot works without speech recognition — recruiter can manually paste transcript or use heuristic analysis.

**Recommended:** Chrome or Edge for recruiters (full Speech Recognition support).

---

## License

MIT
