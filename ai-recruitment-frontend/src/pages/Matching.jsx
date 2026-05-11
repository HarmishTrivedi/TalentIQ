import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ChevronRight, CheckCircle, XCircle, Brain, Sparkles, Target, TrendingUp, Clock, Users, Award, BarChart3, Briefcase } from 'lucide-react'
import { jobsApi, matchingApi } from '../services/api'
import { Spinner, TagList, Badge } from '../components/ui'
import { getInitials, getScoreColor, getRecommendationLabel, formatExperience } from '../utils/helpers'
import toast from 'react-hot-toast'

function ScoreRing({ score, size = 96 }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  const color = getScoreColor(score)
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold" style={{ color, fontFamily: 'Inter, sans-serif' }}>{score}</div>
        <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>score</div>
      </div>
    </div>
  )
}

function AnimatedBar({ score, label, icon: Icon, delay = 0 }) {
  const [width, setWidth] = useState(0)
  const color = getScoreColor(score)
  useEffect(() => { const t = setTimeout(() => setWidth(score), delay + 100); return () => clearTimeout(t) }, [score, delay])
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={11} style={{ color: 'var(--text-muted)' }} />}
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <span className="text-xs font-bold" style={{ color }}>{Math.round(score)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)', boxShadow: `0 0 8px ${color}50` }} />
      </div>
    </div>
  )
}

function AILoader() {
  const steps = ['Parsing job requirements...', 'Vectorizing candidate profiles...', 'Running semantic analysis...', 'Scoring with LLM...', 'Ranking results...']
  const [step, setStep] = useState(0)
  useEffect(() => { const t = setInterval(() => setStep(s => (s + 1) % steps.length), 1800); return () => clearInterval(t) }, [])
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-8">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: 'var(--accent-cyan)', opacity: 0.3 }} />
        <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
          <Brain size={24} style={{ color: 'var(--accent-cyan)' }} className="animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>AI Matching in Progress</p>
        <p className="text-xs animate-pulse" style={{ color: 'var(--accent-cyan)' }}>{steps[step]}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This may take 30–60 seconds</p>
      </div>
      <div className="flex gap-1.5">
        {[0,1,2,3,4].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-cyan)', animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
        ))}
      </div>
    </div>
  )
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>🥇 #1</span>
  if (rank === 2) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>🥈 #2</span>
  if (rank === 3) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}>🥉 #3</span>
  return <span className="text-[10px] font-bold w-5" style={{ color: 'var(--text-muted)' }}>#{rank}</span>
}

export default function Matching() {
  const [jobs, setJobs]                 = useState([])
  const [selectedJob, setSelectedJob]   = useState(null)
  const [results, setResults]           = useState([])
  const [loading, setLoading]           = useState(false)
  const [jobsLoading, setJobsLoading]   = useState(true)
  const [activeResult, setActiveResult] = useState(null)
  const [processingTime, setProcessingTime] = useState(null)

  useEffect(() => {
    jobsApi.list({ page_size: 50 }).then(res => {
      setJobs(res.data.jobs || [])
      if (res.data.jobs?.length > 0) setSelectedJob(res.data.jobs[0])
    }).finally(() => setJobsLoading(false))
  }, [])

  const runMatch = async () => {
    if (!selectedJob) return
    setLoading(true); setResults([]); setActiveResult(null)
    try {
      const res = await matchingApi.run({ job_id: selectedJob.id, top_k: 15 })
      setResults(res.data.results || [])
      setProcessingTime(res.data.processing_time_ms)
      if (res.data.results?.length > 0) setActiveResult(res.data.results[0])
      toast.success(`Matched ${res.data.total_candidates} candidates in ${(res.data.processing_time_ms / 1000).toFixed(1)}s`)
    } catch { toast.error('Matching failed') }
    finally { setLoading(false) }
  }

  const loadExisting = async (job) => {
    setSelectedJob(job); setResults([]); setActiveResult(null)
    try {
      const res = await matchingApi.getJobMatches(job.id)
      const r = res.data?.results || []
      setResults(r)
      if (r.length > 0) setActiveResult(r[0])
    } catch {}
  }

  if (jobsLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={32} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading jobs...</p>
      </div>
    </div>
  )

  const rec = activeResult ? getRecommendationLabel(activeResult.recommendation) : null

  return (
    <div className="flex h-full overflow-hidden page-enter" style={{ background: 'var(--bg-primary)' }}>

      {/* Jobs Sidebar */}
      <div className="w-60 flex-shrink-0 border-r flex flex-col overflow-hidden" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
        <div className="p-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-0.5">
            <Briefcase size={13} style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Job Positions</p>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{jobs.length} available</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {jobs.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>No jobs yet.</p>
              <Link to="/jobs" className="text-xs font-semibold" style={{ color: 'var(--accent-cyan)' }}>Create one →</Link>
            </div>
          ) : jobs.map(job => {
            const isActive = selectedJob?.id === job.id
            return (
              <button key={job.id} onClick={() => loadExisting(job)}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all"
                style={isActive
                  ? { background: 'var(--tag-bg)', border: '1px solid var(--tag-border)', color: 'var(--accent-cyan)' }
                  : { border: '1px solid transparent', color: 'var(--text-secondary)' }
                }
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
              >
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: isActive ? 'var(--accent-cyan)' : 'var(--bg-card-hover)' }}>
                    <Briefcase size={11} style={{ color: isActive ? '#000' : 'var(--text-muted)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate text-xs">{job.title}</div>
                    {job.company && <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{job.company}</div>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Action Bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b" style={{ background: 'var(--topbar-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-3">
            {selectedJob ? (
              <>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <Target size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{selectedJob.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedJob.company || 'No company'}</span>
                    {results.length > 0 && <><span style={{ color: 'var(--border)' }}>·</span><span className="text-xs font-semibold" style={{ color: 'var(--accent-cyan)' }}>{results.length} ranked</span></>}
                  </div>
                </div>
              </>
            ) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a job to start matching</p>}
          </div>
          <div className="flex items-center gap-3">
            {processingTime && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
                <Clock size={11} style={{ color: 'var(--success-text)' }} />
                <span className="text-xs font-semibold font-mono" style={{ color: 'var(--success-text)' }}>{(processingTime / 1000).toFixed(1)}s</span>
              </div>
            )}
            <button onClick={runMatch} disabled={!selectedJob || loading} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? <><Spinner size={14} /><span>Running AI...</span></> : <><Sparkles size={14} /><span>Run AI Match</span></>}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 flex overflow-hidden">

          {/* Candidates List */}
          <div className="w-68 flex-shrink-0 border-r overflow-y-auto" style={{ width: 272, background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            {loading ? <AILoader /> : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
                  <Brain size={24} style={{ color: 'var(--accent-cyan)' }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>Ready to Match</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>Click "Run AI Match" to rank all candidates against this job.</p>
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  <div className="flex items-center gap-1.5">
                    <Users size={12} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{results.length} Candidates</span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Ranked by AI</span>
                </div>
                <div className="p-2 space-y-1">
                  {results.map((r, i) => {
                    const scoreColor = getScoreColor(r.overall_score)
                    const isActive = activeResult?.id === r.id
                    return (
                      <button key={r.id} onClick={() => setActiveResult(r)}
                        className="w-full text-left p-3 rounded-xl transition-all"
                        style={isActive
                          ? { background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }
                          : { border: '1px solid transparent' }
                        }
                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)' } }}
                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' } }}
                      >
                        <div className="flex items-center gap-2">
                          <RankBadge rank={i + 1} />
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${scoreColor}cc, ${scoreColor})` }}>
                            {getInitials(r.candidate?.name || '?')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{r.candidate?.name || 'Unknown'}</div>
                            <div className="h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: 'var(--border)' }}>
                              <div style={{ height: '100%', borderRadius: 9999, width: `${r.overall_score}%`, background: `linear-gradient(90deg, ${scoreColor}80, ${scoreColor})`, transition: 'width 0.8s ease' }} />
                            </div>
                          </div>
                          <div className="text-sm font-bold flex-shrink-0" style={{ color: scoreColor }}>{Math.round(r.overall_score)}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Detail Panel */}
          <div className="flex-1 overflow-y-auto p-5" style={{ background: 'var(--bg-primary)' }}>
            {!activeResult ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <BarChart3 size={28} style={{ color: 'var(--accent-cyan)' }} />
                </div>
                <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>Select a Candidate</p>
                <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>Click any ranked candidate to view their full AI analysis.</p>
              </div>
            ) : (
              <div className="space-y-4 max-w-2xl animate-enter">

                {/* Header */}
                <div className="portal-card overflow-hidden">
                  <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${getScoreColor(activeResult.overall_score)}, ${getScoreColor(activeResult.overall_score)}60)` }} />
                  <div className="p-5 flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${getScoreColor(activeResult.overall_score)}cc, ${getScoreColor(activeResult.overall_score)})` }}>
                      {getInitials(activeResult.candidate?.name || '?')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{activeResult.candidate?.name}</h3>
                        {rec && <span className={`badge badge-${rec.cls.replace('badge-', '')}`}>{rec.label}</span>}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                          <TrendingUp size={11} /> {formatExperience(activeResult.candidate?.experience_years) || '? exp'}
                        </span>
                        {activeResult.candidate?.email && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{activeResult.candidate.email}</span>}
                      </div>
                    </div>
                    <Link to={`/candidates/${activeResult.candidate_id}`} className="btn-ghost text-xs flex-shrink-0">
                      Full Profile <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="portal-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--tag-bg)' }}>
                      <Award size={13} style={{ color: 'var(--accent-cyan)' }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>AI Score Breakdown</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <ScoreRing score={Math.round(activeResult.overall_score)} size={96} />
                    <div className="flex-1 space-y-3">
                      <AnimatedBar score={activeResult.skill_match_score}         label="Skill Match"   icon={Target}    delay={0}   />
                      <AnimatedBar score={activeResult.experience_match_score}    label="Experience"    icon={TrendingUp} delay={100} />
                      <AnimatedBar score={activeResult.semantic_similarity_score} label="Semantic Fit"  icon={Brain}     delay={200} />
                      <AnimatedBar score={activeResult.llm_evaluation_score}      label="AI Evaluation" icon={Sparkles}  delay={300} />
                    </div>
                  </div>
                  {activeResult.explanation && (
                    <div className="mt-4 p-3.5 rounded-2xl" style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
                      <div className="flex items-start gap-2">
                        <Brain size={13} style={{ color: 'var(--accent-cyan)' }} className="mt-0.5 flex-shrink-0" />
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{activeResult.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Strengths & Gaps */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="portal-card p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <CheckCircle size={13} style={{ color: 'var(--success-text)' }} />
                      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--success-text)' }}>Strengths</p>
                    </div>
                    <ul className="space-y-2">
                      {(activeResult.strengths || []).map((s, i) => (
                        <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                          <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-bold" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>✓</span>
                          {s}
                        </li>
                      ))}
                      {!(activeResult.strengths?.length) && <li className="text-xs italic" style={{ color: 'var(--text-muted)' }}>None listed</li>}
                    </ul>
                  </div>
                  <div className="portal-card p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <XCircle size={13} style={{ color: 'var(--error-text)' }} />
                      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--error-text)' }}>Gaps</p>
                    </div>
                    <ul className="space-y-2">
                      {(activeResult.weaknesses || []).map((w, i) => (
                        <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                          <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-bold" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>✗</span>
                          {w}
                        </li>
                      ))}
                      {!(activeResult.weaknesses?.length) && <li className="text-xs italic" style={{ color: 'var(--text-muted)' }}>None listed</li>}
                    </ul>
                  </div>
                </div>

                {/* Skills */}
                {(activeResult.matched_skills?.length > 0 || activeResult.missing_skills?.length > 0) && (
                  <div className="grid grid-cols-2 gap-4">
                    {activeResult.matched_skills?.length > 0 && (
                      <div className="portal-card p-4">
                        <div className="flex items-center gap-1.5 mb-3">
                          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success-text)' }} />
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Matched Skills</p>
                          <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>{activeResult.matched_skills.length}</span>
                        </div>
                        <TagList tags={activeResult.matched_skills} max={10} variant="green" />
                      </div>
                    )}
                    {activeResult.missing_skills?.length > 0 && (
                      <div className="portal-card p-4">
                        <div className="flex items-center gap-1.5 mb-3">
                          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--error-text)' }} />
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Missing Skills</p>
                          <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}>{activeResult.missing_skills.length}</span>
                        </div>
                        <TagList tags={activeResult.missing_skills} max={10} variant="red" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
