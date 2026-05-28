import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle, Mic, MicOff, Signal, Volume2, User,
  Video, VideoOff, BarChart3, Wifi, WifiOff, Settings,
  Calendar, Clock, Briefcase, AlertCircle, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuthStore } from '../store'
import { cn } from '../utils/helpers'

function MicVisualizer({ stream, active }) {
  const [levels, setLevels] = useState([10, 20, 50, 30, 10])
  useEffect(() => {
    if (!stream || !active) return
    let audioContext, analyser, dataArray, interval
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 32
      source.connect(analyser)
      dataArray = new Uint8Array(analyser.frequencyBinCount)
      interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray)
        setLevels(Array.from(dataArray.slice(0, 5)).map(v => Math.max(4, v / 2)))
      }, 50)
    } catch (e) { console.error(e) }
    return () => { if (interval) clearInterval(interval); if (audioContext) audioContext.close() }
  }, [stream, active])

  return (
    <div className="flex items-end gap-1 h-6">
      {levels.map((level, i) => (
        <motion.div key={i} animate={{ height: active ? level / 3 : 2 }}
          className="w-1 bg-primary rounded-full"
          transition={{ type: 'spring', stiffness: 300, damping: 20 }} />
      ))}
    </div>
  )
}

function StatusRow({ icon: Icon, label, value, ready }) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant">
      <div className="flex items-center gap-2.5 text-sm text-on-surface-variant">
        <Icon size={16} className="text-primary opacity-70" />
        <span className="font-medium">{label}</span>
      </div>
      <span className={cn('text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border',
        ready
          ? 'text-tertiary bg-tertiary/10 border-tertiary/20'
          : 'text-outline bg-surface-container border-outline-variant')}>
        {value}
      </span>
    </div>
  )
}

export default function InterviewPreJoin() {
  const { interviewId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const token = searchParams.get('token')

  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState(user?.full_name || '')
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [mediaStream, setMediaStream] = useState(null)
  const [permissionStatus, setPermissionStatus] = useState('pending')
  const [deviceError, setDeviceError] = useState('')
  const [speakerTested, setSpeakerTested] = useState(false)
  const [networkQuality, setNetworkQuality] = useState(navigator.onLine ? 'Good' : 'Offline')
  const [showSettings, setShowSettings] = useState(false)
  const [devices, setDevices] = useState({ cameras: [], microphones: [] })
  const videoRef = useRef(null)

  useEffect(() => {
    loadInterview()
    requestPermissions()
    const update = () => setNetworkQuality(navigator.onLine ? 'Good' : 'Offline')
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      mediaStream?.getTracks().forEach(t => t.stop())
    }
  }, [interviewId])

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream
      videoRef.current.play().catch(console.error)
    }
  }, [loading, mediaStream])

  const loadInterview = async () => {
    try {
      const res = token
        ? await api.get(`/interviews/join/${interviewId}?token=${token}`)
        : await api.get(`/interviews/${interviewId}`)
      setInterview(res.data)
      if (!displayName && res.data.candidate?.name) setDisplayName(res.data.candidate.name)
    } catch {
      toast.error('Failed to load interview')
      navigate('/')
    } finally { setLoading(false) }
  }

  const requestPermissions = async () => {
    setPermissionStatus('requesting')
    setDeviceError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      })
      setMediaStream(stream)
      setPermissionStatus('granted')
      const deviceList = await navigator.mediaDevices.enumerateDevices()
      setDevices({
        cameras: deviceList.filter(d => d.kind === 'videoinput'),
        microphones: deviceList.filter(d => d.kind === 'audioinput'),
      })
    } catch {
      setPermissionStatus('denied')
      setDeviceError('Camera and microphone are unavailable. You may still join and enable devices later.')
    }
  }

  const toggleVideo = () => {
    const track = mediaStream?.getVideoTracks()[0]
    if (track) { track.enabled = !track.enabled; setIsVideoOn(track.enabled) }
  }

  const toggleAudio = () => {
    const track = mediaStream?.getAudioTracks()[0]
    if (track) { track.enabled = !track.enabled; setIsAudioOn(track.enabled) }
  }

  const testSpeaker = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 440; gain.gain.value = 0.06
    osc.start(); osc.stop(ctx.currentTime + 0.18)
    osc.onended = () => ctx.close()
    setSpeakerTested(true)
    toast.success('Speaker test played')
  }

  const joinInterview = () => {
    if (!displayName.trim()) { toast.error('Please enter your display name'); return }
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
    const params = new URLSearchParams()
    if (token) params.append('token', token)
    params.append('name', displayName.trim())
    params.append('hasMedia', permissionStatus === 'granted' ? 'true' : 'false')
    navigate(`/interview-room/${interviewId}?${params.toString()}`)
  }

  const formatDateTime = (d) => d ? new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : '—'

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-outline uppercase tracking-widest">Loading interview...</p>
      </div>
    </div>
  )

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
            <p className="text-sm font-bold text-on-surface leading-none">{interview?.title || 'Interview'}</p>
            <p className="text-[11px] text-outline uppercase tracking-wider">Pre-Join Check</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        {/* Heading */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary mb-3">TalentIQ Interview</p>
          <h1 className="text-3xl font-bold text-on-surface mb-2">Ready to join?</h1>
          <p className="text-on-surface-variant text-sm">
            {interview?.title || 'Interview meeting'} · Check your setup before entering
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8">

          {/* Left — Video */}
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div className="portal-card overflow-hidden bg-surface-container-lowest shadow-lg">
              <div className="relative aspect-video bg-surface-container-high">
                <video ref={videoRef} autoPlay playsInline muted
                  className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />

                {(permissionStatus !== 'granted' || !isVideoOn) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-high">
                    <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                      <User size={36} className="text-primary opacity-60" />
                    </div>
                    <p className="text-sm text-outline font-medium">
                      {permissionStatus === 'denied' ? 'Camera unavailable' : 'Camera is off'}
                    </p>
                  </div>
                )}

                {/* Mic visualizer */}
                {permissionStatus === 'granted' && (
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
                    <MicVisualizer stream={mediaStream} active={isAudioOn} />
                  </div>
                )}

                {/* Name badge */}
                {permissionStatus === 'granted' && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-on-surface/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
                    <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                    <span className="text-white text-xs font-bold">{displayName || 'You'}</span>
                  </div>
                )}

                {/* Controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-on-surface/60 backdrop-blur-sm rounded-full p-1.5 border border-white/20">
                  <button onClick={toggleAudio}
                    className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-all',
                      isAudioOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-error text-white')}>
                    {isAudioOn ? <Mic size={17} /> : <MicOff size={17} />}
                  </button>
                  <button onClick={toggleVideo}
                    className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-all',
                      isVideoOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-error text-white')}>
                    {isVideoOn ? <Video size={17} /> : <VideoOff size={17} />}
                  </button>
                  <button onClick={() => setShowSettings(p => !p)}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
                    <Settings size={17} />
                  </button>
                </div>
              </div>

              {/* Device settings */}
              {showSettings && permissionStatus === 'granted' && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="p-5 border-t border-outline-variant space-y-4">
                  <p className="text-[11px] font-black uppercase tracking-widest text-outline">Device Settings</p>
                  {devices.cameras.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-on-surface-variant">Camera</label>
                      <div className="relative">
                        <select className="w-full h-10 px-3 pr-8 rounded-xl text-sm border border-outline-variant bg-surface-container-low focus:border-primary outline-none appearance-none">
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
                        <select className="w-full h-10 px-3 pr-8 rounded-xl text-sm border border-outline-variant bg-surface-container-low focus:border-primary outline-none appearance-none">
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

              {/* Retry button */}
              {permissionStatus === 'denied' && (
                <div className="p-4 border-t border-outline-variant">
                  <button onClick={requestPermissions}
                    className="w-full btn-secondary py-2.5 flex items-center justify-center gap-2 text-sm">
                    <Video size={16} /> Retry Camera & Microphone Access
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right — Info & Join */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            className="space-y-5">

            {/* Interview info */}
            {interview && (
              <div className="portal-card p-5 bg-surface-container-lowest shadow-md">
                <h3 className="text-base font-bold text-on-surface mb-3">{interview.title}</h3>
                <div className="space-y-2.5">
                  {interview.scheduled_at && (
                    <div className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                      <Calendar size={14} className="text-primary opacity-70 shrink-0" />
                      <span>{formatDateTime(interview.scheduled_at)}</span>
                    </div>
                  )}
                  {interview.duration_minutes && (
                    <div className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                      <Clock size={14} className="text-primary opacity-70 shrink-0" />
                      <span>{interview.duration_minutes} minutes</span>
                    </div>
                  )}
                  {interview.job && (
                    <div className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                      <Briefcase size={14} className="text-primary opacity-70 shrink-0" />
                      <span>{interview.job.title}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Name input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-widest text-outline">Display Name</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-50" />
                <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-medium border border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all" />
              </div>
            </div>

            {/* Status checks */}
            <div className="space-y-2">
              <StatusRow icon={Video} label="Camera" value={permissionStatus === 'granted' && isVideoOn ? 'Ready' : 'Off'} ready={permissionStatus === 'granted' && isVideoOn} />
              <StatusRow icon={Mic} label="Microphone" value={permissionStatus === 'granted' && isAudioOn ? 'Ready' : 'Off'} ready={permissionStatus === 'granted' && isAudioOn} />
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

            {/* Device error */}
            {deviceError && (
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{deviceError}</p>
              </div>
            )}

            {/* Join button */}
            <button onClick={joinInterview}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-md hover:shadow-lg">
              <CheckCircle size={18} /> Join Interview
            </button>

            <p className="text-center text-xs text-outline">Your device settings can be changed after joining.</p>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
