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
  const [liveAnalysis, setLiveAnalysis] = useState({
    commScore: 0,
    confidenceScore: 0,
    technicalScore: 0,
    behavioralScore: 0,
    sentiment: 'Neutral',
    engagementScore: 0,
    insights: [],
    fillerWordCount: 0
  })
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
  const mediaRecorderRef = useRef(null)
  const recordedChunks = useRef([])
  const analysisBuffer = useRef([])
  const lastProcessedIndex = useRef(0)

  useEffect(() => {
    loadInterview()
    initializeWebSocket()
    initializeSpeechRecognition()
    startLocalVideo()
    return () => {
      wsRef.current?.close()
      recognitionRef.current?.stop()
      stopLocalVideo()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
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

  const runRealTimeAnalysis = async (newEntry) => {
    analysisBuffer.current.push(newEntry)
    
    // Immediate filler word detection
    const text = newEntry.text.toLowerCase()
    const fillers = (text.match(/\b(um|uh|umm|ahh|like|you know|basically)\b/g) || []).length
    if (fillers > 0) {
       setLiveAnalysis(prev => ({ ...prev, fillerWordCount: (prev.fillerWordCount || 0) + fillers }))
    }

    // Deep analysis
    const candidateEntries = analysisBuffer.current.filter(e => !e.speaker.toLowerCase().includes('recruiter'))
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

      let apiBase = window.location.origin;
      if (apiBase.includes(':5173')) apiBase = apiBase.replace(':5173', ':8000');
      else if (apiBase.includes('-frontend-')) apiBase = apiBase.replace('-frontend-', '-backend-');

      const res = await fetch(`${apiBase}/api/v1/interviews/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      
      if (!res.ok) return;

      const data = await res.json()
      const content = data.content?.[0]?.text
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return;
        
        const result = JSON.parse(jsonMatch[0])
        setLiveAnalysis(prev => ({
          ...prev,
          commScore: result.scores?.comm || prev.commScore,
          confidenceScore: result.scores?.confidence || prev.confidenceScore,
          technicalScore: result.scores?.technical || prev.technicalScore,
          behavioralScore: result.scores?.behavioral || prev.behavioralScore,
          engagementScore: result.scores?.engagement || prev.engagementScore,
          sentiment: result.sentiment || prev.sentiment,
          insights: [result.insight, ...(prev.insights || [])].slice(0, 10).filter(Boolean)
        }))
        
        // Broadcast analysis to other participants
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'analysis_update', scores: result.scores }))
        }
      }
    } catch (e) {
      console.warn('AI Analysis failed:', e.message)
    }
  }

  const initializeWebSocket = () => {
    let wsUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || '';
    
    if (!wsUrl || wsUrl.startsWith('/')) {
      wsUrl = window.location.origin + '/api/v1';
    }

    if (wsUrl.includes('-frontend-')) {
      wsUrl = wsUrl.replace('-frontend-', '-backend-');
    }

    wsUrl = wsUrl.replace(/^http/, 'ws');
    
    // Strictly ensure /api/v1 is present exactly once before /interviews
    const cleanBase = wsUrl.replace(/\/$/, '').replace(/\/api\/v1$/, '') + '/api/v1';
    const finalUrl = `${cleanBase}/interviews/${interviewId}/live`;

    console.log('[WS] Connecting to signaling server:', finalUrl);
    wsRef.current = new WebSocket(finalUrl);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'transcript') {
        const entry = { speaker: data.speaker, text: data.text, timestamp: data.timestamp || new Date().toISOString() }
        setTranscript((previous) => [...previous, entry])
        // If candidate speaks, we analyze
        if (data.speaker !== 'Recruiter') {
          runRealTimeAnalysis(entry)
        }
      } else if (data.type === 'analysis') {
        setLiveAnalysis(prev => ({ ...prev, ...data.scores, ...data.analysis, ...data }))
      } else if (data.type === 'event' && data.severity === 'high') {
        toast.error(`${data.event_type} detected`, { duration: 5000 })
      }
    }
    wsRef.current.onerror = (error) => console.error('WebSocket error:', error)
  }

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    let finalTranscript = '';

    rec.onresult = (e) => {
      let interimTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
          const speaker = 'Recruiter'; // Or candidate depending on who is logged in
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'transcript', text: finalTranscript.trim(), speaker, timestamp: new Date().toISOString() }))
          }
          finalTranscript = '';
        } else {
          interimTranscript += e.results[i][0].transcript;
        }
      }
    }

    rec.onerror = (e) => console.error('[Speech] Error:', e.error)
    rec.onend = () => {
      if (isRecording && recognitionRef.current === rec) {
        try { rec.start(); } catch (err) {}
      }
    }

    recognitionRef.current = rec
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

  const startActualRecording = () => {
    // Record local stream for now to ensure we capture voice and camera.
    const stream = localVideoRef.current?.srcObject;
    if (!stream) {
      console.warn("No stream to record!");
      return;
    }

    try {
      recordedChunks.current = [];
      const options = { mimeType: 'video/webm' };
      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        toast('Saving recording to cloud...', { icon: '☁️' });

        try {
          const formData = new FormData();
          formData.append('file', blob, `interview_${interviewId}.webm`);

          // Use standard backend api endpoint
          const res = await api.post(`/interviews/${interviewId}/recording`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          if (res.data.recording_url) {
            toast.success('Recording saved directly to recordings page!');
          }
        } catch (err) {
          console.error('Failed to upload recording:', err);
          toast.error('Failed to save recording');
        }
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      console.log("MediaRecorder started");
    } catch (e) {
      console.error("Failed to start MediaRecorder:", e);
    }
  };

  const stopActualRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      console.log("MediaRecorder stopped");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop()
      stopActualRecording()
      setIsRecording(false)
      toast.success('Recording stopped and saving...');
    } else {
      recognitionRef.current?.start()
      startActualRecording()
      setIsRecording(true)
      toast.success('Recording started with voice and camera!');
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
      if (isRecording) {
        toggleRecording()
      }
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
