import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, CheckCircle, AlertCircle, X, Sparkles, ChevronRight, Trash2, Loader, Brain } from 'lucide-react'
import { candidatesApi } from '../services/api'
import { Spinner } from '../components/ui'
import { formatFileSize, formatExperience } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function UploadCV() {
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      toast.error(`${rejected.length} file(s) rejected. Only PDF, DOCX, TXT allowed.`)
    }
    if (accepted.length > 0) {
      const newFiles = accepted.map(f => ({
        file: f,
        status: 'pending',
        progress: 0,
        result: null,
        error: null
      }))
      setFiles(prev => [...prev, ...newFiles])
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

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSingleUpload = async (index) => {
    const item = files[index]
    if (!item || item.status === 'uploading' || item.status === 'success') return

    setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'uploading', progress: 0 } : f))

    const formData = new FormData()
    formData.append('file', item.file)

    try {
      const res = await candidatesApi.upload(formData, pct => {
        setFiles(prev => prev.map((f, i) => i === index ? { ...f, progress: pct } : f))
      })
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'success', result: res.data } : f))
      toast.success(`${res.data.name}'s profile analyzed successfully!`)
    } catch (err) {
      setFiles(prev => prev.map((f, i) => i === index ? {
        ...f,
        status: 'error',
        error: err.response?.data?.detail || 'Upload failed'
      } : f))
      toast.error('Failed to analyze CV')
    }
  }

  const reset = () => {
    setFiles([])
  }

  return (
    <div className="p-6 max-w-4xl mx-auto page-enter">
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
          Upload CVs
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Upload multiple resumes — analyze each profile individually with AI
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className="relative rounded-3xl p-12 text-center cursor-pointer transition-all mb-6"
        style={{
          border: `2px dashed ${isDragActive ? 'var(--accent-cyan)' : 'var(--border)'}`,
          background: isDragActive ? 'var(--tag-bg)' : 'var(--bg-card)',
        }}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center transition-all"
            style={{ background: isDragActive ? 'var(--tag-bg)' : 'var(--bg-card-hover)' }}
          >
            {isDragActive
              ? <Sparkles size={36} style={{ color: 'var(--accent-cyan)' }} className="animate-pulse" />
              : <Upload size={36} style={{ color: 'var(--text-muted)' }} />
            }
          </div>
          <div>
            <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
              {isDragActive ? 'Drop files here!' : 'Drag & drop CVs here'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              or <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>browse files</span>
            </p>
          </div>
          <div className="flex gap-2">
            {['PDF', 'DOCX', 'TXT'].map(t => (
              <span key={t} className="badge badge-blue text-xs">{t}</span>
            ))}
            <span className="badge badge-purple text-xs">Max 10MB each</span>
            <span className="badge badge-green text-xs">Multiple files</span>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {files.length} file{files.length !== 1 ? 's' : ''} uploaded
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Click "Analyze with AI" on each CV to process
              </p>
            </div>
            <button onClick={reset} className="btn-ghost text-sm">
              <X size={14} /> Clear All
            </button>
          </div>

          <div className="space-y-3">
            {files.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl p-4 transition-all"
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${item.status === 'success' ? 'var(--success-border)' : item.status === 'error' ? 'var(--error-border)' : 'var(--border)'}`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: item.status === 'success' ? 'var(--success-bg)' : item.status === 'error' ? 'var(--error-bg)' : 'var(--tag-bg)',
                      border: `1px solid ${item.status === 'success' ? 'var(--success-border)' : item.status === 'error' ? 'var(--error-border)' : 'var(--tag-border)'}`,
                    }}
                  >
                    {item.status === 'success' ? (
                      <CheckCircle size={18} style={{ color: 'var(--success-text)' }} />
                    ) : item.status === 'error' ? (
                      <AlertCircle size={18} style={{ color: 'var(--error-text)' }} />
                    ) : item.status === 'uploading' ? (
                      <Loader size={18} style={{ color: 'var(--accent-cyan)' }} className="animate-spin" />
                    ) : (
                      <FileText size={18} style={{ color: 'var(--accent-cyan)' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                      {item.file.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatFileSize(item.file.size)}
                      {item.status === 'error' && ` · ${item.error}`}
                    </p>
                    {item.status === 'uploading' && item.progress > 0 && (
                      <div className="mt-2">
                        <div className="score-bar h-1">
                          <div className="score-fill" style={{ width: `${item.progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleSingleUpload(i)}
                          className="btn-primary text-xs px-3 py-2"
                        >
                          <Brain size={14} /> Analyze with AI
                        </button>
                        <button
                          onClick={() => removeFile(i)}
                          className="transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--error-text)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {item.status === 'error' && (
                      <button
                        onClick={() => handleSingleUpload(i)}
                        className="btn-ghost text-xs px-3 py-2"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>

                {/* Show profile details after successful analysis */}
                {item.status === 'success' && item.result && (
                  <div
                    className="mt-4 pt-4 space-y-3"
                    style={{ borderTop: '1px solid var(--border)' }}
                  >
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        { label: 'Name', value: item.result.name },
                        { label: 'Email', value: item.result.email || '—' },
                        { label: 'Experience', value: item.result.experience_years ? formatExperience(item.result.experience_years) : '—' },
                        { label: 'Location', value: item.result.location || '—' },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                          <p className="font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {item.result.skills?.technical?.length > 0 && (
                      <div>
                        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Technical Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.result.skills.technical.slice(0, 8).map((s, idx) => (
                            <span key={idx} className="badge badge-blue text-xs">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => navigate(`/candidates/${item.result.id}`)}
                      className="btn-primary text-xs w-full"
                    >
                      View Full Profile <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {files.some(f => f.status === 'success') && (
            <button
              onClick={() => navigate('/candidates')}
              className="btn-primary w-full"
            >
              View All Candidates <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
