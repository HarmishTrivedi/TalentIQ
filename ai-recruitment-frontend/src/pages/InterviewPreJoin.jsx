import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Video, VideoOff, Mic, MicOff, Settings, CheckCircle, AlertCircle, Loader
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function InterviewPreJoin() {
  const { interviewId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [mediaStream, setMediaStream] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('pending'); // pending, granted, denied
  const [deviceError, setDeviceError] = useState(null);
  
  const videoRef = useRef(null);

  useEffect(() => {
    loadInterview();
    requestPermissions();
  }, [interviewId]);

  const loadInterview = async () => {
    try {
      let response;
      if (token) {
        response = await api.get(`/interviews/join/${interviewId}?token=${token}`);
      } else {
        response = await api.get(`/interviews/${interviewId}`);
      }
      setInterview(response.data);
    } catch (error) {
      toast.error('Failed to load interview');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    setPermissionStatus('requesting');
    setDeviceError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setMediaStream(stream);
      setPermissionStatus('granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
      
      toast.success('Camera and microphone ready!');
    } catch (error) {
      console.error('Permission error:', error);
      setPermissionStatus('denied');
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setDeviceError('Permission denied. Please allow camera and microphone access.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setDeviceError('No camera or microphone found. Please connect a device.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setDeviceError('Camera or microphone is already in use by another application.');
      } else {
        setDeviceError('Could not access camera/microphone. Please check your settings.');
      }
    }
  };

  const toggleVideo = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const joinInterview = () => {
    if (permissionStatus === 'granted') {
      // Pass the media stream to the interview room
      const params = new URLSearchParams();
      if (token) params.append('token', token);
      params.append('hasMedia', 'true');
      navigate(`/interview-room/${interviewId}?${params.toString()}`, {
        state: { mediaStream }
      });
    } else {
      // Join without media
      const params = new URLSearchParams();
      if (token) params.append('token', token);
      params.append('hasMedia', 'false');
      navigate(`/interview-room/${interviewId}?${params.toString()}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-purple-300">Loading interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full"
      >
        <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {interview?.title || 'Interview Room'}
            </h1>
            <p className="text-purple-300">
              Get ready to join your interview
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Video Preview */}
            <div className="space-y-4">
              <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video">
                {permissionStatus === 'granted' ? (
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
                        <div className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <VideoOff className="w-12 h-12 text-purple-400" />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                      <p className="text-purple-300">Camera preview will appear here</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              {permissionStatus === 'granted' && (
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-xl transition-all ${
                      isVideoOn
                        ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                        : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    }`}
                  >
                    {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                  </button>

                  <button
                    onClick={toggleAudio}
                    className={`p-4 rounded-xl transition-all ${
                      isAudioOn
                        ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                        : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    }`}
                  >
                    {isAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                  </button>
                </div>
              )}
            </div>

            {/* Setup Instructions */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Setup Checklist</h2>
                
                <div className="space-y-3">
                  {/* Permission Status */}
                  <div className={`p-4 rounded-xl border ${
                    permissionStatus === 'granted'
                      ? 'bg-green-500/10 border-green-500/30'
                      : permissionStatus === 'denied'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-purple-500/10 border-purple-500/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      {permissionStatus === 'granted' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : permissionStatus === 'denied' ? (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <Settings className="w-5 h-5 text-purple-400" />
                      )}
                      <div className="flex-1">
                        <p className={`font-semibold ${
                          permissionStatus === 'granted'
                            ? 'text-green-300'
                            : permissionStatus === 'denied'
                            ? 'text-red-300'
                            : 'text-purple-300'
                        }`}>
                          Camera & Microphone
                        </p>
                        {deviceError && (
                          <p className="text-sm text-red-300 mt-1">{deviceError}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Request Permission Button */}
                  {permissionStatus === 'denied' && (
                    <button
                      onClick={requestPermissions}
                      className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2"
                    >
                      <Settings className="w-5 h-5" />
                      Try Again
                    </button>
                  )}
                </div>
              </div>

              {/* Tips */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <h3 className="text-blue-300 font-semibold mb-2">💡 Tips for a great interview:</h3>
                <ul className="space-y-1 text-sm text-blue-200">
                  <li>• Find a quiet, well-lit space</li>
                  <li>• Test your camera and microphone</li>
                  <li>• Close unnecessary applications</li>
                  <li>• Have your resume ready</li>
                  <li>• Prepare questions about the role</li>
                </ul>
              </div>

              {/* Join Button */}
              <div className="space-y-3">
                <button
                  onClick={joinInterview}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-green-500/50 transition-all"
                >
                  Join Interview
                </button>
                
                {permissionStatus !== 'granted' && (
                  <p className="text-center text-sm text-purple-300">
                    You can join without camera/microphone and enable them later
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
