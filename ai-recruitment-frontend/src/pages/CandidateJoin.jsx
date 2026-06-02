import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Video, VideoOff, Mic, MicOff, Settings, Monitor,
  User, Clock, Calendar, Briefcase, CheckCircle, AlertCircle,
  Loader, Signal, Volume2, BarChart3, ChevronDown, Wifi, WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { cn } from '../utils/helpers';

function MicVisualizer({ stream, active }) {
  const [levels, setLevels] = useState([10, 20, 50, 30, 10]);
  useEffect(() => {
    if (!stream || !active) return;
    let audioContext, analyser, dataArray, interval;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        setLevels(Array.from(dataArray.slice(0, 5)).map(v => Math.max(4, v / 2)));
      }, 50);
    } catch (e) { console.error(e); }
    return () => { if (interval) clearInterval(interval); if (audioContext) audioContext.close(); };
  }, [stream, active]);

  return (
    <div className="flex items-end gap-1 h-6">
      {levels.map((level, i) => (
        <motion.div key={i} animate={{ height: active ? level / 3 : 2 }}
          className="w-1 bg-primary rounded-full"
          transition={{ type: 'spring', stiffness: 300, damping: 20 }} />
      ))}
    </div>
  );
}

function StatusRow({ icon: Icon, label, value, ready }) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant">
      <div className="flex items-center gap-2.5 text-sm text-on-surface-variant">
        <Icon size={16} className="text-primary opacity-70" />
        <span className="font-medium">{label}</span>
      </div>
      <span className={cn('text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border',
        ready ? 'text-tertiary bg-tertiary/10 border-tertiary/20' : 'text-outline bg-surface-container border-outline-variant')}>
        {value}
      </span>
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
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [permissionsGranted, isVideoOn]);

  useEffect(() => {
    if (!token) { toast.error('Invalid meeting link'); return; }
    loadInterview();
    // Proactively request permissions on load
    requestPermissions();
  }, [interviewId, token]);

  useEffect(() => {
    const update = () => setNetworkQuality(navigator.onLine ? 'Good' : 'Offline');
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const loadInterview = async () => {
    try {
      const res = await api.get(`/interviews/join/${interviewId}?token=${token}`);
      setInterview(res.data);
      setCandidateName(res.data.candidate?.name || '');
    } catch {
      toast.error('Invalid or expired meeting link');
      setPermissionError('Unable to access this interview. Please check your link.');
    } finally { setLoading(false); }
  };

  const requestPermissions = async () => {
    try {
      setPermissionError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const cameras = deviceList.filter(d => d.kind === 'videoinput');
      const microphones = deviceList.filter(d => d.kind === 'audioinput');
      setDevices({ cameras, microphones });
      if (cameras.length) setSelectedCamera(cameras[0].deviceId);
      if (microphones.length) setSelectedMicrophone(microphones[0].deviceId);
      setPermissionsGranted(true);
      toast.success('Camera and microphone ready!');
    } catch (error) {
      if (error.name === 'NotAllowedError') setPermissionError('Camera and microphone access denied. Please allow access in your browser settings.');
      else if (error.name === 'NotFoundError') setPermissionError('No camera or microphone found. Please connect a device and try again.');
      else setPermissionError('Unable to access camera/microphone. Please check your device settings.');
      toast.error('Failed to access camera/microphone');
    }
  };

  const toggleVideo = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsVideoOn(track.enabled); }
  };

  const toggleAudio = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsAudioOn(track.enabled); }
  };

  const testSpeaker = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 440; gain.gain.value = 0.06;
    osc.start(); osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => ctx.close();
    setSpeakerTested(true);
    toast.success('Speaker test played');
  };

  const handleJoin = async () => {
    if (!candidateName.trim()) { toast.error('Please enter your name'); return; }
    if (!permissionsGranted) { toast.error('Please allow camera and microphone access'); return; }
    setJoining(true);
    try {
      navigate(`/interview-room/${interviewId}?token=${token}&name=${encodeURIComponent(candidateName)}`);
    } catch { toast.error('Failed to join interview'); setJoining(false); }
  };

  const formatDateTime = (d) => d ? new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : '—';

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-outline uppercase tracking-widest">Loading interview...</p>
      </div>
    </div>
  );

  if (!interview) return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-error/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={36} className="text-error" />
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">Invalid Interview Link</h2>
        <p className="text-on-surface-variant text-sm">{permissionError || 'This interview link is invalid or has expired.'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface font-sans">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 h-16 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BarChart3 size={16} className="text-white" />
          </div>
          <span className="font-display text-lg font-bold text-primary">TalentIQ</span>
          <div className="h-5 w-px bg-outline-variant mx-2" />
          <div>
            <p className="text-sm font-bold text-on-surface leading-none">{interview.title}</p>
            <p className="text-[11px] text-outline uppercase tracking-wider">Interview Pre-Check</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          {networkQuality === 'Good'
            ? <Wifi size={16} className="text-tertiary" />
            : <WifiOff size={16} className="text-error" />}
          <span className={cn('text-[11px] font-black uppercase tracking-wider',
            networkQuality === 'Good' ? 'text-tertiary' : 'text-error')}>
            {networkQuality}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Page heading */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-3xl font-bold text-on-surface mb-2">Ready to join?</h1>
          <p className="text-on-surface-variant text-sm">Check your camera and microphone before entering the interview room.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Left — Video Preview */}
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="space-y-4">

            {/* Video box */}
            <div className="portal-card overflow-hidden bg-surface-container-lowest shadow-lg">
              <div className="relative aspect-video bg-surface-container-high">
                {permissionsGranted ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted
                      className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                    {!isVideoOn && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-high">
                        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                          <User size={36} className="text-primary opacity-60" />
                        </div>
                        <p className="text-sm text-outline font-medium">Camera is off</p>
                      </div>
                    )}
                    {/* Mic visualizer */}
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
                      <MicVisualizer stream={streamRef.current} active={isAudioOn} />
                    </div>
                    {/* Name badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-on-surface/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
                      <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                      <span className="text-white text-xs font-bold">{candidateName || 'You'}</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-high">
                    <div className="w-20 h-20 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center mb-4">
                      <VideoOff size={32} className="text-outline opacity-40" />
                    </div>
                    <p className="text-sm text-outline mb-5 font-medium">Camera preview will appear here</p>
                    <button onClick={requestPermissions}
                      className="btn-primary px-6 py-2.5 shadow-md">
                      <Video size={16} /> Enable Camera & Mic
                    </button>
                  </div>
                )}

                {/* Controls overlay */}
                {permissionsGranted && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-on-surface/60 backdrop-blur-sm rounded-full p-1.5 border border-white/20">
                    <button onClick={toggleVideo}
                      className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-all',
                        isVideoOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-error text-white')}>
                      {isVideoOn ? <Video size={17} /> : <VideoOff size={17} />}
                    </button>
                    <button onClick={toggleAudio}
                      className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-all',
                        isAudioOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-error text-white')}>
                      {isAudioOn ? <Mic size={17} /> : <MicOff size={17} />}
                    </button>
                    <button onClick={() => setShowDeviceSettings(p => !p)}
                      className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
                      <Settings size={17} />
                    </button>
                  </div>
                )}
              </div>

              {/* Device settings dropdown */}
              {showDeviceSettings && permissionsGranted && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="p-5 border-t border-outline-variant space-y-4">
                  <p className="text-[11px] font-black uppercase tracking-widest text-outline">Device Settings</p>
                  {devices.cameras.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-on-surface-variant">Camera</label>
                      <div className="relative">
                        <select value={selectedCamera} onChange={e => {
                          setSelectedCamera(e.target.value);
                          // switch camera
                        }}
                          className="w-full h-10 px-3 pr-8 rounded-xl text-sm border border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none appearance-none">
                          {devices.cameras.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                      </div>
                    </div>
                  )}
                  {devices.microphones.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-on-surface-variant">Microphone</label>
                      <div className="relative">
                        <select value={selectedMicrophone} onChange={e => setSelectedMicrophone(e.target.value)}
                          className="w-full h-10 px-3 pr-8 rounded-xl text-sm border border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none appearance-none">
                          {devices.microphones.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 5)}`}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Permission error */}
            {permissionError && (
              <div className="flex items-start gap-3 p-4 bg-error/5 rounded-xl border border-error/20">
                <AlertCircle size={16} className="text-error shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-error mb-0.5">Permission Required</p>
                  <p className="text-xs text-on-surface-variant">{permissionError}</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Right — Details & Join */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            className="space-y-5">

            {/* Interview info card */}
            <div className="portal-card p-6 bg-surface-container-lowest shadow-md">
              <h2 className="text-lg font-bold text-on-surface mb-4">{interview.title}</h2>
              <div className="space-y-3">
                {interview.scheduled_at && (
                  <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                    <Calendar size={16} className="text-primary opacity-70 shrink-0" />
                    <span>{formatDateTime(interview.scheduled_at)}</span>
                  </div>
                )}
                {interview.duration_minutes && (
                  <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                    <Clock size={16} className="text-primary opacity-70 shrink-0" />
                    <span>{interview.duration_minutes} minutes</span>
                  </div>
                )}
                {interview.job && (
                  <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                    <Briefcase size={16} className="text-primary opacity-70 shrink-0" />
                    <span>{interview.job.title}</span>
                  </div>
                )}
                {interview.interview_types?.length > 0 && (
                  <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                    <Monitor size={16} className="text-primary opacity-70 shrink-0" />
                    <span>{interview.interview_types.join(', ')} Interview</span>
                  </div>
                )}
              </div>
            </div>

            {/* Name input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-widest text-outline">Your Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-50" />
                <input type="text" value={candidateName} onChange={e => setCandidateName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-medium border border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all" />
              </div>
            </div>

            {/* Status checks */}
            <div className="space-y-2">
              <StatusRow icon={Video} label="Camera" value={permissionsGranted && isVideoOn ? 'Ready' : 'Off'} ready={permissionsGranted && isVideoOn} />
              <StatusRow icon={Mic} label="Microphone" value={permissionsGranted && isAudioOn ? 'Ready' : 'Off'} ready={permissionsGranted && isAudioOn} />
              <button onClick={testSpeaker}
                className="w-full flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant hover:border-primary/40 hover:bg-primary/5 transition-all">
                <div className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                  <Volume2 size={16} className="text-primary opacity-70" />
                  <span className="font-medium">Speaker Test</span>
                </div>
                <span className={cn('text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border',
                  speakerTested ? 'text-tertiary bg-tertiary/10 border-tertiary/20' : 'text-outline bg-surface-container border-outline-variant')}>
                  {speakerTested ? 'Played ✓' : 'Test'}
                </span>
              </button>
              <StatusRow icon={networkQuality === 'Good' ? Wifi : WifiOff} label="Network Quality" value={networkQuality} ready={networkQuality === 'Good'} />
            </div>

            {/* Join button */}
            <button onClick={handleJoin}
              disabled={!permissionsGranted || !candidateName.trim() || joining}
              className="w-full h-13 py-3.5 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {joining
                ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Joining...</>
                : <><CheckCircle size={18} /> Join Interview</>
              }
            </button>

            {/* Tips */}
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-[11px] font-black uppercase tracking-widest text-primary mb-2">Before you join</p>
              <ul className="space-y-1.5 text-xs text-on-surface-variant">
                {['Ensure you are in a quiet environment', 'Check your internet connection is stable', 'Have any required documents ready', 'Your device settings can be changed after joining'].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle size={12} className="text-primary shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
