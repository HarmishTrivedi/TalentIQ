import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Brain, CheckCircle, FileText, MessageCircle, Sparkles, Target, X } from 'lucide-react'
import TranscriptPanel from './TranscriptPanel'

export default function RecruiterAIPanel({ analysis = {}, interview, transcript = [], onClose, recording }) {
  const [notes, setNotes] = useState('')
  const questions = interview?.questions || []
  const currentTranscript = transcript[transcript.length - 1]?.text || ''
  const skills = useMemo(() => {
    const source = interview?.candidate?.skills?.technical || analysis.detected_skills || []
    return Array.isArray(source) ? source.slice(0, 6) : []
  }, [analysis.detected_skills, interview])
  const suggestions = analysis.follow_up_questions || questions.slice(0, 3).map((question) => question.question_text)
  const insights = analysis.insights || []
  const riskFlags = analysis.risk_flags || analysis.plagiarism_indicators || []

  return (
    <motion.aside
      initial={{ x: 480, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 480, opacity: 0 }}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-violet-400/15 bg-slate-950/92 shadow-2xl backdrop-blur-2xl"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/20 p-2 text-violet-300"><Brain size={20} /></div>
          <div>
            <h2 className="text-sm font-semibold text-white">AI Copilot</h2>
            <p className="text-xs text-slate-400">Private to recruiter</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close AI copilot">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar">
        <section className="h-72">
          <TranscriptPanel transcript={transcript} recording={recording} embedded />
        </section>

        <section className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.06] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-200">
            <Sparkles size={14} /> Suggested follow-ups
          </h3>
          {suggestions.length ? (
            <div className="space-y-2">
              {suggestions.slice(0, 3).map((suggestion, index) => (
                <p key={index} className="rounded-xl bg-white/[0.05] p-3 text-sm leading-relaxed text-slate-200">{suggestion}</p>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400">Suggestions will appear during the conversation.</p>}
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Target size={14} /> Detected skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {skills.length ? skills.map((skill) => (
                <span key={skill} className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs text-violet-200">{skill}</span>
              )) : <span className="text-sm text-slate-500">Listening for signals</span>}
            </div>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <MessageCircle size={14} /> Communication
            </h3>
            <p className="text-sm text-slate-300">
              {analysis.communication_summary || (currentTranscript ? 'Conversation captured. Detailed assessment appears after the interview.' : 'Analysis begins once conversation is detected.')}
            </p>
          </section>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <CheckCircle size={14} /> Key insights
          </h3>
          {insights.length ? insights.map((insight, index) => (
            <p key={index} className="mb-2 rounded-xl bg-white/[0.04] p-3 text-sm text-slate-200">{insight}</p>
          )) : <p className="text-sm text-slate-500">No key insight available yet.</p>}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <FileText size={14} /> Interview notes
          </h3>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Capture private notes for the post-interview decision..." className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400/40" />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <AlertTriangle size={14} /> Risk flags
          </h3>
          {riskFlags.length ? riskFlags.map((flag, index) => (
            <p key={index} className="mb-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-100">{flag}</p>
          )) : <p className="text-sm text-slate-500">No risk flags shown during this session.</p>}
          <p className="mt-3 text-xs text-slate-500">Full confidence and fraud assessment is reserved for the post-interview report.</p>
        </section>
      </div>
    </motion.aside>
  )
}
