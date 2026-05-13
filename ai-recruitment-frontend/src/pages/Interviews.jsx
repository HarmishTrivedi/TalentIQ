import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Video, Calendar, Clock, User, Briefcase,
  TrendingUp, Brain, Search, Filter, Play, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Brain className="w-10 h-10 text-purple-400" />
              AI Interview Intelligence
            </h1>
            <p className="text-purple-300">Conduct and analyze intelligent interviews</p>
          </div>

          <button
            onClick={() => navigate('/interviews/new')}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Schedule Interview
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
              <input
                type="text"
                placeholder="Search interviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-black/60 border border-purple-500/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {['all', 'scheduled', 'in_progress', 'completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                    filter === status
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-black/60 text-purple-300 hover:bg-black/80 border border-purple-500/20'
                  }`}
                >
                  {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interviews Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <Brain className="w-16 h-16 text-purple-400 animate-pulse mx-auto mb-4" />
            <p className="text-purple-300">Loading interviews...</p>
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <p className="text-purple-300 text-lg mb-4">No interviews found</p>
            <button
              onClick={() => navigate('/interviews/new')}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              Schedule Your First Interview
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInterviews.map((interview, index) => {
              const statusBadge = getStatusBadge(interview.status);
              
              return (
                <motion.div
                  key={interview.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all cursor-pointer group"
                  onClick={() => {
                    if (interview.status === 'completed') {
                      navigate(`/interviews/${interview.id}/analysis`);
                    } else {
                      navigate(`/interviews/${interview.id}`);
                    }
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`px-3 py-1 rounded-lg border ${statusBadge.color} text-sm font-semibold`}>
                      {statusBadge.label}
                    </div>
                    {interview.status === 'in_progress' && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs text-green-400">Live</span>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-white font-bold text-lg mb-2 group-hover:text-purple-400 transition-colors">
                    {interview.title}
                  </h3>

                  {/* Candidate Info */}
                  <div className="flex items-center gap-2 text-purple-300 text-sm mb-4">
                    <User className="w-4 h-4" />
                    <span>{interview.candidate?.name || 'Unknown Candidate'}</span>
                  </div>

                  {/* Job Info */}
                  {interview.job && (
                    <div className="flex items-center gap-2 text-purple-300 text-sm mb-4">
                      <Briefcase className="w-4 h-4" />
                      <span>{interview.job.title}</span>
                    </div>
                  )}

                  {/* Date & Time */}
                  <div className="flex items-center gap-4 text-purple-300 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {interview.scheduled_at 
                          ? new Date(interview.scheduled_at).toLocaleDateString()
                          : 'Not scheduled'}
                      </span>
                    </div>
                    {interview.duration_minutes && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{interview.duration_minutes} min</span>
                      </div>
                    )}
                  </div>

                  {/* Scores (for completed interviews) */}
                  {interview.status === 'completed' && interview.overall_score && (
                    <div className="pt-4 border-t border-purple-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-300 text-sm">Overall Score</span>
                        <span className="text-white font-bold text-xl">
                          {Math.round(interview.overall_score)}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          style={{ width: `${interview.overall_score}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="mt-4 pt-4 border-t border-purple-500/20">
                    {interview.status === 'scheduled' && (
                      <button className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all">
                        <Play className="w-4 h-4 inline mr-2" />
                        Start Interview
                      </button>
                    )}
                    {interview.status === 'in_progress' && (
                      <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all">
                        <Video className="w-4 h-4 inline mr-2" />
                        Join Interview
                      </button>
                    )}
                    {interview.status === 'completed' && (
                      <button className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all">
                        <Eye className="w-4 h-4 inline mr-2" />
                        View Analysis
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
