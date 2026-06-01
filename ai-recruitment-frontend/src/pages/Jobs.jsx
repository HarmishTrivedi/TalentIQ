import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Briefcase, Building, MapPin, Trash2, RefreshCw,
  ChevronRight, X, Sparkles, Wand2, Copy, Check, ArrowRight,
  RotateCcw, ChevronDown, UploadCloud
} from 'lucide-react'
import { jobsApi } from '../services/api'
import { Spinner } from '../components/ui'
import { formatDate, truncate, cn } from '../utils/helpers'
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
      style={{ background: 'rgba(13,28,46,0.7)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <Briefcase size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-on-surface">Create New Job</h3>
              <p className="text-xs text-on-surface-variant">Define your next great hire</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-surface-container transition-all text-outline hover:text-on-surface">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-outline mb-2 block">Job Title *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full h-12 px-4 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface placeholder:text-outline outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                placeholder="e.g. Senior React Developer" required />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-outline mb-2 block">Company</label>
              <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                className="w-full h-12 px-4 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface placeholder:text-outline outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                placeholder="e.g. Acme Corp" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-outline mb-2 block">Location</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                className="w-full h-12 px-4 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface placeholder:text-outline outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                placeholder="e.g. Remote, New York" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-outline mb-2 block">Job Type</label>
              <select value={form.job_type} onChange={e => setForm(p => ({ ...p, job_type: e.target.value }))}
                className="w-full h-12 px-4 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface outline-none focus:border-primary transition-all">
                {['full-time', 'part-time', 'contract', 'freelance', 'internship'].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-outline mb-2 block">Job Description *</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full p-4 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface placeholder:text-outline outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all min-h-[180px] resize-none"
              placeholder="Paste or generate the full job description here..." required />
          </div>
          <div className="flex gap-4 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-12 rounded-xl font-semibold text-sm text-on-surface-variant hover:bg-surface-container transition-all border border-outline-variant">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 h-12 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary-container shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {loading ? <><Spinner size={16} /> Processing with AI...</> : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── AI JD Maker Panel ─────────────────────────────────────────────────────────
function AIJDMaker({ onUseJD }) {
  const [open, setOpen] = useState(false)
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
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim() !== ''))
      const res = await jobsApi.generateJD(payload)
      setGeneratedJD(res.data.jd)
      toast.success('JD generated!')
      setTimeout(() => jdRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch { toast.error('Failed to generate JD') }
    finally { setGenerating(false) }
  }

  const copyJD = () => {
    navigator.clipboard.writeText(generatedJD)
    setCopied(true)
    toast.success('Copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => {
    setGeneratedJD('')
    setForm({ role_title: '', company: '', industry: '', experience_years: '', location: '', job_type: '', key_skills: '', extra_notes: '' })
  }

  const fields = [
    { key: 'role_title',       label: 'Role Title',          required: true,  span: 2, placeholder: 'e.g. Senior Full Stack Developer' },
    { key: 'company',          label: 'Company',             required: false, span: 1, placeholder: 'e.g. TechCorp Solutions' },
    { key: 'industry',         label: 'Industry',            required: false, span: 1, placeholder: 'e.g. FinTech, SaaS' },
    { key: 'experience_years', label: 'Experience Required', required: false, span: 1, placeholder: 'e.g. 3-5 years' },
    { key: 'location',         label: 'Location',            required: false, span: 1, placeholder: 'e.g. Remote, New York' },
    { key: 'job_type',         label: 'Job Type',            required: false, span: 1, placeholder: 'e.g. Full-time, Contract' },
    { key: 'key_skills',       label: 'Key Skills',          required: false, span: 1, placeholder: 'e.g. React, Node.js, AWS' },
    { key: 'extra_notes',      label: 'Additional Notes',    required: false, span: 2, textarea: true, placeholder: 'e.g. Startup culture, agile team' },
  ]

  const filledCount = Object.values(form).filter(v => v.trim()).length

  return (
    <div className={cn('mb-6 border border-outline-variant rounded-xl overflow-hidden transition-all', open ? 'bg-surface-container-low' : 'bg-surface-container-lowest hover:bg-surface-container-low')}>
      <button onClick={() => setOpen(p => !p)} className="w-full flex items-center justify-between px-6 py-4 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Wand2 size={18} className="text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-on-surface">AI Job Description Maker</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-black bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest">✨ AI</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {filledCount > 0 ? `${filledCount} field${filledCount > 1 ? 's' : ''} filled` : 'Provide minimal details — AI builds the complete JD'}
            </p>
          </div>
        </div>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant text-outline transition-transform', open ? 'rotate-180' : '')}>
          <ChevronDown size={16} />
        </div>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-outline-variant">
          {!generatedJD ? (
            <div className="pt-5 space-y-5">
              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <Sparkles size={15} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Only the <span className="text-primary font-bold">Role Title</span> is required — AI fills in the rest.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map(({ key, label, required, span, textarea, placeholder }) => (
                  <div key={key} className={span === 2 ? 'sm:col-span-2' : ''}>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-outline mb-1.5">
                      {label} {required && <span className="text-primary">*</span>}
                    </label>
                    {textarea ? (
                      <textarea value={form[key]} onChange={e => set(key, e.target.value)} rows={3} placeholder={placeholder}
                        className="w-full p-3 rounded-xl text-sm bg-surface-container-low border border-outline-variant text-on-surface placeholder:text-outline outline-none focus:border-primary transition-all resize-none" />
                    ) : (
                      <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
                        className="w-full h-11 px-4 rounded-xl text-sm bg-surface-container-low border border-outline-variant text-on-surface placeholder:text-outline outline-none focus:border-primary transition-all" />
                    )}
                  </div>
                ))}
              </div>
              <button onClick={generate} disabled={generating || !form.role_title.trim()}
                className="w-full h-12 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary-container transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                {generating ? <><Spinner size={16} /> Generating...</> : <><Sparkles size={16} /> Generate JD</>}
              </button>
            </div>
          ) : (
            <div ref={jdRef} className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-on-surface">JD Generated</span>
                <div className="flex gap-2">
                  <button onClick={reset} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-all">Regenerate</button>
                  <button onClick={copyJD} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border transition-all', copied ? 'text-tertiary border-tertiary/30 bg-tertiary/5' : 'text-primary border-primary/20 bg-primary/5')}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="rounded-xl p-5 max-h-72 overflow-y-auto bg-surface-container border border-outline-variant">
                <pre className="text-xs leading-7 whitespace-pre-wrap text-on-surface-variant">{generatedJD}</pre>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={reset} className="h-11 rounded-xl border border-outline-variant text-on-surface-variant font-bold text-xs hover:bg-surface-container transition-all">Discard</button>
                <button onClick={() => { onUseJD({ description: generatedJD, title: form.role_title }); setOpen(false); reset(); }}
                  className="h-11 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-container transition-all shadow-md">Use This JD</button>
              </div>
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
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    try {
      const res = await jobsApi.uploadJds(formData, (p) => setProgress(p))
      toast.success(res.data.message)
      if (res.data.data?.created_jobs?.length) onUploaded(res.data.data.created_jobs)
    } catch (err) { console.error(err) }
    finally { setUploading(false); setProgress(0) }
  }

  return (
    <div className="mb-6 p-6 rounded-xl border-2 border-dashed border-outline-variant hover:border-primary transition-all flex flex-col items-center justify-center text-center bg-surface-container-lowest hover:bg-surface-container-low group">
      <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.docx,.doc,.txt" />
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 border border-primary/20 group-hover:scale-110 transition-all">
        <UploadCloud size={24} className="text-primary" />
      </div>
      <h4 className="text-sm font-bold mb-1 text-on-surface">Bulk Ingestion</h4>
      <p className="text-xs mb-4 text-on-surface-variant">Drop PDF/DOCX job descriptions.</p>
      {uploading ? (
        <div className="w-full max-w-xs space-y-2">
          <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <button onClick={() => fileInputRef.current?.click()} className="h-9 px-6 rounded-lg bg-surface-container border border-outline-variant text-on-surface text-xs font-bold hover:bg-surface-container-high transition-all">
          Select Files
        </button>
      )}
    </div>
  )
}

// ── Main Jobs Page ────────────────────────────────────────────────────────────
export default function Jobs() {
  const [jobs, setJobs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [prefillJD, setPrefillJD] = useState('')

  const load = async (q = '') => {
    setLoading(true)
    try {
      const res = await jobsApi.list({ search: q || undefined, page_size: 50 })
      setJobs(res.data.jobs)
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
    try {
      const res = await jobsApi.create(jobData)
      setJobs(p => [res.data, ...p])
      toast.success('Job Created')
    } catch { toast.error('Failed to create job') }
  }

  return (
    <div className="page-enter pb-20">
      {showModal && (
        <CreateJobModal onClose={() => { setShowModal(false); setPrefillJD('') }} onCreated={j => setJobs(p => [j, ...p])} prefillDescription={prefillJD} />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-1">Active Openings</h2>
          <p className="text-sm text-on-surface-variant">Manage your pipelines with AI intelligence</p>
        </div>
        <button onClick={() => { setPrefillJD(''); setShowModal(true) }}
          className="h-12 px-6 rounded-xl bg-primary text-white font-bold flex items-center gap-2 shadow-md hover:bg-primary-container transition-all">
          <Plus size={18} />
          <span>New Job Opening</span>
        </button>
      </div>

      {/* AI Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2"><AIJDMaker onUseJD={handleUseJD} /></div>
        <div><JDUploader onUploaded={() => load()} /></div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 h-11 bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface placeholder:text-outline outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm"
            placeholder="Search openings..." />
        </div>
        <button onClick={() => load(search)} className="w-11 h-11 rounded-xl bg-surface-container-lowest border border-outline-variant text-outline flex items-center justify-center hover:bg-surface-container hover:text-on-surface transition-all">
          <RefreshCw size={16} className={loading ? 'animate-spin text-primary' : ''} />
        </button>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="h-72 rounded-xl bg-surface-container-low border border-outline-variant animate-pulse" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-outline-variant rounded-xl text-on-surface-variant">
          No jobs found. Create your first opening above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {jobs.map(job => (
            <div key={job.id} className="group flex flex-col h-full portal-card p-6 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Briefcase size={22} className="text-primary" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-outline px-2.5 py-1 rounded-full border border-outline-variant bg-surface-container">
                  {job.job_type || 'Full-time'}
                </span>
              </div>

              <h3 className="text-base font-bold mb-2 text-on-surface group-hover:text-primary transition-colors">{job.title}</h3>

              <div className="flex flex-wrap gap-3 mb-4">
                {job.company && (
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                    <Building size={13} className="text-outline" /> {job.company}
                  </div>
                )}
                {job.location && (
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                    <MapPin size={13} className="text-outline" /> {job.location}
                  </div>
                )}
              </div>

              <p className="text-sm text-on-surface-variant mb-5 line-clamp-3 leading-relaxed flex-1">
                {truncate(job.description, 140)}
              </p>

              <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
                <span className="text-[11px] font-semibold text-outline">{formatDate(job.created_at)}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(job.id, job.title)}
                    className="w-9 h-9 flex items-center justify-center text-outline hover:text-error hover:bg-error/5 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                  <Link to={`/jobs/${job.id}`}
                    className="h-9 px-4 rounded-lg bg-surface-container border border-outline-variant text-on-surface font-bold text-xs flex items-center gap-1.5 hover:bg-surface-container-high hover:border-primary transition-all">
                    Manage <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
