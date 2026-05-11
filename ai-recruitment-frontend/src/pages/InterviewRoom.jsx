import React from 'react'
import { AlertTriangle, BrainCircuit, Mic2, Radio, ShieldCheck, Sparkles, UserRound, Video, Wand2, Waves } from 'lucide-react'

const transcript = [
  ['Candidate', 'I led the migration from a monolith to event-driven services and owned the rollout plan.'],
  ['AI', 'Follow-up: ask for measurable latency, incident, and deployment frequency improvements.'],
  ['Panel', 'What tradeoffs did you make between delivery speed and system reliability?'],
  ['Candidate', 'We used feature flags, canary deploys, and a rollback budget agreed with product.'],
]

const signals = [
  ['Integrity Score', '91%', 'Stable gaze, normal answer cadence', 'success'],
  ['Authenticity', '94%', 'Specific ownership and measurable context', 'cyan'],
  ['Originality', '88%', 'Low template overlap detected', 'violet'],
  ['Suspicion Level', 'Low', 'No active behavior anomaly', 'success'],
]

export default function InterviewRoom() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 page-enter">
      {/* Header */}
      <div className="portal-card p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-cyan)' }}>
              <Radio size={15} /> Flagship Module
            </div>
            <h2 className="text-4xl font-black sm:text-5xl" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
              Interview Intelligence Room
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-sm" style={{ color: 'var(--text-secondary)' }}>
              A premium live interview surface for video, transcript, voice waveform, authenticity signals, suspicious behavior alerts, and AI follow-up suggestions.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="btn-ghost"><Mic2 size={16} /> Calibrate</button>
            <button className="btn-primary"><Sparkles size={16} /> Start Session</button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.45fr_0.9fr]">
        {/* Video + Waveform */}
        <div className="portal-card p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { label: 'Candidate video', icon: UserRound, name: 'Aarav Sharma', role: 'Senior Backend Engineer', accent: 'var(--success-text)' },
              { label: 'Panel video', icon: Video, name: null, role: null, accent: 'var(--accent-violet)' },
            ].map(({ label, icon: Icon, name, role, accent }, i) => (
              <div key={i} className="relative aspect-video overflow-hidden rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{label}</div>
                <Icon size={64} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ color: accent }} />
                {name && (
                  <div className="absolute bottom-3 left-3 right-3 rounded-xl p-3" style={{ background: 'var(--modal-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)' }}>
                    <div className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{role}</div>
                  </div>
                )}
                {!name && (
                  <div className="absolute bottom-3 left-3 right-3 grid grid-cols-3 gap-2">
                    {['HR', 'Tech', 'AI'].map(item => (
                      <div key={item} className="rounded-xl py-2 text-center text-xs font-bold" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{item}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-cyan)' }}>
              <Waves size={15} /> Voice Waveform
            </div>
            <div className="flex h-20 items-center gap-0.5 overflow-hidden">
              {Array.from({ length: 88 }).map((_, i) => (
                <div key={i} className="w-1 rounded-full" style={{ height: `${18 + Math.abs(Math.sin(i * 0.55)) * 52}px`, background: 'var(--accent-cyan)', opacity: 0.3 + (i % 7) / 14 }} />
              ))}
            </div>
          </div>
        </div>

        {/* Authenticity Signals */}
        <div className="portal-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={17} style={{ color: 'var(--success-text)' }} />
            <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>Authenticity Indicators</h3>
          </div>
          <div className="space-y-3">
            {signals.map(([label, value, copy, type]) => (
              <div key={label} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</div>
                  <div className="text-xl font-black" style={{ color: type === 'success' ? 'var(--success-text)' : type === 'cyan' ? 'var(--accent-cyan)' : 'var(--accent-violet)', fontFamily: 'Inter, sans-serif' }}>{value}</div>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Transcript */}
        <div className="portal-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <BrainCircuit size={17} style={{ color: 'var(--accent-violet)' }} />
            <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>Live Transcript</h3>
          </div>
          <div className="space-y-3">
            {transcript.map(([speaker, text], i) => (
              <div key={i} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="mb-1 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-cyan)' }}>{speaker}</div>
                <p className="leading-7 text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Follow-ups */}
        <div className="portal-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Wand2 size={17} style={{ color: 'var(--accent-cyan)' }} />
            <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>AI Follow-ups</h3>
          </div>
          {['Ask for one production failure and recovery detail.', 'Probe ownership depth around architecture decisions.', 'Validate team size, timeline, and measurable business result.'].map((item, i) => (
            <div key={item} className="mb-3 rounded-2xl p-4 text-sm leading-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <span className="mr-2 font-bold" style={{ color: 'var(--accent-cyan)', fontFamily: 'Inter, sans-serif' }}>0{i + 1}</span>{item}
            </div>
          ))}
          <div className="mt-4 rounded-2xl p-4" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--warning-text)' }}>
              <AlertTriangle size={15} /> Alert Monitor
            </div>
            <p className="text-sm leading-6" style={{ color: 'var(--warning-text)' }}>No suspicious behavior requiring interruption. Continue monitoring answer specificity.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
