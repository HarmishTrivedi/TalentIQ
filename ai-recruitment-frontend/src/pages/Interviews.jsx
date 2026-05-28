import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Video, Calendar, Clock, User, Briefcase,
  TrendingUp, Brain, Search, Play, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { cn, formatDate, getScoreColor } from '../utils/helpers';

export default function Interviews() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, scheduled, in_progress, completed
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadInterviews();
  }, [filter]);

  const loadInterviews = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/interviews', { params });
      setInterviews(response.data);
    } catch (error) {
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/20', label: 'Scheduled' },
      in_progress: { color: 'bg-green-500/20 text-green-400 border-green-500/20', label: 'Live' },
      completed: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/20', label: 'Completed' },
      cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/20', label: 'Cancelled' }
    };
    return badges[status] || badges.scheduled;
  };

  const filteredInterviews = interviews.filter(interview =>
    interview.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    interview.candidate?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-enter bg-surface">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-1">Interview Intelligence</h2>
          <p className="text-on-surface-variant text-sm opacity-70">
            Conduct and analyze AI-powered screening sessions
          </p>
        </div>
        <button
          onClick={() => navigate('/interviews/schedule')}
          className="btn-primary"
        >
          <Plus size={18} />
          <span>Schedule New Session</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="portal-card mb-8 p-2 flex flex-col lg:flex-row gap-4 bg-surface-container-lowest shadow-sm">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-70" />
          <input
            type="text"
            placeholder="Search by candidate name or role title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-surface-container-low border border-transparent rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
          />
        </div>
        
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl">
          {['all', 'scheduled', 'in_progress', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                filter === status 
                  ? "bg-primary text-on-primary shadow-md scale-[1.02]" 
                  : "text-outline hover:bg-surface-container-high"
              )}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-5">
             <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             <p className="text-sm font-bold text-outline uppercase tracking-widest">Compiling sessions...</p>
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="portal-card p-20 text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-[40px] bg-surface-container border border-outline-variant flex items-center justify-center shadow-inner">
               <Video size={36} className="text-outline opacity-20" />
            </div>
            <div className="max-w-xs mx-auto">
               <p className="text-lg font-bold text-on-surface mb-2">No interviews found</p>
               <p className="text-sm text-outline mb-6">There are no active sessions matching your current filter.</p>
               <button onClick={() => navigate('/interviews/schedule')} className="btn-primary w-full shadow-lg">Schedule First Interview</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 stagger">
            {filteredInterviews.map((interview, index) => {
              const statusBadge = getStatusBadge(interview.status);
              
              return (
                <motion.div
                  key={interview.id}
                  whileHover={{ y: -4 }}
                  className="portal-card p-6 flex flex-col h-full bg-surface-container-lowest group cursor-pointer border-outline-variant/60 shadow-md hover:shadow-xl hover:border-primary/30 transition-all"
                  onClick={() => {
                    if (interview.status === 'completed') {
                      navigate(`/interviews/${interview.id}/analysis`);
                    } else {
                      navigate(`/interviews/${interview.id}`);
                    }
                  }}
                >
                  {/* Status & Badge */}
                  <div className="flex items-start justify-between mb-6">
                    <div className={cn("px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest", 
                      interview.status === 'completed' ? "bg-tertiary/10 text-tertiary border-tertiary/20" :
                      interview.status === 'in_progress' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                      "bg-primary/5 text-primary border-primary/20"
                    )}>
                      {statusBadge.label}
                    </div>
                    {interview.status === 'in_progress' && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter">Live Session</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 mb-8">
                     <h3 className="text-xl font-bold text-on-surface group-hover:text-primary transition-colors leading-tight mb-4">
                       {interview.title}
                     </h3>
                     
                     <div className="space-y-3">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                              <User size={14} className="text-outline" />
                           </div>
                           <span className="text-sm font-bold text-on-surface opacity-80">{interview.candidate?.name || 'Anonymous Talent'}</span>
                        </div>
                        
                        {interview.job && (
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                                <Briefcase size={14} className="text-outline" />
                             </div>
                             <span className="text-sm font-semibold text-outline truncate">{interview.job.title}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-6 pt-1">
                           <div className="flex items-center gap-2 text-outline">
                              <Calendar size={13} />
                              <span className="text-[11px] font-bold uppercase tracking-wider">
                                {interview.scheduled_at ? formatDate(interview.scheduled_at) : 'Manual Start'}
                              </span>
                           </div>
                           {interview.duration_minutes && (
                             <div className="flex items-center gap-2 text-outline">
                                <Clock size={13} />
                                <span className="text-[11px] font-bold uppercase tracking-wider">{interview.duration_minutes}m</span>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* Summary Metric (Conditional) */}
                  {interview.status === 'completed' && interview.overall_score && (
                    <div className="mb-6 p-4 rounded-2xl bg-surface-container shadow-inner border border-outline-variant/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-outline uppercase tracking-widest">Match Score</span>
                        <span className="text-base font-black font-display" style={{ color: getScoreColor(interview.overall_score) }}>
                          {Math.round(interview.overall_score)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-1000"
                          style={{ 
                            width: `${interview.overall_score}%`,
                            background: `linear-gradient(90deg, ${getScoreColor(interview.overall_score)}cc, ${getScoreColor(interview.overall_score)})` 
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="mt-auto pt-5 border-t border-outline-variant group-hover:border-primary/20 transition-colors">
                    {interview.status === 'scheduled' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          let url = interview.recruiter_meeting_url;
                          if (!url || url.includes('localhost:3000')) {
                            url = `/interview-room/${interview.id}`;
                          }
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="btn-primary w-full shadow-lg group-hover:scale-[1.02] transition-transform">
                        <Play size={16} />
                        <span>Launch Session</span>
                      </button>
                    )}
                    {interview.status === 'in_progress' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          let url = interview.recruiter_meeting_url;
                          if (!url || url.includes('localhost:3000')) {
                            url = `/interview-room/${interview.id}`;
                          }
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 group-hover:scale-[1.02] transition-transform">
                        <Video size={18} />
                        <span>Rejoin Session</span>
                      </button>
                    )}
                    {interview.status === 'completed' && (
                      <button 
                        onClick={() => navigate(`/interviews/${interview.id}/analysis`)}
                        className="btn-secondary w-full py-3 flex items-center justify-center gap-2 group-hover:bg-primary/5 transition-all">
                        <Eye size={18} />
                        <span>Examine Intelligence</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
