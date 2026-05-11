import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, CheckCircle, AlertCircle, X, Sparkles, ChevronRight } from 'lucide-react'
import { candidatesApi } from '../services/api'
import { Spinner } from '../components/ui'
import { formatFileSize, formatExperience } from '../utils/helpers'
import toast from 'react-hot-toast'

const STEPS = ['Select File', 'Processing', 'Complete']

export default function UploadCV() {
  const navigate = useNavigate()
  const [file, setFile]           = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [step, setStep]           = useState(0)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState(null)

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) { toast.error('Invalid file. Please upload PDF, DOCX, or TXT.'); return }
    if (accepted.length > 0) { setFile(accepted[0]); setError(null) }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  })

  const handleUpload = async () => {
    if (!file) return
    setUploading(true); setStep(1); setError(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await candidatesApi.upload(formData, pct => setProgress(pct))
      setResult(res.data); setStep(2)
      toast.success(`CV processed! ${res.data.name} is ready.`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.')
      setStep(0)
    } finally { setUploading(false) }
  }

  const reset = () => {
    setFile(null); setUploading(false); setProgress(0)
    setStep(0); setResult(null); setError(null)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto page-enter">

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={i < step
                  ? { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }
                  : i === step
                  ? { background: 'var(--accent-cyan)', color: '#000' }
                  : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                }
              >
                {i < step ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: i === step ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-px transition-all"
                style={{ background: i < step ? 'var(--success-text)' : 'var(--border)' }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 0 — File selection */}
      {step === 0 && (
        <div className="space-y-4">
          <div
            {...getRootProps()}
            className="relative rounded-3xl p-12 text-center cursor-pointer transition-all"
            style={{
              border: `2px dashed ${isDragActive ? 'var(--accent-cyan)' : 'var(--border)'}`,
              background: isDragActive ? 'var(--tag-bg)' : 'var(--bg-card)',
            }}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all"
                style={{ background: isDragActive ? 'var(--tag-bg)' : 'var(--bg-card-hover)' }}
              >
                {isDragActive
                  ? <Sparkles size={28} style={{ color: 'var(--accent-cyan)' }} className="animate-pulse" />
                  : <Upload size={28} style={{ color: 'var(--text-muted)' }} />
                }
              </div>
              <div>
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                  {isDragActive ? 'Drop it here!' : 'Drag & drop your CV here'}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  or <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>browse files</span>
                </p>
              </div>
              <div className="flex gap-2">
                {['PDF', 'DOCX', 'TXT'].map(t => (
                  <span key={t} className="badge badge-blue text-xs">{t}</span>
                ))}
                <span className="badge badge-purple text-xs">Max 10MB</span>
              </div>
            </div>
          </div>

          {file && (
            <div
              className="rounded-2xl flex items-center gap-4 p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}
              >
                <FileText size={20} style={{ color: 'var(--accent-cyan)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{file.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--error-text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {error && (
            <div
              className="flex items-center gap-2 p-4 rounded-2xl text-sm"
              style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error-text)' }}
            >
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-primary w-full h-12 text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles size={18} /> Process CV with AI <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step 1 — Processing */}
      {step === 1 && (
        <div
          className="rounded-3xl text-center py-16 space-y-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: 'var(--accent-cyan)', opacity: 0.3 }} />
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}
            >
              <Sparkles size={32} style={{ color: 'var(--accent-cyan)' }} className="animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>AI is analysing your CV</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Extracting skills, experience, education...</p>
          </div>
          <div className="max-w-xs mx-auto space-y-2">
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span>Processing</span><span>{progress}%</span>
            </div>
            <div className="score-bar">
              <div className="score-fill transition-all duration-300" style={{ width: `${Math.max(progress, 10)}%` }} />
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            {['Extracting text from document...', 'Parsing skills & experience with AI...', 'Generating embeddings & indexing...'].map((msg, i) => (
              <div key={i} className={`flex items-center justify-center gap-2 transition-opacity ${progress > i * 30 ? 'opacity-100' : 'opacity-30'}`}>
                {progress > (i + 1) * 30
                  ? <CheckCircle size={12} style={{ color: 'var(--success-text)' }} />
                  : <Spinner size={12} />
                }
                {msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Complete */}
      {step === 2 && result && (
        <div className="space-y-4 page-enter">
          <div
            className="rounded-3xl text-center py-8"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}
            >
              <CheckCircle size={28} style={{ color: 'var(--success-text)' }} />
            </div>
            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>Profile Created!</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>AI has successfully processed {result.name}'s CV</p>
          </div>

          <div
            className="rounded-3xl p-6 space-y-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <h4 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Extracted Profile</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Name',       value: result.name },
                { label: 'Email',      value: result.email || '—' },
                { label: 'Experience', value: result.experience_years ? formatExperience(result.experience_years) : '—' },
                { label: 'Location',   value: result.location || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{value}</p>
                </div>
              ))}
            </div>
            {result.skills?.technical?.length > 0 && (
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Technical Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.skills.technical.slice(0, 8).map((s, i) => (
                    <span key={i} className="badge badge-blue text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="btn-ghost flex-1">Upload Another</button>
            <button onClick={() => navigate(`/candidates/${result.id}`)} className="btn-primary flex-1">
              View Full Profile <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
