import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Loader, Mic, MicOff, Signal, Speaker, User, Video, VideoOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuthStore } from '../store'

function StatusRow({ icon: Icon, label, value, ready }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
      <div className="flex items-center gap-3 text-sm text-slate-200"><Icon size={17} className="text-violet-300" />{label}</div>
      <span className={`text-xs font-medium ${ready ? 'text-emerald-300' : 'text-amber-300'}`}>{value}</span>
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
  const videoRef = useRef(null)

  useEffect(() => {
    loadInterview()
    requestPermissions()
    const updateConnection = () => setNetworkQuality(navigator.onLine ? 'Good' : 'Offline')
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)
    return () => {
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
      mediaStream?.getTracks().forEach((track) => track.stop())
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
      const response = token
        ? await api.get(`/interviews/join/${interviewId}?token=${token}`)
        : await api.get(`/interviews/${interviewId}`)
      setInterview(response.data)
      if (!displayName && response.data.candidate?.name) setDisplayName(response.data.candidate.name)
    } catch (error) {
      toast.error('Failed to load interview')
      navigate('/')
    } finally {
      setLoading(false)
    }
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
    } catch (error) {
      console.error('Permission error:', error)
      setPermissionStatus('denied')
      setDeviceError('Camera and microphone are unavailable. You may still join and enable devices later.')
    }
  }

  const toggleVideo = () => {
    const track = mediaStream?.getVideoTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setIsVideoOn(track.enabled)
    }
  }

  const toggleAudio = () => {
    const track = mediaStream?.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setIsAudioOn(track.enabled)
    }
  }

  const testSpeaker = () => {
    const context = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.frequency.value = 440
    gain.gain.value = 0.06
    oscillator.start()
    oscillator.stop(context.currentTime + 0.18)
    oscillator.onended = () => context.close()
    setSpeakerTested(true)
    toast.success('Speaker test played')
  }

  const joinInterview = () => {
    if (!displayName.trim()) {
      toast.error('Please enter your display name')
      return
    }

    // Request full screen on user interaction
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Ignore if blocked or already in FS
      });
    }

    const params = new URLSearchParams()
    if (token) params.append('token', token)
    params.append('name', displayName.trim())
    params.append('hasMedia', permissionStatus === 'granted' ? 'true' : 'false')
    navigate(`/interview-room/${interviewId}?${params.toString()}`, { state: { mediaStream } })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070812]">
        <Loader className="h-10 w-10 animate-spin text-violet-300" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070812] px-4 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.25),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(79,70,229,0.15),transparent_35%)]" />
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-violet-300">TalentIQ interview</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Ready to join?</h1>
          <p className="mt-3 text-sm text-slate-400">{interview?.title || 'Interview meeting'} · Check your setup before entering</p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-3 shadow-2xl backdrop-blur-xl">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900">
              <video ref={videoRef} autoPlay playsInline muted className="mirror h-full w-full object-cover" />
              {(permissionStatus !== 'granted' || !isVideoOn) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400">
                  <div className="mb-3 rounded-full bg-violet-500/20 p-6 text-violet-300"><User size={42} /></div>
                  <p className="text-sm">{permissionStatus === 'denied' ? 'Camera unavailable' : 'Camera is off'}</p>
                </div>
              )}
              <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-3 rounded-full border border-white/10 bg-slate-950/65 p-2 backdrop-blur-xl">
                <button type="button" onClick={toggleAudio} className={`rounded-full p-3 ${isAudioOn ? 'bg-white/10' : 'bg-red-500'}`} aria-label="Toggle microphone">
                  {isAudioOn ? <Mic size={19} /> : <MicOff size={19} />}
                </button>
                <button type="button" onClick={toggleVideo} className={`rounded-full p-3 ${isVideoOn ? 'bg-white/10' : 'bg-red-500'}`} aria-label="Toggle camera">
                  {isVideoOn ? <Video size={19} /> : <VideoOff size={19} />}
                </button>
              </div>
            </div>
            {permissionStatus === 'denied' && (
              <button type="button" onClick={requestPermissions} className="mt-3 w-full rounded-xl border border-violet-300/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100 hover:bg-violet-500/20">
                Retry camera and microphone access
              </button>
            )}
          </section>
          <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl sm:p-6">
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-400">Display name</label>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Enter your name" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-violet-400/50" />
            </div>
            <StatusRow icon={Video} label="Camera" value={permissionStatus === 'granted' && isVideoOn ? 'Ready' : 'Off'} ready={permissionStatus === 'granted' && isVideoOn} />
            <StatusRow icon={Mic} label="Microphone" value={permissionStatus === 'granted' && isAudioOn ? 'Ready' : 'Off'} ready={permissionStatus === 'granted' && isAudioOn} />
            <button type="button" onClick={testSpeaker} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-200 hover:bg-white/[0.07]">
              <span className="flex items-center gap-3"><Speaker size={17} className="text-violet-300" /> Speaker test</span>
              <span className={speakerTested ? 'text-xs text-emerald-300' : 'text-xs text-slate-400'}>{speakerTested ? 'Played' : 'Test'}</span>
            </button>
            <StatusRow icon={Signal} label="Network quality" value={networkQuality} ready={networkQuality === 'Good'} />
            {deviceError && <p className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">{deviceError}</p>}
            <button type="button" onClick={joinInterview} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 text-sm font-semibold shadow-lg shadow-violet-900/30 hover:bg-violet-500">
              <CheckCircle size={18} /> Join interview
            </button>
            <p className="text-center text-xs text-slate-500">Your device settings can be changed after joining.</p>
          </section>
        </div>
      </motion.div>
      <style jsx>{`.mirror { transform: scaleX(-1); }`}</style>
    </div>
  )
}
