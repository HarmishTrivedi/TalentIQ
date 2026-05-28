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
    <div className="page-enter bg-surface min-h-screen">
      
      {/* Header Area */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/jobs" className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs group">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to job listings</span>
        </Link>
        <div className="flex items-center gap-3">
           <button className="p-2 text-outline hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
             <MoreVertical size={18} />
           </button>
           <button onClick={runMatch} disabled={matching} className="btn-ai py-2 px-6 shadow-md">
             {matching ? <Spinner size={16} /> : <Zap size={16} />}
             <span>{matching ? 'Analyzing Pipeline...' : 'Run Smart Match'}</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Job Spec & Requirements (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="portal-card p-6 bg-surface-container-lowest shadow-md border-primary/10">
            <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/20 transition-transform hover:scale-105">
              <Briefcase size={22} />
            </div>
            
            <div className="mb-6 border-b border-outline-variant pb-6">
               <h2 className="text-2xl font-bold text-on-surface leading-tight mb-2">{job.title}</h2>
               <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary/10 border border-tertiary/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-tertiary">{job.status || 'Active'}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-outline px-2 py-0.5 rounded-full border border-outline-variant bg-surface-container-low">
                    {job.job_type || 'Full-time'}
                  </span>
               </div>
            </div>

            <div className="space-y-4 mb-8">
              {[
                { label: 'Company', value: job.company, icon: Building },
                { label: 'Location', value: job.location, icon: MapPin },
                { label: 'Experience Level', value: job.required_experience_years ? `${job.required_experience_years}+ years` : 'Open', icon: TrendingUp },
                { label: 'Created On', value: formatDate(job.created_at), icon: Calendar },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-outline" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-0.5">{label}</p>
                    <p className="text-sm font-bold text-on-surface">{value || 'Not specified'}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-outline-variant">
               <h3 className="text-[11px] font-black text-on-surface uppercase tracking-widest mb-4 flex items-center gap-2">
                 <CheckCircle size={14} className="text-primary" /> Target Capabilities
               </h3>
               <div className="flex flex-wrap gap-1.5">
                  {reqSkills.map((s, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/5 text-primary border border-primary/10 uppercase">
                      {s}
                    </span>
                  ))}
               </div>
            </div>
          </div>

          {prefSkills.length > 0 && (
            <div className="portal-card p-6 bg-surface-container-low border-dashed">
               <h3 className="text-[11px] font-black text-outline uppercase tracking-widest mb-4">Bonus / Preferred</h3>
               <div className="flex flex-wrap gap-1.5">
                  {prefSkills.map((s, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container-lowest text-outline border border-outline-variant uppercase">
                      {s}
                    </span>
                  ))}
               </div>
            </div>
          )}
        </div>

        {/* Right Column: Candidates & Description (Span 8) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Detailed Job Profile */}
          <div className="portal-card p-8 bg-surface-container-lowest shadow-md relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-6 relative z-10">
               <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                  <FileText size={18} />
               </div>
               <h3 className="text-lg font-bold text-on-surface uppercase tracking-tight">Requirement Profile</h3>
            </div>
            <div className="text-sm leading-relaxed text-on-surface-variant font-medium opacity-90 whitespace-pre-wrap relative z-10 max-w-3xl">
              {job.description}
            </div>
            <Sparkles size={160} className="absolute -right-16 -bottom-16 text-primary opacity-[0.03] group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
          </div>

          {/* AI Ranking Pipeline */}
          <div className="portal-card overflow-hidden shadow-xl border-primary/5">
            <div className="p-6 bg-surface-container border-b border-outline-variant flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Intelligence Pipeline</h3>
                <p className="text-[11px] font-bold text-outline uppercase tracking-wider mt-0.5">Top Matched Talent Rankings</p>
              </div>
              <div className="flex items-center gap-4">
                 <div className="text-right hidden sm:block">
                   <p className="text-[10px] font-black text-outline uppercase">Candidates Ranked</p>
                   <p className="text-sm font-black text-primary">{matches.length}</p>
                 </div>
                 <button onClick={runMatch} disabled={matching} className="btn-secondary py-1.5 px-4 text-xs font-bold shadow-sm">
                   <RotateCcw size={14} className={matching ? 'animate-spin' : ''} />
                   <span>Refresh rankings</span>
                 </button>
              </div>
            </div>

            {matches.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center gap-5">
                <div className="w-16 h-16 rounded-[30px] bg-surface-container border border-outline-variant flex items-center justify-center shadow-inner">
                  <Target size={28} className="text-outline opacity-20" />
                </div>
                <div className="max-w-xs mx-auto">
                   <p className="text-base font-bold text-on-surface mb-1">No matches in pipeline</p>
                   <p className="text-sm text-outline mb-6">Vectorize your talent pool against this role to identify the best candidates.</p>
                   <button onClick={runMatch} disabled={matching} className="btn-primary w-full shadow-lg">
                      {matching ? 'Running AI Engine...' : 'Run Matching Now'}
                   </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant">
                {matches.map((m, i) => {
                  const rec = getRecommendationLabel(m.recommendation)
                  const scoreColor = getScoreColor(m.overall_score)
                  return (
                    <Link key={m.id} to={`/candidates/${m.candidate_id}`}
                      className="flex items-center gap-6 p-6 transition-all group bg-surface-container-lowest hover:bg-surface-container-low"
                    >
                      <div className="text-lg font-black w-8 flex-shrink-0 text-outline/30 group-hover:text-primary/40 transition-colors italic">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform"
                        style={{ background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}dd)` }}>
                        {getInitials(m.candidate?.name || '?')}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors truncate">{m.candidate?.name || 'Unknown Candidate'}</h4>
                          <span className={cn("text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border", 
                            rec.cls === 'badge-green' ? "bg-tertiary/10 text-tertiary border-tertiary/10" : "bg-primary/5 text-primary border-primary/10"
                          )}>{rec.label}</span>
                        </div>
                        
                        <div className="flex items-center gap-6">
                           <div className="flex-1 max-w-xs h-1.5 rounded-full bg-surface-container overflow-hidden shadow-inner">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${m.overall_score}%` }}
                               transition={{ duration: 1, delay: i * 0.05 }}
                               style={{ height: '100%', borderRadius: 9999, background: `linear-gradient(90deg, ${scoreColor}cc, ${scoreColor})` }} 
                             />
                           </div>
                           <span className="text-[11px] font-bold text-outline uppercase tracking-wider hidden sm:block">
                              {formatExperience(m.candidate?.experience_years)} Exp
                           </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 border-l border-outline-variant/40 pl-6">
                        <div className="text-2xl font-black font-display leading-none mb-1" style={{ color: scoreColor }}>{Math.round(m.overall_score)}%</div>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">Match</p>
                      </div>
                      
                      <div className="p-2 text-outline group-hover:text-primary transition-colors hidden sm:block">
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
