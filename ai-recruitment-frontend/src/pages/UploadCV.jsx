import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate, Link } from 'react-router-dom'
import { 
  Upload, FileText, CheckCircle, AlertCircle, X, Sparkles, 
  ChevronRight, Trash2, Loader, Brain, RefreshCw, UploadCloud,
  CheckCircle2, User, Mail, Briefcase, MapPin
} from 'lucide-react'
import { motion } from 'framer-motion'
import { candidatesApi } from '../services/api'
import { Spinner } from '../components/ui'
import { formatFileSize, formatExperience, cn } from '../utils/helpers'
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
    <div className="max-w-4xl mx-auto page-enter pb-20">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-8 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
          <h2 className="text-4xl font-bold text-white font-display tracking-tight">Source Talent</h2>
        </div>
        <p className="text-white/40 text-sm font-medium ml-5">
          Upload resumes to instantly vectorize and analyze them with <span className="text-blue-400 font-bold">Llama-3 Intelligence</span>.
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative rounded-[40px] p-20 text-center cursor-pointer transition-all mb-12 border-2 border-dashed group overflow-hidden backdrop-blur-sm",
          isDragActive 
            ? "border-blue-500 bg-blue-500/5 shadow-[0_0_50px_rgba(59,130,246,0.1)]" 
            : "border-white/10 bg-white/[0.02] hover:border-blue-500/30 hover:bg-white/[0.04] shadow-2xl"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-violet-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-8 relative z-10">
          <div
            className={cn(
              "w-28 h-28 rounded-[36px] flex items-center justify-center transition-all duration-500 shadow-xl border border-white/5",
              isDragActive ? "bg-blue-600 text-white scale-110 shadow-blue-500/20" : "bg-white/[0.05] text-blue-500 group-hover:scale-110"
            )}
          >
            {isDragActive
              ? <Sparkles size={54} className="animate-pulse" />
              : <UploadCloud size={54} className="opacity-80" />
            }
          </div>
          <div className="space-y-3">
            <p className="text-2xl font-bold text-white font-display">
              {isDragActive ? 'Release to Ignite Ingestion' : 'Drop candidate resumes here'}
            </p>
            <p className="text-sm text-white/40 font-medium">
              Supports <span className="text-blue-400 font-bold">PDF, DOCX, and TXT</span> formats up to 10MB
            </p>
          </div>
          <div className="flex gap-3">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full bg-white/5 text-white/40 border border-white/10">Batch Processing</span>
             <span className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">Neural Ready</span>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-8 animate-slideUp">
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <div>
              <h3 className="text-xl font-bold text-white font-display">
                Neural Queue ({files.length})
              </h3>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-1">
                Awaiting vector extraction
              </p>
            </div>
            <button onClick={reset} className="h-10 px-5 rounded-xl bg-white/5 text-white/60 font-bold text-xs flex items-center gap-2 hover:bg-white/10 border border-white/10 transition-all">
              <X size={14} /> Clear Workspace
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {files.map((item, i) => (
              <div
                key={i}
                className={cn(
                   "relative rounded-3xl border border-white/5 p-6 group transition-all duration-500 overflow-hidden",
                   item.status === 'success' ? "bg-cyan-500/[0.02] border-cyan-500/20" : 
                   item.status === 'error' ? "bg-red-500/[0.02] border-red-500/20" : 
                   "bg-white/[0.02] hover:bg-white/[0.04]"
                )}
              >
                <div className="flex items-center gap-6 relative z-10">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg transition-all duration-500",
                      item.status === 'success' ? "bg-cyan-500 text-white shadow-cyan-500/20" : 
                      item.status === 'error' ? "bg-red-500 text-white shadow-red-500/20" : 
                      "bg-white/[0.05] text-blue-500 border border-white/10"
                    )}
                  >
                    {item.status === 'success' ? (
                      <CheckCircle2 size={28} />
                    ) : item.status === 'error' ? (
                      <AlertCircle size={28} />
                    ) : item.status === 'uploading' ? (
                      <RefreshCw size={28} className="animate-spin" />
                    ) : (
                      <FileText size={28} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                      {item.file.name}
                    </p>
                    <div className="flex items-center gap-4 mt-1.5">
                       <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{formatFileSize(item.file.size)}</span>
                       {item.status === 'error' && (
                         <span className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                           <AlertCircle size={12} /> {item.error}
                         </span>
                       )}
                       {item.status === 'pending' && (
                         <span className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest">Awaiting Analysis</span>
                       )}
                    </div>
                    {item.status === 'uploading' && (
                      <div className="mt-4">
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${item.progress}%` }}
                             className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleSingleUpload(i)}
                          className="h-11 px-6 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-2 hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all"
                        >
                          <Brain size={16} /> <span>Vectorize</span>
                        </button>
                        <button
                          onClick={() => removeFile(i)}
                          className="w-11 h-11 flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </>
                    )}
                    {item.status === 'error' && (
                      <button onClick={() => handleSingleUpload(i)} className="h-11 px-6 rounded-xl bg-white/5 text-white/60 font-bold text-xs border border-white/10 hover:bg-white/10 transition-all">Retry</button>
                    )}
                    {item.status === 'success' && (
                      <div className="flex items-center gap-3">
                         <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-full">Analyzed</span>
                         <Link to={`/candidates/${item.result?.id}`} className="w-11 h-11 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-white/5">
                           <ChevronRight size={24} />
                         </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Extraction Preview */}
                {item.status === 'success' && item.result && (
                  <div className="mt-6 pt-6 border-t border-white/5 animate-slideUp relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {[
                        { label: 'Full Name', value: item.result.name, icon: User },
                        { label: 'Intelligence Email', value: item.result.email || 'Not detected', icon: Mail },
                        { label: 'Work Experience', value: item.result.experience_years ? formatExperience(item.result.experience_years) : 'Entry Level', icon: Briefcase },
                        { label: 'Location Mapping', value: item.result.location || 'Remote/Unknown', icon: MapPin },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label}>
                          <div className="flex items-center gap-2 mb-1.5 opacity-30">
                            <Icon size={12} className="text-blue-500" />
                            <span className="text-[9px] font-black text-white uppercase tracking-[0.15em]">{label}</span>
                          </div>
                          <p className="text-sm font-bold text-white truncate">{value}</p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-7 flex items-center justify-between gap-6">
                       <div className="flex flex-wrap gap-2 flex-1 overflow-hidden">
                          {(item.result.skills?.technical || []).slice(0, 8).map((s, idx) => (
                            <span key={idx} className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-white/5 text-blue-400 border border-white/5 uppercase tracking-widest">
                               {s}
                            </span>
                          ))}
                       </div>
                       <Link
                          to={`/candidates/${item.result.id}`}
                          className="h-11 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-xs flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-blue-500/20"
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
              className="w-full h-16 rounded-3xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 hover:border-blue-500/30 transition-all flex items-center justify-center gap-3 group"
            >
              <span>Finish and Proceed to Neural Pool</span>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform text-blue-500" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

