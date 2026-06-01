import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sparkles, CheckCircle, XCircle, Brain, Target, TrendingUp,
  Clock, Users, Award, BarChart3, Briefcase, ArrowRight
} from 'lucide-react'
import { jobsApi, matchingApi } from '../services/api'
import { Spinner } from '../components/ui'
import { getInitials, getScoreColor, getRecommendationLabel, formatExperience, cn } from '../utils/helpers'
import toast from 'react-hot-toast'

function ScoreRing({ score, size = 120 }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  const color = getScoreColor(score)
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--tw-color-outline-variant, #c3c6d7)" strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold font-display" style={{ color }}>{score}</div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-outline">score</div>
      </div>
    </div>
  )
}

function AnimatedBar({ score, label, icon: Icon, delay = 0 }) {
  const [width, setWidth] = useState(0)
  const color = getScoreColor(score)
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), delay + 100)
    return () => clearTimeout(t)
  }, [score, delay])
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={12} className="text-outline" />}
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-xs font-bold font-mono" style={{ color }}>{Math.round(score)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-surface-container border border-outline-variant">
        <div className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  )
}

function AILoader() {
  const steps = ['Synthesizing job requirements...', 'Mapping candidate vectors...', 'Semantic analysis...', 'Cross-referencing experience...', 'LLM evaluation cycle...']
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 1800)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-8">
      <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Brain size={28} className="text-primary animate-pulse" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-bold text-on-surface">AI Ranking Engine Active</p>
        <p className="text-[11px] font-semibold text-primary animate-pulse">{steps[step]}</p>
      </div>
      <div className="flex gap-1.5">
        {[0,1,2,3,4].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40"
            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
        ))}
      </div>
    </div>
  )
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200">#1 TOP</span>
  if (rank === 2) return <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-surface-container text-outline border border-outline-variant">#2</span>
  if (rank === 3) return <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-orange-50 text-orange-500 border border-orange-200">#3</span>
  return <span className="text-[10px] font-bold text-outline w-6">#{rank}</span>
}

export default function Matching() {
  const [jobs, setJobs]                   = useState([])
  const [selectedJob, setSelectedJob]     = useState(null)
  const [results, setResults]             = useState([])
  const [loading, setLoading]             = useState(false)
  const [jobsLoading, setJobsLoading]     = useState(true)
  const [activeResult, setActiveResult]   = useState(null)
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
        <Spinner size={28} />
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Loading jobs...</p>
      </div>
    </div>
  )

  const rec = activeResult ? getRecommendationLabel(activeResult.recommendation) : null

  return (
    <div className="flex h-full overflow-hidden page-enter">

      {/* ── Jobs Sidebar ── */}
      <div className="w-64 flex-shrink-0 border-r border-outline-variant flex flex-col overflow-hidden bg-surface-container-lowest">
        <div className="p-5 border-b border-outline-variant flex-shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Open Roles</p>
          <p className="text-sm font-bold text-on-surface">{jobs.length} Active Pipelines</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {jobs.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-xs text-on-surface-variant">No active roles.</p>
              <Link to="/jobs" className="h-9 px-4 rounded-lg bg-primary text-white font-bold text-xs flex items-center justify-center hover:bg-primary-container transition-all">
                Post Role
              </Link>
            </div>
          ) : jobs.map(job => {
            const isActive = selectedJob?.id === job.id
            return (
              <button key={job.id} onClick={() => loadExisting(job)}
                className={cn(
                  'w-full text-left p-3 rounded-xl transition-all border group',
                  isActive
                    ? 'bg-primary/10 border-primary/30 shadow-sm'
                    : 'border-transparent hover:bg-surface-container hover:border-outline-variant'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all',
                    isActive ? 'bg-primary text-white' : 'bg-surface-container border border-outline-variant text-outline'
                  )}>
                    <Briefcase size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-[13px] font-semibold truncate', isActive ? 'text-primary' : 'text-on-surface')}>{job.title}</div>
                    {job.company && <div className="text-[10px] text-outline uppercase tracking-wider mt-0.5 truncate">{job.company}</div>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Action Bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-surface-container-lowest border-b border-outline-variant">
          <div className="flex items-center gap-4">
            {selectedJob ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                  <Target size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-on-surface leading-tight">{selectedJob.title}</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-semibold text-outline uppercase tracking-wider">{selectedJob.company || 'Internal'}</span>
                    {results.length > 0 && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full border border-tertiary/20 uppercase tracking-wider">
                        <div className="w-1 h-1 rounded-full bg-tertiary animate-pulse" />
                        {results.length} ranked
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm font-semibold text-on-surface-variant">Select a job from the left to begin</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {processingTime && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant">
                <Clock size={13} className="text-outline" />
                <span className="text-[11px] font-mono font-semibold text-on-surface-variant">{(processingTime / 1000).toFixed(2)}s</span>
              </div>
            )}
            <button onClick={runMatch} disabled={!selectedJob || loading}
              className="h-10 px-6 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-2 shadow-sm hover:bg-primary-container disabled:opacity-40 transition-all">
              {loading ? <><Spinner size={14} /><span>Processing...</span></> : <><Sparkles size={15} /><span>Run AI Match</span></>}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 flex overflow-hidden">

          {/* Candidates List */}
          <div className="w-72 flex-shrink-0 border-r border-outline-variant overflow-y-auto bg-surface-container-lowest">
            {loading ? <AILoader /> : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center mb-4">
                  <Brain size={28} className="text-outline" />
                </div>
                <p className="text-sm font-bold text-on-surface mb-1">No Results Yet</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">Select a role and click Run AI Match</p>
              </div>
            ) : (
              <div className="p-3 space-y-1">
                <div className="px-2 pb-3 flex items-center justify-between border-b border-outline-variant mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Ranked Results</span>
                  <span className="text-[10px] font-bold text-primary">Top {results.length}</span>
                </div>
                {results.map((r, i) => {
                  const scoreColor = getScoreColor(r.overall_score)
                  const isActive = activeResult?.id === r.id
                  return (
                    <button key={r.id} onClick={() => setActiveResult(r)}
                      className={cn(
                        'w-full text-left p-3 rounded-xl transition-all border',
                        isActive
                          ? 'bg-primary/5 border-primary/20 shadow-sm'
                          : 'border-transparent hover:bg-surface-container hover:border-outline-variant'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <RankBadge rank={i + 1} />
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: scoreColor }}>
                          {getInitials(r.candidate?.name || '?')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn('text-[13px] font-semibold truncate mb-1', isActive ? 'text-primary' : 'text-on-surface')}>
                            {r.candidate?.name}
                          </div>
                          <div className="h-1 rounded-full overflow-hidden bg-surface-container">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${r.overall_score}%` }}
                              transition={{ duration: 1.2, delay: i * 0.05 }}
                              style={{ height: '100%', borderRadius: 9999, background: scoreColor }}
                            />
                          </div>
                        </div>
                        <div className="text-sm font-bold font-mono" style={{ color: scoreColor }}>
                          {Math.round(r.overall_score)}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Analysis Panel */}
          <div className="flex-1 overflow-y-auto bg-surface">
            {!activeResult ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-12">
                <div className="w-20 h-20 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center mb-5">
                  <BarChart3 size={36} className="text-outline" />
                </div>
                <p className="text-lg font-bold text-on-surface mb-2">Candidate Scorecard</p>
                <p className="text-sm text-on-surface-variant max-w-xs">Select a candidate from the list to view their detailed AI analysis</p>
              </div>
            ) : (
              <div className="p-8 max-w-4xl mx-auto space-y-6">

                {/* Candidate Header */}
                <div className="portal-card p-6">
                  <div className="absolute top-0 left-0 h-1 rounded-t-xl transition-all duration-1000"
                    style={{ width: `${activeResult.overall_score}%`, background: getScoreColor(activeResult.overall_score) }} />
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0 shadow-sm"
                      style={{ background: getScoreColor(activeResult.overall_score) }}>
                      {getInitials(activeResult.candidate?.name || '?')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h2 className="text-2xl font-bold text-on-surface">{activeResult.candidate?.name}</h2>
                        {rec && (
                          <span className={cn('text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border',
                            rec.cls === 'badge-green'  ? 'bg-tertiary/10 text-tertiary border-tertiary/20' :
                            rec.cls === 'badge-yellow' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-primary/10 text-primary border-primary/20'
                          )}>{rec.label}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-on-surface-variant">
                        <span className="flex items-center gap-1.5">
                          <TrendingUp size={14} className="text-outline" />
                          {formatExperience(activeResult.candidate?.experience_years) || '0 yrs'} experience
                        </span>
                        <span className="text-outline">•</span>
                        <span className="font-mono text-xs">{activeResult.candidate?.email}</span>
                      </div>
                    </div>
                    <Link to={`/candidates/${activeResult.candidate_id}`}
                      className="h-10 px-5 rounded-xl border border-outline-variant text-on-surface font-bold text-xs flex items-center gap-2 hover:bg-surface-container hover:border-primary transition-all group/btn">
                      View Profile
                      <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform text-primary" />
                    </Link>
                  </div>
                </div>

                {/* Analysis Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Score Breakdown */}
                  <div className="portal-card p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Award size={18} className="text-primary" />
                      </div>
                      <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider">Score Breakdown</h4>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-8 mb-6">
                      <ScoreRing score={Math.round(activeResult.overall_score)} size={120} />
                      <div className="flex-1 w-full space-y-4">
                        <AnimatedBar score={activeResult.skill_match_score}         label="Skill Match"       icon={Target}    delay={0} />
                        <AnimatedBar score={activeResult.experience_match_score}    label="Experience"        icon={TrendingUp} delay={100} />
                        <AnimatedBar score={activeResult.semantic_similarity_score} label="Semantic Fit"      icon={Brain}     delay={200} />
                        <AnimatedBar score={activeResult.llm_evaluation_score}      label="AI Confidence"     icon={Sparkles}  delay={300} />
                      </div>
                    </div>
                    {activeResult.explanation && (
                      <div className="mt-auto p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <div className="flex items-start gap-3">
                          <Brain size={16} className="text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-xs leading-relaxed text-on-surface-variant italic">"{activeResult.explanation}"</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="space-y-4 flex flex-col">
                    <div className="portal-card p-5 flex-1">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant">
                        <div className="w-7 h-7 rounded-lg bg-tertiary/10 flex items-center justify-center">
                          <CheckCircle size={14} className="text-tertiary" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-tertiary">Strengths</span>
                      </div>
                      <ul className="space-y-2.5">
                        {(activeResult.strengths || []).map((s, i) => (
                          <li key={i} className="text-sm flex items-start gap-3 text-on-surface-variant leading-relaxed">
                            <div className="w-1.5 h-1.5 rounded-full bg-tertiary mt-1.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="portal-card p-5 flex-1">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant">
                        <div className="w-7 h-7 rounded-lg bg-error/10 flex items-center justify-center">
                          <XCircle size={14} className="text-error" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-error">Gaps</span>
                      </div>
                      <ul className="space-y-2.5">
                        {(activeResult.weaknesses || []).map((w, i) => (
                          <li key={i} className="text-sm flex items-start gap-3 text-on-surface-variant leading-relaxed">
                            <div className="w-1.5 h-1.5 rounded-full bg-error/40 mt-1.5 shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Skill Matrix */}
                {(activeResult.matched_skills?.length > 0 || activeResult.missing_skills?.length > 0) && (
                  <div className="portal-card p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center">
                        <Users size={18} className="text-outline" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-on-surface">Skill Matrix</h4>
                        <p className="text-[10px] text-outline uppercase tracking-wider">Matched vs missing skills</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Matched Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {(activeResult.matched_skills || []).map((sk, j) => (
                            <span key={j} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-tertiary/10 text-tertiary border border-tertiary/20">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Missing Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {(activeResult.missing_skills || []).map((sk, j) => (
                            <span key={j} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant text-on-surface-variant hover:border-primary transition-all">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
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
