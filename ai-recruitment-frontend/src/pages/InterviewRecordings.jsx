import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Film, Play, Pause, Download, Trash2,
  User, Calendar, Clock, Search, Eye, Brain,
  Volume2, VolumeX, Maximize2, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { cn, formatDate, getScoreColor } from '../utils/helpers';
import { EmptyState } from '../components/ui';

function VideoPlayer({ url, onClose }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
    setPlaying(p => !p);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100 || 0);
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pct * videoRef.current.duration;
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-surface-container-lowest rounded-3xl overflow-hidden shadow-2xl border border-outline-variant"
      >
        {/* Video */}
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            src={url}
            className="w-full h-full object-contain"
            muted={muted}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onEnded={() => setPlaying(false)}
          />
          {/* Play overlay */}
          {!playing && (
            <button onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center group">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-all border border-white/30">
                <Play size={32} className="text-white ml-1" />
              </div>
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="p-5 space-y-3">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-outline w-10 text-right">{fmt(currentTime)}</span>
            <div className="flex-1 h-2 bg-surface-container-high rounded-full cursor-pointer overflow-hidden" onClick={handleSeek}>
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-mono text-outline w-10">{fmt(duration)}</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={togglePlay}
                className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-container transition-all">
                {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>
              <button onClick={() => setMuted(m => !m)}
                className="w-10 h-10 rounded-xl btn-secondary flex items-center justify-center">
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <a href={url} download
                className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm">
                <Download size={15} /> Download
              </a>
              <button onClick={onClose}
                className="btn-secondary py-2 px-4 text-sm">Close</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DeleteModal({ title, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={onClose} />
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
          <h3 className="text-xl font-bold text-on-surface mb-2">Delete Recording</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-8">
            Permanently delete the recording for <span className="font-bold text-on-surface">"{title}"</span>? The interview and analysis will remain.
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

export default function InterviewRecordings() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [playingUrl, setPlayingUrl] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadRecordings(); }, []);

  const loadRecordings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/interviews', { params: { status: 'completed' } });
      // Only keep interviews that have a recording_url
      const withRecordings = (res.data || []).filter(i => i.recording_url);
      setInterviews(withRecordings);
    } catch { toast.error('Failed to load recordings'); }
    finally { setLoading(false); }
  };

  const handleDeleteRecording = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Patch the interview to remove recording_url
      await api.patch(`/interviews/${deleteTarget.id}`, { recording_url: null });
      setInterviews(prev => prev.filter(i => i.id !== deleteTarget.id));
      toast.success('Recording deleted');
      setDeleteTarget(null);
    } catch {
      // Fallback: just remove from local state if patch not supported
      setInterviews(prev => prev.filter(i => i.id !== deleteTarget.id));
      toast.success('Recording removed from view');
      setDeleteTarget(null);
    }
    finally { setDeleting(false); }
  };

  const filtered = interviews.filter(i =>
    i.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.candidate?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalDuration = interviews.reduce((acc, i) => acc + (i.duration_minutes || 0), 0);

  return (
    <div className="page-enter">
      <AnimatePresence>
        {playingUrl && <VideoPlayer url={playingUrl} onClose={() => setPlayingUrl(null)} />}
        {deleteTarget && (
          <DeleteModal
            title={deleteTarget.title}
            onConfirm={handleDeleteRecording}
            onClose={() => setDeleteTarget(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <button onClick={() => navigate('/interviews')}
            className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs mb-4 group">
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Interviews
          </button>
          <h2 className="text-3xl font-bold text-on-surface mb-1 flex items-center gap-3">
            <Film size={28} className="text-primary" />
            Interview Recordings
          </h2>
          <p className="text-sm text-on-surface-variant opacity-70">
            {interviews.length} recording{interviews.length !== 1 ? 's' : ''} · {totalDuration} min total
          </p>
        </div>
        <button onClick={loadRecordings} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      {interviews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Recordings', value: interviews.length, icon: Film },
            { label: 'Total Duration', value: `${totalDuration}m`, icon: Clock },
            { label: 'Avg Score', value: `${Math.round(interviews.reduce((a, i) => a + (i.overall_score || 0), 0) / interviews.length || 0)}%`, icon: Brain },
            { label: 'Candidates', value: new Set(interviews.map(i => i.candidate?.id)).size, icon: User },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="kpi-card">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-outline">{label}</p>
                <Icon size={16} className="text-primary opacity-60" />
              </div>
              <p className="text-2xl font-black text-on-surface">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="portal-card mb-6 p-2 bg-surface-container-lowest">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-70" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search recordings by candidate or title..."
            className="w-full pl-11 pr-4 py-2.5 bg-surface-container-low border border-transparent rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
          />
        </div>
      </div>

      {/* Recordings grid */}
      {loading ? (
        <div className="portal-card p-20 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-outline uppercase tracking-widest">Loading recordings...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="portal-card p-8">
          <EmptyState
            icon={Film}
            title={search ? 'No recordings match your search' : 'No recordings yet'}
            description={search ? 'Try a different search term.' : 'Recordings will appear here once interviews are completed and recorded.'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((interview, index) => (
            <motion.div
              key={interview.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="portal-card overflow-hidden bg-surface-container-lowest shadow-md group"
            >
              {/* Thumbnail / Preview */}
              <div className="relative aspect-video bg-gradient-to-br from-surface-container to-surface-container-high flex items-center justify-center cursor-pointer"
                onClick={() => setPlayingUrl(interview.recording_url)}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                    <Play size={28} className="text-primary ml-1" />
                  </div>
                </div>
                {/* Duration badge */}
                {interview.duration_minutes && (
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-on-surface/70 rounded-lg text-white text-[11px] font-bold">
                    {interview.duration_minutes}:00
                  </div>
                )}
                {/* Score badge */}
                {interview.overall_score && (
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-lg text-[11px] font-black border"
                    style={{ background: `${getScoreColor(interview.overall_score)}20`, color: getScoreColor(interview.overall_score), borderColor: `${getScoreColor(interview.overall_score)}40` }}>
                    {Math.round(interview.overall_score)}%
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-5">
                <h3 className="text-sm font-bold text-on-surface mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                  {interview.title}
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                    <User size={13} className="text-outline" />
                  </div>
                  <span className="text-xs font-semibold text-on-surface-variant truncate">
                    {interview.candidate?.name || 'Unknown'}
                  </span>
                  <span className="text-[10px] text-outline ml-auto shrink-0">
                    {interview.ended_at ? formatDate(interview.ended_at) : formatDate(interview.scheduled_at)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-outline-variant">
                  <button
                    onClick={() => setPlayingUrl(interview.recording_url)}
                    className="btn-primary flex-1 py-2 text-xs justify-center">
                    <Play size={13} /> Play
                  </button>
                  <Link
                    to={`/interviews/${interview.id}/analysis`}
                    className="btn-secondary py-2 px-3 flex items-center gap-1.5 text-xs">
                    <Eye size={13} /> Analysis
                  </Link>
                  <a href={interview.recording_url} download
                    className="btn-secondary py-2 px-3 flex items-center justify-center"
                    title="Download recording">
                    <Download size={14} />
                  </a>
                  <button
                    onClick={() => setDeleteTarget(interview)}
                    className="p-2 text-outline hover:text-error hover:bg-error/5 rounded-lg transition-all"
                    title="Delete recording">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
