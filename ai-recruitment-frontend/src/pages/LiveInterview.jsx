import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff,
  Phone, Code, MessageSquare, AlertTriangle, Activity,
  Brain, TrendingUp, Eye, Clock, CheckCircle, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import CodeEditor from '../components/interview/CodeEditor';
import TranscriptPanel from '../components/interview/TranscriptPanel';
import AIInsightsPanel from '../components/interview/AIInsightsPanel';

export default function LiveInterview() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeTab, setActiveTab] = useState('questions'); // questions, code, whiteboard
  const [transcript, setTranscript] = useState([]);
  const [liveAnalysis, setLiveAnalysis] = useState({
    technical_score: 0,
    communication_score: 0,
    confidence_score: 0,
    suspicion_level: 0,
    insights: []
  });
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  
  const wsRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    loadInterview();
    initializeWebSocket();
    initializeSpeechRecognition();
    startLocalVideo();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (recognitionRef.current) recognitionRef.current.stop();
      stopLocalVideo();
    };
  }, [interviewId]);

  const loadInterview = async () => {
    try {
      const response = await api.get(`/interviews/${interviewId}`);
      setInterview(response.data);
      setQuestions(response.data.questions || []);
      if (response.data.questions?.length > 0) {
        setCurrentQuestion(response.data.questions[0]);
      }
    } catch (error) {
      toast.error('Failed to load interview');
      navigate('/dashboard');
    }
  };

  const initializeWebSocket = () => {
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/api/v1/interviews/${interviewId}/live`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'transcript') {
        setTranscript(prev => [...prev, {
          speaker: data.speaker,
          text: data.text,
          timestamp: new Date(data.timestamp)
        }]);
      } else if (data.type === 'analysis') {
        setLiveAnalysis(data.scores);
      } else if (data.type === 'event') {
        handleInterviewEvent(data);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');

        // Send to backend for analysis
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'transcript',
            text: transcript,
            speaker: 'candidate',
            timestamp: new Date().toISOString()
          }));
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };
    }
  };

  const startLocalVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Could not access camera/microphone');
    }
  };

  const stopLocalVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const tracks = localVideoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const videoTrack = localVideoRef.current.srcObject.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOn(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (localVideoRef.current?.srcObject) {
      const audioTrack = localVideoRef.current.srcObject.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioOn(audioTrack.enabled);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      toast.success('Recording stopped');
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
      toast.success('Recording started');
    }
  };

  const startInterview = async () => {
    try {
      await api.post(`/interviews/${interviewId}/start`);
      toast.success('Interview started');
      toggleRecording();
    } catch (error) {
      toast.error('Failed to start interview');
    }
  };

  const endInterview = async () => {
    try {
      await api.post(`/interviews/${interviewId}/end`);
      toast.success('Interview ended. Generating analysis...');
      navigate(`/interviews/${interviewId}/analysis`);
    } catch (error) {
      toast.error('Failed to end interview');
    }
  };

  const handleInterviewEvent = (event) => {
    if (event.severity === 'high') {
      toast.error(`⚠️ ${event.event_type} detected`, { duration: 5000 });
    }
  };

  const logEvent = async (eventType, eventData = {}, severity = 'low') => {
    try {
      await api.post(`/interviews/${interviewId}/events`, {
        interview_id: interviewId,
        event_type: eventType,
        event_data: eventData,
        severity
      });
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  };

  // Monitor tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && interview?.status === 'in_progress') {
        logEvent('tab_switch', { hidden: true }, 'medium');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [interview]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-black/40 backdrop-blur-xl">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-400" />
              AI Interview Intelligence
            </h1>
            <p className="text-purple-300 text-sm mt-1">{interview?.title}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-white font-mono">00:00:00</span>
            </div>
            
            {interview?.status === 'scheduled' && (
              <button
                onClick={startInterview}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all"
              >
                Start Interview
              </button>
            )}
            
            {interview?.status === 'in_progress' && (
              <button
                onClick={endInterview}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all"
              >
                <Phone className="w-4 h-4 inline mr-2" />
                End Interview
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-100px)]">
        {/* Left Panel - Video & Transcript */}
        <div className="col-span-3 space-y-4">
          {/* Candidate Video */}
          <motion.div 
            className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="p-3 border-b border-purple-500/20 flex items-center justify-between">
              <span className="text-white font-semibold flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-400" />
                Candidate
              </span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-400">Live</span>
              </div>
            </div>
            <div className="relative aspect-video bg-slate-900">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <div className="px-2 py-1 bg-black/60 backdrop-blur rounded text-xs text-white">
                  {interview?.candidate?.name || 'Candidate'}
                </div>
                <Activity className="w-4 h-4 text-green-400 animate-pulse" />
              </div>
            </div>
          </motion.div>

          {/* Recruiter Video */}
          <motion.div 
            className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="p-3 border-b border-purple-500/20">
              <span className="text-white font-semibold flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-400" />
                You (Recruiter)
              </span>
            </div>
            <div className="relative aspect-video bg-slate-900">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* Transcript */}
          <TranscriptPanel transcript={transcript} />
        </div>

        {/* Center Panel - Main Workspace */}
        <div className="col-span-6 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2">
            {['questions', 'code', 'whiteboard'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-black/40 text-purple-300 hover:bg-black/60 border border-purple-500/20'
                }`}
              >
                {tab === 'questions' && <MessageSquare className="w-4 h-4 inline mr-2" />}
                {tab === 'code' && <Code className="w-4 h-4 inline mr-2" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <motion.div 
            className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 h-[calc(100%-80px)] overflow-auto"
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {activeTab === 'questions' && (
              <div className="space-y-6">
                {currentQuestion ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm font-semibold">
                          {currentQuestion.difficulty}
                        </span>
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm">
                          {currentQuestion.category}
                        </span>
                      </div>
                      <span className="text-purple-300 text-sm">
                        Question {questions.indexOf(currentQuestion) + 1} of {questions.length}
                      </span>
                    </div>
                    
                    <div className="prose prose-invert max-w-none">
                      <h2 className="text-2xl font-bold text-white mb-4">
                        {currentQuestion.question_text}
                      </h2>
                    </div>

                    <div className="flex gap-3 mt-8">
                      <button className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all">
                        <CheckCircle className="w-4 h-4 inline mr-2" />
                        Mark as Answered
                      </button>
                      <button className="px-6 py-3 bg-purple-500/20 text-purple-300 rounded-xl font-semibold hover:bg-purple-500/30 transition-all border border-purple-500/20">
                        Next Question
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                    <p className="text-purple-300">No questions added yet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'code' && (
              <CodeEditor 
                interviewId={interviewId}
                questionId={currentQuestion?.id}
                onSubmit={(code) => console.log('Code submitted:', code)}
              />
            )}

            {activeTab === 'whiteboard' && (
              <div className="text-center py-12">
                <p className="text-purple-300">Whiteboard feature coming soon</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Panel - AI Insights */}
        <div className="col-span-3">
          <AIInsightsPanel 
            analysis={liveAnalysis}
            interview={interview}
          />
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl border-t border-purple-500/20 p-4">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all ${
              isVideoOn
                ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
            }`}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-all ${
              isAudioOn
                ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
            }`}
          >
            {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`p-4 rounded-full transition-all ${
              isScreenSharing
                ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
            }`}
          >
            {isScreenSharing ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleRecording}
            className={`p-4 rounded-full transition-all ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
            }`}
          >
            <Activity className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
