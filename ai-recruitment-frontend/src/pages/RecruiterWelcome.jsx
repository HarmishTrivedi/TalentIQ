import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store'
import { getInitials } from '../utils/helpers'
import { BrandMark } from '../components/premium/PremiumUI'

function useTime() {
  const h = new Date().getHours()
  if (h < 12) return { greeting: 'Good morning', emoji: '☀️' }
  if (h < 17) return { greeting: 'Good afternoon', emoji: '🌤️' }
  return { greeting: 'Good evening', emoji: '🌙' }
}

export default function RecruiterWelcome() {
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const [going, setGoing]     = useState(false)
  const [visible, setVisible] = useState(false)
  const { greeting, emoji }   = useTime()
  const firstName = user?.full_name?.split(' ')[0] || 'there'
  
  // Check if user is new (created within last 2 minutes)
  const isNewUser = user?.created_at ? 
    (new Date() - new Date(user.created_at)) < 2 * 60 * 1000 : false

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const proceed = () => {
    setGoing(true)
    setTimeout(() => navigate('/dashboard'), 500)
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Stylish background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:80px_80px]" />
      </div>
      
      <div className={`relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-5 transition-all duration-500 ${going ? 'opacity-0 scale-[0.97]' : 'opacity-100'}`}>

        {/* Logo top-left */}
        <div className="absolute top-6 left-8 z-10">
          <BrandMark />
        </div>

        {/* Main welcome card */}
        <div className={`relative z-10 flex flex-col items-center text-center px-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ maxWidth: 560 }}>

          {/* Time greeting pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 text-xs font-bold uppercase tracking-widest font-sans mb-8">
            <span className="text-base">{emoji}</span>
            {greeting}
          </div>

          {/* Avatar */}
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-3xl bg-[radial-gradient(circle,#fff_0%,#67e8f9_35%,#7c3aed_100%)] flex items-center justify-center text-3xl font-bold text-black shadow-[0_0_42px_rgba(34,211,238,0.35)] font-title">
              {getInitials(user?.full_name || 'U')}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.6)]">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>

          {/* Headline */}
          <h1 className="font-title font-black text-white mb-4 leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', animation: 'fadeUp 0.7s 200ms both' }}>
            {isNewUser ? 'Welcome' : 'Welcome back'},<br />
            <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">{firstName}.</span>
          </h1>

          {/* Subtext */}
          <p className="text-slate-300 text-lg max-w-sm mx-auto mb-12 leading-relaxed" style={{ animation: 'fadeUp 0.7s 350ms both' }}>
            Your cosmic workspace is ready. Everything is set up and waiting for you.
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-12 w-full max-w-xs" style={{ animation: 'fadeUp 0.7s 450ms both' }}>
            <div className="flex-1 h-px bg-white/10" />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* CTA */}
          <div className="relative" style={{ animation: 'fadeUp 0.7s 550ms both' }}>
            <div className="absolute inset-0 rounded-2xl bg-cyan-400 blur-xl opacity-20 scale-110 pointer-events-none" />
            <button
              onClick={proceed}
              className="relative group flex items-center gap-4 px-8 py-4 rounded-2xl border border-cyan-200/50 bg-cyan-200 text-black font-black text-lg hover:bg-white transition-all shadow-[0_0_44px_rgba(34,211,238,0.34)] hover:-translate-y-1 font-sans"
            >
              <span>Enter Dashboard</span>
              <div className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-all">
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-6 font-sans" style={{ animation: 'fadeUp 0.7s 650ms both' }}>
            Press <kbd className="px-1.5 py-0.5 rounded-md border border-white/10 bg-white/5 text-slate-400 text-[10px] font-mono">Enter</kbd> to continue
          </p>

          <p className="text-xs text-slate-600 mt-8 font-sans" style={{ animation: 'fadeUp 0.7s 750ms both' }}>
            © 2026 All Rights Reserved · TalentIQ
          </p>
        </div>

        <KeyboardEnter onEnter={proceed} />
        <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }`}</style>
      </div>
    </div>
  )
}

function KeyboardEnter({ onEnter }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Enter') onEnter() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onEnter])
  return null
}
