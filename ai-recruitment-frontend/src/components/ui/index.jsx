import React from 'react'
import { cn, getScoreColor } from '../../utils/helpers'
import { Loader2, AlertCircle, Trash2, X } from 'lucide-react'

export function Spinner({ size = 20, className }) {
  return <Loader2 size={size} className={cn('animate-spin text-primary', className)} />
}

export function ScoreRing({ score, size = 80 }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  const color = getScoreColor(score)
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={6} className="text-surface-container-highest" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-black font-display tracking-tight" style={{ color }}>{score}</div>
      </div>
    </div>
  )
}

export function ScoreBar({ score, label, className }) {
  const color = getScoreColor(score)
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-outline">{label}</span>
          <span className="text-xs font-black font-display" style={{ color }}>{Math.round(score)}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden shadow-inner">
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }} />
      </div>
    </div>
  )
}

export function Badge({ children, variant = 'blue' }) {
  const styles = {
    blue: 'bg-primary/5 text-primary border-primary/20',
    green: 'bg-tertiary/10 text-tertiary border-tertiary/20',
    yellow: 'bg-amber-400/10 text-amber-500 border-amber-400/20',
    red: 'bg-error/5 text-error border-error/20',
    purple: 'bg-secondary/5 text-secondary border-secondary/20',
  }
  return (
    <span className={cn(
      'px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border',
      styles[variant] || styles.blue
    )}>
      {children}
    </span>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center animate-fadeIn">
      <div className="w-20 h-20 rounded-[32px] bg-surface-container border border-outline-variant flex items-center justify-center mb-6 shadow-inner">
        <Icon size={32} className="text-primary opacity-20" />
      </div>
      <h3 className="text-xl font-bold text-on-surface mb-2">{title}</h3>
      <p className="text-sm text-outline max-w-sm font-medium leading-relaxed mb-8">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="portal-card p-6 space-y-5 bg-surface-container-lowest animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-surface-container" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-surface-container" />
          <div className="h-3 w-20 rounded bg-surface-container" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-surface-container" />
        <div className="h-3 w-3/4 rounded bg-surface-container" />
      </div>
    </div>
  )
}

export function TagList({ tags = [], max = 6, variant = 'blue' }) {
  const visible = tags.slice(0, max)
  const extra = tags.length - max
  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((tag, i) => <Badge key={i} variant={variant}>{tag}</Badge>)}
      {extra > 0 && <Badge variant="purple">+{extra}</Badge>}
    </div>
  )
}

export function SectionHeader({ title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
      <div>
        <h2 className="text-2xl font-bold text-on-surface">{title}</h2>
        {description && <p className="text-sm text-on-surface-variant font-medium opacity-70 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ConfirmationModal({ isOpen, onClose, onConfirm, title = 'Confirm Action', message, confirmText = 'Execute Change', cancelText = 'Discard', variant = 'danger', loading = false }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-md transition-all" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-[32px] p-10 shadow-2xl animate-enter">
        <div className="flex flex-col items-center text-center">
          <div className={cn(
             "w-16 h-16 rounded-[24px] flex items-center justify-center mb-6 shadow-lg transition-transform",
             variant === 'danger' ? "bg-error/10 text-error shadow-error/10" : "bg-primary/10 text-primary shadow-primary/10"
          )}>
            {variant === 'danger' ? <Trash2 size={30} /> : <AlertCircle size={30} />}
          </div>
          <h3 className="text-2xl font-bold text-on-surface mb-2">{title}</h3>
          <p className="text-sm text-on-surface-variant font-medium leading-relaxed mb-10">{message || 'This operation will modify permanent database records.'}</p>
          <div className="flex gap-4 w-full">
            <button onClick={onClose} disabled={loading} className="btn-secondary flex-1 py-3 font-bold">{cancelText}</button>
            <button 
              onClick={onConfirm} 
              disabled={loading} 
              className={cn(
                "flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-md active:scale-95",
                variant === 'danger' ? "bg-error hover:bg-error/90" : "bg-primary hover:bg-primary/90"
              )}
            >
              {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
