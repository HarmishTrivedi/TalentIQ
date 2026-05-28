import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, User, Briefcase, Video, Plus,
  Play, Eye, Edit, Trash2, CheckCircle, AlertCircle,
  XCircle, Download, Zap, TrendingUp, Brain, Search,
  RefreshCw, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { cn, formatDate } from '../utils/helpers';
import { useAuthStore } from '../store';

function DeleteModal({ title, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mb-5">
            <Trash2 size={28} className="text-error" />
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">Delete Interview</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-8">
            Permanently delete <span className="font-bold text-on-surface">"{title}"</span>? This cannot be undone.
          </p>
          <div className="flex gap-3 w-full">
            <button onClick={onClose} disabled={loading} className="btn-secondary flex-1 py-3 font-bold">Cancel</button>
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

export default function InterviewSchedule() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadInterviews(); }, [filter]);

  const loadInterviews = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await api.get('/interviews', { params });
      const sorted = (res.data || []).sort((a, b) => {
        if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
        if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
        return new Date(a.scheduled_at) - new Date(b.scheduled_at);
      });
      setInterviews(sorted);
    } catch { toast.error('Failed to load interviews'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/interviews/${deleteTarget.id}`);
      setInterviews(prev => prev.filter(i => i.id !== deleteTarget.id));
      toast.success('Interview deleted');
      setDeleteTarget(null);
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  const handleCancel = async (id) => {
    try {
      await api.patch(`/interviews/${id}`, { status: 'cancelled' });
      toast.success('Interview cancelled');
      loadInterviews();
    } catch { toast.error('Failed to cancel'); }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Manual Start';
    const d = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (d.toDateString() === today.toDateString()) return `Today at ${time}`;
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow at ${time}`;
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${time}`;
  };

  const getStatusStyle = (status, scheduledAt) => {
    const diff = scheduledAt ? (new Date(scheduledAt) - Date.now()) / 60000 : 999;
    if (status === 'in_progress') return { cls: 'bg-tertiary/10 text-tertiary border-tertiary/20', label: 'Live Now', pulse: true };
    if (status === 'completed') return { cls: 'bg-secondary/10 text-secondary border-secondary/20', label: 'Completed' };
    if (status === 'cancelled') return { cls: 'bg-error/10 text-error border-error/20', label: 'Cancelled' };
    if (diff < 0) return { cls: 'bg-amber-50 text-amber-600 border-amber-200', label: 'Missed' };
    if (diff <= 30) return { cls: 'bg-amber-50 text-amber-600 border-amber-200', label: 'Starting Soon' };
    return { cls: 'bg-primary/5 text-primary border-primary/20', label: 'Upcoming' };
  };

  // Stats
  const todayInterviews = interviews.filter(i => {
    if (!i.scheduled_at) return false;
    return new Date(i.scheduled_at).toDateString() === new Date().toDateString();
  });
  const liveCount = interviews.filter(i => i.status === 'in_progress').length;
  const completedCount = interviews.filter(i => i.status === 'completed').length;
  const pendingEvals = interviews.filter(i => i.status === 'completed' && !i.overall_score);

  const filtered = interviews.filter(i =>
    i.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.candidate?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todayFiltered = filtered.filter(i => i.scheduled_at && new Date(i.scheduled_at).toDateString() === new Date().toDateString());
  const upcomingFiltered = filtered.filter(i => {
    if (!i.scheduled_at) return false;
    const d = new Date(i.scheduled_at);
    return d.toDateString() !== new Date().toDateString() && d > new Date() && i.status === 'scheduled';
  });
  const otherFiltered = filtered.filter(i => i.status === 'completed' || i.status === 'cancelled' || i.status === 'in_progress');

  return (
    <div className="page-enter">
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal title={deleteTarget.title} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} loading={deleting} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-1">Your Interview Schedule</h2>
          <p className="text-sm text-on-surface-variant opacity-70">
            Managing {todayInterviews.length} candidate{todayInterviews.length !== 1 ? 's' : ''} for today,{' '}
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-highest text-on-surface font-bold rounded-lg border border-outline-variant hover:bg-surface-variant transition-colors text-sm">
            <Download size={16} /> Export Schedule
          </button>
          <div className="flex items-center gap-2 bg-primary-container text-on-primary-container px-4 py-2 rounded-lg font-bold text-sm">
            <Zap size={16} /> AI Optimization Active
          </div>
          <button onClick={() => navigate('/interviews/schedule')} className="btn-primary">
            <Plus size={18} /> Schedule New
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">

        {/* Today's Interviews — 8 cols */}
        <section className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
            <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <Calendar size={20} className="text-primary" />
              Today's Interviews
            </h3>
            <span className="text-[11px] font-black uppercase tracking-wider bg-secondary/10 text-secondary px-3 py-1 rounded-full">
              {todayInterviews.length} Scheduled
            </span>
          </div>

          {/* Search & Filter */}
          <div className="px-6 py-3 border-b border-outline-variant flex gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline opacity-60" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search candidates or interviews..."
                className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl">
              {['all', 'scheduled', 'in_progress', 'completed'].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={cn('px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                    filter === s ? 'bg-primary text-on-primary shadow-sm' : 'text-outline hover:bg-surface-container-high')}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-outline uppercase tracking-widest">Loading schedule...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <Calendar size={40} className="text-outline opacity-20 mx-auto mb-4" />
              <p className="text-base font-bold text-on-surface mb-2">No interviews found</p>
              <p className="text-sm text-outline mb-6">Schedule your first interview to get started.</p>
              <button onClick={() => navigate('/interviews/schedule')} className="btn-primary mx-auto">
                <Plus size={16} /> Schedule Interview
              </button>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant">
              {filtered.map((interview, idx) => {
                const status = getStatusStyle(interview.status, interview.scheduled_at);
                return (
                  <motion.div key={interview.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                    className="p-6 flex items-center justify-between hover:bg-surface-bright transition-colors group">
                    <div className="flex items-center gap-4">
                      {/* Time block */}
                      <div className="flex flex-col items-center justify-center w-16 h-16 bg-surface-container rounded-lg border border-outline-variant shrink-0">
                        <span className="font-mono text-[10px] text-outline uppercase tracking-wider">TIME</span>
                        <span className={cn('text-lg font-black', interview.status === 'in_progress' ? 'text-tertiary' : 'text-primary')}>
                          {formatTime(interview.scheduled_at)}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                            {interview.candidate?.name || interview.title}
                          </h4>
                          {status.pulse && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                              <span className="text-[10px] font-black text-red-600 uppercase">Live</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-on-surface-variant">
                          {interview.title}
                          {interview.id && <span className="font-mono text-[11px] text-outline ml-2">#{String(interview.id).slice(0, 6).toUpperCase()}</span>}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className={cn('text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border', status.cls)}>
                            {status.label}
                          </span>
                          {interview.duration_minutes && (
                            <span className="flex items-center gap-1 text-[11px] text-outline">
                              <Clock size={11} /> {interview.duration_minutes}m
                            </span>
                          )}
                          {interview.job && (
                            <span className="flex items-center gap-1 text-[11px] text-outline truncate max-w-[140px]">
                              <Briefcase size={11} /> {interview.job.title}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Link to={`/candidates/${interview.candidate_id}`}
                        className="text-primary font-bold text-sm hover:underline hidden md:block"
                        onClick={e => e.stopPropagation()}>
                        View Profile
                      </Link>

                      {(interview.status === 'scheduled' || interview.status === 'in_progress') && (
                        <button onClick={() => {
                          const url = interview.recruiter_meeting_url && !interview.recruiter_meeting_url.includes('localhost:3000')
                            ? interview.recruiter_meeting_url : `/interview-room/${interview.id}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                          className={cn('px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all hover:shadow-lg',
                            interview.status === 'in_progress'
                              ? 'bg-tertiary text-white hover:shadow-tertiary/20'
                              : 'bg-primary text-on-primary hover:shadow-primary/20'
                          )}>
                          <Video size={16} />
                          {interview.status === 'in_progress' ? 'Rejoin' : 'Start Interview'}
                        </button>
                      )}

                      {interview.status === 'completed' && (
                        <button onClick={() => navigate(`/interviews/${interview.id}/analysis`)}
                          className="px-5 py-2.5 bg-surface-container text-primary rounded-lg font-bold text-sm border border-primary/20 hover:bg-primary/10 transition-colors flex items-center gap-2">
                          <Eye size={16} /> Analysis
                        </button>
                      )}

                      {interview.status === 'scheduled' && (
                        <button onClick={() => navigate(`/interviews/schedule?reschedule=${interview.id}`)}
                          className="p-2.5 text-outline hover:text-primary hover:bg-surface-container rounded-lg transition-all" title="Reschedule">
                          <Edit size={16} />
                        </button>
                      )}

                      <button onClick={() => setDeleteTarget(interview)}
                        className="p-2.5 text-outline hover:text-error hover:bg-error/5 rounded-lg transition-all" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column — 4 cols */}
        <section className="col-span-12 lg:col-span-4 space-y-6">

          {/* Performance Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-secondary" /> Performance
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-on-surface-variant mb-1">Interviews Today</p>
                  <p className="text-[32px] leading-none font-black text-primary">
                    {todayInterviews.length}
                    <span className="text-lg text-outline font-semibold"> scheduled</span>
                  </p>
                </div>
                <div className="h-12 w-20 flex items-end gap-1">
                  {[60, 80, 100, 70].map((h, i) => (
                    <div key={i} className={cn('w-3 rounded-t', i === 2 ? 'bg-primary' : 'bg-surface-container-highest')}
                      style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-outline-variant flex justify-between">
                <div>
                  <p className="text-sm text-on-surface-variant">Completed</p>
                  <p className="text-xl font-black text-on-surface">
                    {completedCount} <span className="text-sm text-tertiary font-bold">total</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">Live Now</p>
                  <p className="text-xl font-black text-on-surface">{liveCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Coaching Insight */}
          <div className="rounded-xl p-6 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #007b71, #006058)', boxShadow: 'inset 0 0 10px rgba(75,65,225,0.05), 0 0 0 1px rgba(75,65,225,0.1)' }}>
            <div className="absolute -right-4 -top-4 opacity-10">
              <Brain size={120} className="text-white" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Brain size={18} className="text-tertiary-fixed" />
              <span className="text-[11px] font-black uppercase tracking-widest text-tertiary-fixed">AI Coaching Insight</span>
            </div>
            <p className="text-sm text-on-tertiary-fixed font-semibold mb-4 leading-relaxed">
              "Your feedback consistency is high. Consider asking more behavioral questions regarding scalability for technical roles."
            </p>
            <button className="text-sm font-bold text-tertiary-fixed flex items-center gap-1 hover:underline">
              Review Recommendations →
            </button>
          </div>

          {/* Quick Stats */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertCircle size={16} className="text-error" /> Pending Evaluations
            </h3>
            {pendingEvals.length === 0 ? (
              <div className="flex items-center gap-2 text-tertiary">
                <CheckCircle size={16} />
                <span className="text-sm font-semibold">All evaluations complete!</span>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingEvals.slice(0, 3).map(i => (
                  <div key={i.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{i.candidate?.name || i.title}</p>
                      <p className="text-[11px] text-outline font-mono">{formatDateTime(i.scheduled_at)}</p>
                    </div>
                    <button onClick={() => navigate(`/interviews/${i.id}/analysis`)}
                      className="ml-3 px-3 py-1.5 bg-surface-container text-primary rounded-lg font-bold text-xs border border-primary/20 hover:bg-primary/10 transition-colors shrink-0">
                      Evaluate
                    </button>
                  </div>
                ))}
                {pendingEvals.length > 3 && (
                  <p className="text-xs text-outline text-center font-semibold">+{pendingEvals.length - 3} more pending</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Pending Evaluations Table — full width */}
        {pendingEvals.length > 0 && (
          <section className="col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <AlertCircle size={20} className="text-error" /> Pending Evaluations
              </h3>
              <div className="flex items-center gap-2 text-error font-bold text-sm bg-error-container/20 px-3 py-1 rounded-full">
                <AlertCircle size={16} /> {pendingEvals.length} Due Soon
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="stitch-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Job Role</th>
                    <th>Completed</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingEvals.map(i => (
                    <tr key={i.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(i.candidate?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-on-surface">{i.candidate?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="text-sm text-on-surface-variant">{i.job?.title || '—'}</td>
                      <td className="font-mono text-xs text-outline">{formatDateTime(i.scheduled_at)}</td>
                      <td>
                        <span className="px-2 py-1 bg-error-container text-on-error-container rounded-md text-[10px] font-black uppercase tracking-wider">
                          Awaiting Feedback
                        </span>
                      </td>
                      <td className="text-right">
                        <button onClick={() => navigate(`/interviews/${i.id}/analysis`)}
                          className="px-4 py-2 bg-surface-container text-primary rounded-lg font-bold text-sm border border-primary/20 hover:bg-primary/10 transition-colors">
                          Submit Scorecard
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
