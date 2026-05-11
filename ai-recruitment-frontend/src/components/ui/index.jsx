import React from 'react'
import { cn, getScoreColor } from '../../utils/helpers'
import { Loader2, AlertCircle, Trash2 } from 'lucide-react'

export function Spinner({ size = 20, className }) {
  return <Loader2 size={size} className={cn('animate-spin', className)} style={{ color: 'var(--accent-cyan)' }} />
}

export function ScoreRing({ score, size = 80 }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  const color = getScoreColor(score)
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-bold" style={{ color, fontFamily: 'Inter, sans-serif' }}>{score}</div>
      </div>
    </div>
  )
}

export function ScoreBar({ score, label, className }) {
  const color = getScoreColor(score)
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className="flex justify-between items-center text-xs">
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span className="font-semibold" style={{ color }}>{Math.round(score)}%</span>
        </div>
      )}
      <div className="score-bar">
        <div className="score-fill" style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }} />
      </div>
    </div>
  )
}

export function Badge({ children, variant = 'blue' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
        <Icon size={28} style={{ color: 'var(--accent-cyan)' }} />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{title}</h3>
      <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="portal-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl shimmer-bg" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded-lg shimmer-bg" />
          <div className="h-3 w-20 rounded-lg shimmer-bg" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded-lg shimmer-bg" />
        <div className="h-3 w-3/4 rounded-lg shimmer-bg" />
      </div>
    </div>
  )
}

export function TagList({ tags = [], max = 6, variant = 'blue' }) {
  const visible = tags.slice(0, max)
  const extra = tags.length - max
  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((tag, i) => <span key={i} className={`badge badge-${variant} text-[11px]`}>{tag}</span>)}
      {extra > 0 && <span className="badge badge-purple text-[11px]">+{extra}</span>}
    </div>
  )
}

export function SectionHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {description && <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ConfirmationModal({ isOpen, onClose, onConfirm, title = 'Are you sure?', message, confirmText = 'Delete Permanently', cancelText = 'Cancel', variant = 'danger', loading = false }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl p-6 animate-scaleIn" style={{ background: 'var(--modal-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }} onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={variant === 'danger' ? { background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)' } : { background: 'var(--tag-bg)', border: '1px solid var(--tag-border)', color: 'var(--accent-cyan)' }}>
            {variant === 'danger' ? <Trash2 size={26} /> : <AlertCircle size={26} />}
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{title}</h3>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>{message || 'This action cannot be undone.'}</p>
          <div className="flex gap-3 w-full">
            <button onClick={onClose} disabled={loading} className="btn-ghost flex-1">{cancelText}</button>
            <button onClick={onConfirm} disabled={loading} className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-black text-sm transition-all" style={{ background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-border)' }}>
              {loading ? <Spinner size={16} /> : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
