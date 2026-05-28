import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Download, Share2, Brain, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, Code, MessageCircle, Shield, Clock,
  Target, Award, ThumbsUp, ThumbsDown, Activity, Zap, User, Trash2
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';
import { cn } from '../utils/helpers';

function ScoreBar({ label, value, icon: Icon, color }) {
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW(value), 200); return () => clearTimeout(t) }, [value])
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-on-surface-variant">
          {Icon && <Icon size={13} />}
          <span className="text-xs font-semibold">{label}</span>
        </div>
        <span className="text-xs font-black" style={{ color }}>{Math.round(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${w}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
      </div>
    </div>
  )
}

function ScoreRing({ value, size = 120 }) {
  const r = (size - 14) / 2
  const circ = 2 * Math.PI * r
  const color = value >= 80 ? '#006058' : value >= 60 ? '#004ac6' : value >= 40 ? '#f59e0b' : '#ba1a1a'
  const [offset, setOffset] = useState(circ)
  useEffect(() => { const t = setTimeout(() => setOffset(circ * (1 - value / 100)), 300); return () => clearTimeout(t) }, [value, circ])
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={7} className="text-surface-container-high" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 6px ${color}60)` }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-black" style={{ color }}>{Math.round(value)}</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-outline">Score</div>
      </div>
    </div>
  )
}

export default function InterviewAnalysis() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [interview, setInterview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadAnalysis() }, [interviewId]);

  const loadAnalysis = async () => {
    try {
      const [interviewRes, analysisRes] = await Promise.all([
        api.get(`/interviews/${interviewId}`),
        api.get(`/interviews/${interviewId}/analysis`)
      ]);
      setInterview(interviewRes.data);
      setAnalysis(analysisRes.data);
    } catch { toast.error('Failed to load analysis') }
    finally { setLoading(false) }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: `TalentIQ Analysis`, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied!') }
    } catch (e) { if (e?.name !== 'AbortError') toast.error('Unable to share') }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/interviews/${interviewId}`);
      toast.success('Interview and analysis deleted');
      navigate('/interviews');
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  const recColor = (r) => ({ strong_hire: '#006058', hire: '#004ac6', maybe: '#f59e0b', no_hire: '#ba1a1a' }[r] || '#737686')
  const recLabel = (r) => ({ strong_hire: 'Strong Hire', hire: 'Hire', maybe: 'Maybe', no_hire: 'No Hire' }[r] || r)
  const riskColor = (l) => ({ low: 'text-tertiary bg-tertiary/10 border-tertiary/20', medium: 'text-amber-600 bg-amber-50 border-amber-200', high: 'text-error bg-error/10 border-error/20' }[l] || '')

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-outline uppercase tracking-widest">Generating AI Analysis...</p>
      </div>
    </div>
  )

  if (!analysis) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
        <p className="text-lg font-bold text-on-surface">Analysis not available</p>
        <p className="text-sm text-outline mt-2">This interview may not have completed yet.</p>
        <button onClick={() => navigate('/interviews')} className="btn-primary mt-6">Back to Interviews</button>
      </div>
    </div>
  )

  const reportTranscript = location.state?.transcript || [];

  return (
    <div className="page-enter">
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mb-5">
                  <Trash2 size={28} className="text-error" />
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-2">Delete Analysis</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-8">
                  Permanently delete <span className="font-bold text-on-surface">"{interview?.title}"</span> and all its AI analysis data? This cannot be undone.
                </p>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setShowDeleteModal(false)} disabled={deleting}
                    className="btn-secondary flex-1 py-3 font-bold">Cancel</button>
                  <button onClick={handleDelete} disabled={deleting}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-error hover:bg-error/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {deleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={16} />}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <button onClick={() => navigate('/interviews')}
            className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs mb-4 group">
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Interviews
          </button>
          <h2 className="text-3xl font-bold text-on-surface mb-1 flex items-center gap-3">
            <Brain size={28} className="text-primary" />
            Interview Analysis Report
          </h2>
          <p className="text-sm text-on-surface-variant opacity-70">{interview?.title}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleShare} className="btn-secondary flex items-center gap-2">
            <Share2 size={16} /> Share
          </button>
          <button onClick={() => { toast.success('Use print dialog to save as PDF'); window.print() }}
            className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Export PDF
          </button>
          <button onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-error/30 text-error hover:bg-error/5 transition-all font-semibold text-sm">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Overall Score Hero */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="portal-card p-8 mb-6 bg-surface-container-lowest shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Ring */}
          <div className="flex flex-col items-center gap-3">
            <ScoreRing value={analysis.overall_rating || 0} size={130} />
            <p className="text-[11px] font-black uppercase tracking-widest text-outline">Overall Rating</p>
          </div>

          {/* Recommendation */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-outline">Hiring Recommendation</p>
            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl border-2 text-white font-black text-xl"
              style={{ background: recColor(analysis.hiring_recommendation), borderColor: recColor(analysis.hiring_recommendation) }}>
              {analysis.hiring_recommendation === 'strong_hire' && <ThumbsUp size={24} />}
              {analysis.hiring_recommendation === 'hire' && <CheckCircle size={24} />}
              {analysis.hiring_recommendation === 'maybe' && <AlertTriangle size={24} />}
              {analysis.hiring_recommendation === 'no_hire' && <ThumbsDown size={24} />}
              {recLabel(analysis.hiring_recommendation)}
            </div>
            {analysis.ai_summary && (
              <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-3">{analysis.ai_summary}</p>
            )}
          </div>

          {/* Key Scores */}
          <div className="space-y-3">
            {[
              { label: 'Technical', value: analysis.technical_rating, icon: Code, color: '#004ac6' },
              { label: 'Communication', value: analysis.communication_rating, icon: MessageCircle, color: '#4b41e1' },
              { label: 'Confidence', value: analysis.confidence_rating, icon: TrendingUp, color: '#006058' },
              { label: 'Coding', value: analysis.coding_rating, icon: Code, color: '#f59e0b' },
            ].filter(s => s.value).map(s => (
              <ScoreBar key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} />
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Fraud Detection */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="portal-card p-6 bg-surface-container-lowest shadow-md">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant">
              <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                <Shield size={18} />
              </div>
              <h3 className="text-base font-bold text-on-surface">AI Fraud Detection</h3>
            </div>

            <div className={cn('flex items-center justify-between p-4 rounded-xl border mb-5', riskColor(analysis.fraud_risk_level))}>
              <div className="flex items-center gap-3">
                {analysis.fraud_risk_level === 'low' && <CheckCircle size={20} />}
                {analysis.fraud_risk_level === 'medium' && <AlertTriangle size={20} />}
                {analysis.fraud_risk_level === 'high' && <XCircle size={20} />}
                <div>
                  <p className="font-black text-sm uppercase tracking-wider">{(analysis.fraud_risk_level || 'low').toUpperCase()} RISK</p>
                  <p className="text-xs opacity-80">AI Assistance Probability: {Math.round(analysis.ai_assistance_probability || 0)}%</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Tab Switches', value: analysis.tab_switching_count || 0 },
                { label: 'Copy-Paste', value: analysis.copy_paste_count || 0 },
                { label: 'Suspicious Events', value: analysis.plagiarism_indicators?.length || 0 },
              ].map(({ label, value }) => (
                <div key={label} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant text-center">
                  <p className="text-2xl font-black text-on-surface">{value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-outline mt-1">{label}</p>
                </div>
              ))}
            </div>

            {analysis.plagiarism_indicators?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-outline mb-2">Detected Indicators</p>
                {analysis.plagiarism_indicators.map((ind, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-error/5 rounded-xl border border-error/10">
                    <AlertTriangle size={14} className="text-error shrink-0 mt-0.5" />
                    <span className="text-xs text-on-surface-variant">{ind}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Technical Analysis */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="portal-card p-6 bg-surface-container-lowest shadow-md">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant">
              <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                <Code size={18} />
              </div>
              <h3 className="text-base font-bold text-on-surface">Technical Analysis</h3>
            </div>

            {analysis.technical_fit && (
              <p className="text-sm text-on-surface-variant leading-relaxed mb-6">{analysis.technical_fit}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-tertiary/5 border border-tertiary/20">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={14} className="text-tertiary" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-tertiary">Strengths</span>
                </div>
                <ul className="space-y-2.5">
                  {(analysis.candidate_strengths || []).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-on-surface font-medium">
                      <Award size={12} className="text-tertiary shrink-0 mt-0.5" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-600">Weaknesses</span>
                </div>
                <ul className="space-y-2.5">
                  {(analysis.candidate_weaknesses || []).map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-on-surface font-medium">
                      <Target size={12} className="text-amber-600 shrink-0 mt-0.5" /> {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Communication */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="portal-card p-6 bg-surface-container-lowest shadow-md">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant">
              <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                <MessageCircle size={18} />
              </div>
              <h3 className="text-base font-bold text-on-surface">Communication Analysis</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Speech Clarity', value: analysis.speech_clarity || 75, type: 'bar' },
                { label: 'Professionalism', value: analysis.professionalism || 80, type: 'bar' },
                { label: 'Filler Words', value: analysis.filler_words_count || 0, type: 'count' },
                { label: 'Speaking Speed', value: `${Math.round(analysis.speaking_speed_wpm || 125)} WPM`, type: 'text' },
              ].map(({ label, value, type }) => (
                <div key={label} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-2">{label}</p>
                  {type === 'bar' ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${value}%` }} />
                      </div>
                      <span className="text-sm font-black text-on-surface">{Math.round(value)}</span>
                    </div>
                  ) : (
                    <p className="text-2xl font-black text-on-surface">{value}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Transcript */}
          {reportTranscript.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="portal-card p-6 bg-surface-container-lowest shadow-md">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant">
                <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                  <MessageCircle size={18} />
                </div>
                <h3 className="text-base font-bold text-on-surface">Interview Transcript</h3>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                {reportTranscript.map((line, i) => (
                  <div key={i} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-primary capitalize">{line.speaker}</span>
                      <span className="text-[10px] text-outline">{new Date(line.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant">{line.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Interview Details */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="portal-card p-6 bg-surface-container-lowest shadow-md">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-outline-variant">
              <User size={16} className="text-primary" />
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Interview Details</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Duration', value: `${interview?.duration_minutes || 0} min`, icon: Clock },
                { label: 'Date', value: interview?.started_at ? new Date(interview.started_at).toLocaleDateString() : '—', icon: Activity },
                { label: 'Questions', value: interview?.questions?.length || 0, icon: Brain },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Icon size={14} className="text-outline" />
                    <span className="text-xs font-semibold">{label}</span>
                  </div>
                  <span className="text-xs font-black text-on-surface">{value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Improvement Areas */}
          {analysis.improvement_areas?.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="portal-card p-6 bg-surface-container-lowest shadow-md">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-outline-variant">
                <Target size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Improvement Areas</h3>
              </div>
              <ul className="space-y-3">
                {analysis.improvement_areas.map((area, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-on-surface-variant">
                    <Zap size={12} className="text-amber-500 shrink-0 mt-0.5" /> {area}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Next Steps */}
          {analysis.next_round_suggestion && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
              className="portal-card p-6 bg-primary/5 border-primary/20 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Activity size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Next Round</h3>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">{analysis.next_round_suggestion}</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
