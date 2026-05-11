import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Briefcase, Zap, TrendingUp, ArrowRight, Clock, Target, Brain, Upload, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'
import { dashboardApi } from '../services/api'
import { formatRelativeTime, getScoreColor, getRecommendationLabel, getInitials, formatExperience } from '../utils/helpers'
import { useAuthStore } from '../store'

function StatCard({ label, value, icon: Icon, trend, gradient, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="portal-card p-5 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend != null && (
          <div
            className="text-xs font-bold px-2 py-1 rounded-lg"
            style={trend > 0
              ? { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }
              : { background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-border)' }
            }
          >
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
        {value}
      </div>
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</div>
    </motion.div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    dashboardApi.getStats()
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const s = stats || {}
  const firstName = user?.full_name?.split(' ')[0] || 'Recruiter'

  return (
    <div className="p-6 page-enter" style={{ minHeight: '100%' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
          Welcome back, {firstName} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Your AI hiring intelligence dashboard</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Candidates"  value={s.total_candidates || 0}       icon={Users}      gradient="from-blue-500 to-cyan-500"    delay={0}   />
        <StatCard label="Active Jobs"        value={s.total_jobs || 0}             icon={Briefcase}  gradient="from-violet-500 to-purple-500" delay={0.08}/>
        <StatCard label="AI Matches"         value={s.total_matches || 0}          icon={Zap}        gradient="from-pink-500 to-rose-500"     delay={0.16}/>
        <StatCard label="Avg Match Score"    value={`${s.avg_match_score || 0}%`}  icon={TrendingUp} gradient="from-amber-500 to-orange-500"  delay={0.24}/>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Top Candidates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="portal-card p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                  Top Matched Candidates
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI-ranked talent pool</p>
              </div>
            </div>
            <Link
              to="/matching"
              className="text-xs font-semibold flex items-center gap-1 transition-colors"
              style={{ color: 'var(--accent-cyan)' }}
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {(s.top_candidates || []).length === 0 ? (
              <div className="text-center py-10">
                <Brain className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No matches yet. Run AI matching first.</p>
              </div>
            ) : (
              (s.top_candidates || []).map((c) => {
                const rec = getRecommendationLabel(c.recommendation)
                const scoreColor = getScoreColor(c.score)
                return (
                  <Link
                    key={c.id}
                    to={`/candidates/${c.id}`}
                    className="flex items-center gap-3 p-3 rounded-2xl transition-all group"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${scoreColor}cc, ${scoreColor})` }}
                    >
                      {getInitials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {(c.skills || []).slice(0, 3).map((sk, j) => (
                          <span key={j} className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>{sk}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-bold" style={{ color: scoreColor }}>{c.score}%</div>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-md"
                        style={rec.cls === 'badge-green'
                          ? { background: 'var(--success-bg)', color: 'var(--success-text)' }
                          : rec.cls === 'badge-blue'
                          ? { background: 'var(--tag-bg)', color: 'var(--tag-text)' }
                          : rec.cls === 'badge-yellow'
                          ? { background: 'var(--warning-bg)', color: 'var(--warning-text)' }
                          : { background: 'var(--error-bg)', color: 'var(--error-text)' }
                        }
                      >
                        {rec.label}
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="portal-card p-5"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>Recent Activity</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Latest updates</p>
            </div>
          </div>

          <div className="space-y-2">
            {(s.recent_activity || []).length === 0 ? (
              <div className="text-center py-10">
                <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent activity</p>
              </div>
            ) : (
              (s.recent_activity || []).map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-2xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: item.type === 'job_created' ? 'var(--accent-violet)' : 'var(--accent-cyan)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{item.message}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatRelativeTime(item.time)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-4 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
            <Link to="/upload" className="btn-primary flex-1 text-xs h-9">
              <Upload size={13} /> Upload CV
            </Link>
            <Link to="/jobs" className="btn-ghost flex-1 text-xs h-9">
              Add Job
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {[
          { to: '/matching', icon: Zap,    gradient: 'from-blue-500 to-cyan-500',    title: 'Run AI Matching',  desc: 'Match candidates to jobs using AI intelligence',    cta: 'Start matching',  ctaColor: 'var(--accent-cyan)' },
          { to: '/chat',     icon: Brain,  gradient: 'from-violet-500 to-purple-500', title: 'AI Assistant',     desc: 'Chat with TalentIQ AI for recruitment insights',    cta: 'Open chat',       ctaColor: 'var(--accent-violet)' },
          { to: '/candidates',icon: Users, gradient: 'from-pink-500 to-rose-500',    title: 'Talent Pool',      desc: 'Browse and manage all your candidates',             cta: 'View candidates', ctaColor: '#f472b6' },
        ].map(({ to, icon: Icon, gradient, title, desc, cta, ctaColor }) => (
          <Link
            key={to}
            to={to}
            className="portal-card p-5 group block"
          >
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg transition-all`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{title}</h3>
            <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
            <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: ctaColor }}>
              {cta} <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  )
}
