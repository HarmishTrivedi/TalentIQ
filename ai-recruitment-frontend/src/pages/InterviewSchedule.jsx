import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, User, Briefcase, Video, Mail, Phone,
  Edit, X, RefreshCw, Eye, Play, CheckCircle, AlertCircle,
  XCircle, Clock3, Search, Filter, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function InterviewSchedule() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadInterviews();
  }, [filter]);

  const loadInterviews = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/interviews', { params });
      
      // Sort by nearest time first
      const sorted = response.data.sort((a, b) => {
        const timeA = new Date(a.scheduled_at).getTime();
        const timeB = new Date(b.scheduled_at).getTime();
        const now = Date.now();
        
        // Prioritize ongoing interviews
        if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
        if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
        
        // Then sort by closest to current time
        return Math.abs(timeA - now) - Math.abs(timeB - now);
      });
      
      setInterviews(sorted);
    } catch (error) {
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status, scheduledAt) => {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diffMinutes = (scheduled - now) / 1000 / 60;

    if (status === 'in_progress') {
      return {
        icon: Video,
        color: 'bg-green-500/20 text-green-400 border-green-500/30',
        label: 'Live Now',
        pulse: true
      };
    }
    
    if (status === 'completed') {
      return {
        icon: CheckCircle,
        color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        label: 'Completed'
      };
    }
    
    if (status === 'cancelled') {
      return {
        icon: XCircle,
        color: 'bg-red-500/20 text-red-400 border-red-500/30',
        label: 'Cancelled'
      };
    }
    
    // Scheduled interviews
    if (diffMinutes < 0) {
      return {
        icon: AlertCircle,
        color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        label: 'Missed'
      };
    }
    
    if (diffMinutes <= 30) {
      return {
        icon: Clock3,
        color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        label: 'Starting Soon'
      };
    }
    
    return {
      icon: Calendar,
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      label: 'Upcoming'
    };
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }) + ` at ${timeStr}`;
  };

  const handleStartInterview = (interviewId) => {
    navigate(`/interview-room/${interviewId}`);
  };

  const handleViewDetails = (interviewId, status) => {
    if (status === 'completed') {
      navigate(`/interviews/${interviewId}/analysis`);
    } else {
      navigate(`/ai-interviews`);
    }
  };

  const handleReschedule = async (interviewId) => {
    navigate(`/interviews/schedule?reschedule=${interviewId}`);
  };

  const handleCancel = async (interviewId) => {
    if (!window.confirm('Are you sure you want to cancel this interview?')) return;
    
    try {
      await api.patch(`/interviews/${interviewId}`, { status: 'cancelled' });
      toast.success('Interview cancelled');
      loadInterviews();
    } catch (error) {
      toast.error('Failed to cancel interview');
    }
  };

  const filteredInterviews = interviews.filter(interview =>
    interview.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    interview.candidate?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Calendar className="w-10 h-10 text-cyan-400" />
              Interview Schedule
            </h1>
            <p className="text-slate-400">Manage and track all your scheduled interviews</p>
          </div>

          <button
            onClick={() => navigate('/interviews/schedule')}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Schedule New Interview
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by candidate name or interview title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'All' },
                { value: 'scheduled', label: 'Upcoming' },
                { value: 'in_progress', label: 'Live' },
                { value: 'completed', label: 'Completed' }
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => setFilter(status.value)}
                  className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                    filter === status.value
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-700/50'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interviews List */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading interviews...</p>
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-4">No interviews found</p>
            <button
              onClick={() => navigate('/interviews/schedule')}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              Schedule Your First Interview
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInterviews.map((interview, index) => {
              const statusBadge = getStatusBadge(interview.status, interview.scheduled_at);
              const StatusIcon = statusBadge.icon;
              
              return (
                <motion.div
                  key={interview.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 hover:border-cyan-500/30 transition-all group"
                >
                  <div className="flex items-start gap-6">
                    {/* Time Section */}
                    <div className="flex-shrink-0 text-center">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-white">
                          {new Date(interview.scheduled_at).getDate()}
                        </div>
                        <div className="text-xs text-cyan-400 uppercase">
                          {new Date(interview.scheduled_at).toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                            {interview.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Clock className="w-4 h-4" />
                            <span>{formatDateTime(interview.scheduled_at)}</span>
                            {interview.duration_minutes && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span>{interview.duration_minutes} minutes</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusBadge.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="text-sm font-semibold">{statusBadge.label}</span>
                          {statusBadge.pulse && (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          )}
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Candidate */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Candidate</div>
                            <div className="text-sm font-semibold text-white truncate">
                              {interview.candidate?.name || 'Unknown'}
                            </div>
                          </div>
                        </div>

                        {/* Role */}
                        {interview.job && (
                          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                              <Briefcase className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-slate-500 uppercase tracking-wider">Position</div>
                              <div className="text-sm font-semibold text-white truncate">
                                {interview.job.title}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Interview Types */}
                        {interview.interview_types && interview.interview_types.length > 0 && (
                          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                              <Video className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-slate-500 uppercase tracking-wider">Type</div>
                              <div className="text-sm font-semibold text-white truncate">
                                {interview.interview_types.join(', ')}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-4 border-t border-slate-700/30">
                        {interview.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => handleStartInterview(interview.id)}
                              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center justify-center gap-2"
                            >
                              <Play className="w-4 h-4" />
                              Start Interview
                            </button>
                            <button
                              onClick={() => handleReschedule(interview.id)}
                              className="px-4 py-2.5 bg-slate-800/60 text-slate-300 rounded-xl font-semibold hover:bg-slate-700/60 border border-slate-700/50 transition-all flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Reschedule
                            </button>
                            <button
                              onClick={() => handleCancel(interview.id)}
                              className="px-4 py-2.5 bg-red-500/10 text-red-400 rounded-xl font-semibold hover:bg-red-500/20 border border-red-500/30 transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {interview.status === 'in_progress' && (
                          <button
                            onClick={() => handleStartInterview(interview.id)}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2 animate-pulse"
                          >
                            <Video className="w-4 h-4" />
                            Join Live Interview
                          </button>
                        )}

                        {interview.status === 'completed' && (
                          <button
                            onClick={() => handleViewDetails(interview.id, interview.status)}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Analysis
                          </button>
                        )}

                        {interview.status === 'cancelled' && (
                          <div className="flex-1 text-center text-sm text-slate-500">
                            This interview was cancelled
                          </div>
                        )}
                      </div>
                    </div>
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
