import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, Lock, Zap, Users, MessageSquare, X } from 'lucide-react'
import { useAppStore } from '../../store'

export default function DemoPopup() {
  const navigate = useNavigate()
  const { showUpgradePopup, setShowUpgradePopup } = useAppStore()

  if (!showUpgradePopup) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}>

      <div className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #12132a, #1a1b2e)',
          border: '1px solid rgba(91,114,245,0.35)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(91,114,245,0.1)',
          animation: 'popIn 0.3s cubic-bezier(0.16,1,0.3,1)'
        }}>

        {/* Top accent line */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #5b72f5, #a78bfa, #34d399)' }} />

        {/* Dismiss button — only minimizes, popup comes back on next service */}
        <button onClick={() => setShowUpgradePopup(false)}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/05 transition-all"
          title="Dismiss (will reappear on next service)">
          <X size={14} />
        </button>

        <div className="p-7">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #5b72f5, #a78bfa)' }}>
              <Lock size={22} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-xl leading-tight">Demo Limit Reached</div>
              <div className="text-white/40 text-sm mt-0.5">You've used your 1 free demo service</div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px my-5" style={{ background: 'rgba(255,255,255,0.06)' }} />

          {/* Locked features */}
          <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-3">Unlock with a free account</p>
          <div className="space-y-2 mb-6">
            {[
              { icon: Zap, label: 'Unlimited AI Matching' },
              { icon: Users, label: 'Full Candidate Management' },
              { icon: MessageSquare, label: 'AI Screening Chat' },
              { icon: Sparkles, label: 'CV Processing & Analytics' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Icon size={15} style={{ color: '#5b72f5' }} />
                <span className="text-sm text-white/60 flex-1">{label}</span>
                <Lock size={11} className="text-white/15" />
              </div>
            ))}
          </div>

          {/* CTAs */}
          <button
            onClick={() => { setShowUpgradePopup(false); navigate('/register') }}
            className="w-full h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-100"
            style={{ background: 'linear-gradient(135deg, #5b72f5, #7c5af5)', boxShadow: '0 4px 24px rgba(91,114,245,0.45)' }}>
            <Sparkles size={16} /> Create Free Account <ArrowRight size={15} />
          </button>

          <button
            onClick={() => { setShowUpgradePopup(false); navigate('/admin/login') }}
            className="w-full h-10 rounded-xl text-sm text-white/35 hover:text-white/60 transition-colors mt-2">
            Already have an account? Sign in →
          </button>
        </div>
      </div>

      <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.9) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  )
}
