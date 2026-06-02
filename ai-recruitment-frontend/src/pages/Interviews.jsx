import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Video, Calendar, Clock, User, Briefcase,
  Brain, Search, Play, Eye, Trash2, AlertCircle, X, Film, Sparkles, Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { cn, formatDate, getScoreColor } from '../utils/helpers';

function DeleteModal({ interview, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mb-5">
            <Trash2 size={28} className="text-error" />
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">Delete Interview</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-8">
            Are you sure you want to permanently delete <span className="font-bold text-on-surface">"{interview?.title}"</span>? This will also remove all AI analysis and recordings.
          </p>
          <div className="flex gap-3 w-full">
            <button onClick={onClose} disabled={loading}
              className="btn-secondary flex-1 py-3 font-bold">Cancel</button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-error hover:bg-error/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={16} />}
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Interviews() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadInterviews(); }, [filter]);

  const loadInterviews = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/interviews', { params });
      setInterviews(response.data);
    } catch { toast.error('Failed to load interviews'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/interviews/${deleteTarget.id}`);
      setInterviews(prev => prev.filter(i => i.id !== deleteTarget.id));
      toast.success('Interview deleted successfully');
      setDeleteTarget(null);
    } catch { toast.error('Failed to delete interview'); }
    finally { setDeleting(false); }
  };

  const getStatusStyle = (status) => ({
    completed:   'bg-tertiary/10 text-tertiary border-tertiary/20',
    in_progress: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    scheduled:   'bg-primary/5 text-primary border-primary/20',
    cancelled:   'bg-error/10 text-error border-error/20',
  }[status] || 'bg-primary/5 text-primary border-primary/20');

  const getStatusLabel = (status) => ({
    completed: 'Completed', in_progress: 'Live', scheduled: 'Scheduled', cancelled: 'Cancelled'
  }[status] || 'Scheduled');

  const filteredInterviews = interviews.filter(i =>
    i.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.candidate?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [aiInput, setAiInput] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const handleAiSchedule = async () => {
    if (!aiInput.trim()) return;
    setAiGenerating(true);
    try {
      // Use the unified interviews endpoint for real-time syncing
      const res = await api.post('/interviews/ai-generate', { text: aiInput });
      toast.success(res.data.message || 'AI successfully dispatched your session(s)!');
      setAiInput('');
      loadInterviews(); // Refresh the list immediately
    } catch (err) {
      console.error('AI Schedule Error:', err);
      toast.error('AI failed to parse scheduling intent');
    } finally {
      setAiGenerating(false);
    }
  };

  const recordingCount = interviews.filter(i => i.recording_url).length;

  return (
    <div className="page-enter bg-surface">
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            interview={deleteTarget}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-1">Interview Intelligence</h2>
          <p className="text-on-surface-variant text-sm opacity-70">
            Conduct and analyze AI-powered screening sessions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {recordingCount > 0 && (
            <Link to="/interviews/recordings"
              className="btn-secondary flex items-center gap-2">
              <Film size={16} className="text-primary" />
              <span>Recordings ({recordingCount})</span>
            </Link>
          )}
          <button onClick={() => navigate('/interviews/schedule')} className="btn-primary">
            <Plus size={18} />
            <span>Schedule New Session</span>
          </button>
        </div>
      </div>

      {/* AI Instant Scheduler Box (Themed like JD AI bar) */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="portal-card p-6 mb-8 bg-primary/5 border border-primary/20 shadow-xl overflow-hidden relative group"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all duration-700"></div>
        
        <div className="flex items-center gap-4 mb-4 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="w-5 h-5 text-on-primary animate-pulse" />
          </div>
          <div>
            <h3 className="font-black text-primary text-xs uppercase tracking-wider">AI Interview Dispatcher</h3>
            <p className="text-[10px] font-bold text-outline opacity-70 italic">"Schedule John for technical round at 2pm tomorrow..."</p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input 
                type="text"
                placeholder="Bulk schedule candidates via AI (e.g. Rahul at 2pm, Amit at 4pm today)..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSchedule()}
                className="w-full h-12 pl-5 pr-4 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-bold text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-inner"
              />
            </div>
            <button 
              onClick={handleAiSchedule}
              disabled={aiGenerating || !aiInput.trim()}
              className="h-12 px-8 bg-primary hover:bg-primary-container text-white rounded-xl transition-all flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {aiGenerating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={14} />
                  <span>Dispatch</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Filters & Search */}
      <div className="portal-card mb-8 p-2 flex flex-col lg:flex-row gap-4 bg-surface-container-lowest shadow-sm">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-70" />
          <input
            type="text"
            placeholder="Search by candidate name or role title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-surface-container-low border border-transparent rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl">
          {['all', 'scheduled', 'in_progress', 'completed'].map(status => (
            <button key={status} onClick={() => setFilter(status)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all',
                filter === status ? 'bg-primary text-on-primary shadow-md' : 'text-outline hover:bg-surface-container-high'
              )}>
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-5">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-outline uppercase tracking-widest">Loading sessions...</p>
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="portal-card p-20 text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-[40px] bg-surface-container border border-outline-variant flex items-center justify-center shadow-inner">
              <Video size={36} className="text-outline opacity-20" />
            </div>
            <div className="max-w-xs mx-auto">
              <p className="text-lg font-bold text-on-surface mb-2">No interviews found</p>
              <p className="text-sm text-outline mb-6">No sessions match your current filter.</p>
              <button onClick={() => navigate('/interviews/schedule')} className="btn-primary w-full shadow-lg">
                Schedule First Interview
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredInterviews.map((interview, index) => (
              <motion.div
                key={interview.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="portal-card p-6 flex flex-col h-full bg-surface-container-lowest group border-outline-variant/60 shadow-md hover:shadow-xl hover:border-primary/30 transition-all"
              >
                {/* Status row */}
                <div className="flex items-start justify-between mb-5">
                  <div className={cn('px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest', getStatusStyle(interview.status))}>
                    {getStatusLabel(interview.status)}
                  </div>
                  <div className="flex items-center gap-1">
                    {interview.recording_url && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/10 border border-secondary/20 text-[10px] font-black text-secondary uppercase tracking-wider">
                        <Film size={10} /> REC
                      </span>
                    )}
                    {interview.status === 'in_progress' && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-red-600 uppercase">Live</span>
                      </div>
                    )}
                    {/* Delete button */}
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(interview); }}
                      className="p-1.5 text-outline hover:text-error hover:bg-error/5 rounded-lg transition-all ml-1"
                      title="Delete interview"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Body — clickable */}
                <div className="flex-1 cursor-pointer" onClick={() => {
                  if (interview.status === 'completed') navigate(`/interviews/${interview.id}/analysis`);
                  else navigate(`/interview-room/${interview.id}`);
                }}>
                  <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors leading-tight mb-4">
                    {interview.title}
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                        <User size={13} className="text-outline" />
                      </div>
                      <span className="text-sm font-semibold text-on-surface opacity-80 truncate">
                        {interview.candidate?.name || 'Anonymous Talent'}
                      </span>
                    </div>
                    {interview.job && (
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                          <Briefcase size={13} className="text-outline" />
                        </div>
                        <span className="text-sm text-outline truncate">{interview.job.title}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-5 pt-1">
                      <div className="flex items-center gap-1.5 text-outline">
                        <Calendar size={12} />
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          {interview.scheduled_at ? formatDate(interview.scheduled_at) : 'Manual Start'}
                        </span>
                      </div>
                      {interview.duration_minutes && (
                        <div className="flex items-center gap-1.5 text-outline">
                          <Clock size={12} />
                          <span className="text-[11px] font-bold uppercase tracking-wider">{interview.duration_minutes}m</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score bar */}
                {interview.status === 'completed' && interview.overall_score && (
                  <div className="my-4 p-3 rounded-xl bg-surface-container border border-outline-variant/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black text-outline uppercase tracking-widest">AI Score</span>
                      <span className="text-sm font-black" style={{ color: getScoreColor(interview.overall_score) }}>
                        {Math.round(interview.overall_score)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${interview.overall_score}%`, background: `linear-gradient(90deg, ${getScoreColor(interview.overall_score)}cc, ${getScoreColor(interview.overall_score)})` }} />
                    </div>
                  </div>
                )}

                {/* Footer action */}
                <div className="mt-auto pt-4 border-t border-outline-variant">
                  {interview.status === 'scheduled' && (
                    <button onClick={e => {
                      e.stopPropagation();
                      const url = interview.recruiter_meeting_url && !interview.recruiter_meeting_url.includes('localhost:3000')
                        ? interview.recruiter_meeting_url : `/interview-room/${interview.id}`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }} className="btn-primary w-full justify-center">
                      <Play size={15} /> Launch Session
                    </button>
                  )}
                  {interview.status === 'in_progress' && (
                    <button onClick={e => {
                      e.stopPropagation();
                      const url = interview.recruiter_meeting_url && !interview.recruiter_meeting_url.includes('localhost:3000')
                        ? interview.recruiter_meeting_url : `/interview-room/${interview.id}`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }} className="w-full bg-emerald-500 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all">
                      <Video size={16} /> Rejoin Session
                    </button>
                  )}
                  {interview.status === 'completed' && (
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/interviews/${interview.id}/analysis`)}
                        className="btn-secondary flex-1 py-2.5 flex items-center justify-center gap-2">
                        <Eye size={15} /> Analysis
                      </button>
                      {interview.recording_url && (
                        <Link to="/interviews/recordings"
                          className="btn-secondary py-2.5 px-3 flex items-center justify-center"
                          title="View recording">
                          <Film size={15} className="text-secondary" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
