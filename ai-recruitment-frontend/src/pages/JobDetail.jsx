import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, Building, MapPin, Clock, Sparkles, TrendingUp, ChevronRight } from 'lucide-react'
import { jobsApi, matchingApi } from '../services/api'
import { Spinner, EmptyState, TagList, Badge, ScoreRing } from '../components/ui'
import { getInitials, getScoreColor, getRecommendationLabel, truncate, formatExperience } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)

  useEffect(() => {
    Promise.all([
      jobsApi.get(id),
      matchingApi.getJobMatches(id).catch(() => ({ data: { results: [] } })),
    ]).then(([jRes, mRes]) => {
      setJob(jRes.data)
      setMatches(mRes.data?.results || [])
    }).finally(() => setLoading(false))
  }, [id])

  const runMatch = async () => {
    setMatching(true)
    try {
      const res = await matchingApi.run({ job_id: id, top_k: 10 })
      setMatches(res.data.results || [])
      toast.success(`Matched ${res.data.total_candidates} candidates!`)
    } catch { toast.error('Matching failed') }
    finally { setMatching(false) }
  }

  if (loading) return <div className="p-6 flex justify-center"><Spinner size={32} /></div>
  if (!job) return <div className="p-6"><EmptyState icon={Zap} title="Job not found" description="" /></div>

  const reqSkills = [...(job.required_skills?.technical || []), ...(job.required_skills?.frameworks || [])]
  const prefSkills = [...(job.preferred_skills?.technical || [])]

  return (
    <div className="p-6 space-y-5 page-enter" style={{ background: 'var(--bg-primary)', minHeight: '100%' }}>
      <div className="flex items-center justify-between">
        <Link to="/jobs" className="flex items-center gap-2 text-sm transition-colors" style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          <ArrowLeft size={16} /> Back to Jobs
        </Link>
        <button onClick={runMatch} disabled={matching} className="btn-primary">
          {matching ? <><Spinner size={14} /> Matching...</> : <><Zap size={14} /> Run AI Match</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          {/* Job Info */}
          <div className="portal-card p-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
              <Zap size={22} style={{ color: 'var(--accent-cyan)' }} />
            </div>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{job.title}</h2>
            <div className="space-y-2 mb-4">
              {job.company && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}><Building size={13} />{job.company}</div>}
              {job.location && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}><MapPin size={13} />{job.location}</div>}
              {job.required_experience_years && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}><Clock size={13} />{job.required_experience_years}+ years</div>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {job.job_type && <Badge variant="blue">{job.job_type}</Badge>}
              <Badge variant={job.status === 'active' ? 'green' : 'yellow'}>{job.status}</Badge>
            </div>
          </div>

          {/* Skills */}
          {reqSkills.length > 0 && (
            <div className="portal-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Required Skills</p>
              <TagList tags={reqSkills} max={15} variant="blue" />
              {prefSkills.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Preferred</p>
                  <TagList tags={prefSkills} max={8} variant="purple" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="portal-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Job Description</p>
            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{job.description}</div>
          </div>

          {/* Match Results */}
          <div className="portal-card p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>Candidate Rankings</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{matches.length} candidates ranked by AI</p>
              </div>
              {matches.length === 0 && (
                <button onClick={runMatch} disabled={matching} className="btn-primary text-sm h-8 px-4">
                  {matching ? <Spinner size={13} /> : <Zap size={13} />}
                  {matching ? 'Running...' : 'Match Now'}
                </button>
              )}
            </div>

            {matches.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No matches yet. Click "Run AI Match" to rank candidates.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {matches.map((m, i) => {
                  const rec = getRecommendationLabel(m.recommendation)
                  const scoreColor = getScoreColor(m.overall_score)
                  return (
                    <Link key={m.id} to={`/candidates/${m.candidate_id}`}
                      className="flex items-center gap-4 p-4 rounded-2xl transition-all group"
                      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}
                    >
                      <div className="text-sm font-bold w-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>#{i + 1}</div>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${scoreColor}cc, ${scoreColor})` }}>
                        {getInitials(m.candidate?.name || '?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.candidate?.name || 'Candidate'}</span>
                          <span className={`badge badge-${rec.cls.replace('badge-', '')} text-xs`}>{rec.label}</span>
                        </div>
                        <div className="score-bar">
                          <div className="score-fill" style={{ width: `${m.overall_score}%`, background: `linear-gradient(90deg, ${scoreColor}80, ${scoreColor})` }} />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold" style={{ color: scoreColor, fontFamily: 'Inter, sans-serif' }}>{Math.round(m.overall_score)}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>/ 100</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
