import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Brain, Code, Copy, FileText, Hand, Maximize, Mic, MicOff, Minimize,
  Monitor, MonitorOff, Phone, Signal, Users, Video, VideoOff, MessageSquare, User
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuthStore } from '../store'
import MeetingChat from '../components/interview/MeetingChat'
import ParticipantsList from '../components/interview/ParticipantsList'
import RecruiterAIPanel from '../components/interview/RecruiterAIPanel'
import SharedCodeEditor from '../components/interview/SharedCodeEditor'
import TranscriptPanel from '../components/interview/TranscriptPanel'

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
  const { user } = useAuthStore()
  const token = searchParams.get('token')
  const candidateName = searchParams.get('name')
  const isCandidate = !!token
  const isRecruiter = !isCandidate && (user?.role === 'recruiter' || user?.role === 'admin')

  const [interview, setInterview] = useState(null)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activePanel, setActivePanel] = useState(null)
  const [showCodeEditor, setShowCodeEditor] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [networkQuality] = useState('good')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [liveAnalysis, setLiveAnalysis] = useState({ insights: [] })

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const screenShareRef = useRef(null)
  const wsRef = useRef(null)
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    loadInterview()
    initializeMedia()
    initializeWebSocket()
    initializeSpeechRecognition()
    startTimer()
    return cleanup
  }, [interviewId])

  const loadInterview = async () => {
    try {
      const response = isCandidate
        ? await api.get(`/interviews/join/${interviewId}?token=${token}`)
        : await api.get(`/interviews/${interviewId}`)
      setInterview(response.data)
      if (isRecruiter && response.data.status === 'scheduled') {
        await api.post(`/interviews/${interviewId}/start`)
      }
    } catch (error) {
      toast.error('Failed to load interview')
      navigate(isCandidate ? '/' : '/interviews')
    }
  }

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 }
      })
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.play().catch((error) => console.error('Video play error:', error))
      }
    } catch (error) {
      console.error('Media access error:', error)
      setIsVideoOn(false)
      setIsAudioOn(false)
      toast.error('Camera or microphone is unavailable. You can remain in the call.')
    }
  }

  const initializeWebSocket = () => {
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/api/v1/interviews/${interviewId}/live`
    wsRef.current = new WebSocket(wsUrl)
    wsRef.current.onmessage = (event) => handleWebSocketMessage(JSON.parse(event.data))
    wsRef.current.onerror = (error) => console.error('WebSocket error:', error)
  }

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.onresult = (event) => {
      const text = Array.from(event.results).map((result) => result[0].transcript).join('')
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'transcript',
          text,
          speaker: isRecruiter ? 'recruiter' : 'candidate',
          timestamp: new Date().toISOString()
        }))
      }
    }
    if (isRecruiter) {
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  const startTimer = () => {
    timerRef.current = setInterval(() => setElapsedTime((previous) => previous + 1), 1000)
  }

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'transcript':
        setTranscript((previous) => [...previous, {
          speaker: data.speaker,
          text: data.text,
          timestamp: data.timestamp || new Date().toISOString()
        }])
        break
      case 'analysis':
        setLiveAnalysis(data.scores || data.analysis || data)
        break
      case 'chat_message':
        setChatMessages((previous) => [...previous, {
          id: data.id || `remote-${Date.now()}`,
          sender: data.sender || data.name || 'Participant',
          text: data.text || data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          isOwn: false
        }])
        break
      case 'participant_joined':
        toast.success(`${data.name} joined the interview`)
        break
      case 'participant_left':
        toast(`${data.name} left the interview`)
        break
      case 'hand_raised':
        toast(`${data.name} raised their hand`)
        break
      default:
        break
    }
  }

  const toggleVideo = () => {
    const track = localVideoRef.current?.srcObject?.getVideoTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setIsVideoOn(track.enabled)
    }
  }

  const toggleAudio = () => {
    const track = localVideoRef.current?.srcObject?.getAudioTracks()[0]
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
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
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
    try {
      if (isRecruiter) {
        await api.post(`/interviews/${interviewId}/end`)
        toast.success('Interview ended. Opening report.')
        cleanup()
        navigate(`/interviews/${interviewId}/analysis`, { state: { transcript } })
      } else {
        cleanup()
        navigate('/')
      }
    } catch (error) {
      console.error('Error ending interview:', error)
      toast.error('Failed to end interview')
      cleanup()
      navigate(isRecruiter ? '/interviews' : '/')
    }
  }

  const cleanup = () => {
    localVideoRef.current?.srcObject?.getTracks().forEach((track) => track.stop())
    screenShareRef.current?.srcObject?.getTracks().forEach((track) => track.stop())
    wsRef.current?.close()
    recognitionRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return [hrs, mins, secs].map((value) => value.toString().padStart(2, '0')).join(':')
  }

  const participants = useMemo(() => [
    {
      id: 'remote',
      name: isRecruiter ? interview?.candidate?.name || 'Candidate' : 'Recruiter',
      isHost: isCandidate,
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
          {isRecruiter && <Control label="Share screen" active={isScreenSharing} onClick={toggleScreenShare}>{isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}</Control>}
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
        {activePanel === 'participants' && isRecruiter && <ParticipantsList participants={participants} onClose={() => setActivePanel(null)} />}
        {activePanel === 'transcript' && isRecruiter && <TranscriptPanel transcript={transcript} recording={isRecording} onClose={() => setActivePanel(null)} />}
        {activePanel === 'ai' && isRecruiter && <RecruiterAIPanel analysis={liveAnalysis} interview={interview} transcript={transcript} recording={isRecording} onClose={() => setActivePanel(null)} />}
      </AnimatePresence>
      <style jsx>{`.mirror { transform: scaleX(-1); }`}</style>
    </div>
  )
}
