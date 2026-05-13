import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, Phone,
  MessageSquare, Users, Settings, MoreVertical, Maximize, Minimize,
  Hand, Copy, Share2, Clock, Signal, Code, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../store';
import RecruiterAIPanel from '../components/interview/RecruiterAIPanel';
import MeetingChat from '../components/interview/MeetingChat';
import SharedCodeEditor from '../components/interview/SharedCodeEditor';
import ParticipantsList from '../components/interview/ParticipantsList';

export default function InterviewRoom() {
  const { interviewId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Check if candidate (token-based access) or recruiter (auth-based)
  const token = searchParams.get('token');
  const candidateName = searchParams.get('name');
  const isCandidate = !!token;
  const isRecruiter = !isCandidate && (user?.role === 'recruiter' || user?.role === 'admin');
  
  const [interview, setInterview] = useState(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [networkQuality, setNetworkQuality] = useState('good'); // good, fair, poor
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenShareRef = useRef(null);
  const wsRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    loadInterview();
    initializeMedia();
    initializeWebSocket();
    initializeSpeechRecognition();
    startTimer();

    return () => {
      cleanup();
    };
  }, [interviewId]);

  const loadInterview = async () => {
    try {
      let response;
      if (isCandidate) {
        // Candidate access with token
        response = await api.get(`/interviews/join/${interviewId}?token=${token}`);
      } else {
        // Recruiter access with auth
        response = await api.get(`/interviews/${interviewId}`);
      }
      
      setInterview(response.data);
      
      // Auto-start interview if recruiter
      if (isRecruiter && response.data.status === 'scheduled') {
        await api.post(`/interviews/${interviewId}/start`);
      }
    } catch (error) {
      toast.error('Failed to load interview');
      if (isCandidate) {
        navigate('/');
      } else {
        navigate('/interviews');
      }
    }
  };

  const initializeMedia = async () => {
    try {
      // Request permissions explicitly
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Ensure video plays
        localVideoRef.current.play().catch(err => {
          console.error('Video play error:', err);
        });
      }
      
      toast.success('Camera and microphone connected');
    } catch (error) {
      console.error('Media access error:', error);
      
      // Provide specific error messages
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Please allow camera and microphone access to join the interview');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('No camera or microphone found. Please connect a device.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        toast.error('Camera or microphone is already in use by another application');
      } else {
        toast.error('Could not access camera/microphone. Please check your device settings.');
      }
      
      // Still allow joining without media
      setIsVideoOn(false);
      setIsAudioOn(false);
    }
  };

  const initializeWebSocket = () => {
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/api/v1/interviews/${interviewId}/live`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('Connected to interview room');
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'transcript',
          text: transcript,
          speaker: isRecruiter ? 'recruiter' : 'candidate',
          timestamp: new Date().toISOString()
        }));
      }
    };

    // Auto-start for recruiter
    if (isRecruiter) {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'participant_joined':
        toast.success(`${data.name} joined the interview`);
        break;
      case 'participant_left':
        toast(`${data.name} left the interview`, { icon: '👋' });
        break;
      case 'hand_raised':
        toast(`${data.name} raised their hand`, { icon: '✋' });
        break;
      case 'chat_message':
        // Handle chat message
        break;
      default:
        break;
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

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenShareRef.current?.srcObject) {
        screenShareRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      setIsScreenSharing(false);
    } else {
      // Start screen sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });
        
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = stream;
        }
        
        setIsScreenSharing(true);
        
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      } catch (error) {
        console.error('Screen share error:', error);
        toast.error('Could not start screen sharing');
      }
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const raiseHand = () => {
    setHandRaised(!handRaised);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'hand_raised',
        raised: !handRaised,
        name: user?.full_name || 'Participant'
      }));
    }
  };

  const copyMeetingLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    toast.success('Meeting link copied!');
  };

  const endInterview = async () => {
    try {
      if (isRecruiter) {
        await api.post(`/interviews/${interviewId}/end`);
        toast.success('Interview ended successfully');
        cleanup();
        navigate('/interviews');
      } else {
        toast.success('You have left the interview');
        cleanup();
        navigate('/');
      }
    } catch (error) {
      console.error('Error ending interview:', error);
      toast.error('Failed to end interview');
      // Still cleanup and navigate even if API fails
      cleanup();
      navigate(isRecruiter ? '/interviews' : '/');
    }
  };

  const cleanup = () => {
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    if (screenShareRef.current?.srcObject) {
      screenShareRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getNetworkIcon = () => {
    const colors = {
      good: 'text-green-400',
      fair: 'text-yellow-400',
      poor: 'text-red-400'
    };
    return <Signal className={`w-4 h-4 ${colors[networkQuality]}`} />;
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="bg-black/60 backdrop-blur-xl border-b border-purple-500/20 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-bold text-lg">{interview?.title || 'Interview Room'}</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-lg border border-red-500/30">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-sm font-semibold">{isRecording ? 'REC' : 'LIVE'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-white font-mono text-sm">{formatTime(elapsedTime)}</span>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
            {getNetworkIcon()}
            <span className="text-purple-300 text-sm capitalize">{networkQuality}</span>
          </div>

          <button
            onClick={copyMeetingLink}
            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
            title="Copy meeting link"
          >
            <Copy className="w-5 h-5 text-purple-400" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
            title="Toggle fullscreen"
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5 text-purple-400" />
            ) : (
              <Maximize className="w-5 h-5 text-purple-400" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className={`flex-1 flex flex-col p-4 ${isRecruiter ? 'pr-2' : ''}`}>
          {/* Main Video Grid - Larger candidate video */}
          <div className="flex-1 flex gap-4 mb-4">
            {/* Remote Video (Candidate for Recruiter, Recruiter for Candidate) - LARGER */}
            <div className="relative bg-slate-900 rounded-2xl overflow-hidden flex-[2]">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur rounded-lg">
                <span className="text-white text-sm font-semibold">
                  {isRecruiter ? interview?.candidate?.name || 'Candidate' : 'Interviewer'}
                </span>
              </div>
              {handRaised && !isRecruiter && (
                <div className="absolute top-4 right-4 p-2 bg-yellow-500/20 backdrop-blur rounded-lg border border-yellow-500/30">
                  <Hand className="w-6 h-6 text-yellow-400" />
                </div>
              )}
            </div>

            {/* Local Video - SMALLER */}
            <div className="relative bg-slate-900 rounded-2xl overflow-hidden flex-1">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
              <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur rounded-lg">
                <span className="text-white text-sm font-semibold">You</span>
              </div>
              {!isVideoOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <User className="w-10 h-10 text-purple-400" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Screen Share */}
          {isScreenSharing && (
            <div className="h-64 bg-slate-900 rounded-2xl overflow-hidden mb-4">
              <video
                ref={screenShareRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Code Editor */}
          {showCodeEditor && (
            <div className="h-96 mb-4">
              <SharedCodeEditor interviewId={interviewId} />
            </div>
          )}
        </div>

        {/* Recruiter AI Panel (Only for Recruiter) */}
        {isRecruiter && (
          <div className="w-96 flex-shrink-0 pl-2">
            <RecruiterAIPanel interviewId={interviewId} />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-black/60 backdrop-blur-xl border-t border-purple-500/20 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-xl transition-all ${
              isVideoOn
                ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
            }`}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleAudio}
            className={`p-4 rounded-xl transition-all ${
              isAudioOn
                ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
            }`}
          >
            {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-xl transition-all ${
              isScreenSharing
                ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
            }`}
          >
            {isScreenSharing ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
          </button>

          {!isRecruiter && (
            <button
              onClick={raiseHand}
              className={`p-4 rounded-xl transition-all ${
                handRaised
                  ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                  : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
              }`}
            >
              <Hand className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-4 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-all"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            className="p-4 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-all"
          >
            <Code className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="p-4 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-all"
          >
            <Users className="w-5 h-5" />
          </button>

          {isRecruiter && (
            <button
              onClick={toggleRecording}
              className={`p-4 rounded-xl transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-current" />
            </button>
          )}
        </div>

        <button
          onClick={endInterview}
          className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all"
        >
          <Phone className="w-4 h-4 inline mr-2" />
          {isRecruiter ? 'End Interview' : 'Leave'}
        </button>
      </div>

      {/* Side Panels */}
      <AnimatePresence>
        {showChat && (
          <MeetingChat
            interviewId={interviewId}
            onClose={() => setShowChat(false)}
          />
        )}
        
        {showParticipants && (
          <ParticipantsList
            interviewId={interviewId}
            onClose={() => setShowParticipants(false)}
          />
        )}
      </AnimatePresence>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
