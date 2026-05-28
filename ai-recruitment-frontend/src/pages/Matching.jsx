import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ChevronRight, CheckCircle, XCircle, Brain, Sparkles, Target, TrendingUp, Clock, Users, Award, BarChart3, Briefcase, ArrowRight } from 'lucide-react'
import { jobsApi, matchingApi } from '../services/api'
import { Spinner, TagList, Badge } from '../components/ui'
import { getInitials, getScoreColor, getRecommendationLabel, formatExperience, cn } from '../utils/helpers'
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
    <div className="flex h-full overflow-hidden page-enter bg-surface">

      {/* Jobs Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-outline-variant flex flex-col overflow-hidden bg-surface-container-lowest">
        <div className="p-4 border-b border-outline-variant flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase size={16} className="text-primary" />
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface">Available Roles</p>
          </div>
          <p className="text-[11px] text-outline font-medium">{jobs.length} positions ready for matching</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {jobs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-outline mb-3">No active jobs found.</p>
              <Link to="/jobs" className="btn-primary text-xs py-2 w-full">Post a Job</Link>
            </div>
          ) : jobs.map(job => {
            const isActive = selectedJob?.id === job.id
            return (
              <button key={job.id} onClick={() => loadExisting(job)}
                className={cn(
                  "w-full text-left p-3 rounded-xl transition-all border border-transparent",
                  isActive ? "bg-surface-container border-primary shadow-sm" : "hover:bg-surface-container-low"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm",
                    isActive ? "bg-primary text-on-primary" : "bg-surface-container-high text-outline"
                  )}>
                    <Briefcase size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-xs font-bold truncate", isActive ? "text-primary" : "text-on-surface")}>{job.title}</div>
                    {job.company && <div className="text-[10px] text-outline font-medium truncate mt-0.5">{job.company}</div>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Action Bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-surface-container-lowest border-b border-outline-variant shadow-sm z-10">
          <div className="flex items-center gap-4">
            {selectedJob ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-md">
                  <Target size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-on-surface leading-tight">{selectedJob.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-outline font-medium">{selectedJob.company || 'Direct Hire'}</span>
                    {results.length > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 uppercase tracking-tighter ml-1">
                        {results.length} ranked
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : <p className="text-sm font-medium text-outline">Select a position from the left to start ranking</p>}
          </div>
          <div className="flex items-center gap-3">
            {processingTime && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tertiary/10 border border-tertiary/20">
                <Clock size={14} className="text-tertiary" />
                <span className="text-xs font-bold font-mono text-tertiary">{(processingTime / 1000).toFixed(1)}s</span>
              </div>
            )}
            <button onClick={runMatch} disabled={!selectedJob || loading} className="btn-ai disabled:opacity-40">
              {loading ? <><Spinner size={16} /><span>Analyzing...</span></> : <><Sparkles size={16} /><span>Run AI Analysis</span></>}
            </button>
          </div>
        </div>

        {/* Results Container */}
        <div className="flex-1 flex overflow-hidden">

          {/* Candidates List Column */}
          <div className="w-72 flex-shrink-0 border-r border-outline-variant overflow-y-auto bg-surface-container-low custom-scrollbar shadow-inner">
            {loading ? <AILoader /> : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 rounded-3xl bg-surface-container-lowest border border-outline-variant flex items-center justify-center mb-5 shadow-sm">
                  <Brain size={28} className="text-primary opacity-30" />
                </div>
                <p className="text-sm font-bold text-on-surface mb-2">Ready for Intelligence</p>
                <p className="text-xs text-outline leading-relaxed max-w-[200px]">Click the AI button to rank all candidates against this role.</p>
              </div>
            ) : (
              <div className="p-3 space-y-1.5">
                <div className="px-2 pb-2 flex items-center justify-between">
                   <span className="text-[10px] font-black uppercase tracking-[0.1em] text-outline opacity-70">Ranked Results</span>
                </div>
                {results.map((r, i) => {
                  const scoreColor = getScoreColor(r.overall_score)
                  const isActive = activeResult?.id === r.id
                  return (
                    <button key={r.id} onClick={() => setActiveResult(r)}
                      className={cn(
                        "w-full text-left p-3 rounded-2xl transition-all border",
                        isActive 
                          ? "bg-surface-container-lowest border-primary shadow-md" 
                          : "bg-transparent border-transparent hover:bg-surface-container-lowest hover:border-outline-variant"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <RankBadge rank={i + 1} />
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}dd)` }}>
                          {getInitials(r.candidate?.name || '?')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-[13px] font-bold truncate mb-1", isActive ? "text-primary" : "text-on-surface")}>{r.candidate?.name}</div>
                          <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden shadow-inner">
                            <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${r.overall_score}%` }}
                               transition={{ duration: 1, delay: i * 0.05 }}
                               style={{ height: '100%', borderRadius: 9999, background: `linear-gradient(90deg, ${scoreColor}cc, ${scoreColor})` }} 
                            />
                          </div>
                        </div>
                        <div className="text-sm font-black font-display" style={{ color: scoreColor }}>{Math.round(r.overall_score)}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Deep Analysis View Area */}
          <div className="flex-1 overflow-y-auto bg-surface relative custom-scrollbar">
            {!activeResult ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-12">
                <div className="w-20 h-20 rounded-[40px] bg-surface-container-lowest border border-outline-variant flex items-center justify-center mb-6 shadow-xl">
                  <BarChart3 size={32} className="text-primary opacity-20" />
                </div>
                <p className="text-lg font-bold text-on-surface mb-2">Detailed AI Scorecard</p>
                <p className="text-sm text-outline max-w-sm">Select a ranked candidate from the list to view their deep analysis, strengths, and qualification gaps.</p>
              </div>
            ) : (
              <div className="p-8 max-w-4xl mx-auto space-y-6 animate-enter">

                {/* Candidate Overview Card */}
                <div className="portal-card overflow-hidden group shadow-lg">
                  <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${getScoreColor(activeResult.overall_score)}, ${getScoreColor(activeResult.overall_score)}40)` }} />
                  <div className="p-6 flex items-start gap-6">
                    <div className="w-16 h-16 rounded-[22px] flex items-center justify-center text-xl font-bold text-white flex-shrink-0 shadow-2xl transition-transform group-hover:scale-105" style={{ background: `linear-gradient(135deg, ${getScoreColor(activeResult.overall_score)}, ${getScoreColor(activeResult.overall_score)}dd)` }}>
                      {getInitials(activeResult.candidate?.name || '?')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h2 className="text-2xl font-bold text-on-surface leading-none">{activeResult.candidate?.name}</h2>
                        {rec && <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border", 
                          rec.cls === 'badge-green' ? "bg-tertiary/10 text-tertiary border-tertiary/20" : 
                          rec.cls === 'badge-yellow' ? "bg-amber-400/10 text-amber-500 border-amber-400/20" : 
                          "bg-primary/10 text-primary border-primary/20"
                        )}>{rec.label}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-sm font-medium text-outline">
                        <span className="flex items-center gap-1.5"><TrendingUp size={16} /> {formatExperience(activeResult.candidate?.experience_years) || 'No data'} Experience</span>
                        <span className="opacity-20">|</span>
                        <span>{activeResult.candidate?.email}</span>
                      </div>
                    </div>
                    <Link to={`/candidates/${activeResult.candidate_id}`} className="btn-secondary py-2 flex items-center gap-2 group/btn">
                      <span>Full Profile</span>
                      <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>

                {/* Main Analysis Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   {/* Score Breakdown */}
                   <div className="portal-card p-6 shadow-md flex flex-col">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shadow-inner">
                          <Award size={18} />
                        </div>
                        <h4 className="text-base font-bold text-on-surface uppercase tracking-tight">Intelligence Metrics</h4>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-10">
                        <ScoreRing score={Math.round(activeResult.overall_score)} size={110} />
                        <div className="flex-1 w-full space-y-4">
                          <AnimatedBar score={activeResult.skill_match_score}         label="Skill Overlap" icon={Target} delay={0} />
                          <AnimatedBar score={activeResult.experience_match_score}    label="Experience Fit" icon={TrendingUp} delay={100} />
                          <AnimatedBar score={activeResult.semantic_similarity_score} label="Role Alignment" icon={Brain} delay={200} />
                          <AnimatedBar score={activeResult.llm_evaluation_score}      label="AI Confidence" icon={Sparkles} delay={300} />
                        </div>
                      </div>

                      {activeResult.explanation && (
                        <div className="mt-8 p-4 rounded-2xl bg-surface-container border border-outline-variant/40 relative overflow-hidden group">
                          <div className="flex items-start gap-3 relative z-10">
                            <Brain size={16} className="text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-xs leading-relaxed text-on-surface-variant font-medium italic">"{activeResult.explanation}"</p>
                          </div>
                          <Sparkles className="absolute -right-2 -bottom-2 text-primary/5 group-hover:scale-110 transition-transform duration-700" size={64} />
                        </div>
                      )}
                   </div>

                   {/* Strengths & Weaknesses */}
                   <div className="space-y-6 flex flex-col">
                      <div className="portal-card p-5 bg-tertiary/5 border-tertiary/20 flex-1">
                        <div className="flex items-center gap-2 mb-4 border-b border-tertiary/10 pb-2">
                          <CheckCircle size={14} className="text-tertiary" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-tertiary">Key Strengths</span>
                        </div>
                        <ul className="space-y-3">
                          {(activeResult.strengths || []).map((s, i) => (
                            <li key={i} className="text-xs flex items-start gap-3 text-on-surface font-medium">
                              <div className="w-1.5 h-1.5 rounded-full bg-tertiary mt-1 shadow-glow" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="portal-card p-5 bg-error/5 border-error/20 flex-1">
                        <div className="flex items-center gap-2 mb-4 border-b border-error/10 pb-2">
                          <XCircle size={14} className="text-error" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-error">Potential Gaps</span>
                        </div>
                        <ul className="space-y-3">
                          {(activeResult.weaknesses || []).map((w, i) => (
                            <li key={i} className="text-xs flex items-start gap-3 text-on-surface font-medium">
                              <div className="w-1.5 h-1.5 rounded-full bg-error mt-1 shadow-sm" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                   </div>
                </div>

                {/* Skill Matrix Detail */}
                {(activeResult.matched_skills?.length > 0 || activeResult.missing_skills?.length > 0) && (
                  <div className="portal-card p-6 shadow-md bg-surface-container-low border-dashed">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                        <Users size={18} />
                      </div>
                      <h4 className="text-base font-bold text-on-surface uppercase tracking-tight">Qualification Matrix</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                         <p className="text-[10px] font-black text-outline uppercase tracking-wider pl-1">Matched Capabilities</p>
                         <div className="flex flex-wrap gap-1.5">
                            {activeResult.matched_skills.map((sk, j) => (
                              <span key={j} className="text-[10px] font-bold px-2 py-1 rounded bg-tertiary/10 text-tertiary border border-tertiary/10">
                                {sk}
                              </span>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-3 opacity-80">
                         <p className="text-[10px] font-black text-outline uppercase tracking-wider pl-1">Missing / Unverified</p>
                         <div className="flex flex-wrap gap-1.5">
                            {activeResult.missing_skills.map((sk, j) => (
                              <span key={j} className="text-[10px] font-bold px-2 py-1 rounded bg-error/5 text-outline border border-error/5">
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
