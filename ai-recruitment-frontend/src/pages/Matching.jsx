import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, ChevronRight, CheckCircle, XCircle, Brain, Sparkles, Target, TrendingUp, Clock, Users, Award, BarChart3, Briefcase, ArrowRight } from 'lucide-react'
import { jobsApi, matchingApi } from '../services/api'
import { Spinner } from '../components/ui'
import { getInitials, getScoreColor, getRecommendationLabel, formatExperience, cn } from '../utils/helpers'
import toast from 'react-hot-toast'

function ScoreRing({ score, size = 96 }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - score / 100)
  const color = getScoreColor(score)
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold font-display" style={{ color }}>{score}</div>
        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">score</div>
      </div>
    </div>
  )
}

function AnimatedBar({ score, label, icon: Icon, delay = 0 }) {
  const [width, setWidth] = useState(0)
  const color = getScoreColor(score)
  useEffect(() => { const t = setTimeout(() => setWidth(score), delay + 100); return () => clearTimeout(t) }, [score, delay])
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-0.5">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={12} className="text-blue-500 opacity-60" />}
          <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-xs font-black font-mono" style={{ color }}>{Math.round(score)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-white/5 border border-white/5 shadow-inner">
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}60, ${color})`, boxShadow: `0 0 10px ${color}40` }} />
      </div>
    </div>
  )
}

function AILoader() {
  const steps = ['Synthesizing job requirements...', 'Mapping candidate vectors...', 'Neural semantic analysis...', 'Cross-referencing experience...', 'LLM evaluation cycle...']
  const [step, setStep] = useState(0)
  useEffect(() => { const t = setInterval(() => setStep(s => (s + 1) % steps.length), 1800); return () => clearInterval(t) }, [])
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-[24px] bg-blue-500/10 border border-blue-500/20 animate-ping opacity-20" />
        <div className="absolute inset-0 rounded-[28px] flex items-center justify-center bg-white/[0.03] border border-white/5 backdrop-blur-xl shadow-2xl">
          <Brain size={32} className="text-blue-400 animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-bold text-white font-display tracking-wide">AI Ranking Engine Active</p>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse text-blue-400">{steps[step]}</p>
      </div>
      <div className="flex gap-2">
        {[0,1,2,3,4].map(i => (
          <div key={i} className="w-1 h-1 rounded-full bg-blue-500/40"
            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
        ))}
      </div>
    </div>
  )
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">#1 APEX</span>
  if (rank === 2) return <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-white/5 text-white/40 border border-white/10">#2 LEAD</span>
  if (rank === 3) return <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">#3 CORE</span>
  return <span className="text-[10px] font-black w-6 text-white/10">#{rank}</span>
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
    <div className="flex items-center justify-center h-full bg-[#030303]">
      <div className="flex flex-col items-center gap-4">
        <Spinner size={32} className="text-blue-500" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/20">Initializing Neural Mesh...</p>
      </div>
    </div>
  )

  const rec = activeResult ? getRecommendationLabel(activeResult.recommendation) : null

  return (
    <div className="flex h-full overflow-hidden page-enter bg-[#030303]">

      {/* Jobs Sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-white/5 flex flex-col overflow-hidden bg-black/20 backdrop-blur-3xl">
        <div className="p-6 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-5 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Open Roles</p>
          </div>
          <p className="text-sm font-bold text-white">{jobs.length} MANAGED PIPELINES</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {jobs.length === 0 ? (
            <div className="p-10 text-center space-y-4">
              <p className="text-xs text-white/20 font-medium">No active roles.</p>
              <Link to="/jobs" className="h-10 px-6 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs flex items-center justify-center hover:bg-white/10 transition-all">Post Role</Link>
            </div>
          ) : jobs.map(job => {
            const isActive = selectedJob?.id === job.id
            return (
              <button key={job.id} onClick={() => loadExisting(job)}
                className={cn(
                  "w-full text-left p-4 rounded-[24px] transition-all duration-500 border group",
                  isActive ? "bg-blue-600/10 border-blue-500/30 shadow-2xl" : "bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/5"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-500",
                    isActive ? "bg-blue-600 text-white shadow-blue-500/20 scale-110" : "bg-white/[0.05] text-white/20 border border-white/5"
                  )}>
                    <Briefcase size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-[13px] font-bold truncate", isActive ? "text-white" : "text-white/40 group-hover:text-white/60 transition-colors")}>{job.title}</div>
                    {job.company && <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1.5 truncate">{job.company}</div>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Decorative Blur */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[40%] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Action Bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 bg-white/[0.01] border-b border-white/5 backdrop-blur-md z-10">
          <div className="flex items-center gap-6">
            {selectedJob ? (
              <>
                <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-blue-600 to-violet-700 flex items-center justify-center shadow-lg border border-white/10 group">
                  <Target size={22} className="text-white group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white font-display leading-tight">{selectedJob.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{selectedJob.company || 'INTERNAL UNIT'}</span>
                    {results.length > 0 && (
                      <span className="flex items-center gap-2 text-[9px] font-black text-cyan-400 bg-cyan-500/5 px-2.5 py-1 rounded-full border border-cyan-500/10 uppercase tracking-[0.15em]">
                        <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                        {results.length} VECTORS RANKED
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : <p className="text-sm font-black uppercase tracking-widest text-white/20">Select a neural source on the left</p>}
          </div>
          <div className="flex items-center gap-4">
            {processingTime && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <Clock size={14} className="text-blue-500" />
                <span className="text-[11px] font-black font-mono text-white/40 tracking-wider">{(processingTime / 1000).toFixed(2)}S CYCLE</span>
              </div>
            )}
            <button onClick={runMatch} disabled={!selectedJob || loading} className="h-12 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-xs flex items-center gap-3 shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 disabled:opacity-30 transition-all group">
              {loading ? <><Spinner size={16} /><span>PROCESSING...</span></> : <><Sparkles size={18} className="group-hover:rotate-12 transition-transform" /><span>EXECUTE AI RANKING</span></>}
            </button>
          </div>
        </div>

        {/* Results Container */}
        <div className="flex-1 flex overflow-hidden">

          {/* Candidates List Column */}
          <div className="w-80 flex-shrink-0 border-r border-white/5 overflow-y-auto bg-black/10 custom-scrollbar relative z-10">
            {loading ? <AILoader /> : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                <div className="w-20 h-20 rounded-[32px] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6 shadow-2xl">
                  <Brain size={32} className="text-white/10" />
                </div>
                <p className="text-sm font-bold text-white mb-2 font-display">Awaiting Inference</p>
                <p className="text-[11px] font-medium text-white/20 leading-relaxed max-w-[200px] uppercase tracking-widest">Select a role and execute neural match</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                <div className="px-3 pb-3 flex items-center justify-between border-b border-white/5 mb-4">
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Ranked Results</span>
                   <span className="text-[10px] font-black text-blue-500/40">TOP {results.length}</span>
                </div>
                {results.map((r, i) => {
                  const scoreColor = getScoreColor(r.overall_score)
                  const isActive = activeResult?.id === r.id
                  return (
                    <button key={r.id} onClick={() => setActiveResult(r)}
                      className={cn(
                        "w-full text-left p-4 rounded-[28px] transition-all duration-500 border group",
                        isActive 
                          ? "bg-white/[0.04] border-white/10 shadow-2xl translate-x-1" 
                          : "bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <RankBadge rank={i + 1} />
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black text-white flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-500" style={{ background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}cc)`, border: '1px solid rgba(255,255,255,0.1)' }}>
                          {getInitials(r.candidate?.name || '?')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-[14px] font-bold truncate mb-2 font-display transition-colors", isActive ? "text-blue-400" : "text-white")}>{r.candidate?.name}</div>
                          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                            <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${r.overall_score}%` }}
                               transition={{ duration: 1.2, delay: i * 0.05 }}
                               style={{ height: '100%', borderRadius: 9999, background: scoreColor, boxShadow: `0 0 8px ${scoreColor}60` }} 
                            />
                          </div>
                        </div>
                        <div className="text-[15px] font-black font-mono tracking-tighter" style={{ color: scoreColor }}>{Math.round(r.overall_score)}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Deep Analysis View Area */}
          <div className="flex-1 overflow-y-auto bg-black/20 relative custom-scrollbar z-10 backdrop-blur-sm">
            {!activeResult ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-12">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/10 blur-[60px] rounded-full" />
                  <div className="relative w-24 h-24 rounded-[44px] bg-white/[0.01] border border-white/5 flex items-center justify-center mb-8 shadow-2xl backdrop-blur-2xl">
                    <BarChart3 size={40} className="text-white/5" />
                  </div>
                </div>
                <p className="text-xl font-bold text-white mb-3 font-display tracking-tight">Intelligence Scorecard</p>
                <p className="text-sm font-medium text-white/20 max-w-sm uppercase tracking-[0.15em]">Select a mapped entity to view high-fidelity analysis</p>
              </div>
            ) : (
              <div className="p-10 max-w-5xl mx-auto space-y-8 animate-fadeIn">

                {/* Candidate Overview Card */}
                <div className="relative rounded-[40px] border border-white/5 p-8 group transition-all duration-500 overflow-hidden">
                  <div className="absolute inset-0 bg-white/[0.02] group-hover:bg-white/[0.04] transition-colors" />
                  <div className="absolute top-0 left-0 h-1 transition-all duration-1000 ease-out" style={{ width: `${activeResult.overall_score}%`, background: `linear-gradient(90deg, transparent, ${getScoreColor(activeResult.overall_score)}, transparent)` }} />
                  
                  <div className="relative z-10 flex items-start gap-8">
                    <div className="w-20 h-20 rounded-[28px] flex items-center justify-center text-2xl font-black text-white flex-shrink-0 shadow-2xl transition-all duration-700 group-hover:scale-105 group-hover:rotate-3 border border-white/10" style={{ background: `linear-gradient(135deg, ${getScoreColor(activeResult.overall_score)}, ${getScoreColor(activeResult.overall_score)}dd)` }}>
                      {getInitials(activeResult.candidate?.name || '?')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-4 flex-wrap mb-3">
                        <h2 className="text-3xl font-bold text-white leading-none font-display tracking-tight">{activeResult.candidate?.name}</h2>
                        {rec && <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border shadow-lg", 
                          rec.cls === 'badge-green' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : 
                          rec.cls === 'badge-yellow' ? "bg-amber-400/10 text-amber-500 border-amber-400/20" : 
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        )}>{rec.label}</span>}
                      </div>
                      <div className="flex items-center gap-6 text-sm font-medium text-white/40">
                        <span className="flex items-center gap-2.5"><TrendingUp size={16} className="text-blue-500" /> <span className="text-white/60">{formatExperience(activeResult.candidate?.experience_years) || '0'} YEARS XP</span></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/5" />
                        <span className="flex items-center gap-2.5 font-mono text-xs">{activeResult.candidate?.email}</span>
                      </div>
                    </div>
                    <Link to={`/candidates/${activeResult.candidate_id}`} className="h-12 px-6 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-xs flex items-center gap-3 hover:bg-white/10 group/btn transition-all">
                      <span>OPEN PROFILE</span>
                      <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform text-blue-500" />
                    </Link>
                  </div>
                </div>

                {/* Main Analysis Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   {/* Score Breakdown */}
                   <div className="rounded-[40px] border border-white/5 p-8 bg-white/[0.01] flex flex-col relative overflow-hidden">
                      <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-blue-500 shadow-inner">
                          <Award size={20} />
                        </div>
                        <h4 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Intelligence Breakdown</h4>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-12 mb-10">
                        <ScoreRing score={Math.round(activeResult.overall_score)} size={130} />
                        <div className="flex-1 w-full space-y-6">
                          <AnimatedBar score={activeResult.skill_match_score}         label="Neural Overlap" icon={Target} delay={0} />
                          <AnimatedBar score={activeResult.experience_match_score}    label="Experience Mesh" icon={TrendingUp} delay={100} />
                          <AnimatedBar score={activeResult.semantic_similarity_score} label="Semantic Align" icon={Brain} delay={200} />
                          <AnimatedBar score={activeResult.llm_evaluation_score}      label="Model Confidence" icon={Sparkles} delay={300} />
                        </div>
                      </div>

                      {activeResult.explanation && (
                        <div className="mt-auto p-6 rounded-[32px] bg-blue-500/[0.03] border border-blue-500/10 relative overflow-hidden group/explain">
                          <div className="flex items-start gap-4 relative z-10">
                            <Brain size={20} className="text-blue-500 mt-1 flex-shrink-0" />
                            <p className="text-[13px] leading-relaxed text-white/60 font-medium italic">"{activeResult.explanation}"</p>
                          </div>
                          <Sparkles className="absolute -right-4 -bottom-4 text-blue-500/5 group-hover/explain:scale-125 group-hover/explain:rotate-12 transition-transform duration-1000" size={96} />
                        </div>
                      )}
                   </div>

                   {/* Strengths & Weaknesses */}
                   <div className="space-y-8 flex flex-col">
                      <div className="rounded-[40px] border border-cyan-500/10 p-7 bg-cyan-500/[0.02] flex-1 group">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                            <CheckCircle size={16} className="text-cyan-400" />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-400/60">Core Strengths</span>
                        </div>
                        <ul className="space-y-4">
                          {(activeResult.strengths || []).map((s, i) => (
                            <li key={i} className="text-[13px] flex items-start gap-4 text-white/70 font-medium leading-relaxed group-hover:text-white transition-colors">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shadow-[0_0_8px_rgba(34,211,238,0.5)] shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="rounded-[40px] border border-red-500/10 p-7 bg-red-500/[0.02] flex-1 group">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                           <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <XCircle size={16} className="text-red-400" />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-red-400/60">Intelligence Gaps</span>
                        </div>
                        <ul className="space-y-4">
                          {(activeResult.weaknesses || []).map((w, i) => (
                            <li key={i} className="text-[13px] flex items-start gap-4 text-white/50 font-medium leading-relaxed group-hover:text-white/70 transition-colors">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-400/40 mt-2 shrink-0" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                   </div>
                </div>

                {/* Skill Matrix Detail */}
                {(activeResult.matched_skills?.length > 0 || activeResult.missing_skills?.length > 0) && (
                  <div className="rounded-[40px] border border-white/5 p-10 bg-white/[0.01] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/[0.02] to-transparent" />
                    
                    <div className="flex items-center gap-4 mb-10 relative z-10">
                      <div className="w-12 h-12 rounded-[18px] bg-white/[0.03] border border-white/10 flex items-center justify-center text-blue-500">
                        <Users size={22} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white font-display tracking-tight uppercase">Neural Matrix Mapping</h4>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-1">Cross-referencing vector capabilities</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                      <div className="space-y-5">
                         <p className="text-[10px] font-black text-cyan-400/40 uppercase tracking-[0.2em] pl-1">Matched Nodes</p>
                         <div className="flex flex-wrap gap-2.5">
                            {(activeResult.matched_skills || []).map((sk, j) => (
                              <span key={j} className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-cyan-500/5 text-cyan-400 border border-cyan-500/10 shadow-sm transition-all hover:border-cyan-400/40 hover:scale-105">
                                {sk}
                              </span>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-5">
                         <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em] pl-1">Missing / Unmapped</p>
                         <div className="flex flex-wrap gap-2.5">
                            {(activeResult.missing_skills || []).map((sk, j) => (
                              <span key={j} className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white/[0.02] text-white/20 border border-white/5 transition-all hover:bg-white/[0.05] hover:text-white/40">
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

