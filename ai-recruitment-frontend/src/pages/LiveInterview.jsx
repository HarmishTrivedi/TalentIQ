import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Brain, CheckCircle, Code, FileText, MessageSquare, Mic, MicOff, Monitor, MonitorOff, Phone, Video, VideoOff, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { API_BASE } from '../services/api'
import CodeEditor from '../components/interview/CodeEditor'
import RecruiterAIPanel from '../components/interview/RecruiterAIPanel'
import TranscriptPanel from '../components/interview/TranscriptPanel'

function ToolButton({ active, label, onClick, children, danger }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={`flex h-14 w-14 items-center justify-center rounded-full border transition ${
      danger ? 'border-red-400/30 bg-red-500 text-white hover:bg-red-400' : active ? 'border-violet-300/30 bg-violet-500/25 text-violet-100' : 'border-white/10 bg-slate-800/80 text-slate-100 hover:bg-slate-700'
    }`}>
      {children}
    </button>
  )
}

export default function LiveInterview() {
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const [interview, setInterview] = useState(null)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [liveAnalysis, setLiveAnalysis] = useState({ insights: [] })
  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [answeredQuestions, setAnsweredQuestions] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [activePanel, setActivePanel] = useState(null)
  const [workspace, setWorkspace] = useState(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const screenShareRef = useRef(null)
  const wsRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    loadInterview()
    initializeWebSocket()
    initializeSpeechRecognition()
    startLocalVideo()
    return () => {
      wsRef.current?.close()
      recognitionRef.current?.stop()
      stopLocalVideo()
      screenShareRef.current?.srcObject?.getTracks().forEach((track) => track.stop())
    }
  }, [interviewId])

  const loadInterview = async () => {
    try {
      const response = await api.get(`/interviews/${interviewId}`)
      setInterview(response.data)
      setQuestions(response.data.questions || [])
      setCurrentQuestion(response.data.questions?.[0] || null)
    } catch (error) {
      toast.error('Failed to load interview')
      navigate('/dashboard')
    }
  }

  const initializeWebSocket = () => {
    // Build correct WebSocket URL from API_BASE
    let wsBase = import.meta.env.VITE_WS_URL || API_BASE
    
    // Convert http(s) to ws(s)
    wsBase = wsBase.replace(/^http/, 'ws')
    
    // Ensure it doesn't end with a slash
    const cleanBase = wsBase.replace(/\/$/, '')
    const wsUrl = `${cleanBase}/interviews/${interviewId}/live`

    console.log('[WS] Connecting to:', wsUrl)
    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'transcript') {
        setTranscript((previous) => [...previous, { speaker: data.speaker, text: data.text, timestamp: data.timestamp || new Date().toISOString() }])
      } else if (data.type === 'analysis') {
        setLiveAnalysis(data.scores || data.analysis || data)
      } else if (data.type === 'event' && data.severity === 'high') {
        toast.error(`${data.event_type} detected`, { duration: 5000 })
      }
    }
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
        wsRef.current.send(JSON.stringify({ type: 'transcript', text, speaker: 'candidate', timestamp: new Date().toISOString() }))
      }
    }
  }

  const startLocalVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
    } catch (error) {
      console.error('Error accessing media devices:', error)
      toast.error('Could not access camera/microphone')
      setIsVideoOn(false)
      setIsAudioOn(false)
    }
  }

  const stopLocalVideo = () => localVideoRef.current?.srcObject?.getTracks().forEach((track) => track.stop())

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
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      if (screenShareRef.current) screenShareRef.current.srcObject = stream
      setIsScreenSharing(true)
      stream.getVideoTracks()[0].onended = () => setIsScreenSharing(false)
    } catch (error) {
      toast.error('Unable to share your screen')
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      recognitionRef.current?.start()
      setIsRecording(true)
    }
  }

  const startInterview = async () => {
    try {
      await api.post(`/interviews/${interviewId}/start`)
      setInterview((current) => ({ ...current, status: 'in_progress' }))
      toggleRecording()
      toast.success('Interview started')
    } catch (error) {
      toast.error('Failed to start interview')
    }
  }

  const endInterview = async () => {
    try {
      await api.post(`/interviews/${interviewId}/end`)
      stopLocalVideo()
      navigate(`/interviews/${interviewId}/analysis`, { state: { transcript } })
    } catch (error) {
      toast.error('Failed to end interview')
    }
  }

  const logEvent = async (eventType, eventData = {}, severity = 'low') => {
    try {
      await api.post(`/interviews/${interviewId}/events`, { interview_id: interviewId, event_type: eventType, event_data: eventData, severity })
    } catch (error) {
      console.error('Failed to log event:', error)
    }
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && interview?.status === 'in_progress') logEvent('tab_switch', { hidden: true }, 'medium')
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [interview])

  const advanceQuestion = () => {
    const index = questions.indexOf(currentQuestion)
    if (index < questions.length - 1) setCurrentQuestion(questions[index + 1])
    else toast('This is the final question')
  }

  const markQuestionAnswered = () => {
    if (!currentQuestion) return
    setAnsweredQuestions((previous) => previous.includes(currentQuestion.id) ? previous : [...previous, currentQuestion.id])
    toast.success('Question marked as answered')
    advanceQuestion()
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#070812] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_36%)]" />
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">{interview?.title || 'AI Interview'}</h1>
          <p className="text-xs text-slate-400">Private recruiter workspace</p>
        </div>
        {interview?.status === 'scheduled' ? (
          <button type="button" onClick={startInterview} className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500">Start interview</button>
        ) : <span className="rounded-full bg-red-500/15 px-3 py-2 text-xs text-red-200">{isRecording ? 'Recording' : 'Live'}</span>}
      </header>
      <main className="relative z-10 flex-1 px-5 pb-28">
        <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
          {isScreenSharing ? <video ref={screenShareRef} autoPlay playsInline className="h-full w-full bg-black object-contain" /> : <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />}
          <div className="absolute bottom-5 left-5 rounded-full bg-black/55 px-4 py-2 text-sm">{interview?.candidate?.name || 'Candidate'}</div>
          <div className="absolute bottom-5 right-5 h-36 w-56 overflow-hidden rounded-2xl border border-white/20 bg-slate-800 shadow-xl">
            <video ref={localVideoRef} autoPlay playsInline muted className="mirror h-full w-full object-cover" />
            {!isVideoOn && <div className="absolute inset-0 flex items-center justify-center bg-slate-800"><VideoOff className="text-violet-300" /></div>}
            <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-1 text-xs">You</span>
          </div>
        </div>
      </main>
      <footer className="absolute inset-x-0 bottom-6 z-30 flex justify-center">
        <div className="flex gap-2 rounded-full border border-white/10 bg-slate-950/80 p-2 backdrop-blur-xl">
          <ToolButton label="Microphone" active={!isAudioOn} onClick={toggleAudio}>{isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}</ToolButton>
          <ToolButton label="Camera" active={!isVideoOn} onClick={toggleVideo}>{isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}</ToolButton>
          <ToolButton label="Screen share" active={isScreenSharing} onClick={toggleScreenShare}>{isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}</ToolButton>
          <ToolButton label="Transcript" active={activePanel === 'transcript'} onClick={() => setActivePanel(activePanel === 'transcript' ? null : 'transcript')}><FileText size={20} /></ToolButton>
          <ToolButton label="AI Assistant" active={activePanel === 'ai'} onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')}><Brain size={20} /></ToolButton>
          <ToolButton label="Questions" active={workspace === 'questions'} onClick={() => setWorkspace(workspace === 'questions' ? null : 'questions')}><MessageSquare size={20} /></ToolButton>
          <ToolButton label="Code editor" active={workspace === 'code'} onClick={() => setWorkspace(workspace === 'code' ? null : 'code')}><Code size={20} /></ToolButton>
          <ToolButton label="End interview" danger onClick={endInterview}><Phone size={20} className="rotate-[135deg]" /></ToolButton>
        </div>
      </footer>
      <AnimatePresence>
        {activePanel === 'transcript' && <TranscriptPanel transcript={transcript} recording={isRecording} onClose={() => setActivePanel(null)} />}
        {activePanel === 'ai' && <RecruiterAIPanel analysis={liveAnalysis} interview={interview} transcript={transcript} recording={isRecording} onClose={() => setActivePanel(null)} />}
        {workspace && (
          <motion.section initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="absolute inset-x-5 bottom-28 top-20 z-20 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 p-5 backdrop-blur-2xl">
            <button type="button" onClick={() => setWorkspace(null)} className="absolute right-5 top-5 z-10 rounded-full bg-white/10 p-2"><X size={17} /></button>
            {workspace === 'code' ? <CodeEditor interviewId={interviewId} questionId={currentQuestion?.id} onSubmit={(code) => console.log('Code submitted:', code)} /> : (
              <div className="mx-auto max-w-3xl pt-12">
                <p className="mb-4 text-xs font-medium uppercase tracking-widest text-violet-300">Interview prompts</p>
                {currentQuestion ? (
                  <>
                    <h2 className="text-2xl font-semibold">{currentQuestion.question_text}</h2>
                    <p className="mt-3 text-sm text-slate-400">Question {questions.indexOf(currentQuestion) + 1} of {questions.length} · {currentQuestion.difficulty}</p>
                    <div className="mt-8 flex gap-3">
                      <button type="button" onClick={markQuestionAnswered} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium"><CheckCircle className="mr-2 inline h-4 w-4" />{answeredQuestions.includes(currentQuestion.id) ? 'Answered' : 'Mark answered'}</button>
                      <button type="button" onClick={advanceQuestion} className="rounded-xl border border-white/10 px-5 py-3 text-sm">Next question</button>
                    </div>
                  </>
                ) : <p className="text-slate-400">No questions assigned to this interview.</p>}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
      <style jsx>{`.mirror { transform: scaleX(-1); }`}</style>
    </div>
  )
}
