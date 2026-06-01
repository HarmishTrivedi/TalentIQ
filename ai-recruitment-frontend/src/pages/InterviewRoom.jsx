import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Brain, Code, Copy, FileText, Hand, Maximize, Mic, MicOff, Minimize,
  Monitor, MonitorOff, Phone, Signal, Users, Video, VideoOff, MessageSquare, User
} from 'lucide-react'
import toast from 'react-hot-toast'
import api, { authApi } from '../services/api'
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

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const screenShareRef = useRef(null)
  const wsRef = useRef(null)
  const peerRef = useRef(null)
  const streamRef = useRef(null)
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  }

  // Auth/User Loading
  useEffect(() => {
    const fetchUser = async () => {
      if (authToken && !user && !isCandidate) {
        try {
          const res = await authApi.me()
          updateUser(res.data)
        } catch (e) {
          console.error('Failed to fetch user', e)
          toast.error('Session expired. Please login.')
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

  // Auth Protection for Recruiters
  useEffect(() => {
    if (!isCandidate && !authToken && !isAuthLoading) {
      toast.error('Recruiters must be logged in to access this room.')
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

    // Prevent back navigation
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      if (confirm('Are you sure you want to exit the interview room?')) {
        endInterview();
      } else {
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
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
      toast.error('Could not load interview. Access denied or invalid link.')
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
      console.error('Media access error:', error)
      setIsVideoOn(false)
      setIsAudioOn(false)
      toast.error('Camera or microphone is unavailable.')
      return null
    }
  }

  const initializeWebSocket = (stream) => {
    const wsUrl = `${import.meta.env.VITE_WS_URL || (window.location.protocol === 'https:' ? 'wss' : 'ws') + '://' + window.location.host + '/api/v1'}/interviews/${interviewId}/live`
    console.log('[WS] Connecting to:', wsUrl);
    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onopen = () => {
      console.log('[WS] ✅ Connected to signaling server');
      // Announce ourselves — do NOT create peer connection yet.
      // Wait for participant_joined from the other peer.
      wsRef.current.send(JSON.stringify({
        type: 'participant_joined',
        name: user?.full_name || candidateName || 'Participant'
      }));
    }

    wsRef.current.onmessage = (event) => {
      try {
        handleWebSocketMessage(JSON.parse(event.data), stream);
      } catch (e) {
        console.error('[WS] Failed to parse message:', e);
      }
    }
    wsRef.current.onerror = (error) => console.error('[WS] Error:', error);
    wsRef.current.onclose = (e) => console.log('[WS] Closed:', e.code, e.reason);
  }

  const createPeerConnection = (stream) => {
    // Close any existing peer connection before creating a new one
    if (peerRef.current) {
      console.log('[WebRTC] Closing existing peer connection before creating new one');
      peerRef.current.close();
      peerRef.current = null;
    }

    console.log('[WebRTC] Creating new RTCPeerConnection');
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = pc;

    if (stream) {
      stream.getTracks().forEach(track => {
        console.log('[WebRTC] Adding local track:', track.kind);
        pc.addTrack(track, stream);
      });
    } else {
      console.warn('[WebRTC] No stream when creating peer connection!');
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('[WebRTC] Sending ICE candidate:', event.candidate.type);
        wsRef.current.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] ✅ ontrack fired — kind:', event.track.kind, 'streams:', event.streams?.length);
      const remoteStream = event.streams?.[0] || new MediaStream([event.track]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        // Start muted to satisfy autoplay policy, then unmute
        remoteVideoRef.current.muted = true;
        remoteVideoRef.current.play()
          .then(() => {
            remoteVideoRef.current.muted = false;
            console.log('[WebRTC] Remote video playing and unmuted');
          })
          .catch(e => {
            console.warn('[WebRTC] Autoplay blocked, keeping muted:', e.name);
            // Unmute on first user interaction
            const unmute = () => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.muted = false;
                remoteVideoRef.current.play().catch(() => {});
              }
              document.removeEventListener('click', unmute);
            };
            document.addEventListener('click', unmute, { once: true });
          });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('[WebRTC] ✅ Peer connection established!');
        toast.success('Video connected', { duration: 2000 });
      }
      if (pc.connectionState === 'failed') {
        console.error('[WebRTC] Connection failed — attempting ICE restart');
        pc.restartIce();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log('[WebRTC] Signaling state:', pc.signalingState);
    };

    return pc;
  };

  const handleWebSocketMessage = async (data, stream) => {
    console.log('[WS] Received message type:', data.type);
    switch (data.type) {

      case 'participant_joined':
        // The OTHER peer just joined — WE are the one who creates the offer
        console.log('[WebRTC] participant_joined — creating offer to', data.name);
        toast.success(`${data.name} joined the interview`);
        if (stream) {
          const pc = createPeerConnection(stream);
          try {
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);
            console.log('[WebRTC] Offer created, sending...');
            wsRef.current.send(JSON.stringify({ type: 'offer', offer: pc.localDescription }));
          } catch (e) {
            console.error('[WebRTC] createOffer failed:', e);
          }
        }
        break;

      case 'offer':
        console.log('[WebRTC] Received offer — creating answer');
        try {
          // Create a fresh peer connection to handle the incoming offer
          const pcOffer = createPeerConnection(stream);
          await pcOffer.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pcOffer.createAnswer();
          await pcOffer.setLocalDescription(answer);
          console.log('[WebRTC] Answer created, sending...');
          wsRef.current.send(JSON.stringify({ type: 'answer', answer: pcOffer.localDescription }));
        } catch (e) {
          console.error('[WebRTC] handleOffer failed:', e);
        }
        break;

      case 'answer':
        console.log('[WebRTC] Received answer');
        if (peerRef.current) {
          try {
            if (peerRef.current.signalingState === 'have-local-offer') {
              await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
              console.log('[WebRTC] ✅ Remote description (answer) set successfully');
            } else {
              console.warn('[WebRTC] Ignoring answer — signaling state:', peerRef.current.signalingState);
            }
          } catch (e) {
            console.error('[WebRTC] setRemoteDescription (answer) failed:', e);
          }
        }
        break;

      case 'ice-candidate':
        if (peerRef.current && data.candidate) {
          try {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log('[WebRTC] ICE candidate added');
          } catch (e) {
            if (e.name !== 'InvalidStateError') {
              console.warn('[WebRTC] addIceCandidate failed:', e.message);
            }
          }
        }
        break;

      case 'interview_started':
        setInterview(prev => ({ ...prev, status: 'in_progress' }));
        toast.success('Interview has officially started');
        break;

      case 'interview_ended':
        toast('Interview has ended');
        setTimeout(() => {
          if (isCandidate) navigate('/thanks', { replace: true });
          else navigate('/interviews', { replace: true });
        }, 3000);
        break;

      case 'transcript':
        setTranscript((previous) => [...previous, {
          speaker: data.speaker,
          text: data.text,
          timestamp: data.timestamp || new Date().toISOString()
        }]);
        break;

      case 'analysis':
        setLiveAnalysis(data.scores || data.analysis || data);
        break;

      case 'chat_message':
        setChatMessages((previous) => [...previous, {
          id: data.id || `remote-${Date.now()}`,
          sender: data.sender || data.name || 'Participant',
          text: data.text || data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          isOwn: false
        }]);
        break;

      case 'participant_left':
        toast(`${data.name} left the interview`);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
        break;

      case 'hand_raised':
        toast(`${data.name} raised their hand`);
        break;

      default:
        break;
    }
  };

  const toggleVideo = () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setIsVideoOn(track.enabled)
    }
  }

  const toggleAudio = () => {
    const track = streamRef.current?.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setIsAudioOn(track.enabled)
    }
  }

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenShareRef.current?.srcObject?.getTracks().forEach((track) => track.stop())
      setIsScreenSharing(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false })
      if (screenShareRef.current) screenShareRef.current.srcObject = stream
      setIsScreenSharing(true)
      stream.getVideoTracks()[0].onended = () => setIsScreenSharing(false)
    } catch (error) {
      console.error('Screen share error:', error)
      toast.error('Could not start screen sharing')
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      toast.success('Transcript paused')
    } else {
      recognitionRef.current?.start()
      setIsRecording(true)
      toast.success('Transcript resumed')
    }
  }

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
          setIsFullscreen(false)
        }
      }
    } catch (e) {
      console.error('Fullscreen error', e)
    }
  }

  const raiseHand = () => {
    const raised = !handRaised
    setHandRaised(raised)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'hand_raised', raised, name: candidateName || user?.full_name || 'Participant' }))
    }
  }

  const sendChatMessage = (text) => {
    const message = {
      id: `local-${Date.now()}`,
      sender: candidateName || user?.full_name || 'You',
      text,
      timestamp: new Date().toISOString(),
      isOwn: true
    }
    setChatMessages((previous) => [...previous, message])
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat_message', sender: message.sender, text, timestamp: message.timestamp }))
    }
  }

  const copyMeetingLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    toast.success('Meeting link copied')
  }

  const endInterview = async () => {
    if (!confirm('Are you sure you want to leave the interview room?')) return;

    try {
      // Exit fullscreen first
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }

      // Cleanup media and connections
      cleanup();

      if (isRecruiter) {
        // Send end interview request
        try {
          await api.post(`/interviews/${interviewId}/end`);
          toast.success('Interview ended. Opening report.');
        } catch (error) {
          console.error('Error ending interview:', error);
          // Continue navigation even if API fails
        }
        navigate(`/interviews/${interviewId}/analysis`, { state: { transcript }, replace: true });
      } else {
        // Notify server that candidate left
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'participant_left',
            name: candidateName || 'Candidate'
          }));
        }
        navigate('/thanks', { replace: true });
      }
    } catch (error) {
      console.error('Error in endInterview:', error);
      cleanup();
      navigate(isRecruiter ? '/interviews' : '/', { replace: true });
    }
  }

  const startTimer = () => {
    timerRef.current = setInterval(() => setElapsedTime((previous) => previous + 1), 1000)
  }

  const initializeSpeechRecognition = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('Speech recognition not supported');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');

        if (event.results[event.results.length - 1].isFinal) {
          const speaker = candidateName || user?.full_name || 'Participant';
          setTranscript(prev => [...prev, {
            speaker,
            text: transcript,
            timestamp: new Date().toISOString()
          }]);

          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'transcript',
              speaker,
              text: transcript,
              timestamp: new Date().toISOString()
            }));
          }
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          recognition.start();
        }
      };

      recognition.onend = () => {
        if (isRecording) {
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
    }
  };

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    screenShareRef.current?.srcObject?.getTracks().forEach((track) => track.stop())
    wsRef.current?.close()
    recognitionRef.current?.stop()
    if (peerRef.current) peerRef.current.close()
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return [hrs, mins, secs].map((value) => value.toString().padStart(2, '0')).join(':')
  }

  const participantsData = useMemo(() => [
    {
      id: 'remote',
      name: isRecruiter ? interview?.candidate?.name || 'Candidate' : 'Interviewer',
      isHost: !isCandidate,
      isAudioOn: true,
      isVideoOn: true
    },
    {
      id: 'local',
      name: `${candidateName || user?.full_name || 'You'} (You)`,
      isHost: isRecruiter,
      isAudioOn,
      isVideoOn
    }
  ], [candidateName, interview, isAudioOn, isCandidate, isRecruiter, isVideoOn, user])

  const openPanel = (panel) => setActivePanel((current) => current === panel ? null : panel)

  if (loading || isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#070812]">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-violet-500 mx-auto" />
          <p className="text-slate-400">Loading interview room...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#070812] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(124,58,237,0.2),transparent_35%),radial-gradient(circle_at_90%_18%,rgba(76,29,149,0.18),transparent_28%)]" />
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-7">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-base font-semibold sm:text-lg">{interview?.title || 'TalentIQ Interview'}</h1>
            <span className="hidden items-center gap-1.5 rounded-full border border-red-300/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-200 sm:flex">
              <span className={`h-1.5 w-1.5 rounded-full bg-red-400 ${isRecording ? 'animate-pulse' : ''}`} />
              {isRecording ? 'Recording' : 'Live'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{isRecruiter ? 'Recruiter meeting room' : 'Interview meeting room'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 sm:flex">
            <Signal size={14} className="text-emerald-300" /> {networkQuality}
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-slate-200">{formatTime(elapsedTime)}</div>
          <button type="button" onClick={copyMeetingLink} className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-slate-300 hover:bg-white/10" aria-label="Copy meeting link"><Copy size={16} /></button>
          <button type="button" onClick={toggleFullscreen} className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-slate-300 hover:bg-white/10" aria-label="Fullscreen">
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 px-3 pb-24 sm:px-6 sm:pb-28">
        <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
          {isScreenSharing ? (
            <video ref={screenShareRef} autoPlay playsInline className="h-full w-full bg-black object-contain" />
          ) : (
            <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full bg-slate-900 object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
          <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-sm backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {isRecruiter ? interview?.candidate?.name || 'Candidate' : 'Interviewer'}
          </div>

          <motion.div layout className="absolute bottom-5 right-4 h-28 w-40 overflow-hidden rounded-2xl border border-white/20 bg-slate-900 shadow-2xl sm:bottom-6 sm:right-6 sm:h-40 sm:w-60">
            <video ref={localVideoRef} autoPlay playsInline muted className="mirror h-full w-full object-cover" />
            {!isVideoOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <User className="text-violet-300" size={38} />
              </div>
            )}
            
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
               <MicVisualizer stream={streamRef.current} active={isAudioOn} />
            </div>

            <div className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-1 text-xs">You</div>
          </motion.div>

          {handRaised && isCandidate && (
            <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full bg-amber-400 px-3 py-2 text-xs font-medium text-slate-950">
              <Hand size={15} /> Hand raised
            </div>
          )}
        </div>

        <AnimatePresence>
          {showCodeEditor && isRecruiter && (
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="absolute inset-x-6 bottom-28 top-12 z-20 rounded-3xl bg-slate-950/90 p-3 shadow-2xl backdrop-blur-xl">
              <button type="button" onClick={() => setShowCodeEditor(false)} className="absolute right-6 top-6 z-10 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white">Close code editor</button>
              <SharedCodeEditor interviewId={interviewId} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="absolute inset-x-0 bottom-4 z-30 flex justify-center px-3 sm:bottom-6">
        <div className="flex max-w-[calc(100vw-24px)] items-center gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-slate-950/75 p-2 shadow-2xl backdrop-blur-2xl sm:gap-2">
          <Control label={isAudioOn ? 'Mute microphone' : 'Unmute microphone'} active={!isAudioOn} onClick={toggleAudio}>{isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}</Control>
          <Control label={isVideoOn ? 'Turn off camera' : 'Turn on camera'} active={!isVideoOn} onClick={toggleVideo}>{isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}</Control>
          <Control label={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'} active={isFullscreen} onClick={toggleFullscreen}>{isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}</Control>
          <Control label="Share screen" active={isScreenSharing} onClick={toggleScreenShare}>{isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}</Control>
          <Control label="Chat" active={activePanel === 'chat'} onClick={() => openPanel('chat')}><MessageSquare size={20} /></Control>
          {isCandidate && <Control label="Raise hand" active={handRaised} onClick={raiseHand}><Hand size={20} /></Control>}
          {isRecruiter && (
            <>
              <Control label="Participants" active={activePanel === 'participants'} onClick={() => openPanel('participants')}><Users size={20} /></Control>
              <Control label="Transcript" active={activePanel === 'transcript'} onClick={() => openPanel('transcript')}><FileText size={20} /></Control>
              <Control label="AI Assistant" active={activePanel === 'ai'} onClick={() => openPanel('ai')}><Brain size={20} /></Control>
              <Control label="Coding workspace" active={showCodeEditor} onClick={() => setShowCodeEditor((current) => !current)}><Code size={20} /></Control>
              <Control label={isRecording ? 'Pause transcript' : 'Resume transcript'} active={isRecording} onClick={toggleRecording}><span className={`h-3 w-3 rounded-full ${isRecording ? 'bg-red-400' : 'bg-slate-300'}`} /></Control>
            </>
          )}
          <Control label={isRecruiter ? 'End interview' : 'Leave interview'} danger onClick={endInterview}><Phone size={20} className="rotate-[135deg]" /></Control>
        </div>
      </footer>

      <AnimatePresence>
        {activePanel === 'chat' && <MeetingChat messages={chatMessages} onSend={sendChatMessage} onClose={() => setActivePanel(null)} />}
        {activePanel === 'participants' && isRecruiter && <ParticipantsList participants={participantsData} onClose={() => setActivePanel(null)} />}
        {activePanel === 'transcript' && isRecruiter && <TranscriptPanel transcript={transcript} recording={isRecording} onClose={() => setActivePanel(null)} />}
        {activePanel === 'ai' && isRecruiter && <RecruiterAIPanel analysis={liveAnalysis} interview={interview} transcript={transcript} recording={isRecording} onClose={() => setActivePanel(null)} />}
      </AnimatePresence>
      <style jsx>{`
        .mirror { transform: scaleX(-1); }
      `}</style>
    </div>
  )
}
