import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Brain, Code, Copy, FileText, Hand, Maximize, Mic, MicOff, Minimize,
  Monitor, MonitorOff, Phone, Signal, Users, Video, VideoOff, MessageSquare, 
  User, Activity, Zap, TrendingUp, Shield, BarChart3, Clock, CheckCircle2, AlertTriangle, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import api, { authApi, API_BASE } from '../services/api'
import { useAuthStore } from '../store'
import MeetingChat from '../components/interview/MeetingChat'
import SharedCodeEditor from '../components/interview/SharedCodeEditor'

// ── Components ──────────────────────────────────────────────────────────────

function ScoreCircle({ score, label, color = "teal" }) {
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  const colorMap = {
    teal: "text-teal-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    amber: "text-amber-400"
  }
  const strokeMap = {
    teal: "stroke-teal-500",
    blue: "stroke-blue-500",
    purple: "stroke-purple-500",
    amber: "stroke-amber-500"
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center w-16 h-16">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
          <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" 
            strokeDasharray={circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease' }}
            className={strokeMap[color]} strokeLinecap="round" />
        </svg>
        <span className={cn("absolute text-sm font-black font-mono", colorMap[color])}>{Math.round(score)}%</span>
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    </div>
  )
}

function MetricBar({ label, score, color = "bg-teal-500" }) {
  return (
    <div className="space-y-1.5 w-full">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-mono">{Math.round(score)}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} className={cn("h-full rounded-full shadow-sm", color)} />
      </div>
    </div>
  )
}

function Control({ active, danger, label, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`group flex h-11 w-11 items-center justify-center rounded-xl border transition duration-200 ${
        danger
          ? 'border-red-400/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white'
          : active
            ? 'border-teal-400/30 bg-teal-500/20 text-teal-400'
            : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function TranscriptBlock({ entry, isAiNote }) {
  if (isAiNote) {
    return (
      <div className="mb-4 bg-teal-500/5 border-l-2 border-teal-500 p-3 rounded-r-xl">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={12} className="text-teal-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">AI Notes</span>
        </div>
        <p className="text-xs text-teal-100/70 italic leading-relaxed">
          {entry.text}
        </p>
      </div>
    )
  }

  const isAi = entry.speaker.includes('AI')
  const isCandidate = !isAi && entry.speaker.toLowerCase().includes('candidate')

  return (
    <div className="mb-5 space-y-1">
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-[10px] font-black uppercase tracking-[0.15em]",
          isAi ? "text-purple-400" : isCandidate ? "text-teal-400" : "text-slate-400"
        )}>
          {entry.speaker}
        </span>
        <span className="text-[9px] text-slate-600 font-mono">
          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
      <p className={cn(
        "text-sm leading-relaxed",
        isAi ? "text-purple-100/90 font-medium" : "text-slate-100/80"
      )}>
        {entry.text}
      </p>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function InterviewRoom() {
  const { interviewId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token: authToken, updateUser } = useAuthStore()
  const token = searchParams.get('token')
  const candidateNameFromParams = searchParams.get('name')
  const isCandidate = !!token
  
  const isRecruiter = useMemo(() => {
    if (isCandidate) return false;
    if (!authToken) return false;
    if (!user) return null; 
    return user.role === 'recruiter' || user.role === 'admin';
  }, [isCandidate, user, authToken]);

  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthLoading, setIsAuthLoading] = useState(!!(authToken && !user && !isCandidate))
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [transcript, setTranscript] = useState([])
  const [aiNotes, setAiNotes] = useState([])
  const [activePanel, setActivePanel] = useState(null)
  const [showCodeEditor, setShowCodeEditor] = useState(false)
  const [chatMessages, setChatMessages] = useState([])

  const [analysis, setAnalysis] = useState({
    commScore: 0,
    confidenceScore: 0,
    technicalScore: 0,
    behavioralScore: 0,
    sentiment: 'Neutral',
    engagementScore: 0,
    insights: [],
    detectedSkills: [],
    fillerWordCount: 0,
    eyeContactScore: null,
    riskLevel: 'Low'
  })

  const [remoteStream, setRemoteStream] = useState(null)
  const [isRemoteConnected, setIsRemoteConnected] = useState(false)

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const wsRef = useRef(null)
  const peerRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const recognitionRef = useRef(null)
  const analysisBuffer = useRef([])
  const lastProcessedIndex = useRef(0)

  // ── ICE Servers ──
  const iceServersRef = useRef([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ])

  useEffect(() => {
    api.get('/interviews/turn-credentials')
      .then(res => {
        if (res.data?.iceServers?.length) {
          iceServersRef.current = res.data.iceServers
          console.log('[ICE] TURN credentials loaded')
        }
      })
      .catch(() => console.warn('[ICE] Using STUN fallback'))
  }, [])

  // ── Auth & Init ──
  useEffect(() => {
    const fetchUser = async () => {
      if (authToken && !user && !isCandidate) {
        try {
          const res = await authApi.me()
          updateUser(res.data)
        } catch (e) {
          navigate('/login', { replace: true })
        } finally { setIsAuthLoading(false) }
      } else { setIsAuthLoading(false) }
    }
    fetchUser()
  }, [authToken, user, isCandidate, updateUser, navigate])

  useEffect(() => {
    if (!isCandidate && !authToken && !isAuthLoading) {
      navigate('/login', { state: { from: location.pathname }, replace: true })
    }
  }, [isCandidate, authToken, navigate, location, isAuthLoading])

  useEffect(() => {
    if (isRecruiter === null && isAuthLoading) return;
    
    const init = async () => {
      const data = await loadInterview()
      if (!data || data.status === 'completed') return;

      const stream = await initializeMedia()
      initializeWebSocket(stream)
      initializeSpeechRecognition()
      startTimer()
    }
    init()

    return () => cleanup()
  }, [interviewId, user, isAuthLoading])

  const loadInterview = async () => {
    try {
      const response = isCandidate
        ? await api.get(`/interviews/join/${interviewId}?token=${token}`)
        : await api.get(`/interviews/${interviewId}`)
      
      setInterview(response.data)
      setLoading(false)
      
      if (isRecruiter && response.data.status === 'scheduled') {
        await api.post(`/interviews/${interviewId}/start`)
      }
      return response.data
    } catch (error) {
      navigate(isCandidate ? '/' : '/interviews', { replace: true })
      return null
    }
  }

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      })
      streamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      return stream
    } catch (error) {
      toast.error('Media access failed')
      return null
    }
  }

  const initializeWebSocket = (stream) => {
    let wsUrl = import.meta.env.VITE_WS_URL;
    
    if (!wsUrl) {
      let apiBase = import.meta.env.VITE_API_URL || '';
      if (!apiBase || apiBase.startsWith('/')) {
        apiBase = window.location.origin;
      }
      if (apiBase.includes('-frontend-')) {
        apiBase = apiBase.replace('-frontend-', '-backend-');
      }
      wsUrl = apiBase.replace(/^http/, 'ws');
    }
    
    // Strictly ensure /api/v1 is present exactly once before /interviews
    const cleanBase = wsUrl.replace(/\/$/, '').replace(/\/api\/v1$/, '') + '/api/v1';
    const finalUrl = `${cleanBase}/interviews/${interviewId}/live`;

    console.log('[WS] Connecting to:', finalUrl)

    wsRef.current = new WebSocket(finalUrl)
    wsRef.current.onopen = () => {
      wsRef.current.send(JSON.stringify({
        type: 'participant_joined',
        name: user?.full_name || candidateNameFromParams || 'Participant'
      }))
    }

    wsRef.current.onmessage = (e) => {
      const data = JSON.parse(e.data)
      handleWebSocketMessage(data, stream)
    }
    
    wsRef.current.onclose = () => setIsRemoteConnected(false)
  }

  // ── WebRTC Engine ──
  const createPeerConnection = (stream) => {
    if (peerRef.current) peerRef.current.close()
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })
    peerRef.current = pc

    if (stream) stream.getTracks().forEach(track => pc.addTrack(track, stream))

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ice-candidate', candidate }))
      }
    }

    pc.ontrack = (e) => {
      setIsRemoteConnected(true)
      setRemoteStream(prev => {
        if (!prev) return new MediaStream([e.track])
        if (prev.getTracks().find(t => t.id === e.track.id)) return prev
        const newStream = new MediaStream(prev.getTracks())
        newStream.addTrack(e.track)
        return newStream
      })
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') toast.success('Video connected')
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') setIsRemoteConnected(false)
    }

    pc.onnegotiationneeded = async () => {
      if (makingOfferRef.current) return;
      try {
        makingOfferRef.current = true
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        wsRef.current?.send(JSON.stringify({ type: 'offer', offer: pc.localDescription }))
      } catch (err) {} finally {
        makingOfferRef.current = false
      }
    }

    return pc
  }

  const handleWebSocketMessage = async (data, stream) => {
    switch (data.type) {
      case 'participant_joined':
        toast.success(`${data.name} joined`)
        if (!peerRef.current) createPeerConnection(stream)
        break

      case 'offer':
        const pc = peerRef.current || createPeerConnection(stream)
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        wsRef.current.send(JSON.stringify({ type: 'answer', answer: pc.localDescription }))
        break

      case 'answer':
        await peerRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer))
        break

      case 'ice-candidate':
        await peerRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate))
        break

      case 'transcript':
        const entry = { speaker: data.speaker, text: data.text, timestamp: new Date().toISOString() }
        setTranscript(prev => [...prev, entry])
        // Buffer for real-time analysis
        if (isRecruiter) runRealTimeAnalysis(entry)
        break
        
      case 'chat_message':
        setChatMessages(prev => [...prev, {
          id: `remote-${Date.now()}`,
          sender: data.sender || data.name || 'Participant',
          text: data.text,
          timestamp: new Date().toISOString(),
          isOwn: false
        }])
        break

      case 'participant_left':
        toast(`${data.name} left`)
        setIsRemoteConnected(false)
        break

      default: break
    }
  }

  // ── AI Analysis Logic ──
  const runRealTimeAnalysis = async (newEntry) => {
    analysisBuffer.current.push(newEntry)
    
    // Immediate filler word detection (Clarity/Confidence logic)
    const text = newEntry.text.toLowerCase()
    const fillers = (text.match(/\b(um|uh|umm|ahh|like|you know|basically)\b/g) || []).length
    if (fillers > 0) {
       setAnalysis(prev => ({ ...prev, fillerWordCount: prev.fillerWordCount + fillers }))
    }

    // Call LLM for deep analysis every 3 candidate entries
    const candidateEntries = analysisBuffer.current.filter(e => !e.speaker.includes('AI') && !e.speaker.includes('Recruiter'))
    if (candidateEntries.length - lastProcessedIndex.current >= 2) {
      lastProcessedIndex.current = candidateEntries.length
      triggerLLMAnalysis(candidateEntries)
    }
  }

  const triggerLLMAnalysis = async (buffer) => {
    try {
      const recentText = buffer.slice(-5).map(e => `${e.speaker}: ${e.text}`).join('\n')
      const prompt = `Analyze this interview transcript slice. Return valid JSON ONLY.
      - scores (0-100): comm, confidence, technical, behavioral, engagement
      - sentiment: Positive|Neutral|Negative
      - insight: one critical observation
      - ai_note: optional context for interviewer

      Transcript:
      ${recentText}`

      // Call the proxy on the interview server (localhost:3000 logic)
      const res = await fetch(`${window.location.origin.replace(':5173', ':3000')}/api/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      
      const data = await res.json()
      const content = data.content?.[0]?.text
      if (content) {
        const result = JSON.parse(content.replace(/```json|```/g, ''))
        setAnalysis(prev => ({
          ...prev,
          commScore: result.scores?.comm || prev.commScore,
          confidenceScore: result.scores?.confidence || prev.confidenceScore,
          technicalScore: result.scores?.technical || prev.technicalScore,
          behavioralScore: result.scores?.behavioral || prev.behavioralScore,
          engagementScore: result.scores?.engagement || prev.engagementScore,
          sentiment: result.sentiment || prev.sentiment,
          insights: [result.insight, ...prev.insights].slice(0, 10).filter(Boolean)
        }))
        if (result.ai_note) {
          setAiNotes(prev => [{ speaker: 'AI Notes', text: result.ai_note, timestamp: new Date().toISOString() }, ...prev])
        }
      }
    } catch (e) {
      console.warn('AI Analysis failed:', e)
    }
  }

  const initializeSpeechRecognition = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Speech) return
    const rec = new Speech()
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      const text = e.results[e.results.length - 1][0].transcript
      const speaker = isRecruiter ? 'Interviewer' : (candidateNameFromParams || 'Candidate')
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'transcript', speaker, text }))
      }
    }
    rec.start()
    recognitionRef.current = rec
  }

  const startTimer = () => {
    timerRef.current = setInterval(() => setElapsedTime(p => p + 1), 1000)
  }

  const cleanup = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    peerRef.current?.close()
    wsRef.current?.close()
    recognitionRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#070812]">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-teal-500" />
    </div>
  )

  const formatTime = (s) => {
    const m = Math.floor(s / 60); const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0a0b14] text-slate-100 font-sans">
      
      {/* ── Header ── */}
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-teal-500/10 rounded-lg"><Signal size={18} className="text-teal-400" /></div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">{interview?.title || 'Mission Critical Interview'}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Connection</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Elapsed Time</span>
              <span className="text-sm font-mono font-bold text-teal-400">{formatTime(elapsedTime)}</span>
           </div>
           <button onClick={() => { if (confirm('End session?')) navigate(isRecruiter ? '/interviews' : '/thanks') }}
             className="h-10 px-6 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg shadow-red-500/20">
             <Phone size={16} className="rotate-[135deg]" /> END SESSION
           </button>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        
        {/* Panel 1: Video (40% for recruiter, 100% for candidate) */}
        <section className={cn("flex flex-col gap-4 transition-all duration-500", isRecruiter ? "w-[40%]" : "w-full")}>
          <div className="flex-1 relative rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl shadow-black/50 group">
             <video ref={remoteVideoRef} playsInline autoPlay className="w-full h-full object-cover" />
             
             {/* Local PIP Video */}
             <div className="absolute bottom-6 right-6 w-48 h-32 rounded-2xl border border-white/10 bg-slate-800 shadow-2xl overflow-hidden z-10 transition-transform group-hover:scale-105">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                {!isVideoOn && <div className="absolute inset-0 flex items-center justify-center bg-slate-800"><VideoOff size={24} className="text-slate-600" /></div>}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/40 rounded text-[9px] font-black uppercase tracking-widest">You (Self)</div>
             </div>

             {/* Candidate Info Overlay */}
             <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-end justify-between">
                   <div>
                      <h2 className="text-2xl font-bold text-white mb-1">{isRecruiter ? interview?.candidate?.name : 'Interviewer'}</h2>
                      <div className="flex items-center gap-3">
                         <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest", 
                           isRemoteConnected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                         )}>
                            {isRemoteConnected ? 'Secured Link' : 'Lost Signal'}
                         </div>
                         {isAudioOn && <Activity size={14} className="text-teal-400 animate-pulse" />}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {isRecruiter && (
          <>
            {/* Panel 2 (CENTER - 30%): Notes/Transcript */}
            <section className="w-[30%] flex flex-col rounded-3xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm overflow-hidden shadow-xl">
               <div className="p-5 border-b border-slate-800 bg-slate-800/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-slate-800 rounded-lg text-slate-400"><FileText size={18} /></div>
                     <h3 className="text-xs font-black uppercase tracking-[0.2em]">Mission Journal</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">{transcript.length} Logs</span>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  {transcript.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-10">
                       <MessageSquare size={32} className="mb-4" />
                       <p className="text-xs font-bold uppercase tracking-widest leading-loose">Awaiting neural voice input synchronization...</p>
                    </div>
                  ) : (
                    <div className="stagger">
                       {/* Interleave AI Notes and Transcript */}
                       {[...transcript, ...aiNotes].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)).map((entry, i) => (
                         <TranscriptBlock key={i} entry={entry} isAiNote={entry.speaker === 'AI Notes'} />
                       ))}
                    </div>
                  )}
               </div>
            </section>

            {/* Panel 3 (RIGHT - 30%): AI Analysis */}
            <section className="w-[30%] flex flex-col rounded-3xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
               <div className="p-5 border-b border-slate-800 bg-slate-800/40 flex items-center gap-3">
                  <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400"><Brain size={18} className="animate-pulse" /></div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Neural Evaluation</h3>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                  
                  {/* Overall Confidence Radar Placeholder */}
                  <div className="grid grid-cols-2 gap-6">
                     <ScoreCircle score={analysis.commScore} label="Clarity" color="teal" />
                     <ScoreCircle score={analysis.confidenceScore} label="Confidence" color="blue" />
                     <ScoreCircle score={analysis.technicalScore} label="Technical" color="purple" />
                     <ScoreCircle score={analysis.behavioralScore} label="Behavior" color="amber" />
                  </div>

                  {/* Behavior Analysis Details */}
                  <div className="space-y-6 pt-4">
                     <div className="p-5 rounded-2xl bg-black/40 border border-slate-800">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center justify-between">
                           Communication Profile
                           <span className={cn("text-[9px] px-2 py-0.5 rounded uppercase", 
                             analysis.sentiment === 'Positive' ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                           )}>{analysis.sentiment} Sentiment</span>
                        </h4>
                        <div className="space-y-4">
                           <MetricBar label="Engagement" score={analysis.engagementScore} color="bg-teal-500" />
                           <MetricBar label="Response Accuracy" score={analysis.technicalScore} color="bg-purple-500" />
                        </div>
                     </div>

                     {/* Real-time Insights */}
                     <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1 flex items-center gap-2">
                           <Zap size={12} className="text-teal-400" /> Neural Signals
                        </h4>
                        {analysis.insights.length > 0 ? analysis.insights.map((insight, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-start gap-3">
                            <CheckCircle2 size={14} className="text-teal-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">{insight}</p>
                          </motion.div>
                        )) : (
                          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center py-10 border border-dashed border-slate-800 rounded-2xl italic">Synthesizing behavioral streams...</p>
                        )}
                     </div>

                     {/* Fraud / Risk Alert */}
                     <div className={cn("p-4 rounded-2xl border flex items-center justify-between", 
                       analysis.fillerWordCount > 8 ? "bg-amber-500/5 border-amber-500/20" : "bg-slate-800/20 border-slate-800"
                     )}>
                        <div className="flex items-center gap-3">
                           <Shield size={16} className={analysis.fillerWordCount > 8 ? "text-amber-400" : "text-slate-600"} />
                           <div className="min-w-0">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Speech Analysis</p>
                              <p className="text-xs font-bold text-slate-200">{analysis.fillerWordCount} Hesitation Markers</p>
                           </div>
                        </div>
                        {analysis.fillerWordCount > 8 && <AlertTriangle size={14} className="text-amber-400" />}
                     </div>
                     
                     <div className="p-4 rounded-2xl border border-slate-800 bg-slate-800/10">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <Activity size={16} className="text-slate-600" />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facial Posture</p>
                           </div>
                           <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Unavailable</span>
                        </div>
                     </div>
                  </div>
               </div>
            </section>
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="h-20 flex-shrink-0 flex items-center justify-center px-6 gap-3 bg-slate-900 border-t border-slate-800">
         <Control label="Mic" active={!isAudioOn} onClick={() => {
           const track = streamRef.current?.getAudioTracks()[0]
           if (track) { track.enabled = !track.enabled; setIsAudioOn(track.enabled) }
         }}>{isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}</Control>
         
         <Control label="Video" active={!isVideoOn} onClick={() => {
           const track = streamRef.current?.getVideoTracks()[0]
           if (track) { track.enabled = !track.enabled; setIsVideoOn(track.enabled) }
         }}>{isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}</Control>
         
         <Control label="Chat" active={activePanel === 'chat'} onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}><MessageSquare size={20} /></Control>
         
         {isRecruiter && (
           <>
             <div className="w-[1px] h-8 bg-slate-800 mx-2" />
             <Control label="AI Assistant" active={true}><Brain size={20} className="text-teal-400" /></Control>
             <button onClick={() => setShowCodeEditor(!showCodeEditor)} className={cn("px-5 h-11 rounded-xl font-bold text-xs flex items-center gap-2 transition-all", 
               showCodeEditor ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700")}>
               <Code size={16} /> {showCodeEditor ? 'CLOSE EDITOR' : 'SHARED WORKSPACE'}
             </button>
           </>
         )}
      </footer>

      {/* Floating Overlays */}
      <AnimatePresence>
        {activePanel === 'chat' && <MeetingChat messages={chatMessages} onSend={(t) => {
          const m = { id: `local-${Date.now()}`, sender: 'You', text: t, timestamp: new Date().toISOString(), isOwn: true };
          setChatMessages(p => [...p, m]);
          wsRef.current?.send(JSON.stringify({ type: 'chat_message', sender: user?.full_name || 'Recruiter', text: t }));
        }} onClose={() => setActivePanel(null)} />}
        
        {showCodeEditor && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 top-16 bottom-20 z-10 bg-[#0a0b14]/95 backdrop-blur-3xl p-6">
             <div className="h-full rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
               <SharedCodeEditor interviewId={interviewId} />
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #14b8a6; }
        .stagger > * { animation: fadeIn 0.5s ease backwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
