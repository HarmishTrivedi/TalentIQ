import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Download, FileText, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TranscriptPanel({ transcript = [], onClose, recording = false, embedded = false }) {
  const [query, setQuery] = useState('')
  const scrollRef = useRef(null)
  const visibleTranscript = useMemo(() => {
    const normalized = query.toLowerCase().trim()
    if (!normalized) return transcript
    return transcript.filter((line) => `${line.speaker} ${line.text}`.toLowerCase().includes(normalized))
  }, [query, transcript])

  useEffect(() => {
    if (!query && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [query, transcript])

  const transcriptText = transcript.map((line) => (
    `[${new Date(line.timestamp).toLocaleTimeString()}] ${line.speaker}: ${line.text}`
  )).join('\n')

  const copyTranscript = async () => {
    await navigator.clipboard.writeText(transcriptText)
    toast.success('Transcript copied')
  }

  const exportTranscript = () => {
    const file = new Blob([transcriptText || 'No transcript captured.'], { type: 'text/plain' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'talentiq-interview-transcript.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.aside
      initial={embedded ? { opacity: 0 } : { x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={embedded ? { opacity: 0 } : { x: 420, opacity: 0 }}
      className={embedded
        ? 'flex h-full min-h-72 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]'
        : 'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-2xl'}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/15 p-2 text-violet-300"><FileText size={18} /></div>
          <div>
            <h2 className="text-sm font-semibold text-white">Live transcript</h2>
            <p className="text-xs text-slate-400">{recording ? 'Transcribing now' : 'Transcript available'}</p>
          </div>
        </div>
        {!embedded && (
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close transcript">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="space-y-3 border-b border-white/10 p-4">
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-400">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transcript" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={copyTranscript} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10">
            <Copy size={14} /> Copy
          </button>
          <button type="button" onClick={exportTranscript} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10">
            <Download size={14} /> Export
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar">
        {visibleTranscript.length === 0 ? (
          <div className="flex h-full min-h-40 items-center justify-center text-center text-sm text-slate-500">
            {query ? 'No transcript matches your search.' : 'Transcript will appear as the conversation begins.'}
          </div>
        ) : visibleTranscript.map((line, index) => (
          <div key={`${line.timestamp}-${index}`} className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className={line.speaker === 'candidate' ? 'font-semibold text-violet-300' : 'font-semibold text-cyan-300'}>
                {line.speaker === 'candidate' ? 'Candidate' : 'Recruiter'}
              </span>
              <span className="text-slate-500">{new Date(line.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="rounded-xl bg-white/[0.04] px-3 py-2 text-sm leading-relaxed text-slate-200">{line.text}</p>
          </div>
        ))}
      </div>
    </motion.aside>
  )
}
