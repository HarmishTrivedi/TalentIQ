import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Video, VideoOff, Mic, MicOff, Settings, Monitor,
  User, Clock, Calendar, Briefcase, CheckCircle, AlertCircle,
  Loader, ChevronDown, Signal, Speaker
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

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
    } catch (e) { console.error(e); }
    
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

export default function CandidateJoin() {
  const { interviewId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [candidateName, setCandidateName] = useState('');
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [devices, setDevices] = useState({ cameras: [], microphones: [] });
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMicrophone, setSelectedMicrophone] = useState('');
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [joining, setJoining] = useState(false);
  const [speakerTested, setSpeakerTested] = useState(false);
  const [networkQuality, setNetworkQuality] = useState(navigator.onLine ? 'Good' : 'Offline');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!token) {
      toast.error('Invalid meeting link');
      return;
    }
    loadInterview();
  }, [interviewId, token]);

  useEffect(() => {
    const updateConnection = () => setNetworkQuality(navigator.onLine ? 'Good' : 'Offline');
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      // Cleanup media stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  const loadInterview = async () => {
    try {
      const response = await api.get(`/interviews/join/${interviewId}?token=${token}`);
      setInterview(response.data);
      setCandidateName(response.data.candidate?.name || '');
    } catch (error) {
      toast.error('Invalid or expired meeting link');
      setPermissionError('Unable to access this interview. Please check your link.');
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    try {
      setPermissionError('');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Get available devices
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const cameras = deviceList.filter(device => device.kind === 'videoinput');
      const microphones = deviceList.filter(device => device.kind === 'audioinput');
      
      setDevices({ cameras, microphones });
      
      if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId);
      if (microphones.length > 0) setSelectedMicrophone(microphones[0].deviceId);
      
      setPermissionsGranted(true);
      toast.success('Camera and microphone ready!');
    } catch (error) {
      console.error('Permission error:', error);
      
      if (error.name === 'NotAllowedError') {
        setPermissionError('Camera and microphone access denied. Please allow access to join the interview.');
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No camera or microphone found. Please connect a device and try again.');
      } else {
        setPermissionError('Unable to access camera/microphone. Please check your device settings.');
      }
      
      toast.error('Failed to access camera/microphone');
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const changeCamera = async (deviceId) => {
    try {
      setSelectedCamera(deviceId);
      
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: 1280, height: 720 },
        audio: { deviceId: selectedMicrophone ? { exact: selectedMicrophone } : undefined }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast.error('Failed to switch camera');
    }
  };

  const changeMicrophone = async (deviceId) => {
    try {
      setSelectedMicrophone(deviceId);
      
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedCamera ? { exact: selectedCamera } : undefined },
        audio: { deviceId: { exact: deviceId } }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast.error('Failed to switch microphone');
    }
  };

  const handleJoinInterview = async () => {
    if (!candidateName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!permissionsGranted) {
      toast.error('Please allow camera and microphone access');
      return;
    }

    setJoining(true);
    
    try {
      // Navigate to interview room with token
      navigate(`/interview-room/${interviewId}?token=${token}&name=${encodeURIComponent(candidateName)}`);
    } catch (error) {
      toast.error('Failed to join interview');
      setJoining(false);
    }
  };

  const testSpeaker = () => {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = 440;
    gain.gain.value = 0.06;
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
    oscillator.onended = () => context.close();
    setSpeakerTested(true);
    toast.success('Speaker test played');
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Invalid Interview Link</h2>
          <p className="text-slate-400">{permissionError || 'This interview link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/40 to-slate-950 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Video Preview */}
          <div className="space-y-6">
            {/* Video Preview */}
            <div className="relative bg-slate-900 rounded-3xl overflow-hidden border border-slate-700/50 aspect-video">
              {permissionsGranted ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                  {!isVideoOn && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                        <User className="w-12 h-12 text-white" />
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
                    <MicVisualizer stream={streamRef.current} active={isAudioOn && permissionsGranted} />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <div className="text-center">
                    <VideoOff className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 mb-4">Camera preview will appear here</p>
                    <button
                      onClick={requestPermissions}
                      className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                    >
                      Enable Camera & Microphone
                    </button>
                  </div>
                </div>
              )}

              {/* Controls Overlay */}
              {permissionsGranted && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-3">
                  <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full transition-all ${
                      isVideoOn
                        ? 'bg-slate-800/80 hover:bg-slate-700/80'
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {isVideoOn ? (
                      <Video className="w-5 h-5 text-white" />
                    ) : (
                      <VideoOff className="w-5 h-5 text-white" />
                    )}
                  </button>

                  <button
                    onClick={toggleAudio}
                    className={`p-4 rounded-full transition-all ${
                      isAudioOn
                        ? 'bg-slate-800/80 hover:bg-slate-700/80'
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {isAudioOn ? (
                      <Mic className="w-5 h-5 text-white" />
                    ) : (
                      <MicOff className="w-5 h-5 text-white" />
                    )}
                  </button>

                  <button
                    onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                    className="p-4 rounded-full bg-slate-800/80 hover:bg-slate-700/80 transition-all"
                  >
                    <Settings className="w-5 h-5 text-white" />
                  </button>
                </div>
              )}
            </div>

            {/* Device Settings */}
            {showDeviceSettings && permissionsGranted && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 space-y-4"
              >
                <h3 className="text-white font-semibold mb-4">Device Settings</h3>
                
                {/* Camera Selection */}
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Camera</label>
                  <select
                    value={selectedCamera}
                    onChange={(e) => changeCamera(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  >
                    {devices.cameras.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Microphone Selection */}
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Microphone</label>
                  <select
                    value={selectedMicrophone}
                    onChange={(e) => changeMicrophone(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  >
                    {devices.microphones.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}

            {/* Permission Error */}
            {permissionError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 text-sm font-semibold mb-1">Permission Required</p>
                    <p className="text-red-300/80 text-sm">{permissionError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Interview Details */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Ready to join?</h1>
              <p className="text-slate-400">Please check your camera and microphone before joining</p>
            </div>

            {/* Interview Info Card */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 space-y-4">
              <h2 className="text-xl font-bold text-white">{interview.title}</h2>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-300">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  <span>{formatDateTime(interview.scheduled_at)}</span>
                </div>

                {interview.duration_minutes && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    <span>{interview.duration_minutes} minutes</span>
                  </div>
                )}

                {interview.job && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <Briefcase className="w-5 h-5 text-cyan-400" />
                    <span>{interview.job.title}</span>
                  </div>
                )}

                {interview.interview_types && interview.interview_types.length > 0 && (
                  <div className="flex items-center gap-3 text-slate-300">
                    <Monitor className="w-5 h-5 text-cyan-400" />
                    <span>{interview.interview_types.join(', ')} Interview</span>
                  </div>
                )}
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Your Name</label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={testSpeaker}
                className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-slate-200 hover:border-violet-400/40 transition-all"
              >
                <span className="flex items-center gap-2 text-sm"><Speaker className="w-4 h-4 text-violet-300" /> Speaker Test</span>
                <span className={`text-xs ${speakerTested ? 'text-emerald-300' : 'text-slate-400'}`}>{speakerTested ? 'Played' : 'Test'}</span>
              </button>
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-slate-200">
                <span className="flex items-center gap-2 text-sm"><Signal className="w-4 h-4 text-violet-300" /> Network</span>
                <span className={`text-xs ${networkQuality === 'Good' ? 'text-emerald-300' : 'text-amber-300'}`}>{networkQuality}</span>
              </div>
            </div>

            {/* Join Button */}
            <button
              onClick={handleJoinInterview}
              disabled={!permissionsGranted || !candidateName.trim() || joining}
              className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {joining ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Join Interview
                </>
              )}
            </button>

            {/* Tips */}
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4">
              <h3 className="text-cyan-400 font-semibold mb-2 text-sm">Before you join:</h3>
              <ul className="space-y-1 text-cyan-300/80 text-sm">
                <li>• Ensure you're in a quiet environment</li>
                <li>• Check your internet connection</li>
                <li>• Test your camera and microphone</li>
                <li>• Have any required documents ready</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
