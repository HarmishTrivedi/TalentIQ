import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Filter, Briefcase, Building, MapPin, Clock, Trash2, RefreshCw,
  ChevronRight, X, Sparkles, Wand2, Copy, Check, ArrowRight,
  Zap, RotateCcw, ChevronDown, UploadCloud
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
      // Only send fields that have actual values — no fake defaults
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v.trim() !== '')
      )
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
    { key: 'extra_notes',      label: 'Additional Notes',    required: false, span: 2, textarea: true, placeholder: 'e.g. Startup culture, equity offered, agile team' },
  ]

  const filledCount = Object.values(form).filter(v => v.trim()).length

  return (
    <div className="mb-6 portal-card overflow-visible bg-surface-container-lowest shadow-md">
      {/* Header */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-6 py-5 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #004ac6, #4b41e1)', boxShadow: '0 4px 20px rgba(0,74,198,0.3)' }}>
            <Wand2 size={20} className="text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-tertiary border-2 border-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-on-surface">AI Job Description Maker</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                ✨ AI Powered
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {filledCount > 0 ? `${filledCount} field${filledCount > 1 ? 's' : ''} filled` : 'Fill in details — get a complete JD in seconds'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!open && filledCount === 0 && (
            <span className="text-xs font-bold px-4 py-2 rounded-xl bg-primary text-white hidden sm:block">
              Generate JD
            </span>
          )}
          <div className="w-8 h-8 rounded-xl flex items-center justify-center border border-outline-variant text-outline transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <ChevronDown size={15} />
          </div>
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="px-6 pb-6 border-t border-outline-variant">
          {!generatedJD ? (
            <div className="pt-5 space-y-5">
              {/* Info banner */}
              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Only <span className="font-bold text-on-surface">Role Title</span> is required. Fill in as many or as few fields as you like — AI will only use what you provide.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map(({ key, label, required, span, textarea, placeholder }) => (
                  <div key={key} className={span === 2 ? 'sm:col-span-2' : ''}>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-outline mb-1.5">
                      {label} {required && <span className="text-error">*</span>}
                    </label>
                    {textarea ? (
                      <textarea
                        value={form[key]}
                        onChange={e => set(key, e.target.value)}
                        rows={3}
                        placeholder={placeholder}
                        className="w-full p-3 rounded-xl text-sm font-medium bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none"
                      />
                    ) : (
                      <input
                        value={form[key]}
                        onChange={e => set(key, e.target.value)}
                        placeholder={placeholder}
                        className="w-full h-11 px-4 rounded-xl text-sm font-medium bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                      />
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={generate}
                disabled={generating || !form.role_title.trim()}
                className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-white hover:bg-primary-container shadow-md hover:shadow-lg"
              >
                {generating
                  ? <><Spinner size={16} /> Generating with AI...</>
                  : <><Sparkles size={16} /> Generate Job Description</>
                }
              </button>
            </div>
          ) : (
            <div ref={jdRef} className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-tertiary" style={{ boxShadow: '0 0 6px #006058' }} />
                  <span className="text-sm font-bold text-on-surface">JD Generated Successfully</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={reset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold btn-secondary">
                    <RotateCcw size={12} /> Regenerate
                  </button>
                  <button onClick={copyJD}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
                      copied ? 'bg-tertiary/10 text-tertiary border-tertiary/20' : 'bg-surface-container-low text-primary border-primary/20 hover:bg-primary/5'
                    )}>
                    {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
              </div>

              <div className="rounded-xl p-5 max-h-72 overflow-y-auto bg-surface-container-low border border-outline-variant custom-scrollbar">
                <pre className="text-xs leading-6 whitespace-pre-wrap font-sans text-on-surface-variant">{generatedJD}</pre>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={reset} className="btn-secondary py-2.5 flex items-center justify-center gap-2">
                  <RotateCcw size={14} /> Generate New
                </button>
                <button
                  onClick={() => {
                    onUseJD({
                      description: generatedJD,
                      title: form.role_title,
                      ...(form.company && { company: form.company }),
                      ...(form.location && { location: form.location }),
                      ...(form.job_type && { job_type: form.job_type }),
                      ...(form.experience_years && { required_experience_years: parseFloat(form.experience_years) || null }),
                    })
                    setOpen(false)
                    reset()
                  }}
                  className="btn-primary py-2.5 justify-center"
                >
                  <ArrowRight size={14} /> Use This JD
                </button>
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
