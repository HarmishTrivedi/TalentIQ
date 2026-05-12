import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Play, Brain, Shield, TrendingUp, Users } from 'lucide-react'
import { Starfield } from './Starfield'
import { Link } from 'react-router-dom'

function Vortex() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 h-[1400px] w-[1400px] -translate-x-1/2 -translate-y-1/2 animate-vortex opacity-60">
        <div className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, #0080ff35 60deg, transparent 120deg, #8c1aff40 200deg, transparent 260deg, #65F7FF30 320deg, transparent 360deg)',
            filter: 'blur(60px)',
          }} />
      </div>
      <div className="absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 opacity-50"
        style={{ animation: 'vortex-spin 90s linear infinite reverse' }}>
        <div className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 90deg, transparent, #65F7FF30, transparent, #0080ff40, transparent)',
            filter: 'blur(40px)',
          }} />
      </div>

      <div className="absolute left-[10%] top-[20%] h-[500px] w-[500px] rounded-full animate-drift animate-pulse-glow"
        style={{ background: 'radial-gradient(circle, #0080ff60, transparent 70%)' }} />
      <div className="absolute right-[5%] top-[10%] h-[400px] w-[400px] rounded-full animate-drift animate-pulse-glow"
        style={{ background: 'radial-gradient(circle, #8c1aff60, transparent 70%)', animationDelay: '2s' }} />
      <div className="absolute bottom-[10%] left-[40%] h-[600px] w-[600px] rounded-full animate-drift animate-pulse-glow"
        style={{ background: 'radial-gradient(circle, #65F7FF50, transparent 70%)', animationDelay: '4s' }} />

      <div className="absolute inset-0">
        {[0, 1, 2, 3].map((i) => (
          <span key={i}
            className="absolute left-1/2 top-0 block h-[120%] w-[2px] animate-ray"
            style={{
              background: 'linear-gradient(to bottom, transparent, #65F7FF60, transparent)',
              left: `${20 + i * 20}%`,
              animationDelay: `${i * 1.5}s`,
              filter: 'blur(1px)',
            }} />
        ))}
      </div>

      <Starfield count={120} />

      <div className="absolute inset-x-0 bottom-0 h-[40%]" style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}>
        <div className="absolute inset-0 grid-floor opacity-40"
          style={{ transform: 'rotateX(65deg) translateZ(-100px)', transformOrigin: 'center top' }} />
        <div className="absolute inset-x-0 bottom-0 h-1/2"
          style={{ background: 'linear-gradient(to top, #000000, transparent)' }} />
      </div>
    </div>
  )
}

function HoloDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateY: -15 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative animate-float"
      style={{ transformStyle: 'preserve-3d', perspective: 1500 }}
    >
      <div className="absolute -inset-10 rounded-3xl opacity-60 blur-3xl"
        style={{ background: 'linear-gradient(135deg, #0080ff, #8c1aff)' }} />

      <div className="relative glass-strong rounded-3xl p-6"
        style={{ transform: 'rotateY(-8deg) rotateX(6deg)', boxShadow: '0 0 40px #0080ff66' }}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <span className="font-display text-xs text-white/50">TalentIQ Console</span>
        </div>

        <div className="mb-5 flex items-center gap-4 rounded-2xl glass p-4">
          <div className="relative h-20 w-20">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round"
                stroke="url(#g1)"
                strokeDasharray="264"
                initial={{ strokeDashoffset: 264 }}
                animate={{ strokeDashoffset: 264 - 264 * 0.94 }}
                transition={{ duration: 2, delay: 1 }}
              />
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0080ff" />
                  <stop offset="100%" stopColor="#65F7FF" />
                </linearGradient>
              </defs>
            </svg>
            <div className="font-display absolute inset-0 grid place-items-center text-xl font-bold text-white">94%</div>
          </div>
          <div>
            <div className="font-display text-sm font-semibold text-white">AI Match Score</div>
            <div className="text-xs text-white/50">Sarah Chen · Sr. Engineer</div>
            <div className="mt-1.5 flex gap-1">
              {['React', 'Python', 'ML'].map((t) => (
                <span key={t} className="rounded-md px-1.5 py-0.5 text-[10px]" style={{ background: '#0080ff20', color: '#0080ff' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-5 space-y-2">
          {[
            { n: 'Marcus Lee', s: 91, c: '#65F7FF' },
            { n: 'Aisha Patel', s: 88, c: '#8c1aff' },
          ].map((c, i) => (
            <motion.div
              key={c.n}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 + i * 0.15 }}
              className="flex items-center justify-between rounded-xl glass px-3 py-2"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full"
                  style={{ background: `linear-gradient(135deg, ${c.c}, #0080ff)` }} />
                <span className="text-xs text-white">{c.n}</span>
              </div>
              <span className="font-display text-xs font-bold" style={{ color: '#65F7FF' }}>{c.s}%</span>
            </motion.div>
          ))}
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-xl p-2.5"
          style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>
          <Shield className="h-4 w-4 text-red-400" />
          <span className="text-xs text-white/70">Fraud detected · Resume #1284</span>
        </div>

        <div className="rounded-xl glass p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-white/50">Interview Intelligence</span>
            <TrendingUp className="h-3.5 w-3.5 text-[#65F7FF]" />
          </div>
          <svg viewBox="0 0 200 50" className="h-12 w-full">
            <defs>
              <linearGradient id="ch" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#0080ff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#0080ff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,40 L25,30 L50,35 L75,20 L100,25 L125,12 L150,18 L175,8 L200,10 L200,50 L0,50 Z" fill="url(#ch)" />
            <path d="M0,40 L25,30 L50,35 L75,20 L100,25 L125,12 L150,18 L175,8 L200,10"
              fill="none" stroke="#65F7FF" strokeWidth="2" />
          </svg>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.6 }}
          className="absolute -left-8 top-20 rounded-xl glass-strong p-3"
          style={{ boxShadow: '0 0 30px #0080ff66' }}
        >
          <Brain className="mb-1 h-4 w-4 text-[#65F7FF]" />
          <div className="text-[10px] text-white/50">Skills parsed</div>
          <div className="font-display text-sm font-bold text-white">128</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute -right-6 bottom-24 rounded-xl glass-strong p-3"
          style={{ boxShadow: '0 0 30px #8c1aff80' }}
        >
          <Users className="mb-1 h-4 w-4 text-[#8c1aff]" />
          <div className="text-[10px] text-white/50">Pipeline</div>
          <div className="font-display text-sm font-bold text-white">2,481</div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function Hero() {
  const ref = useRef(null)
  const [parallax, setParallax] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      setParallax({ x: x * 20, y: y * 20 })
    }
    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <section ref={ref} className="relative isolate min-h-screen overflow-hidden pt-32">
      <Vortex />

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 pb-24 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ transform: `translate(${parallax.x * 0.3}px, ${parallax.y * 0.3}px)` }}
        >
          <h1 className="font-display text-[clamp(3rem,7vw,5.75rem)] font-bold leading-[0.95] tracking-tight">
            <span className="text-gradient">The Future of</span>
            <br />
            <span className="relative text-white">
              Intelligent Hiring
              <span aria-hidden className="absolute -inset-x-4 -bottom-2 h-4 blur-2xl opacity-70"
                style={{ background: 'linear-gradient(90deg, #0080ff, #8c1aff, #65F7FF)' }} />
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/60">
            Transform recruitment with AI-powered candidate matching, interview intelligence,
            and fraud detection — all in one cinematic platform.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/register"
              className="group relative overflow-hidden rounded-xl px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.04]"
              style={{ background: 'linear-gradient(135deg, #0080ff, #65F7FF)', boxShadow: '0 0 60px #0080ff70, 0 0 120px #8c1aff40' }}>
              <span className="relative z-10 inline-flex items-center gap-2">
                Start Free Trial <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </Link>
            <a href="#product"
              className="group inline-flex items-center gap-2 rounded-xl glass-strong px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10">
              <Play className="h-4 w-4 fill-current" />
              Watch Demo
            </a>
          </div>

          <div className="mt-14">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/40">
              Trusted by 500+ forward-thinking companies
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 opacity-60">
              {['NEXUS', 'ORBITAL', 'LUMEN', 'ARCFLOW', 'QUANTA', 'VERTEX'].map((c) => (
                <span key={c} className="font-display text-sm font-bold tracking-[0.25em] text-white">{c}</span>
              ))}
            </div>
          </div>
        </motion.div>

        <div
          style={{ transform: `translate(${-parallax.x * 0.6}px, ${-parallax.y * 0.6}px)` }}
          className="relative flex items-center justify-center"
        >
          <HoloDashboard />
        </div>
      </div>
    </section>
  )
}
