import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Briefcase, Building, MapPin, Clock, Trash2,
  ChevronRight, X, Sparkles, Wand2, Copy, Check, ArrowRight,
  FileText, Zap, RotateCcw, ChevronDown, ChevronUp
} from 'lucide-react'
import { jobsApi } from '../services/api'
import { Spinner, EmptyState, SkeletonCard, Badge, TagList } from '../components/ui'
import { formatRelativeTime, truncate } from '../utils/helpers'
import toast from 'react-hot-toast'

// ── Create Job Modal ──────────────────────────────────────────────────────────
function CreateJobModal({ onClose, onCreated, prefillDescription }) {
  const [form, setForm] = useState({
    title: '', company: '', location: '',
    job_type: 'full-time', description: prefillDescription || ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (prefillDescription) setForm(p => ({ ...p, description: prefillDescription }))
  }, [prefillDescription])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.description) return
    setLoading(true)
    try {
      const res = await jobsApi.create(form)
      toast.success('Job created and analyzed by AI!')
      onCreated(res.data)
      onClose()
    } catch {}
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}>
      <div className="w-full max-w-2xl rounded-3xl p-6 space-y-5 animate-scaleIn max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--modal-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Briefcase size={16} className="text-white" />
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
              Create New Job
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Job Title *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="input-field" placeholder="e.g. Senior React Developer" required />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Company</label>
              <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                className="input-field" placeholder="e.g. Acme Corp" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Location</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                className="input-field" placeholder="e.g. Remote, New York" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Job Type</label>
              <select value={form.job_type} onChange={e => setForm(p => ({ ...p, job_type: e.target.value }))}
                className="input-field" style={{ background: 'var(--input-bg)' }}>
                {['full-time', 'part-time', 'contract', 'freelance', 'internship'].map(t => (
                  <option key={t} value={t} style={{ background: 'var(--bg-secondary)' }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Job Description *</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="input-field min-h-[180px] resize-none"
              placeholder="Paste or generate the full job description here..." required />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
              {loading ? <><Spinner size={14} /> Processing with AI...</> : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── AI JD Maker Panel ─────────────────────────────────────────────────────────
const EXAMPLE_FORMAT = `Role Title: Senior Full Stack Developer
Company: TechCorp Solutions
Industry: FinTech / SaaS
Experience: 4-6 years
Location: Remote (India / US)
Job Type: Full-time
Key Skills: React, Node.js, PostgreSQL, AWS, TypeScript
Notes: Must have experience with microservices and agile teams`

const FIELD_EXAMPLES = {
  role_title:       'e.g. Senior Full Stack Developer',
  company:          'e.g. TechCorp Solutions',
  industry:         'e.g. FinTech, SaaS, Healthcare',
  experience_years: 'e.g. 3-5 years',
  location:         'e.g. Remote, Bangalore, New York',
  job_type:         'e.g. Full-time, Contract',
  key_skills:       'e.g. React, Node.js, AWS, PostgreSQL',
  extra_notes:      'e.g. Startup culture, agile team, equity offered',
}

function AIJDMaker({ onUseJD }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('form') // 'format' | 'form'
  const [form, setForm] = useState({
    role_title: '', company: '', industry: '', experience_years: '',
    location: '', job_type: '', key_skills: '', extra_notes: ''
  })
  const [generating, setGenerating] = useState(false)
  const [generatedJD, setGeneratedJD] = useState('')
  const [copied, setCopied] = useState(false)
  const jdRef = useRef(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const generate = async () => {
    if (!form.role_title.trim()) { toast.error('Role title is required'); return }
    setGenerating(true)
    setGeneratedJD('')
    try {
      const res = await jobsApi.generateJD(form)
      setGeneratedJD(res.data.jd)
      toast.success('JD generated successfully!')
      setTimeout(() => jdRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch { toast.error('Failed to generate JD') }
    finally { setGenerating(false) }
  }

  const copyJD = () => {
    navigator.clipboard.writeText(generatedJD)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => {
    setGeneratedJD('')
    setForm({ role_title: '', company: '', industry: '', experience_years: '', location: '', job_type: '', key_skills: '', extra_notes: '' })
  }

  const fields = [
    { key: 'role_title',       label: 'Role Title *',       span: 2 },
    { key: 'company',          label: 'Company',             span: 1 },
    { key: 'industry',         label: 'Industry',            span: 1 },
    { key: 'experience_years', label: 'Experience Required', span: 1 },
    { key: 'location',         label: 'Location',            span: 1 },
    { key: 'job_type',         label: 'Job Type',            span: 1 },
    { key: 'key_skills',       label: 'Key Skills',          span: 1 },
    { key: 'extra_notes',      label: 'Additional Notes',    span: 2 },
  ]

  return (
    <div className="mb-6 rounded-3xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>

      {/* Header — always visible */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-5 py-4 transition-all group"
        style={{ background: open ? 'var(--bg-card-hover)' : 'transparent' }}
      >
        <div className="flex items-center gap-3">
          {/* Animated icon */}
          <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
            <Wand2 size={18} className="text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2"
              style={{ borderColor: 'var(--bg-card)', boxShadow: '0 0 6px #34d399' }} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                AI Job Description Maker
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.2))', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                ✨ Powered by AI
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Fill in a few details — get a complete, professional JD in seconds
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!open && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full hidden sm:block"
              style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', color: '#fff' }}>
              Generate JD
            </span>
          )}
          <div className="w-7 h-7 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
      </button>

      {/* Expandable body */}
      {open && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--border)' }}>

          {/* Mode tabs */}
          <div className="flex gap-2 mt-4 mb-5">
            {[
              { id: 'form',   label: '📝 Fill Form',      desc: 'Guided fields' },
              { id: 'format', label: '📋 Example Format', desc: 'See what to provide' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setMode(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all"
                style={mode === tab.id
                  ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.15))', color: '#818cf8', border: '1px solid rgba(99,102,241,0.4)' }
                  : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                }>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Example Format tab */}
          {mode === 'format' && (
            <div className="space-y-4">
              <div className="rounded-2xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={14} style={{ color: 'var(--accent-cyan)' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Example Input Format
                  </span>
                </div>
                <pre className="text-sm leading-7 whitespace-pre-wrap font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {EXAMPLE_FORMAT}
                </pre>
              </div>
              <div className="rounded-2xl p-4" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#818cf8' }}>💡 What AI generates from this:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['About the Role', 'Key Responsibilities', 'Required Qualifications', 'Preferred Qualifications', 'What We Offer', 'About the Company'].map(s => (
                    <div key={s} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <Check size={11} style={{ color: 'var(--success-text)' }} /> {s}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setMode('form')} className="btn-primary w-full">
                <Wand2 size={14} /> Start Generating →
              </button>
            </div>
          )}

          {/* Form tab */}
          {mode === 'form' && (
            <div className="space-y-5">
              {!generatedJD ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fields.map(({ key, label, span }) => (
                      <div key={key} className={span === 2 ? 'sm:col-span-2' : ''}>
                        <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                          {label}
                        </label>
                        {key === 'extra_notes' ? (
                          <textarea
                            value={form[key]}
                            onChange={e => set(key, e.target.value)}
                            className="input-field resize-none"
                            style={{ minHeight: 72 }}
                            placeholder={FIELD_EXAMPLES[key]}
                          />
                        ) : (
                          <input
                            value={form[key]}
                            onChange={e => set(key, e.target.value)}
                            className="input-field"
                            placeholder={FIELD_EXAMPLES[key]}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={generate}
                    disabled={generating || !form.role_title.trim()}
                    className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: generating ? 'var(--bg-card)' : 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
                      color: generating ? 'var(--text-secondary)' : '#fff',
                      boxShadow: generating ? 'none' : '0 0 30px rgba(99,102,241,0.4)',
                    }}
                  >
                    {generating ? (
                      <><Spinner size={16} /> Generating your JD with AI...</>
                    ) : (
                      <><Sparkles size={16} /> Generate Full Job Description</>
                    )}
                  </button>
                </>
              ) : (
                /* Generated JD output */
                <div ref={jdRef} className="space-y-4">
                  {/* Output header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px #34d399' }} />
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                        JD Generated Successfully
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={reset}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        <RotateCcw size={12} /> Regenerate
                      </button>
                      <button onClick={copyJD}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                        style={{ background: copied ? 'var(--success-bg)' : 'var(--tag-bg)', border: `1px solid ${copied ? 'var(--success-border)' : 'var(--tag-border)'}`, color: copied ? 'var(--success-text)' : 'var(--accent-cyan)' }}>
                        {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                      </button>
                    </div>
                  </div>

                  {/* JD preview */}
                  <div className="rounded-2xl p-5 max-h-80 overflow-y-auto"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <pre className="text-xs leading-6 whitespace-pre-wrap font-sans" style={{ color: 'var(--text-secondary)' }}>
                      {generatedJD}
                    </pre>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={reset} className="btn-ghost">
                      <RotateCcw size={14} /> Generate New
                    </button>
                    <button
                      onClick={() => onUseJD(generatedJD)}
                      className="h-10 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', color: '#fff', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}
                    >
                      <ArrowRight size={14} /> Use This JD
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Jobs Page ────────────────────────────────────────────────────────────
const JOB_TYPE_COLORS = { 'full-time': 'green', 'part-time': 'blue', 'contract': 'yellow', 'freelance': 'purple', 'internship': 'blue' }

export default function Jobs() {
  const [jobs, setJobs]           = useState([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [prefillJD, setPrefillJD] = useState('')

  const load = async (q = '') => {
    setLoading(true)
    try {
      const res = await jobsApi.list({ search: q || undefined, page_size: 50 })
      setJobs(res.data.jobs)
      setTotal(res.data.total)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const t = setTimeout(() => load(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return
    try {
      await jobsApi.delete(id)
      setJobs(p => p.filter(j => j.id !== id))
      toast.success('Job deleted')
    } catch {}
  }

  const handleUseJD = async (jd) => {
    // Auto-create job with generated JD
    const title = jd.split('\n')[0].replace(/^(Role Title:|Job Title:)/i, '').trim() || 'New Job Position'
    try {
      const res = await jobsApi.create({
        title,
        company: '',
        location: '',
        job_type: 'full-time',
        description: jd,
      })
      setJobs(p => [res.data, ...p])
      toast.success(`Job "${res.data.title}" created successfully!`)
    } catch {
      toast.error('Failed to create job')
    }
  }

  return (
    <div className="p-6 page-enter">
      {showModal && (
        <CreateJobModal
          onClose={() => { setShowModal(false); setPrefillJD('') }}
          onCreated={j => setJobs(p => [j, ...p])}
          prefillDescription={prefillJD}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
            Job Listings
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {total} job{total !== 1 ? 's' : ''} posted
          </p>
        </div>
        <button onClick={() => { setPrefillJD(''); setShowModal(true) }} className="btn-primary">
          <Plus size={16} /> New Job
        </button>
      </div>

      {/* AI JD Maker — inline panel */}
      <AIJDMaker onUseJD={handleUseJD} />

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-11 h-11"
          placeholder="Search jobs..."
        />
      </div>

      {/* Job cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description="Use the AI JD Maker above or create a job manually."
          action={<button onClick={() => setShowModal(true)} className="btn-primary">Create First Job</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
          {jobs.map(job => {
            const skills = [...(job.required_skills?.technical || []), ...(job.required_skills?.frameworks || [])].slice(0, 5)
            return (
              <div key={job.id} className="portal-card p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
                    <Briefcase size={18} style={{ color: 'var(--accent-cyan)' }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {job.job_type && <Badge variant={JOB_TYPE_COLORS[job.job_type] || 'blue'}>{job.job_type}</Badge>}
                    <Badge variant={job.status === 'active' ? 'green' : 'yellow'}>{job.status}</Badge>
                  </div>
                </div>

                <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                  {job.title}
                </h3>

                <div className="space-y-1 mb-3">
                  {job.company && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <Building size={11} /> {job.company}
                    </div>
                  )}
                  {job.location && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <MapPin size={11} /> {job.location}
                    </div>
                  )}
                  {job.required_experience_years && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <Clock size={11} /> {job.required_experience_years}+ years required
                    </div>
                  )}
                </div>

                <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                  {truncate(job.description, 100)}
                </p>

                {skills.length > 0 && <TagList tags={skills} max={4} />}

                <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatRelativeTime(job.created_at)}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDelete(job.id, job.title)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--error-text)'; e.currentTarget.style.background = 'var(--error-bg)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <Trash2 size={13} />
                    </button>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                      style={{ color: 'var(--accent-cyan)', background: 'var(--tag-bg)' }}
                    >
                      View <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
