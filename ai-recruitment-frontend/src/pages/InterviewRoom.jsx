import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Brain, Code, Copy, FileText, Hand, Maximize, Mic, MicOff, Minimize,
  Monitor, MonitorOff, Phone, Signal, Users, Video, VideoOff, MessageSquare, User
} from 'lucide-react'
import toast from 'react-hot-toast'
import api, { authApi, API_BASE } from '../services/api'
import { useAuthStore } from '../store'
import MeetingChat from '../components/interview/MeetingChat'
import ParticipantsList from '../components/interview/ParticipantsList'
import RecruiterAIPanel from '../components/interview/RecruiterAIPanel'
import SharedCodeEditor from '../components/interview/SharedCodeEditor'
import TranscriptPanel from '../components/interview/TranscriptPanel'

function MicVisualizer({ stream, active }) {
  const [levels, setLevels] = useState([10, 20, 50, 30, 10]);
  
  useEffect(() => {
    if (!stream || !active) return;
    
    let audioContext, analyser, dataArray, interval;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      
      audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      interval = setInterval(() => {
        if (analyser && dataArray) {
          analyser.getByteFrequencyData(dataArray);
          const newLevels = Array.from(dataArray.slice(0, 5)).map(v => Math.max(10, v / 2));
          setLevels(newLevels);
        }
      }, 50);
    } catch (e) { console.error('Mic visualizer error:', e); }
    
    return () => {
      if (interval) clearInterval(interval);
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
    };
  }, [stream, active]);

  return (
    <div className="flex items-end gap-1 h-8">
      {levels.map((level, i) => (
        <motion.div
          key={i}
          animate={{ height: active ? level / 2 : 2 }}
          className="w-1 bg-violet-400 rounded-full"
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
      ))}
    </div>
  );
}

function Control({ active, danger, label, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`group flex h-12 w-12 items-center justify-center rounded-full border transition duration-200 sm:h-14 sm:w-14 ${
        danger
          ? 'border-red-400/30 bg-red-500 text-white hover:bg-red-400'
          : active
            ? 'border-violet-300/35 bg-violet-500/25 text-violet-100 hover:bg-violet-500/35'
            : 'border-white/10 bg-slate-800/80 text-slate-100 hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

export default function InterviewRoom() {
  const { interviewId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token: authToken, updateUser } = useAuthStore()
  const token = searchParams.get('token')
  const candidateName = searchParams.get('name')
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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activePanel, setActivePanel] = useState(null)
  const [showCodeEditor, setShowCodeEditor] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [networkQuality] = useState('Excellent')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [liveAnalysis, setLiveAnalysis] = useState({ insights: [] })

  const [remoteStream, setRemoteStream] = useState(null)

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const screenShareRef = useRef(null)
  const wsRef = useRef(null)
  const peerRef = useRef(null)
  const streamRef = useRef(null)
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  
  const makingOfferRef = useRef(false)
  const ignoreOfferRef = useRef(false)
  const isPoliteRef = useRef(false)
  const iceCandidateQueue = useRef([])

  const iceServersRef = useRef([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ])

  useEffect(() => {
    api.get('/interviews/turn-credentials')
      .then(res => {
        if (res.data?.iceServers?.length) {
          iceServersRef.current = res.data.iceServers
          console.log('[ICE] TURN credentials loaded:', res.data.iceServers.length, 'servers')
        }
      })
      .catch(() => console.warn('[ICE] Could not fetch TURN credentials, using STUN only'))
  }, [])

  useEffect(() => {
    if (!remoteStream || !remoteVideoRef.current) return
    const video = remoteVideoRef.current
    video.srcObject = remoteStream
    video.muted = true
    video.play()
      .then(() => {
        video.muted = false
      })
      .catch(err => {
        const unmute = () => { video.muted = false; video.play().catch(() => {}) }
        document.addEventListener('click', unmute, { once: true })
      })
  }, [remoteStream])

  useEffect(() => {
    const fetchUser = async () => {
      if (authToken && !user && !isCandidate) {
        try {
          const res = await authApi.me()
          updateUser(res.data)
        } catch (e) {
          navigate('/login', { replace: true })
        } finally {
          setIsAuthLoading(false)
        }
      } else {
        setIsAuthLoading(false)
      }
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
    if (isRecruiter === null && !isCandidate && authToken) return;
    
    const init = async () => {
      try {
        const interviewData = await loadInterview()
        if (!interviewData) return;

        if (interviewData.status === 'completed') {
          if (isCandidate) navigate('/thanks', { replace: true })
          else navigate(`/interviews/${interviewId}/analysis`, { replace: true })
          return
        }

        const stream = await initializeMedia()
        initializeWebSocket(stream)
        initializeSpeechRecognition()
        startTimer()
      } catch (e) {
        console.error('Init failed', e)
      }
    }

    init()

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanup();
    };
  }, [interviewId, user, authToken, isAuthLoading])

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
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 }
      })
      streamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      return stream
    } catch (error) {
      setIsVideoOn(false)
      setIsAudioOn(false)
      toast.error('Camera or microphone is unavailable.')
      return null
    }
  }

  const initializeWebSocket = (stream) => {
    let wsUrl = import.meta.env.VITE_WS_URL;
    
    if (!wsUrl) {
      let base = API_BASE;
      if (window.location.hostname.includes('onrender.com') && base.includes(window.location.hostname)) {
        base = base.replace('-frontend-', '-backend-'); 
      }
      wsUrl = base.replace(/^http/, 'ws').replace(/\/$/, '') + `/interviews/${interviewId}/live`;
    } else {
      if (!wsUrl.includes('/interviews/')) {
        wsUrl = wsUrl.replace(/\/$/, '') + `/interviews/${interviewId}/live`;
      }
    }

    console.log('[WS] Connecting to:', wsUrl);
    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onopen = () => {
      wsRef.current.send(JSON.stringify({
        type: 'participant_joined',
        name: user?.full_name || candidateName || 'Participant'
      }));
    }

    wsRef.current.onmessage = (event) => {
      try {
        handleWebSocketMessage(JSON.parse(event.data), stream);
      } catch (e) {}
    }
    wsRef.current.onerror = (error) => console.error('[WS] Error:', error);
    wsRef.current.onclose = (e) => console.log('[WS] Closed:', e.code);
  }

  const createPeerConnection = (stream) => {
    if (peerRef.current) peerRef.current.close();
    iceCandidateQueue.current = [] 

    const config = { iceServers: iceServersRef.current, iceCandidatePoolSize: 10 }
    const pc = new RTCPeerConnection(config)
    peerRef.current = pc

    if (stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream))
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ice-candidate', candidate }))
      }
    }

    pc.ontrack = (event) => {
      setRemoteStream(prev => {
        if (!prev) return new MediaStream([event.track])
        if (prev.getTracks().find(t => t.id === event.track.id)) return prev
        prev.addTrack(event.track)
        return new MediaStream(prev.getTracks())
      })
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') toast.success('Video connected')
      if (pc.connectionState === 'failed') pc.restartIce()
    }

    pc.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current = true
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        wsRef.current?.send(JSON.stringify({ type: 'offer', offer: pc.localDescription }))
      } catch (err) {
      } finally {
        makingOfferRef.current = false
      }
    }

    return pc
  }

  const handleWebSocketMessage = async (data, stream) => {
    isPoliteRef.current = isRecruiter

    switch (data.type) {
      case 'participant_joined':
        toast.success(`${data.name} joined`)
        if (!peerRef.current) createPeerConnection(streamRef.current)
        break

      case 'offer': {
        const pc = peerRef.current || createPeerConnection(streamRef.current)
        const offerCollision = makingOfferRef.current || pc.signalingState !== 'stable'
        ignoreOfferRef.current = !isPoliteRef.current && offerCollision
        if (ignoreOfferRef.current) break;

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          wsRef.current.send(JSON.stringify({ type: 'answer', answer: pc.localDescription }))
          for (const c of iceCandidateQueue.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
          }
          iceCandidateQueue.current = []
        } catch (e) {}
        break
      }

      case 'answer': {
        const pc = peerRef.current
        if (!pc) break
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
          for (const c of iceCandidateQueue.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
          }
          iceCandidateQueue.current = []
        } catch (e) {}
        break
      }

      case 'ice-candidate': {
        if (!data.candidate) break
        const pc = peerRef.current
        if (!pc || !pc.remoteDescription) {
          iceCandidateQueue.current.push(data.candidate)
          break
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
        } catch (e) {}
        break
      }

      case 'interview_started':
        setInterview(prev => ({ ...prev, status: 'in_progress' }))
        break

      case 'interview_ended':
        setTimeout(() => {
          if (isCandidate) navigate('/thanks', { replace: true })
          else navigate('/interviews', { replace: true })
        }, 2000)
        break

      case 'transcript':
        setTranscript(prev => [...prev, { speaker: data.speaker, text: data.text, timestamp: data.timestamp || new Date().toISOString() }])
        break

      case 'chat_message':
        setChatMessages(prev => [...prev, { id: data.id || `remote-${Date.now()}`, sender: data.sender || data.name || 'Participant', text: data.text || data.message, timestamp: data.timestamp || new Date().toISOString(), isOwn: false }])
        break

      case 'participant_left':
        toast(`${data.name} left`)
        setRemoteStream(null)
        if (peerRef.current) { peerRef.current.close(); peerRef.current = null }
        break

      default:
        break
    }
  }

  const toggleVideo = () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (track) { track.enabled = !track.enabled; setIsVideoOn(track.enabled) }
  }

  const toggleAudio = () => {
    const track = streamRef.current?.getAudioTracks()[0]
    if (track) { track.enabled = !track.enabled; setIsAudioOn(track.enabled) }
  }

  const endInterview = async () => {
    if (!confirm('Leave room?')) return;
    cleanup();
    if (isRecruiter) {
      try { await api.post(`/interviews/${interviewId}/end`); } catch (error) {}
      navigate(`/interviews/${interviewId}/analysis`, { state: { transcript }, replace: true });
    } else {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'participant_left', name: candidateName || 'Candidate' }));
      }
      navigate('/thanks', { replace: true });
    }
  }

  const startTimer = () => {
    timerRef.current = setInterval(() => setElapsedTime((previous) => previous + 1), 1000)
  }

  const initializeSpeechRecognition = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        const text = Array.from(event.results).map(result => result[0].transcript).join('');
        if (event.results[event.results.length - 1].isFinal) {
          const speaker = candidateName || user?.full_name || 'Participant';
          setTranscript(prev => [...prev, { speaker, text, timestamp: new Date().toISOString() }]);
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'transcript', speaker, text, timestamp: new Date().toISOString() }));
          }
        }
      };
      recognition.onend = () => { if (isRecording) recognition.start() };
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch (error) {}
  };

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    wsRef.current?.close()
    recognitionRef.current?.stop()
    if (peerRef.current) peerRef.current.close()
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600); const mins = Math.floor((seconds % 3600) / 60); const secs = seconds % 60;
    return [hrs, mins, secs].map((v) => v.toString().padStart(2, '0')).join(':')
  }

  if (loading || isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#070812]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary mx-auto" />
      </div>
    )
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#070812] text-white">
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="truncate text-lg font-semibold">{interview?.title || 'Interview'}</h1>
          <p className="text-xs text-slate-400">{isRecruiter ? 'Recruiter' : 'Candidate'} Room</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/5 px-3 py-1.5 rounded-full font-mono text-xs">{formatTime(elapsedTime)}</div>
          <button type="button" onClick={endInterview} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-xs font-bold">End Session</button>
        </div>
      </header>

      <main className="relative z-10 flex-1 px-6 pb-24">
        <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
          <video ref={remoteVideoRef} playsInline className="h-full w-full object-cover" />
          <div className="absolute bottom-5 left-5 bg-black/40 px-4 py-1.5 rounded-full text-sm">
            {isRecruiter ? interview?.candidate?.name || 'Candidate' : 'Interviewer'}
          </div>

          <div className="absolute bottom-5 right-5 h-36 w-52 overflow-hidden rounded-2xl border border-white/20 bg-slate-800 shadow-2xl">
            <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover mirror" />
            {!isVideoOn && <div className="absolute inset-0 flex items-center justify-center bg-slate-800"><VideoOff size={32} /></div>}
            <div className="absolute bottom-2 left-2 bg-black/40 px-2 py-0.5 rounded text-[10px]">You</div>
          </div>
        </div>
      </main>

      <footer className="absolute inset-x-0 bottom-6 z-30 flex justify-center px-4">
        <div className="flex items-center gap-3 p-2 bg-slate-950/80 rounded-full border border-white/10 backdrop-blur-xl">
           <Control label="Mic" active={!isAudioOn} onClick={toggleAudio}>{isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}</Control>
           <Control label="Video" active={!isVideoOn} onClick={toggleVideo}>{isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}</Control>
           <Control label="Chat" active={activePanel === 'chat'} onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}><MessageSquare size={20} /></Control>
           {isRecruiter && (
             <>
               <Control label="Transcript" active={activePanel === 'transcript'} onClick={() => setActivePanel(activePanel === 'transcript' ? null : 'transcript')}><FileText size={20} /></Control>
               <Control label="AI" active={activePanel === 'ai'} onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')}><Brain size={20} /></Control>
             </>
           )}
        </div>
      </footer>

      <AnimatePresence>
        {activePanel === 'chat' && <MeetingChat messages={chatMessages} onSend={(t) => {
          const m = { id: `local-${Date.now()}`, sender: 'You', text: t, timestamp: new Date().toISOString(), isOwn: true };
          setChatMessages(p => [...p, m]);
          wsRef.current?.send(JSON.stringify({ type: 'chat_message', sender: user?.full_name || 'Recruiter', text: t }));
        }} onClose={() => setActivePanel(null)} />}
      </AnimatePresence>
      <style jsx>{`.mirror { transform: scaleX(-1); }`}</style>
    </div>
  )
}
