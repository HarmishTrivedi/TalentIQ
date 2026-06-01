import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Filter, Briefcase, Building, MapPin, Clock, Trash2, RefreshCw,
  ChevronRight, X, Sparkles, Wand2, Copy, Check, ArrowRight,
  Zap, RotateCcw, ChevronDown, UploadCloud
} from 'lucide-react'
import { jobsApi } from '../services/api'
import { Spinner, EmptyState, SkeletonCard, Badge, TagList } from '../components/ui'
import { formatRelativeTime, truncate, formatDate, cn } from '../utils/helpers'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-2xl rounded-[32px] p-8 space-y-6 animate-scaleIn max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/10 shadow-2xl"
        style={{ 
          background: 'linear-gradient(145deg, rgba(15,15,26,0.9), rgba(10,10,15,0.95))',
          boxShadow: '0 0 50px rgba(0,128,255,0.15), inset 0 0 20px rgba(255,255,255,0.02)' 
        }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Briefcase size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-display tracking-tight">
                Create New Job
              </h3>
              <p className="text-xs text-white/40 font-medium">Define your next great hire</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all bg-white/5 hover:bg-white/10 text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Job Title *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full h-14 px-5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium" 
                placeholder="e.g. Senior React Developer" required />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Company</label>
              <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                className="w-full h-14 px-5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium" 
                placeholder="e.g. Acme Corp" />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Location</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                className="w-full h-14 px-5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium" 
                placeholder="e.g. Remote, New York" />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Job Type</label>
              <select value={form.job_type} onChange={e => setForm(p => ({ ...p, job_type: e.target.value }))}
                className="w-full h-14 px-5 rounded-2xl bg-white/5 border border-white/10 text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium appearance-none">
                {['full-time', 'part-time', 'contract', 'freelance', 'internship'].map(t => (
                  <option key={t} value={t} className="bg-[#0f0f1a] text-white">
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Job Description *</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium min-h-[180px] resize-none"
              placeholder="Paste or generate the full job description here..." required />
          </div>
          <div className="flex gap-4 pt-2">
            <button type="button" onClick={onClose} 
              className="flex-1 h-14 rounded-2xl font-bold text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading} 
              className="flex-1 h-14 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/25 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
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
    { key: 'extra_notes',      label: 'Additional Notes',    required: false, span: 2, textarea: true, placeholder: 'e.g. Startup culture, agile team' },
  ]

  const filledCount = Object.values(form).filter(v => v.trim()).length

  return (
    <div className={cn("mb-6 overflow-visible transition-all duration-500 border border-white/5 rounded-3xl", 
      open ? "bg-white/[0.03] shadow-2xl" : "bg-white/[0.01] hover:bg-white/[0.03]")}>
      <button onClick={() => setOpen(p => !p)} className="w-full flex items-center justify-between px-6 py-5 transition-all group">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
            style={{ background: 'linear-gradient(135deg, #004ac6, #4b41e1)', boxShadow: '0 8px 25px rgba(0,74,198,0.3)' }}>
            <Wand2 size={22} className="text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 border-2 border-[#0a0a0f] animate-pulse" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white font-display">AI Job Description Maker</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest">✨ Quantum AI</span>
            </div>
            <p className="text-xs text-white/40 mt-0.5 font-medium">
              {filledCount > 0 ? `${filledCount} field${filledCount > 1 ? 's' : ''} filled` : 'Provide minimal details — AI builds the complete JD'}
            </p>
          </div>
        </div>
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center border border-white/10 text-white/40 group-hover:text-white transition-all"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <ChevronDown size={16} />
        </div>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-white/5 animate-slideUp">
          {!generatedJD ? (
            <div className="pt-6 space-y-6">
              <div className="flex items-start gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                <Sparkles size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-white/50 leading-relaxed font-medium">
                  Our <span className="text-blue-400 font-bold">Llama-3 Intelligence</span> only requires the <span className="text-white font-bold">Role Title</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map(({ key, label, required, span, textarea, placeholder }) => (
                  <div key={key} className={span === 2 ? 'sm:col-span-2' : ''}>
                    <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-2 ml-1">
                      {label} {required && <span className="text-blue-500">*</span>}
                    </label>
                    {textarea ? (
                      <textarea value={form[key]} onChange={e => set(key, e.target.value)} rows={3} placeholder={placeholder}
                        className="w-full p-4 rounded-2xl text-sm font-medium bg-white/[0.04] border border-white/5 text-white placeholder:text-white/10 outline-none focus:border-blue-500/50 transition-all resize-none" />
                    ) : (
                      <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
                        className="w-full h-12 px-4 rounded-2xl text-sm font-medium bg-white/[0.04] border border-white/5 text-white placeholder:text-white/10 outline-none focus:border-blue-500/50 transition-all" />
                    )}
                  </div>
                ))}
              </div>

              <button onClick={generate} disabled={generating || !form.role_title.trim()}
                className="w-full h-14 rounded-2xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                {generating ? <><Spinner size={18} /> Generating...</> : <><Sparkles size={18} /> Generate JD</>}
              </button>
            </div>
          ) : (
            <div ref={jdRef} className="pt-6 space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">JD Generated</span>
                <div className="flex gap-2">
                  <button onClick={reset} className="px-3 py-2 rounded-xl text-xs font-bold bg-white/5 text-white/60 hover:bg-white/10 transition-all">Regenerate</button>
                  <button onClick={copyJD} className={cn('px-3 py-2 rounded-xl text-xs font-bold border transition-all', copied ? 'text-cyan-400 border-cyan-400/20' : 'text-blue-400 border-white/5')}>{copied ? 'Copied!' : 'Copy'}</button>
                </div>
              </div>
              <div className="rounded-2xl p-6 max-h-80 overflow-y-auto bg-black/40 border border-white/5 custom-scrollbar">
                <pre className="text-xs leading-7 whitespace-pre-wrap text-white/70">{generatedJD}</pre>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={reset} className="h-12 rounded-2xl bg-white/5 text-white/60 font-bold text-xs">Discard</button>
                <button onClick={() => { onUseJD({ description: generatedJD, title: form.role_title }); setOpen(false); reset(); }}
                  className="h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-xs">Use This JD</button>
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
    <div className="mb-6 p-6 rounded-[32px] border-2 border-dashed border-white/5 transition-all flex flex-col items-center justify-center text-center group hover:border-blue-500/30 bg-white/[0.01] hover:bg-white/[0.03]">
      <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.docx,.doc,.txt" />
      <div className="w-14 h-14 rounded-2xl bg-blue-500/5 flex items-center justify-center mb-4 border border-blue-500/10 group-hover:scale-110 transition-all">
        <UploadCloud size={28} className="text-blue-400" />
      </div>
      <h4 className="text-sm font-bold mb-1 text-white">Bulk Ingestion</h4>
      <p className="text-xs mb-5 text-white/40">Drop PDF/DOCX job descriptions.</p>
      {uploading ? (
        <div className="w-full max-w-xs space-y-3">
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <button onClick={() => fileInputRef.current?.click()} className="h-10 px-8 rounded-xl bg-white/5 text-white text-xs font-bold border border-white/10">Select Files</button>
      )}
    </div>
  )
}

// ── Main Jobs Page ────────────────────────────────────────────────────────────
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
    try {
      const res = await jobsApi.create(jobData)
      setJobs(p => [res.data, ...p])
      setTotal(prev => prev + 1)
      toast.success('Job Created')
    } catch (err) { toast.error('Failed to create job') }
  }

  return (
    <div className="page-enter min-h-screen pb-20 bg-void">
      {showModal && (
        <CreateJobModal onClose={() => { setShowModal(false); setPrefillJD('') }} onCreated={j => setJobs(p => [j, ...p])} prefillDescription={prefillJD} />
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <h2 className="text-4xl font-bold text-white font-display">Active Openings</h2>
          <p className="text-white/40 text-sm mt-2">Manage your pipelines with AI intelligence</p>
        </div>
        <button onClick={() => { setPrefillJD(''); setShowModal(true) }} 
          className="h-14 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold flex items-center gap-3 shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all">
          <Plus size={18} />
          <span>New Job Opening</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2"><AIJDMaker onUseJD={handleUseJD} /></div>
        <div><JDUploader onUploaded={() => load()} /></div>
      </div>

      <div className="mb-8 p-3 flex gap-4 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-md">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 h-12 bg-white/[0.03] border border-white/5 rounded-xl text-white outline-none focus:border-blue-500/30 transition-all"
            placeholder="Search openings..." />
        </div>
        <button onClick={() => load(search)} className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 text-white/60 flex items-center justify-center hover:bg-white/10 transition-all">
          <RefreshCw size={18} className={loading ? 'animate-spin text-blue-400' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-80 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-white/5 rounded-[40px] text-white/40">No jobs found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 stagger">
          {jobs.map(job => (
            <div key={job.id} className="group relative flex flex-col h-full rounded-[32px] bg-white/[0.02] border border-white/5 p-7 hover:bg-white/[0.04] hover:border-blue-500/20 transition-all duration-500 hover:-translate-y-2 overflow-hidden shadow-xl">
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:border-blue-500/30 transition-all">
                  <Briefcase size={26} className="text-blue-500" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-3 py-1 rounded-full border border-white/5">{job.job_type || 'Full-time'}</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white font-display group-hover:text-blue-400 transition-colors">{job.title}</h3>
              <div className="flex gap-4 mb-6 opacity-40 text-xs font-bold uppercase tracking-wider">
                {job.company && <div className="flex items-center gap-2"><Building size={14} className="text-blue-500" /> {job.company}</div>}
                {job.location && <div className="flex items-center gap-2"><MapPin size={14} className="text-blue-500" /> {job.location}</div>}
              </div>
              <p className="text-sm text-white/50 mb-7 line-clamp-3 leading-relaxed font-medium">{truncate(job.description, 140)}</p>
              <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">{formatDate(job.created_at)}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleDelete(job.id, job.title)} className="w-10 h-10 flex items-center justify-center text-white/20 hover:text-red-400 transition-all"><Trash2 size={18} /></button>
                  <Link to={`/jobs/${job.id}`} className="h-10 px-5 rounded-xl bg-white/5 text-white font-bold text-xs flex items-center gap-2 border border-white/10 hover:bg-white/10 transition-all">Manage <ChevronRight size={14} /></Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
