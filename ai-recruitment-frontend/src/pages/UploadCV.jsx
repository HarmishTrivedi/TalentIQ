import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate, Link } from 'react-router-dom'
import {
  FileText, AlertCircle, X, Sparkles,
  ChevronRight, Trash2, RefreshCw, UploadCloud,
  CheckCircle2, User, Mail, Briefcase, MapPin, Brain
} from 'lucide-react'
import { motion } from 'framer-motion'
import { candidatesApi } from '../services/api'
import { Spinner } from '../components/ui'
import { formatFileSize, formatExperience, cn } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function UploadCV() {
  const navigate = useNavigate()
  const [files, setFiles] = useState([])

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) toast.error(`${rejected.length} file(s) rejected. Only PDF, DOCX, TXT allowed.`)
    if (accepted.length > 0) {
      setFiles(prev => [...prev, ...accepted.map(f => ({ file: f, status: 'pending', progress: 0, result: null, error: null }))])
      toast.success(`${accepted.length} file(s) added`)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxSize: 10 * 1024 * 1024,
  })

  const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index))

  const handleUpload = async (index) => {
    const item = files[index]
    if (!item || item.status === 'uploading' || item.status === 'success') return
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'uploading', progress: 0 } : f))
    const formData = new FormData()
    formData.append('file', item.file)
    try {
      const res = await candidatesApi.upload(formData, pct =>
        setFiles(prev => prev.map((f, i) => i === index ? { ...f, progress: pct } : f))
      )
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'success', result: res.data } : f))
      toast.success(`${res.data.name}'s profile analyzed!`)
    } catch (err) {
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'error', error: err.response?.data?.detail || 'Upload failed' } : f))
      toast.error('Failed to analyze CV')
    }
  }

  return (
    <div className="max-w-4xl mx-auto page-enter pb-20">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-on-surface mb-1">Upload Candidates</h2>
        <p className="text-sm text-on-surface-variant">
          Upload resumes to instantly analyze them with <span className="text-primary font-semibold">AI Intelligence</span>.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-xl p-16 text-center cursor-pointer transition-all mb-8 border-2 border-dashed',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-outline-variant bg-surface-container-lowest hover:border-primary hover:bg-surface-container-low'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-6">
          <div className={cn(
            'w-20 h-20 rounded-xl flex items-center justify-center transition-all duration-300',
            isDragActive ? 'bg-primary text-white scale-110' : 'bg-primary/10 text-primary border border-primary/20'
          )}>
            {isDragActive ? <Sparkles size={40} className="animate-pulse" /> : <UploadCloud size={40} />}
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold text-on-surface">
              {isDragActive ? 'Drop to upload' : 'Drop candidate resumes here'}
            </p>
            <p className="text-sm text-on-surface-variant">
              Supports <span className="text-primary font-semibold">PDF, DOCX, and TXT</span> — up to 10MB each
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-surface-container border border-outline-variant text-outline">Batch Processing</span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">AI Ready</span>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-4">
            <div>
              <h3 className="text-lg font-bold text-on-surface">Upload Queue ({files.length})</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Ready for AI analysis</p>
            </div>
            <button onClick={() => setFiles([])}
              className="h-9 px-4 rounded-lg border border-outline-variant text-on-surface-variant font-semibold text-xs flex items-center gap-2 hover:bg-surface-container transition-all">
              <X size={14} /> Clear All
            </button>
          </div>

          <div className="space-y-4">
            {files.map((item, i) => (
              <div key={i} className={cn(
                'portal-card p-5 transition-all',
                item.status === 'success' ? 'border-tertiary/30 bg-tertiary/5' :
                item.status === 'error'   ? 'border-error/30 bg-error/5' : ''
              )}>
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                    item.status === 'success' ? 'bg-tertiary text-white' :
                    item.status === 'error'   ? 'bg-error text-white' :
                    item.status === 'uploading' ? 'bg-primary/10 text-primary border border-primary/20' :
                    'bg-surface-container border border-outline-variant text-outline'
                  )}>
                    {item.status === 'success'   ? <CheckCircle2 size={24} /> :
                     item.status === 'error'     ? <AlertCircle size={24} /> :
                     item.status === 'uploading' ? <RefreshCw size={24} className="animate-spin" /> :
                     <FileText size={24} />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{item.file.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-outline font-medium">{formatFileSize(item.file.size)}</span>
                      {item.status === 'error' && (
                        <span className="text-[11px] font-bold text-error flex items-center gap-1">
                          <AlertCircle size={11} /> {item.error}
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="text-[11px] font-semibold text-on-surface-variant">Awaiting analysis</span>
                      )}
                    </div>
                    {item.status === 'uploading' && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.progress}%` }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.status === 'pending' && (
                      <>
                        <button onClick={() => handleUpload(i)}
                          className="h-10 px-5 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-2 hover:bg-primary-container shadow-sm transition-all">
                          <Brain size={15} /> Analyze
                        </button>
                        <button onClick={() => removeFile(i)}
                          className="w-10 h-10 flex items-center justify-center text-outline hover:text-error hover:bg-error/5 rounded-xl transition-all">
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                    {item.status === 'error' && (
                      <button onClick={() => handleUpload(i)}
                        className="h-10 px-5 rounded-xl border border-outline-variant text-on-surface-variant font-bold text-xs hover:bg-surface-container transition-all">
                        Retry
                      </button>
                    )}
                    {item.status === 'success' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary bg-tertiary/10 border border-tertiary/20 px-3 py-1 rounded-full">
                          Analyzed
                        </span>
                        <Link to={`/candidates/${item.result?.id}`}
                          className="w-10 h-10 flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container rounded-xl border border-outline-variant transition-all">
                          <ChevronRight size={20} />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Extraction Preview */}
                {item.status === 'success' && item.result && (
                  <div className="mt-5 pt-5 border-t border-outline-variant">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                      {[
                        { label: 'Full Name',   value: item.result.name,                                                    icon: User },
                        { label: 'Email',       value: item.result.email || 'Not detected',                                 icon: Mail },
                        { label: 'Experience',  value: item.result.experience_years ? formatExperience(item.result.experience_years) : 'Entry Level', icon: Briefcase },
                        { label: 'Location',    value: item.result.location || 'Remote / Unknown',                          icon: MapPin },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon size={11} className="text-outline" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-outline">{label}</span>
                          </div>
                          <p className="text-sm font-semibold text-on-surface truncate">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-wrap gap-1.5 flex-1 overflow-hidden">
                        {(item.result.skills?.technical || []).slice(0, 8).map((s, idx) => (
                          <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">
                            {s}
                          </span>
                        ))}
                      </div>
                      <Link to={`/candidates/${item.result.id}`}
                        className="h-10 px-5 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-2 hover:bg-primary-container shadow-sm transition-all flex-shrink-0">
                        View Profile <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {files.some(f => f.status === 'success') && (
            <button onClick={() => navigate('/candidates')}
              className="w-full h-14 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface font-bold text-sm hover:bg-surface-container hover:border-primary transition-all flex items-center justify-center gap-2 group">
              <span>Go to Talent Pool</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform text-primary" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
