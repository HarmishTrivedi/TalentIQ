import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, Briefcase, Zap, TrendingUp, ArrowRight, Clock, 
  Target, Brain, Upload, BarChart3, Plus, Calendar,
  MoreVertical, Filter, Activity, CheckCircle, Send, FileText
} from 'lucide-react'
import { motion } from 'framer-motion'
import { dashboardApi } from '../services/api'
import { 
  formatRelativeTime, getScoreColor, getRecommendationLabel, 
  getInitials, formatExperience 
} from '../utils/helpers'
import { useAuthStore } from '../store'

function StatCard({ label, value, icon: Icon, trend, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="kpi-card"
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-outline">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-display">{value}</span>
        {trend != null && (
          <span className={`text-[10px] font-bold ${trend >= 0 ? 'text-tertiary' : 'text-error'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="page-enter">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-1">Good morning, {firstName}</h2>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-primary-container text-on-primary-container text-[11px] font-bold rounded-full uppercase tracking-widest">
              {user?.role || 'Recruiting Lead'}
            </span>
            <span className="text-on-surface-variant text-sm opacity-70">
              You have {s.total_matches || 0} smart matches to review today.
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link to="/calendar" className="btn-secondary flex items-center gap-2">
            <Calendar size={18} />
            <span>Calendar View</span>
          </Link>
          <Link to="/ai-sourcing" className="btn-ai flex items-center gap-2">
            <Sparkles size={18} />
            <span>AI Sourcing Assist</span>
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Openings"   value={s.total_jobs || 0}       delay={0} />
        <StatCard label="Candidates"        value={s.total_candidates || 0} delay={0.05} />
        <StatCard label="AI Matches"        value={s.total_matches || 0}    delay={0.15} />
        <StatCard label="Avg. Match"        value={`${s.avg_match_score || 0}%`} delay={0.2} />
      </div>

      {/* Main Bento Grid */}
      <div className="bento-grid">
        {/* Pipeline Snapshot (Span 8) */}
        <div className="col-span-12 lg:col-span-8 portal-card flex flex-col">
          <div className="p-6 border-b border-outline-variant flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Pipeline Snapshot</h3>
              <p className="text-xs text-on-surface-variant">Core hiring metrics across active roles</p>
            </div>
            <Link to="/jobs" className="text-primary text-xs font-bold hover:underline">View All Openings</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="stitch-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Candidates</th>
                  <th>Matches</th>
                  <th>Interview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {(s.top_jobs || []).length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-on-surface-variant opacity-50">
                      No active pipelines found
                    </td>
                  </tr>
                ) : (
                  (s.top_jobs || []).map((job, idx) => (
                    <tr key={job.id} className="group">
                      <td>
                        <Link to={`/jobs/${job.id}`} className="flex flex-col">
                          <span className="font-semibold text-primary group-hover:underline">{job.title}</span>
                          <span className="text-[10px] text-outline font-mono uppercase">ID: #{job.id.slice(0, 8)}</span>
                        </Link>
                      </td>
                      <td><span className="font-mono text-sm">{job.candidates}</span></td>
                      <td><span className="font-mono text-sm text-primary font-bold">{job.matches}</span></td>
                      <td><span className="font-mono text-sm">{job.interviews}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Widgets (Span 4) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="bg-primary-container p-6 rounded-xl text-on-primary-container shadow-sm flex flex-col gap-4">
            <h3 className="text-lg font-bold">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                { to: '/jobs', icon: Plus, label: 'Create Job' },
                { to: '/upload', icon: Upload, label: 'Upload CV' },
                { to: '/candidates', icon: Target, label: 'Run Match' }
              ].map((act, i) => (
                <Link 
                  key={i} 
                  to={act.to}
                  className="w-full flex items-center justify-between p-3 bg-surface-container-lowest rounded-lg hover:bg-white transition-all group border border-transparent hover:border-primary-fixed"
                >
                  <div className="flex items-center gap-3">
                    <act.icon size={18} className="text-primary" />
                    <span className="text-sm font-semibold text-on-surface">{act.label}</span>
                  </div>
                  <ArrowRight size={14} className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity Feed (Span 4) */}
        <div className="col-span-12 lg:col-span-4 portal-card flex flex-col">
          <div className="p-6 border-b border-outline-variant flex items-center justify-between">
            <h3 className="text-xl font-bold">Recent Activity</h3>
            <Activity size={16} className="text-outline opacity-50" />
          </div>
          <div className="p-6 relative flex-1">
            <div className="absolute left-[35px] top-8 bottom-8 w-[1px] bg-outline-variant opacity-50"></div>
            <div className="flex flex-col gap-6 relative">
              {(s.recent_activity || []).slice(0, 4).map((item, i) => {
                let Icon = Activity;
                let color = 'bg-primary';
                if (item.type === 'job_created') { Icon = Briefcase; color = 'bg-violet-500'; }
                if (item.type === 'candidate_uploaded') { Icon = Users; color = 'bg-tertiary'; }
                
                return (
                  <div key={i} className="flex gap-4 items-start group">
                    <div className={`z-10 w-8 h-8 rounded-full ${color} flex items-center justify-center text-white ring-4 ring-surface-container-lowest shadow-sm transition-transform group-hover:scale-110`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-xs leading-relaxed font-medium">
                        {item.message}
                      </p>
                      <span className="text-[10px] text-outline font-bold uppercase tracking-wider">
                        {formatRelativeTime(item.time)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            <button className="w-full mt-8 py-2 text-primary font-bold text-xs border border-primary/10 rounded-lg hover:bg-surface-container transition-all">
              View All Activity
            </button>
          </div>
        </div>

        {/* Top Matches Section (Span 8) */}
        <div className="col-span-12 lg:col-span-8 portal-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Top Matched Candidates</h3>
            <Link to="/matching" className="btn-secondary flex items-center gap-2">
              <span>View rankings</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(s.top_candidates || []).map((c, i) => {
              const rec = getRecommendationLabel(c.recommendation)
              const scoreColor = getScoreColor(c.score)
              return (
                <Link
                  key={c.id}
                  to={`/candidates/${c.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-outline-variant hover:border-primary hover:bg-surface-container-low transition-all group"
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}dd)` }}
                  >
                    {getInitials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                      {c.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
                      {(c.skills || []).slice(0, 2).map((sk, j) => (
                        <span key={j} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant whitespace-nowrap">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold font-display" style={{ color: scoreColor }}>
                      {c.score}%
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-outline">
                      Match
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
