import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Zap, Building, MapPin, Clock, Sparkles, 
  TrendingUp, ChevronRight, Briefcase, FileText, 
  CheckCircle, MoreVertical, RotateCcw, Calendar, Target
} from 'lucide-react'
import { motion } from 'framer-motion'
import { jobsApi, matchingApi } from '../services/api'
import { Spinner, EmptyState, TagList, Badge, ScoreRing } from '../components/ui'
import { getInitials, getScoreColor, getRecommendationLabel, truncate, formatExperience, formatDate, cn } from '../utils/helpers'
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

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#030303]">
      <div className="flex flex-col items-center gap-4">
        <Spinner size={40} className="text-blue-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Synthesizing Job Profile...</p>
      </div>
    </div>
  )
  
  if (!job) return (
    <div className="p-8 bg-[#030303] min-h-screen">
      <EmptyState icon={Zap} title="Role Not Found" description="The requested job pipeline could not be retrieved from neural storage." />
    </div>
  )

  const reqSkills = [...(job.required_skills?.technical || []), ...(job.required_skills?.frameworks || [])]
  const prefSkills = [...(job.preferred_skills?.technical || [])]

  return (
    <div className="page-enter bg-[#030303] min-h-screen pb-20 relative overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header Area */}
      <div className="flex items-center justify-between mb-10 relative z-10">
        <Link to="/jobs" className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold text-xs flex items-center gap-2 hover:bg-white/10 transition-all group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform text-blue-500" />
          <span>BACK TO LISTINGS</span>
        </Link>
        <div className="flex items-center gap-4">
           <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/20 hover:text-white transition-all">
             <MoreVertical size={18} />
           </button>
           <button onClick={runMatch} disabled={matching} className="h-12 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-xs flex items-center gap-3 shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all">
             {matching ? <Spinner size={18} /> : <Zap size={18} className="animate-pulse" />}
             <span>{matching ? 'ANALYZING PIPELINE...' : 'EXECUTE SMART MATCH'}</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
        {/* Left Column: Job Spec & Requirements (Span 4) */}
        <div className="lg:col-span-4 space-y-8">
          <div className="rounded-[40px] border border-white/10 p-8 bg-white/[0.02] backdrop-blur-2xl shadow-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="w-16 h-16 rounded-[24px] bg-blue-600 text-white flex items-center justify-center mb-8 shadow-2xl border border-white/10 group-hover:scale-110 transition-transform duration-500 relative z-10">
              <Briefcase size={28} />
            </div>
            
            <div className="mb-10 border-b border-white/5 pb-8 relative z-10">
               <h2 className="text-3xl font-bold text-white font-display tracking-tight leading-tight mb-4">{job.title}</h2>
               <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">{job.status || 'Active'}</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 px-3 py-1.5 rounded-full border border-white/5 bg-white/5">
                    {job.job_type || 'Full-time'}
                  </span>
               </div>
            </div>

            <div className="space-y-6 mb-10 relative z-10">
              {[
                { label: 'Intelligence Unit', value: job.company, icon: Building },
                { label: 'Location Mesh', value: job.location, icon: MapPin },
                { label: 'Seniority Level', value: job.required_experience_years ? `${job.required_experience_years}+ cycles` : 'Open Matrix', icon: TrendingUp },
                { label: 'Published On', value: formatDate(job.created_at), icon: Calendar },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-start gap-4 group/item">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover/item:border-blue-500/30 transition-colors">
                    <Icon size={16} className="text-blue-500 opacity-60" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">{label}</p>
                    <p className="text-sm font-bold text-white truncate">{value || 'NOT SPECIFIED'}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-white/5 relative z-10">
               <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                 <CheckCircle size={14} className="text-blue-500" /> Core Capabilities
               </h3>
               <div className="flex flex-wrap gap-2.5">
                  {reqSkills.map((s, i) => (
                    <span key={i} className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-blue-500/5 text-blue-400 border border-white/5 hover:border-blue-500/30 transition-all cursor-default">
                      {s}
                    </span>
                  ))}
               </div>
            </div>
          </div>

          {prefSkills.length > 0 && (
            <div className="rounded-[32px] border border-dashed border-white/10 p-8 bg-white/[0.01]">
               <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-6">Bonus Signal Nodes</h3>
               <div className="flex flex-wrap gap-2.5">
                  {prefSkills.map((s, i) => (
                    <span key={i} className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-white/5 text-white/40 border border-white/5 uppercase">
                      {s}
                    </span>
                  ))}
               </div>
            </div>
          )}
        </div>

        {/* Right Column: Candidates & Description (Span 8) */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* Detailed Job Profile */}
          <div className="rounded-[40px] border border-white/5 p-10 bg-white/[0.01] shadow-2xl relative overflow-hidden group/profile">
            <div className="absolute inset-0 bg-white/[0.01] group-hover/profile:bg-white/[0.02] transition-colors duration-700" />
            <div className="flex items-center gap-4 mb-8 relative z-10">
               <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-blue-500 shadow-inner">
                  <FileText size={20} />
               </div>
               <h3 className="text-lg font-bold text-white font-display tracking-tight uppercase">Requirement Profile</h3>
            </div>
            <div className="text-[15px] leading-relaxed text-white/50 font-medium whitespace-pre-wrap relative z-10 max-w-4xl custom-scrollbar">
              {job.description}
            </div>
            <Sparkles size={200} className="absolute -right-20 -bottom-20 text-blue-500 opacity-[0.02] group-hover/profile:scale-110 transition-transform duration-1000 pointer-events-none" />
          </div>

          {/* AI Ranking Pipeline */}
          <div className="rounded-[40px] border border-white/10 bg-black/40 shadow-2xl overflow-hidden backdrop-blur-3xl">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white font-display tracking-tight">Intelligence Pipeline</h3>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-2">Neural candidate rankings for this role</p>
              </div>
              <div className="flex items-center gap-6">
                 <div className="text-right hidden sm:block">
                   <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Ranked Vectors</p>
                   <p className="text-lg font-black text-blue-400 font-mono">{matches.length}</p>
                 </div>
                 <button onClick={runMatch} disabled={matching} className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs flex items-center gap-3 hover:bg-white/10 transition-all shadow-lg">
                   <RotateCcw size={14} className={cn("text-blue-500", matching ? 'animate-spin' : '')} />
                   <span>RE-RANK</span>
                 </button>
              </div>
            </div>

            {matches.length === 0 ? (
              <div className="p-24 text-center flex flex-col items-center gap-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/10 blur-[40px] rounded-full" />
                  <div className="relative w-20 h-20 rounded-[36px] bg-white/[0.02] border border-white/10 flex items-center justify-center shadow-inner">
                    <Target size={36} className="text-white/10" />
                  </div>
                </div>
                <div className="max-w-sm mx-auto space-y-4">
                   <p className="text-lg font-bold text-white font-display">No Neural Matches Detected</p>
                   <p className="text-sm text-white/20 leading-relaxed uppercase tracking-[0.1em]">Vectorize your talent pool against this role to initiate high-fidelity ranking.</p>
                   <button onClick={runMatch} disabled={matching} className="h-14 px-10 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-black text-xs tracking-widest shadow-2xl shadow-blue-500/20 hover:scale-105 transition-all">
                      {matching ? 'SYNTHESIZING...' : 'START RANKING ENGINE'}
                   </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {matches.map((m, i) => {
                  const rec = getRecommendationLabel(m.recommendation)
                  const scoreColor = getScoreColor(m.overall_score)
                  return (
                    <Link key={m.id} to={`/candidates/${m.candidate_id}`}
                      className="flex items-center gap-8 p-8 transition-all group bg-transparent hover:bg-white/[0.02]"
                    >
                      <div className="text-xl font-black w-10 flex-shrink-0 text-white/5 group-hover:text-blue-500/20 transition-colors font-mono italic">
                        {(i + 1).toString().padStart(2, '0')}
                      </div>
                      
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0 shadow-2xl group-hover:scale-110 transition-all duration-500 border border-white/10"
                        style={{ background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}cc)` }}>
                        {getInitials(m.candidate?.name || '?')}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-3">
                          <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate font-display">{m.candidate?.name || 'Unknown Entity'}</h4>
                          <span className={cn("text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full border", 
                            rec.cls === 'badge-green' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-lg shadow-cyan-500/5" : "bg-blue-500/5 text-blue-400 border-blue-500/10"
                          )}>{rec.label}</span>
                        </div>
                        
                        <div className="flex items-center gap-8">
                           <div className="flex-1 max-w-sm h-1 rounded-full bg-white/5 overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${m.overall_score}%` }}
                               transition={{ duration: 1.5, delay: i * 0.05 }}
                               style={{ height: '100%', borderRadius: 9999, background: scoreColor, boxShadow: `0 0 10px ${scoreColor}40` }} 
                             />
                           </div>
                           <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] hidden sm:block">
                              {formatExperience(m.candidate?.experience_years)} XP CYCLE
                           </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 border-l border-white/5 pl-8">
                        <div className="text-3xl font-black font-mono leading-none mb-1.5" style={{ color: scoreColor }}>{Math.round(m.overall_score)}</div>
                        <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.3em]">MATCH</p>
                      </div>
                      
                      <div className="p-3 rounded-xl bg-white/5 text-white/10 group-hover:text-blue-500 group-hover:bg-blue-500/5 transition-all hidden sm:block border border-transparent group-hover:border-blue-500/20">
                         <ChevronRight size={24} />
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
