const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory room store (replace with DB in production)
const rooms = new Map();
const participants = new Map();

// ─────────────────────────────────────────────
// REST API — Integration endpoints for your portal
// ─────────────────────────────────────────────

// Create a new interview room (called from your recruitment portal)
app.post('/api/rooms/create', (req, res) => {
  const {
    interviewId,
    recruiterId,
    candidateId,
    candidateName,
    recruiterName,
    jobTitle,
    jobId,
    scheduledAt,
    apiKey
  } = req.body;

  // Optional API key check — set TALENTIQ_API_KEY in .env
  if (process.env.TALENTIQ_API_KEY && apiKey !== process.env.TALENTIQ_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const roomId = interviewId || uuidv4();

  rooms.set(roomId, {
    roomId,
    recruiterId,
    candidateId,
    candidateName,
    recruiterName,
    jobTitle,
    jobId,
    scheduledAt: scheduledAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    status: 'waiting',
    participants: []
  });

  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;

  res.json({
    success: true,
    roomId,
    recruiterUrl: `${baseUrl}/interview/${roomId}?role=recruiter&name=${encodeURIComponent(recruiterName || 'Recruiter')}`,
    candidateUrl: `${baseUrl}/interview/${roomId}?role=candidate&name=${encodeURIComponent(candidateName || 'Candidate')}`,
    room: rooms.get(roomId)
  });
});

// Get room info
app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

// List all rooms
app.get('/api/rooms', (req, res) => {
  res.json(Array.from(rooms.values()));
});

// End interview room
app.post('/api/rooms/:roomId/end', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  room.status = 'ended';
  room.endedAt = new Date().toISOString();
  io.to(req.params.roomId).emit('interview-ended', { roomId: req.params.roomId });
  res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size, uptime: process.uptime() });
});

// Anthropic API Proxy — protects your API key server-side
// The recruiter's browser calls /api/ai/analyze instead of Anthropic directly
app.post('/api/ai/analyze', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI analysis not configured (no ANTHROPIC_API_KEY)' });
  }
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('AI proxy error:', err);
    res.status(500).json({ error: 'AI proxy error' });
  }
});

// Save recording metadata (called from client after MediaRecorder finishes)
app.post('/api/rooms/:roomId/recording', express.raw({ type: 'video/webm', limit: '500mb' }), (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const fs = require('fs');
  const recordingsDir = path.join(__dirname, 'public', 'recordings');
  if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true });

  const candidateName = (room.candidateName || 'candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
  const date = new Date().toISOString().split('T')[0];
  const filename = `${candidateName}_${date}_${req.params.roomId.slice(0, 8)}.webm`;
  const filepath = path.join(recordingsDir, filename);

  fs.writeFile(filepath, req.body, (err) => {
    if (err) {
      console.error('Recording save error:', err);
      return res.status(500).json({ error: 'Failed to save recording' });
    }
    const recordingUrl = `/recordings/${filename}`;
    room.recordingUrl = recordingUrl;
    room.recordingFilename = filename;
    console.log(`[Recording] Saved: ${filename}`);
    res.json({ success: true, recordingUrl, filename });
  });
});

// Report page
app.get('/report', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

// Serve SPA for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─────────────────────────────────────────────
// Socket.IO — WebRTC Signaling
// ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Join a room
  socket.on('join-room', ({ roomId, userId, userName, role }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userId = userId;
    socket.userName = userName;
    socket.role = role;

    participants.set(socket.id, { socketId: socket.id, userId, userName, role, roomId });

    // Update room participants
    const room = rooms.get(roomId);
    if (room) {
      room.participants = room.participants.filter(p => p.userId !== userId);
      room.participants.push({ userId, userName, role, socketId: socket.id });
      if (room.status === 'waiting' && role === 'recruiter') room.status = 'active';
    }

    // Notify others in room
    socket.to(roomId).emit('participant-joined', { userId, userName, role, socketId: socket.id });

    // Send current participants list to newcomer
    const roomParticipants = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
      .map(sid => participants.get(sid))
      .filter(Boolean);
    socket.emit('room-participants', roomParticipants);

    console.log(`[Room ${roomId}] ${userName} (${role}) joined`);
  });

  // WebRTC Signaling
  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer, userName: socket.userName, role: socket.role });
  });

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  // Chat messages
  socket.on('chat-message', ({ roomId, message, userName, role }) => {
    const msg = {
      id: uuidv4(),
      message,
      userName,
      role,
      timestamp: new Date().toISOString(),
      socketId: socket.id
    };
    io.to(roomId).emit('chat-message', msg);
  });

  // Transcript update (from AI analysis on recruiter side)
  socket.on('transcript-update', ({ roomId, transcript }) => {
    socket.to(roomId).emit('transcript-update', transcript);
  });

  // AI analysis results (recruiter side only)
  socket.on('ai-analysis', ({ roomId, analysis }) => {
    // Only broadcast to recruiter sockets
    const roomSockets = io.sockets.adapter.rooms.get(roomId) || new Set();
    roomSockets.forEach(sid => {
      const p = participants.get(sid);
      if (p && p.role === 'recruiter') {
        io.to(sid).emit('ai-analysis', analysis);
      }
    });
  });

  // Media state changes
  socket.on('media-state', ({ roomId, video, audio }) => {
    socket.to(roomId).emit('media-state', { socketId: socket.id, userId: socket.userId, video, audio });
  });

  // Screen share
  socket.on('screen-share-started', ({ roomId }) => {
    socket.to(roomId).emit('screen-share-started', { socketId: socket.id, userName: socket.userName });
  });

  socket.on('screen-share-stopped', ({ roomId }) => {
    socket.to(roomId).emit('screen-share-stopped', { socketId: socket.id });
  });

  // ── Recording consent flow ──
  // Recruiter requests to start recording → notify candidate
  socket.on('recording-start-request', ({ roomId, recruiterName }) => {
    if (socket.role !== 'recruiter') return;
    socket.to(roomId).emit('recording-consent-request', { recruiterName });
  });

  // Candidate responds to consent
  socket.on('recording-consent-response', ({ roomId, accepted }) => {
    // Notify recruiter of candidate's decision
    const roomSockets = io.sockets.adapter.rooms.get(roomId) || new Set();
    roomSockets.forEach(sid => {
      const p = participants.get(sid);
      if (p && p.role === 'recruiter') {
        io.to(sid).emit('recording-consent-result', { accepted, candidateName: socket.userName });
      }
    });
  });

  // Recruiter confirmed recording started → broadcast to all in room
  socket.on('recording-started', ({ roomId }) => {
    if (socket.role !== 'recruiter') return;
    const room = rooms.get(roomId);
    if (room) room.recordingStartedAt = new Date().toISOString();
    io.to(roomId).emit('recording-started', { startedBy: socket.userName });
  });

  // Recruiter stopped recording → broadcast to all in room
  socket.on('recording-stopped', ({ roomId }) => {
    if (socket.role !== 'recruiter') return;
    const room = rooms.get(roomId);
    if (room) room.recordingStoppedAt = new Date().toISOString();
    io.to(roomId).emit('recording-stopped', { stoppedBy: socket.userName });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const { roomId, userId, userName, role } = socket;
    if (roomId) {
      socket.to(roomId).emit('participant-left', { userId, userName, role, socketId: socket.id });
      const room = rooms.get(roomId);
      if (room) {
        room.participants = room.participants.filter(p => p.socketId !== socket.id);
      }
    }
    participants.delete(socket.id);
    console.log(`[Socket] Disconnected: ${socket.id} (${userName})`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 TalentIQ Interview OS running on port ${PORT}`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   API:     http://localhost:${PORT}/api/health\n`);
});
