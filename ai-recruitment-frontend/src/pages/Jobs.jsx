import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Filter, Briefcase, Building, MapPin, Clock, Trash2, RefreshCw,
  ChevronRight, X, Sparkles, Wand2, Copy, Check, ArrowRight,
  FileText, Zap, RotateCcw, ChevronDown, ChevronUp, UploadCloud
} from 'lucide-react'
import { jobsApi } from '../services/api'
import { Spinner, EmptyState, SkeletonCard, Badge, TagList } from '../components/ui'
import { formatRelativeTime, truncate, formatDate } from '../utils/helpers'
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
                      onClick={() => {
                        onUseJD({
                          description: generatedJD,
                          title: form.role_title,
                          company: form.company,
                          location: form.location,
                          job_type: form.job_type || 'full-time',
                          required_experience_years: parseFloat(form.experience_years) || null
                        });
                        setOpen(false);
                        reset();
                      }}
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

// ── JD Uploader Panel ────────────────────────────────────────────────────────
function JDUploader({ onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    setUploading(true)
    setProgress(0)
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))

    try {
      const res = await jobsApi.uploadJds(formData, (p) => setProgress(p))
      toast.success(res.data.message)
      if (res.data.data?.created_jobs?.length) {
        onUploaded(res.data.data.created_jobs)
      }
      if (res.data.data?.errors?.length) {
        res.data.data.errors.forEach(err => {
          toast.error(`Failed to process ${err.filename}: ${err.error}`)
        })
      }
    } catch (err) {
      console.error('JD Upload Error:', err)
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="mb-6 p-5 rounded-3xl border border-dashed transition-all flex flex-col items-center justify-center text-center group"
      style={{ 
        background: 'rgba(99, 102, 241, 0.03)', 
        borderColor: uploading ? 'var(--accent-cyan)' : 'var(--border)',
      }}>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.docx,.doc,.txt"
      />
      
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-600/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
        <UploadCloud size={24} className="text-blue-500" />
      </div>

      <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Bulk Publish via JD Upload
      </h4>
      <p className="text-xs mb-4 max-w-sm" style={{ color: 'var(--text-muted)' }}>
        Upload one or more JD files (PDF, DOCX). AI will automatically parse and publish them as job openings.
      </p>

      {uploading ? (
        <div className="w-full max-w-xs space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            <span>Processing JDs...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary py-2 px-6 h-auto text-xs"
        >
          Select JD Files
        </button>
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

  const handleUseJD = async (jobData) => {
    // Auto-create job with generated data from AI
    try {
      const res = await jobsApi.create(jobData)
      setJobs(p => [res.data, ...p])
      setTotal(prev => prev + 1)
      toast.success('Job Created Successfully')
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Network Error: Failed to create job'
      toast.error(msg)
      console.error('JD Creation Error:', err)
    }
  }

  const handleJDUploaded = (newJobs) => {
    // We need to refresh the list to get full job objects or we can just reload
    load()
  }

  return (
    <div className="page-enter">
      {showModal && (
        <CreateJobModal
          onClose={() => { setShowModal(false); setPrefillJD('') }}
          onCreated={j => setJobs(p => [j, ...p])}
          prefillDescription={prefillJD}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-1">Active Openings</h2>
          <p className="text-on-surface-variant text-sm opacity-70">
            {total} position{total !== 1 ? 's' : ''} currently being filled
          </p>
        </div>
        <button onClick={() => { setPrefillJD(''); setShowModal(true) }} className="btn-primary">
          <Plus size={18} />
          <span>New Job Opening</span>
        </button>
      </div>

      {/* AI Tools Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <AIJDMaker onUseJD={handleUseJD} />
        </div>
        <div>
          <JDUploader onUploaded={handleJDUploaded} />
        </div>
      </div>

      {/* Search & Actions */}
      <div className="portal-card mb-6 p-2 flex flex-col md:flex-row gap-4 bg-surface-container-lowest">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-70" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-surface-container-low border border-transparent rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
            placeholder="Search by job title, company, or keyword..."
          />
        </div>
        <div className="flex gap-2 px-2 pb-2 md:pb-0">
           <button className="btn-secondary py-2 flex items-center gap-2">
             <Filter size={16} />
             <span>Status</span>
           </button>
           <button className="btn-secondary py-2 flex items-center gap-2">
             <RefreshCw size={16} className={loading ? 'animate-spin' : ''} onClick={() => load(search)} />
           </button>
        </div>
      </div>

      {/* Job cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="portal-card p-20 text-center">
          <EmptyState
            icon={Briefcase}
            title="No job openings found"
            description={search ? `No jobs match "${search}"` : "You haven't posted any jobs yet. Use the AI JD Maker to get started."}
            action={!search && <button onClick={() => setShowModal(true)} className="btn-primary">Create First Job</button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
          {jobs.map(job => {
            const skills = [...(job.required_skills?.technical || []), ...(job.required_skills?.frameworks || [])].slice(0, 4)
            return (
              <div key={job.id} className="portal-card p-6 group flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-container-low border border-outline-variant shadow-sm group-hover:border-primary transition-all">
                    <Briefcase size={22} className="text-primary" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-outline px-2 py-0.5 rounded-full border border-outline-variant bg-surface-container-low">
                      {job.job_type || 'Full-time'}
                    </span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary/10 border border-tertiary/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary">{job.status || 'Active'}</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">
                  {job.title}
                </h3>

                <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 opacity-70">
                  {job.company && (
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <Building size={14} className="text-outline" /> {job.company}
                    </div>
                  )}
                  {job.location && (
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <MapPin size={14} className="text-outline" /> {job.location}
                    </div>
                  )}
                </div>

                <p className="text-sm text-on-surface-variant mb-5 line-clamp-3 leading-relaxed">
                  {truncate(job.description, 140)}
                </p>

                <div className="mt-auto pt-4 border-t border-outline-variant/50">
                   <div className="flex flex-wrap gap-1.5 mb-5">
                      {skills.length > 0 ? (
                        skills.map((sk, j) => (
                          <span key={j} className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container text-primary uppercase">
                            {sk}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-outline italic">No skills defined</span>
                      )}
                   </div>
                   
                   <div className="flex items-center justify-between">
                     <span className="text-[11px] font-bold text-outline uppercase tracking-wider">
                       Posted {formatDate(job.created_at)}
                     </span>
                     <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(job.id, job.title)}
                          className="p-2 text-outline hover:text-error hover:bg-error/5 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                        <Link
                          to={`/jobs/${job.id}`}
                          className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs"
                        >
                          <span>Manage</span>
                          <ChevronRight size={14} />
                        </Link>
                     </div>
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
