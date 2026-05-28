import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, MessageSquare, Zap, CheckCircle, XCircle, 
  GraduationCap, Briefcase, Mail, Phone, MapPin, Trash2, 
  Award, FileText, TrendingUp, Sparkles, ChevronRight, 
  Clock, Calendar, User, Brain, Heart, Download, Target
} from 'lucide-react'
import { motion } from 'framer-motion'
import { candidatesApi, matchingApi, chatApi } from '../services/api'
import { ScoreRing, Spinner, EmptyState, ConfirmationModal } from '../components/ui'
import { 
  formatDate, getInitials, getScoreColor, 
  getRecommendationLabel, formatExperience, cn 
} from '../utils/helpers'
import toast from 'react-hot-toast'

function AnimatedBar({ score, label, icon: Icon }) {
  const [width, setWidth] = useState(0)
  const color = getScoreColor(score)
  useEffect(() => { const t = setTimeout(() => setWidth(score), 100); return () => clearTimeout(t) }, [score])
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 opacity-70">
          {Icon && <Icon size={12} />}
          <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-xs font-black font-display" style={{ color }}>{Math.round(score)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden shadow-inner">
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }} />
      </div>
    </div>
  )
}

export default function CandidateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    Promise.all([
      candidatesApi.get(id),
      matchingApi.getCandidateMatches(id).catch(() => ({ data: [] })),
    ]).then(([cRes, mRes]) => {
      setCandidate(cRes.data)
      setMatches(Array.isArray(mRes.data) ? mRes.data : [])
    }).catch(() => toast.error('Failed to load candidate profile'))
      .finally(() => setLoading(false))
  }, [id])

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await candidatesApi.delete(id)
      toast.success('Candidate deleted permanently')
      navigate('/candidates', { replace: true })
    } catch { 
      toast.error('Failed to delete candidate')
      setDeleting(false)
      setShowDeleteModal(false) 
    }
  }

  const startChat = async () => {
    setChatLoading(true)
    try {
      const res = await chatApi.createSession({ candidate_id: id, title: `Screening: ${candidate?.name}` })
      navigate(`/chat/${res.data.id}`)
    } catch { toast.error('Could not initiate screening session') }
    finally { setChatLoading(false) }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
  
  if (!candidate) return (
    <div className="p-8">
      <EmptyState icon={User} title="Profile not found" description="The candidate record you're looking for doesn't exist or was removed." />
    </div>
  )

  const allSkills = [...(candidate.skills?.technical || []), ...(candidate.skills?.frameworks || []), ...(candidate.skills?.tools || [])]
  const softSkills = candidate.skills?.soft || []
  const positions = candidate.experience_details?.positions || []
  const degrees = candidate.education?.degrees || []
  const topMatch = matches[0]

  return (
    <div className="page-enter bg-surface min-h-screen">
      
      {/* Header / Navigation */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/candidates" className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs group">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to talent pool</span>
        </Link>
        <div className="flex items-center gap-2">
           <button onClick={() => setShowDeleteModal(true)} className="p-2 text-outline hover:text-error hover:bg-error/5 rounded-lg transition-all">
             <Trash2 size={18} />
           </button>
           <button className="btn-secondary py-2 flex items-center gap-2">
             <Download size={16} />
             <span>Export Profile</span>
           </button>
        </div>
      </div>

      {/* Main Profile Header */}
      <div className="portal-card mb-8 p-8 flex flex-col md:flex-row items-center md:items-start gap-8 bg-surface-container-lowest shadow-lg">
        <div className="w-24 h-24 rounded-[32px] flex items-center justify-center text-3xl font-bold text-white shrink-0 bg-gradient-to-br from-primary to-primary-container shadow-2xl shadow-primary/20">
          {getInitials(candidate.name)}
        </div>
        <div className="flex-1 text-center md:text-left min-w-0">
           <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
             <h1 className="text-3xl font-bold text-on-surface leading-none">{candidate.name}</h1>
             {candidate.experience_years > 0 && (
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/10 text-[10px] font-black uppercase tracking-widest">
                 {formatExperience(candidate.experience_years)} Experience
               </span>
             )}
           </div>
           
           <div className="flex flex-wrap justify-center md:justify-start gap-y-2 gap-x-6 text-sm font-medium text-outline">
              {candidate.email && <div className="flex items-center gap-2"><Mail size={16} className="text-primary opacity-60" /> {candidate.email}</div>}
              {candidate.phone && <div className="flex items-center gap-2"><Phone size={16} className="text-primary opacity-60" /> {candidate.phone}</div>}
              {candidate.location && <div className="flex items-center gap-2"><MapPin size={16} className="text-primary opacity-60" /> {candidate.location}</div>}
           </div>

           <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
              <button onClick={startChat} disabled={chatLoading} className="btn-ai py-2.5 px-6 shadow-md">
                {chatLoading ? <Spinner size={18} /> : <Brain size={18} />}
                <span>AI Screening Session</span>
              </button>
              <Link to={`/interviews/schedule?candidateId=${id}`} className="btn-primary py-2.5 px-6 shadow-md">
                <Calendar size={18} />
                <span>Schedule Interview</span>
              </Link>
           </div>
        </div>

        {/* Dynamic Match Score UI */}
        {topMatch && (
           <div className="hidden lg:flex flex-col items-end gap-3 shrink-0">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-1">Overall Match</p>
                <div className="text-4xl font-black font-display" style={{ color: getScoreColor(topMatch.overall_score) }}>
                   {Math.round(topMatch.overall_score)}%
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary/10 border border-tertiary/20">
                 <Sparkles size={12} className="text-tertiary" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-tertiary">Strong Match</span>
              </div>
           </div>
        )}
      </div>

      {/* Profile Detail Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Summary & Quick Metadata */}
        <div className="space-y-8">
           {/* Profile Bio */}
           <div className="portal-card p-6 bg-surface-container-lowest shadow-md">
              <div className="flex items-center gap-3 mb-5 border-b border-outline-variant pb-4">
                 <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary shadow-inner">
                   <Sparkles size={16} />
                 </div>
                 <h3 className="text-sm font-bold uppercase tracking-widest">Profile Bio</h3>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed font-medium italic opacity-90">
                 "{candidate.summary || 'No professional summary detected during profile vectorization.'}"
              </p>
           </div>

           {/* Core Metrics Grid */}
           <div className="grid grid-cols-2 gap-4">
              {[
                { val: formatExperience(candidate.experience_years) || '0y', label: 'Experience', icon: Briefcase },
                { val: allSkills.length, label: 'Verified Skills', icon: Award },
                { val: positions.length, label: 'Past Roles', icon: TrendingUp },
                { val: degrees.length, label: 'Edu Degrees', icon: GraduationCap },
              ].map(({ val, label, icon: Icon }) => (
                <div key={label} className="portal-card p-5 bg-surface-container-lowest flex flex-col items-center text-center shadow-sm">
                  <Icon size={16} className="text-outline mb-3 opacity-40" />
                  <p className="text-xl font-bold text-on-surface leading-none mb-1">{val}</p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-outline">{label}</p>
                </div>
              ))}
           </div>

           {/* Source File Info */}
           <div className="portal-card p-6 bg-surface-container-low border-dashed">
              <div className="flex items-center gap-3 mb-4 text-primary">
                <FileText size={18} />
                <h3 className="text-[11px] font-black uppercase tracking-widest">Source Document</h3>
              </div>
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant flex items-center justify-between group cursor-pointer hover:border-primary transition-all shadow-inner">
                 <div className="min-w-0">
                    <p className="text-xs font-bold text-on-surface truncate">{candidate.cv_filename || 'Candidate_Resume.pdf'}</p>
                    <p className="text-[10px] text-outline font-medium mt-0.5">Vectorized on {formatDate(candidate.created_at)}</p>
                 </div>
                 <ChevronRight size={16} className="text-outline group-hover:text-primary transition-colors" />
              </div>
           </div>
        </div>

        {/* Right Side: Deep Analysis & Timeline */}
        <div className="lg:col-span-2 space-y-8">
           
           {/* Detailed AI Talent Analysis Section */}
           {topMatch && (
              <div className="portal-card p-8 bg-surface-container shadow-xl border-primary/20 relative overflow-hidden">
                 <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                       <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20">
                          <Zap size={20} />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold text-on-surface">Intelligent Match Analysis</h3>
                          <p className="text-xs text-outline font-medium uppercase tracking-wider">Against: {topMatch.job?.title || 'Current Role Opening'}</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8">
                       <div className="flex flex-col items-center gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-inner">
                          <ScoreRing score={Math.round(topMatch.overall_score)} size={110} />
                          <div className="text-center">
                             <p className="text-[11px] font-black uppercase tracking-[0.2em] text-outline mb-1">AI Recommendation</p>
                             {(() => { 
                               const rec = getRecommendationLabel(topMatch.recommendation); 
                               return <span className={cn("text-sm font-bold", 
                                 rec.cls === 'badge-green' ? "text-tertiary" : 
                                 rec.cls === 'badge-yellow' ? "text-amber-500" : "text-primary"
                               )}>{rec.label}</span> 
                             })()}
                          </div>
                       </div>
                       <div className="space-y-4 py-2">
                          <AnimatedBar score={topMatch.skill_match_score}         label="Skill Overlap" icon={Target} />
                          <AnimatedBar score={topMatch.experience_match_score}    label="Experience Fit" icon={TrendingUp} />
                          <AnimatedBar score={topMatch.semantic_similarity_score} label="Role Alignment" icon={Brain} />
                          <AnimatedBar score={topMatch.llm_evaluation_score}      label="AI Confidence" icon={Sparkles} />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-5 rounded-2xl bg-tertiary/[0.03] border border-tertiary/10">
                          <p className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-3 flex items-center gap-1.5">
                             <CheckCircle size={14} className="fill-tertiary/10" /> Competitive Advantages
                          </p>
                          <ul className="space-y-2.5">
                             {(topMatch.strengths || []).slice(0, 3).map((s, i) => (
                               <li key={i} className="text-xs font-medium text-on-surface leading-relaxed">• {s}</li>
                             ))}
                          </ul>
                       </div>
                       <div className="p-5 rounded-2xl bg-error/[0.03] border border-error/10 opacity-90">
                          <p className="text-[10px] font-black uppercase tracking-widest text-error mb-3 flex items-center gap-1.5">
                             <XCircle size={14} className="fill-error/10" /> Qualification Gaps
                          </p>
                          <ul className="space-y-2.5">
                             {(topMatch.weaknesses || []).slice(0, 3).map((w, i) => (
                               <li key={i} className="text-xs font-medium text-on-surface leading-relaxed opacity-70">• {w}</li>
                             ))}
                          </ul>
                       </div>
                    </div>
                 </div>
                 <Brain size={240} className="absolute -right-24 -bottom-24 text-primary opacity-[0.03] pointer-events-none" />
              </div>
           )}

           {/* Professional History Timeline */}
           <div className="portal-card p-8 bg-surface-container-lowest shadow-md">
              <div className="flex items-center gap-3 mb-8 border-b border-outline-variant/30 pb-4">
                 <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shadow-inner">
                    <Briefcase size={18} />
                 </div>
                 <h3 className="text-lg font-bold text-on-surface uppercase tracking-tight">Employment History</h3>
              </div>
              <div className="space-y-0 relative">
                 {positions.length > 0 ? positions.map((pos, i) => (
                   <div key={i} className="relative flex gap-8 pb-10 last:pb-0 group/role">
                      {i < positions.length - 1 && <div className="absolute left-[19px] top-10 bottom-0 w-[1px] bg-outline-variant" />}
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 z-10 bg-surface-container-lowest border-2 border-outline-variant shadow-sm group-hover/role:border-primary transition-all">
                        <Briefcase size={16} className="text-outline group-hover/role:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                            <div>
                               <h4 className="text-base font-bold text-on-surface mb-0.5">{pos.title}</h4>
                               <p className="text-sm font-semibold text-primary">{pos.company}</p>
                            </div>
                            {pos.duration && (
                               <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-outline bg-surface-container px-3 py-1 rounded-full border border-outline-variant">
                                  <Clock size={12} /> {pos.duration}
                               </span>
                            )}
                         </div>
                         {pos.description && (
                            <p className="text-sm text-on-surface-variant leading-relaxed opacity-80 max-w-2xl">
                               {pos.description}
                            </p>
                         )}
                      </div>
                   </div>
                 )) : (
                   <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                      <Briefcase size={40} className="mb-4 text-outline" />
                      <p className="text-sm font-bold uppercase tracking-widest text-outline">No roles detected in CV</p>
                   </div>
                 )}
              </div>
           </div>

           {/* Skills Competency Sections */}
           <div className="portal-card p-8 bg-surface-container-lowest shadow-md">
              <div className="flex items-center gap-3 mb-8 border-b border-outline-variant/30 pb-4">
                 <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                    <TrendingUp size={18} />
                 </div>
                 <h3 className="text-lg font-bold text-on-surface uppercase tracking-tight">Competency Profile</h3>
              </div>
              
              <div className="space-y-8">
                 {allSkills.length > 0 && (
                   <div>
                      <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-4 pl-1">Hard Skills & Frameworks</p>
                      <div className="flex flex-wrap gap-2.5">
                         {allSkills.map((s, i) => (
                           <span key={i} className="text-[11px] font-bold px-3.5 py-1.5 rounded-xl bg-surface-container text-primary border border-outline-variant/40 hover:border-primary hover:bg-primary/5 transition-all cursor-default">
                              {s}
                           </span>
                         ))}
                      </div>
                   </div>
                 )}
                 {softSkills.length > 0 && (
                   <div>
                      <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-4 pl-1">Soft Skills & Leadership</p>
                      <div className="flex flex-wrap gap-2.5">
                         {softSkills.map((s, i) => (
                           <span key={i} className="text-[11px] font-bold px-3.5 py-1.5 rounded-xl bg-surface-container-low text-on-surface-variant border border-transparent hover:border-outline transition-all cursor-default opacity-80">
                              {s}
                           </span>
                         ))}
                      </div>
                   </div>
                 )}
              </div>
           </div>

           {/* Academic Background */}
           {degrees.length > 0 && (
              <div className="portal-card p-8 bg-surface-container-lowest shadow-md">
                 <div className="flex items-center gap-3 mb-8 border-b border-outline-variant/30 pb-4">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                       <GraduationCap size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-on-surface uppercase tracking-tight">Academic History</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {degrees.map((deg, i) => (
                      <div key={i} className="flex items-center gap-5 p-4 rounded-2xl border border-outline-variant bg-surface-container-low hover:border-primary transition-all group/edu">
                         <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-surface-container-lowest border border-outline-variant group-hover/edu:bg-primary group-hover/edu:text-on-primary transition-all">
                            <GraduationCap size={20} />
                         </div>
                         <div className="min-w-0">
                            <p className="text-sm font-bold text-on-surface truncate leading-tight mb-1">{deg.degree}</p>
                            <p className="text-xs font-medium text-outline truncate">{deg.institution}</p>
                            {deg.year && <p className="text-[10px] font-black text-primary uppercase mt-1.5">{deg.year}</p>}
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           )}

           {/* Final Call to Action */}
           <div className="portal-card p-8 bg-gradient-to-br from-primary to-primary-container border-none shadow-2xl relative overflow-hidden group">
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Advance Candidate to Screening?</h3>
                  <p className="text-sm text-on-primary-container opacity-80 max-w-md font-medium leading-relaxed">
                    Initiate an autonomous AI screening session with {candidate.name} to verify their capabilities and communication style.
                  </p>
                </div>
                <button onClick={startChat} disabled={chatLoading}
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-[20px] text-primary bg-white font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-2xl flex-shrink-0"
                >
                  {chatLoading ? <Spinner size={18} /> : <MessageSquare size={18} className="fill-primary/10" />}
                  <span>Begin AI Screening</span>
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-all duration-700" />
           </div>
        </div>
      </div>

      <ConfirmationModal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        onConfirm={confirmDelete} 
        loading={deleting} 
        title="Delete Candidate Record" 
        message={`Are you sure you want to permanently remove ${candidate?.name} from your talent pool? This action cannot be undone.`} 
      />
    </div>
  )
}
