import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Zap, CheckCircle, XCircle, GraduationCap, Briefcase, Mail, Phone, MapPin, Trash2, Award, FileText, TrendingUp, Sparkles, ChevronRight, Clock, Calendar } from 'lucide-react'
import { candidatesApi, matchingApi, chatApi } from '../services/api'
import { ScoreRing, ScoreBar, Spinner, EmptyState, ConfirmationModal } from '../components/ui'
import { formatDate, getInitials, getScoreColor, getRecommendationLabel, formatExperience } from '../utils/helpers'
import toast from 'react-hot-toast'

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="portal-card p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
          <Icon size={15} style={{ color: 'var(--accent-cyan)' }} />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function SkillPill({ label, variant = 'blue' }) {
  return <span className={`badge badge-${variant} text-xs`}>{label}</span>
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

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await candidatesApi.delete(id)
      toast.success('Candidate deleted permanently')
      navigate('/candidates')
    } catch { toast.error('Failed to delete candidate'); setDeleting(false); setShowDeleteModal(false) }
  }

  useEffect(() => {
    Promise.all([
      candidatesApi.get(id),
      matchingApi.getCandidateMatches(id).catch(() => ({ data: [] })),
    ]).then(([cRes, mRes]) => {
      setCandidate(cRes.data)
      setMatches(Array.isArray(mRes.data) ? mRes.data : [])
    }).catch(() => toast.error('Failed to load candidate'))
      .finally(() => setLoading(false))
  }, [id])

  const startChat = async () => {
    setChatLoading(true)
    try {
      const res = await chatApi.createSession({ candidate_id: id, title: `Screening: ${candidate?.name}` })
      navigate(`/chat/${res.data.id}`)
    } catch { toast.error('Failed to start chat') }
    finally { setChatLoading(false) }
  }

  if (loading) return <div className="p-8 flex items-center justify-center h-64"><Spinner size={32} /></div>
  if (!candidate) return <div className="p-8"><EmptyState icon={Briefcase} title="Candidate not found" description="This candidate may have been deleted." /></div>

  const allSkills = [...(candidate.skills?.technical || []), ...(candidate.skills?.frameworks || []), ...(candidate.skills?.tools || [])]
  const softSkills = candidate.skills?.soft || []
  const positions = candidate.experience_details?.positions || []
  const degrees = candidate.education?.degrees || []
  const topMatch = matches[0]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)' }}>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="relative px-6 pt-5 pb-6">
          <Link to="/candidates" className="inline-flex items-center gap-1.5 text-sm mb-5 transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}>
            <ArrowLeft size={15} /> Back to Candidates
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.3)' }}>
              {getInitials(candidate.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>{candidate.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {candidate.email && <span className="flex items-center gap-1.5"><Mail size={13} />{candidate.email}</span>}
                {candidate.phone && <span className="flex items-center gap-1.5"><Phone size={13} />{candidate.phone}</span>}
                {candidate.location && <span className="flex items-center gap-1.5"><MapPin size={13} />{candidate.location}</span>}
                {candidate.experience_years > 0 && <span className="flex items-center gap-1.5"><Briefcase size={13} />{formatExperience(candidate.experience_years)} exp</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setShowDeleteModal(true)} disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ color: 'rgba(255,100,100,0.9)', border: '1px solid rgba(255,100,100,0.3)', background: 'rgba(255,100,100,0.1)' }}>
                <Trash2 size={14} /> Delete
              </button>
              <button onClick={startChat} disabled={chatLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)' }}>
                {chatLoading ? <Spinner size={14} /> : <MessageSquare size={14} />} AI Screen
              </button>
              <Link to={`/interviews/schedule?candidateId=${id}`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)' }}>
                <Calendar size={14} /> Schedule Interview
              </Link>
              <Link to="/matching" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg"
                style={{ background: '#fff', color: '#1d4ed8' }}>
                <Zap size={14} /> Match to Job
              </Link>
            </div>
          </div>
        </div>
        {topMatch && (
          <div className="relative px-6 pb-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-0">
              {[
                { label: 'Overall',    val: topMatch.overall_score },
                { label: 'Skills',     val: topMatch.skill_match_score },
                { label: 'Experience', val: topMatch.experience_match_score },
                { label: 'Semantic',   val: topMatch.semantic_similarity_score },
              ].map(({ label, val }) => (
                <div key={label} className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</p>
                  <p className="text-xl font-bold" style={{ color: getScoreColor(Math.round(val)), fontFamily: 'Inter, sans-serif' }}>{Math.round(val)}%</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <svg viewBox="0 0 1440 24" className="w-full mt-4" preserveAspectRatio="none" style={{ height: 24 }}>
          <path d="M0,24 C360,0 1080,0 1440,24 L1440,24 L0,24 Z" fill="var(--bg-primary)" />
        </svg>
      </div>

      {/* Body */}
      <div className="px-6 py-5 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger">

          {/* Left */}
          <div className="space-y-4">
            {candidate.summary && (
              <SectionCard title="Summary" icon={Sparkles}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{candidate.summary}</p>
              </SectionCard>
            )}
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: formatExperience(candidate.experience_years) ?? '—', label: 'Experience' },
                { val: allSkills.length, label: 'Skills' },
                { val: positions.length, label: 'Positions' },
                { val: degrees.length, label: 'Degrees' },
              ].map(({ val, label }) => (
                <div key={label} className="portal-card p-4 text-center">
                  <p className="text-2xl font-bold mb-0.5" style={{ color: 'var(--accent-cyan)', fontFamily: 'Inter, sans-serif' }}>{val}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>
            {(candidate.languages?.length > 0 || candidate.certifications?.length > 0) && (
              <SectionCard title="Languages & Certs" icon={Award}>
                {candidate.languages?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Languages</p>
                    <div className="flex flex-wrap gap-1.5">{candidate.languages.map((l, i) => <SkillPill key={i} label={l} variant="purple" />)}</div>
                  </div>
                )}
                {candidate.certifications?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Certifications</p>
                    <div className="space-y-1.5">
                      {candidate.certifications.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <CheckCircle size={13} style={{ color: 'var(--success-text)' }} className="flex-shrink-0" />{c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            )}
            <div className="portal-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
                <FileText size={18} style={{ color: 'var(--accent-cyan)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{candidate.cv_filename}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(candidate.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-2 space-y-4">
            {/* Skills */}
            <SectionCard title="Skills" icon={TrendingUp}>
              {allSkills.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Technical · Frameworks · Tools</p>
                  <div className="flex flex-wrap gap-1.5">{allSkills.map((s, i) => <SkillPill key={i} label={s} variant="blue" />)}</div>
                </div>
              )}
              {softSkills.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Soft Skills</p>
                  <div className="flex flex-wrap gap-1.5">{softSkills.map((s, i) => <SkillPill key={i} label={s} variant="purple" />)}</div>
                </div>
              )}
              {allSkills.length === 0 && softSkills.length === 0 && <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No skills extracted yet.</p>}
            </SectionCard>

            {/* AI Analysis */}
            {topMatch && (
              <SectionCard title="AI Talent Analysis" icon={Sparkles}>
                <div className="flex items-center gap-5 mb-5 p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <ScoreRing score={Math.round(topMatch.overall_score)} size={80} />
                  <div className="flex-1">
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Recommendation</p>
                    {(() => { const rec = getRecommendationLabel(topMatch.recommendation); return <span className={`badge badge-${rec.cls.replace('badge-', '')} text-sm`}>{rec.label}</span> })()}
                    {topMatch.explanation && <p className="text-xs mt-2 leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{topMatch.explanation}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
                  <ScoreBar score={topMatch.skill_match_score}         label="Skill Match" />
                  <ScoreBar score={topMatch.experience_match_score}    label="Experience Match" />
                  <ScoreBar score={topMatch.semantic_similarity_score} label="Semantic Fit" />
                  <ScoreBar score={topMatch.llm_evaluation_score}      label="AI Evaluation" />
                </div>
                {(topMatch.strengths?.length > 0 || topMatch.weaknesses?.length > 0) && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {topMatch.strengths?.length > 0 && (
                      <div className="p-3 rounded-2xl" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
                        <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: 'var(--success-text)' }}><CheckCircle size={12} /> Strengths</p>
                        <ul className="space-y-1">{topMatch.strengths.slice(0, 4).map((s, i) => <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--success-text)' }}><span className="mt-0.5 flex-shrink-0">✓</span>{s}</li>)}</ul>
                      </div>
                    )}
                    {topMatch.weaknesses?.length > 0 && (
                      <div className="p-3 rounded-2xl" style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
                        <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: 'var(--error-text)' }}><XCircle size={12} /> Gaps</p>
                        <ul className="space-y-1">{topMatch.weaknesses.slice(0, 4).map((w, i) => <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--error-text)' }}><span className="mt-0.5 flex-shrink-0">✗</span>{w}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}
                {(topMatch.matched_skills?.length > 0 || topMatch.missing_skills?.length > 0) && (
                  <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                    {topMatch.matched_skills?.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Matched Skills</p><div className="flex flex-wrap gap-1.5">{topMatch.matched_skills.slice(0, 8).map((s, i) => <SkillPill key={i} label={s} variant="green" />)}</div></div>}
                    {topMatch.missing_skills?.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Missing Skills</p><div className="flex flex-wrap gap-1.5">{topMatch.missing_skills.slice(0, 8).map((s, i) => <SkillPill key={i} label={s} variant="red" />)}</div></div>}
                  </div>
                )}
              </SectionCard>
            )}

            {/* Work Experience */}
            {positions.length > 0 && (
              <SectionCard title="Work Experience" icon={Briefcase}>
                <div className="space-y-0">
                  {positions.map((pos, i) => (
                    <div key={i} className="relative flex gap-4 pb-5 last:pb-0">
                      {i < positions.length - 1 && <div className="absolute left-[19px] top-8 bottom-0 w-px" style={{ background: 'var(--border)' }} />}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 z-10" style={{ background: 'var(--tag-bg)', border: '2px solid var(--tag-border)' }}>
                        <Briefcase size={14} style={{ color: 'var(--accent-cyan)' }} />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{pos.title}</p>
                            <p className="text-xs font-semibold" style={{ color: 'var(--accent-cyan)' }}>{pos.company}</p>
                          </div>
                          {pos.duration && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg flex-shrink-0" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                              <Clock size={10} /> {pos.duration}
                            </span>
                          )}
                        </div>
                        {pos.description && <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}>{pos.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Education */}
            {degrees.length > 0 && (
              <SectionCard title="Education" icon={GraduationCap}>
                <div className="space-y-3">
                  {degrees.map((deg, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl transition-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
                        <GraduationCap size={16} style={{ color: 'var(--accent-violet)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{deg.degree}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{deg.institution}</p>
                      </div>
                      {deg.year && <span className="text-xs font-semibold px-2.5 py-1 rounded-lg flex-shrink-0" style={{ background: 'var(--tag-bg)', color: 'var(--accent-violet)', border: '1px solid rgba(167,139,250,0.2)' }}>{deg.year}</span>}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* CTA */}
            <div className="portal-card p-5" style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', border: 'none' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>Ready to screen {candidate.name}?</h3>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Start an AI-powered interview screening session.</p>
                </div>
                <button onClick={startChat} disabled={chatLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg flex-shrink-0"
                  style={{ background: '#fff', color: '#1d4ed8' }}>
                  {chatLoading ? <Spinner size={14} /> : <MessageSquare size={14} />}
                  Start Chat <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={confirmDelete} loading={deleting} title="Delete Candidate" message={`Are you sure you want to delete ${candidate?.name}? This will permanently remove their CV, AI analysis, and all match history.`} />
    </div>
  )
}
