import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, CheckCircle, AlertCircle, X, Sparkles, ChevronRight, Trash2, Loader } from 'lucide-react'
import { candidatesApi } from '../services/api'
import { Spinner } from '../components/ui'
import { formatFileSize } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function BulkUploadCV() {
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      toast.error(`${rejected.length} file(s) rejected. Only PDF, DOCX, TXT allowed.`)
    }
    if (accepted.length > 0) {
      setFiles(prev => [...prev, ...accepted.map(f => ({ file: f, status: 'pending', progress: 0 }))])
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

  const handleBulkUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    setResults([])
    setCurrentIndex(0)

    for (let i = 0; i < files.length; i++) {
      setCurrentIndex(i)
      const item = files[i]
      const formData = new FormData()
      formData.append('file', item.file)

      try {
        const res = await candidatesApi.upload(formData, pct => {
          setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: pct } : f))
        })
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'success', result: res.data } : f))
        setResults(prev => [...prev, { success: true, data: res.data }])
      } catch (err) {
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: err.response?.data?.detail || 'Upload failed' } : f))
        setResults(prev => [...prev, { success: false, error: err.response?.data?.detail || 'Upload failed' }])
      }
    }

    setUploading(false)
    const successCount = results.filter(r => r.success).length
    toast.success(`Bulk upload complete! ${successCount}/${files.length} CVs processed successfully.`)
  }

  const reset = () => {
    setFiles([])
    setResults([])
    setCurrentIndex(0)
  }

  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length

  return (
    <div className="p-6 max-w-4xl mx-auto page-enter">
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
          Bulk CV Upload
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Upload multiple resumes at once — AI will process them all
        </p>
      </div>

      {/* Drop zone */}
      {!uploading && files.length === 0 && (
        <div
          {...getRootProps()}
          className="relative rounded-3xl p-16 text-center cursor-pointer transition-all mb-6"
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
                {isDragActive ? 'Drop files here!' : 'Drag & drop multiple CVs here'}
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
              <span className="badge badge-green text-xs">Unlimited files</span>
            </div>
          </div>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {files.length} file{files.length !== 1 ? 's' : ''} ready
              </p>
              {uploading && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Processing {currentIndex + 1} of {files.length}...
                </p>
              )}
            </div>
            {!uploading && (
              <div className="flex gap-2">
                <button onClick={reset} className="btn-ghost text-sm">
                  <X size={14} /> Clear All
                </button>
                <button onClick={handleBulkUpload} className="btn-primary text-sm">
                  <Sparkles size={14} /> Process All CVs
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {files.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl flex items-center gap-4 p-4 transition-all"
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${item.status === 'success' ? 'var(--success-border)' : item.status === 'error' ? 'var(--error-border)' : 'var(--border)'}`,
                }}
              >
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
                  ) : uploading && i === currentIndex ? (
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
                    {item.status === 'success' && item.result && ` · ${item.result.name}`}
                    {item.status === 'error' && ` · ${item.error}`}
                  </p>
                  {uploading && i === currentIndex && item.progress > 0 && (
                    <div className="mt-2">
                      <div className="score-bar h-1">
                        <div className="score-fill" style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                {!uploading && item.status === 'pending' && (
                  <button
                    onClick={() => removeFile(i)}
                    className="transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--error-text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {!uploading && (successCount > 0 || errorCount > 0) && (
            <div className="flex gap-3 pt-2">
              <button onClick={reset} className="btn-ghost flex-1">
                Upload More
              </button>
              <button onClick={() => navigate('/candidates')} className="btn-primary flex-1">
                View All Candidates <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add more files button */}
      {files.length > 0 && !uploading && (
        <div
          {...getRootProps()}
          className="mt-4 rounded-2xl p-6 text-center cursor-pointer transition-all"
          style={{ border: '2px dashed var(--border)', background: 'var(--bg-card)' }}
        >
          <input {...getInputProps()} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            <Upload size={14} className="inline mr-1" /> Add more files
          </p>
        </div>
      )}
    </div>
  )
}
