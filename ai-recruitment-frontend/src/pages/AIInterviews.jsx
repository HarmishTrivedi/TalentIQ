import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Video, Brain, User, Clock, Play, Eye, TrendingUp, Activity, Zap, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { EmptyState } from '../components/ui'

export default function AIInterviews() {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLiveInterviews()
    const interval = setInterval(loadLiveInterviews, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadLiveInterviews = async () => {
    try {
      const [inProgressRes, completedRes] = await Promise.all([
        api.get('/interviews', { params: { status: 'in_progress' } }),
        api.get('/interviews', { params: { status: 'completed' } }),
      ])
      setInterviews([...inProgressRes.data, ...completedRes.data.slice(0, 5)])
    } catch {
      toast.error('Failed to load interviews')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (startedAt, endedAt) => {
    if (!startedAt) return 'Not started'
    const start = new Date(startedAt)
    const end = endedAt ? new Date(endedAt) : new Date()
    const diffMinutes = Math.floor((end - start) / 1000 / 60)
    if (diffMinutes < 60) return `${diffMinutes} min`
    const hours = Math.floor(diffMinutes / 60)
    const mins = diffMinutes % 60
    return `${hours}h ${mins}m`
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-tertiary'
    if (score >= 60) return 'text-primary'
    return 'text-error'
  }

  const liveCount = interviews.filter(i => i.status === 'in_progress').length
  const completedCount = interviews.filter(i => i.status === 'completed').length

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-1 flex items-center gap-3">
            <Brain size={28} className="text-primary" />
            AI Interview Intelligence
          </h2>
          <p className="text-sm text-on-surface-variant opacity-70">Live interview sessions with real-time AI analysis</p>
        </div>
        <button
          onClick={loadLiveInterviews}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="kpi-card border-l-4 border-l-tertiary">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-outline">Live Now</p>
            <Activity size={18} className="text-tertiary animate-pulse" />
          </div>
          <p className="text-3xl font-black text-on-surface">{liveCount}</p>
          <p className="text-xs text-on-surface-variant">Active sessions</p>
        </div>
        <div className="kpi-card border-l-4 border-l-primary">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-outline">Completed Today</p>
            <TrendingUp size={18} className="text-primary" />
          </div>
          <p className="text-3xl font-black text-on-surface">{completedCount}</p>
          <p className="text-xs text-on-surface-variant">Interviews done</p>
        </div>
        <div className="kpi-card border-l-4 border-l-secondary">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-outline">AI Insights</p>
            <Zap size={18} className="text-secondary" />
          </div>
          <p className="text-3xl font-black text-on-surface">Active</p>
          <p className="text-xs text-on-surface-variant">Analysis engine running</p>
        </div>
      </div>

      {/* Interviews List */}
      {loading ? (
        <div className="portal-card p-20 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-outline">Loading AI interviews...</p>
        </div>
      ) : interviews.length === 0 ? (
        <div className="portal-card p-8">
          <EmptyState
            icon={Video}
            title="No active interviews"
            description="Live interviews will appear here automatically when sessions begin."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {interviews.map((interview, index) => (
            <motion.div
              key={interview.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
              className={`portal-card p-6 ${interview.status === 'in_progress' ? 'border-l-4 border-l-tertiary' : ''}`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-on-surface mb-1 truncate">{interview.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <User size={14} className="text-outline opacity-60" />
                    <span>{interview.candidate?.name || 'Unknown Candidate'}</span>
                  </div>
                </div>
                {interview.status === 'in_progress' && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-tertiary/10 rounded-full border border-tertiary/20 ml-3 shrink-0">
                    <div className="w-2 h-2 bg-tertiary rounded-full animate-pulse" />
                    <span className="text-tertiary text-[11px] font-black uppercase tracking-wider">Live</span>
                  </div>
                )}
                {interview.status === 'completed' && (
                  <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20 ml-3 shrink-0">
                    <span className="text-primary text-[11px] font-black uppercase tracking-wider">Completed</span>
                  </div>
                )}
              </div>

              {/* Duration */}
              <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
                <Clock size={14} className="text-outline opacity-60" />
                <span>Duration: {formatDuration(interview.started_at, interview.ended_at)}</span>
              </div>

              {/* Scores */}
              {interview.status === 'completed' && interview.overall_score && (
                <div className="grid grid-cols-4 gap-3 mb-4 p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                  {[
                    { val: interview.overall_score, label: 'Overall' },
                    { val: interview.technical_score, label: 'Technical' },
                    { val: interview.communication_score, label: 'Comm' },
                    { val: interview.confidence_score, label: 'Confidence' },
                  ].filter(s => s.val).map(({ val, label }) => (
                    <div key={label} className="text-center">
                      <div className={`text-xl font-black ${getScoreColor(val)}`}>{Math.round(val)}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-outline mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Live AI Badge */}
              {interview.status === 'in_progress' && (
                <div className="ai-glass mb-4 flex items-center gap-3">
                  <Brain size={16} className="text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-on-surface">Live AI Analysis Active</p>
                    <p className="text-[11px] text-on-surface-variant">Real-time analysis in progress. Join to see detailed insights.</p>
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="pt-4 border-t border-outline-variant">
                {interview.status === 'in_progress' && (
                  <button
                    onClick={() => {
                      if (interview.recruiter_meeting_url) window.open(interview.recruiter_meeting_url, '_blank')
                      else navigate(`/interview-room/${interview.id}`)
                    }}
                    className="w-full btn-primary py-3 justify-center"
                  >
                    <Play size={16} />
                    Join Interview
                  </button>
                )}
                {interview.status === 'completed' && (
                  <button
                    onClick={() => {
                      if (interview.recruiter_meeting_url) {
                        const reportUrl = interview.recruiter_meeting_url.includes('?')
                          ? interview.recruiter_meeting_url.replace('/interview/', '/report/')
                          : `${interview.recruiter_meeting_url}/report`
                        window.open(reportUrl, '_blank')
                      } else {
                        navigate(`/interviews/${interview.id}/analysis`)
                      }
                    }}
                    className="w-full btn-secondary py-3 flex items-center justify-center gap-2 font-semibold"
                  >
                    <Eye size={16} />
                    View AI Analysis
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
