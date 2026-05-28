import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, CheckCircle, AlertCircle, X, Sparkles, ChevronRight, Trash2, Loader, Brain, RefreshCw } from 'lucide-react'
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
    <div className="max-w-4xl mx-auto page-enter">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-on-surface mb-1">Source Talent</h2>
        <p className="text-on-surface-variant text-sm opacity-70">
          Upload resumes to instantly vectorize and analyze them with AI intelligence.
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative rounded-[32px] p-16 text-center cursor-pointer transition-all mb-8 border-2 border-dashed",
          isDragActive 
            ? "border-primary bg-primary/5 shadow-2xl" 
            : "border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:shadow-lg"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-6">
          <div
            className={cn(
              "w-24 h-24 rounded-[30px] flex items-center justify-center transition-all shadow-sm",
              isDragActive ? "bg-primary text-on-primary" : "bg-surface-container text-primary"
            )}
          >
            {isDragActive
              ? <Sparkles size={48} className="animate-pulse" />
              : <UploadCloud size={48} className="opacity-80" />
            }
          </div>
          <div>
            <p className="text-xl font-bold text-on-surface">
              {isDragActive ? 'Release to upload!' : 'Drop candidate resumes here'}
            </p>
            <p className="text-sm mt-2 text-outline font-medium">
              Supports <span className="text-primary">PDF, DOCX, and TXT</span> formats up to 10MB
            </p>
          </div>
          <div className="flex gap-2">
             <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-surface-container text-outline border border-outline-variant">Multiple Files</span>
             <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/20">AI Ready</span>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-4">
            <div>
              <h3 className="text-lg font-bold text-on-surface">
                Queue ({files.length})
              </h3>
              <p className="text-[11px] font-bold text-outline uppercase tracking-wider mt-0.5">
                Waiting for AI extraction
              </p>
            </div>
            <button onClick={reset} className="btn-secondary py-1.5 px-4 text-xs flex items-center gap-2">
              <X size={14} /> Clear Workspace
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {files.map((item, i) => (
              <div
                key={i}
                className={cn(
                   "portal-card p-5 group transition-all",
                   item.status === 'success' && "border-tertiary/30 bg-tertiary/[0.02]",
                   item.status === 'error' && "border-error/30 bg-error/[0.02]"
                )}
              >
                <div className="flex items-center gap-5">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-all",
                      item.status === 'success' ? "bg-tertiary text-on-tertiary" : 
                      item.status === 'error' ? "bg-error text-on-error" : 
                      "bg-surface-container-high text-primary"
                    )}
                  >
                    {item.status === 'success' ? (
                      <CheckCircle2 size={24} />
                    ) : item.status === 'error' ? (
                      <AlertCircle size={24} />
                    ) : item.status === 'uploading' ? (
                      <RefreshCw size={24} className="animate-spin" />
                    ) : (
                      <FileText size={24} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                      {item.file.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                       <span className="text-[11px] font-bold text-outline uppercase tracking-wider">{formatFileSize(item.file.size)}</span>
                       {item.status === 'error' && (
                         <span className="text-[11px] font-bold text-error uppercase tracking-wider flex items-center gap-1">
                           <AlertCircle size={10} /> {item.error}
                         </span>
                       )}
                    </div>
                    {item.status === 'uploading' && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden shadow-inner">
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${item.progress}%` }}
                             className="h-full bg-primary shadow-glow" 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleSingleUpload(i)}
                          className="btn-ai text-xs py-2 px-5"
                        >
                          <Brain size={16} /> <span>Vectorize</span>
                        </button>
                        <button
                          onClick={() => removeFile(i)}
                          className="p-2 text-outline hover:text-error transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                    {item.status === 'error' && (
                      <button onClick={() => handleSingleUpload(i)} className="btn-secondary text-xs py-2">Retry</button>
                    )}
                    {item.status === 'success' && (
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black uppercase text-tertiary bg-tertiary/10 px-2 py-1 rounded">Analyzed</span>
                         <Link to={`/candidates/${item.result?.id}`} className="p-2 text-outline hover:text-primary transition-all">
                           <ChevronRight size={22} />
                         </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Extraction Preview */}
                {item.status === 'success' && item.result && (
                  <div className="mt-5 pt-5 border-t border-outline-variant/40 animate-enter">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {[
                        { label: 'Full Name', value: item.result.name, icon: User },
                        { label: 'Professional Email', value: item.result.email || 'Not detected', icon: Mail },
                        { label: 'Work Experience', value: item.result.experience_years ? formatExperience(item.result.experience_years) : 'Entry Level', icon: Briefcase },
                        { label: 'Location', value: item.result.location || 'Remote/Unknown', icon: MapPin },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label}>
                          <div className="flex items-center gap-1.5 mb-1 opacity-60">
                            <Icon size={12} className="text-outline" />
                            <span className="text-[10px] font-bold text-outline uppercase tracking-widest">{label}</span>
                          </div>
                          <p className="text-sm font-bold text-on-surface truncate">{value}</p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-5 flex items-center justify-between gap-4">
                       <div className="flex flex-wrap gap-1.5 flex-1 overflow-hidden">
                          {item.result.skills?.technical?.slice(0, 6).map((s, idx) => (
                            <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/5 text-primary border border-primary/10 uppercase tracking-tighter">
                               {s}
                            </span>
                          ))}
                       </div>
                       <Link
                          to={`/candidates/${item.result.id}`}
                          className="btn-primary text-xs py-2 px-6 shadow-md"
                        >
                          Open Intelligence Profile
                        </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {files.some(f => f.status === 'success') && (
            <button
              onClick={() => navigate('/candidates')}
              className="w-full btn-secondary py-4 font-bold text-sm shadow-sm"
            >
              Finish and Go to Talent Pool →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
