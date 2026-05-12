import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString) {
  if (!dateString) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateString))
}

export function formatRelativeTime(dateString) {
  if (!dateString) return '—'
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m ago`
  
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  
  return formatDate(dateString)
}

export function getScoreColor(score) {
  if (score >= 80) return '#34d399'
  if (score >= 65) return '#5b72f5'
  if (score >= 50) return '#fbbf24'
  return '#f87171'
}

export function getScoreBadge(score) {
  if (score >= 80) return { label: 'Excellent', cls: 'badge-green' }
  if (score >= 65) return { label: 'Good', cls: 'badge-blue' }
  if (score >= 50) return { label: 'Fair', cls: 'badge-yellow' }
  return { label: 'Poor', cls: 'badge-red' }
}

export function getRecommendationLabel(rec) {
  const map = {
    strong_yes: { label: 'Strong Yes', cls: 'badge-green' },
    yes: { label: 'Yes', cls: 'badge-blue' },
    maybe: { label: 'Maybe', cls: 'badge-yellow' },
    no: { label: 'No', cls: 'badge-red' },
  }
  return map[rec] || { label: rec, cls: 'badge-purple' }
}

export function truncate(str, len = 80) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '…' : str
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatExperience(years) {
  if (years === null || years === undefined || years === 0) return null
  const totalMonths = Math.round(years * 12)
  if (totalMonths === 0) return null
  const yrs = Math.floor(totalMonths / 12)
  const mos = totalMonths % 12
  if (yrs === 0) return `${mos} mo${mos !== 1 ? 's' : ''}`
  if (mos === 0) return `${yrs} yr${yrs !== 1 ? 's' : ''}`
  return `${yrs} yr${yrs !== 1 ? 's' : ''} ${mos} mo${mos !== 1 ? 's' : ''}`
}

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
