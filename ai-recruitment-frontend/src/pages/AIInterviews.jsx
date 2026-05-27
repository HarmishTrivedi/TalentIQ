import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Video, Brain, User, Clock, Play, Eye, TrendingUp,
  Activity, Zap, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function AIInterviews() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLiveInterviews();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadLiveInterviews, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLiveInterviews = async () => {
    try {
      // Get in_progress and recently completed interviews
      const [inProgressRes, completedRes] = await Promise.all([
        api.get('/interviews', { params: { status: 'in_progress' } }),
        api.get('/interviews', { params: { status: 'completed' } })
      ]);
      
      // Combine and sort - in_progress first, then recently completed
      const combined = [
        ...inProgressRes.data,
        ...completedRes.data.slice(0, 5) // Only show last 5 completed
      ];
      
      setInterviews(combined);
    } catch (error) {
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (startedAt, endedAt) => {
    if (!startedAt) return 'Not started';
    
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const diffMinutes = Math.floor((end - start) / 1000 / 60);
    
    if (diffMinutes < 60) return `${diffMinutes} min`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Brain className="w-10 h-10 text-purple-400" />
              AI Interview Intelligence
            </h1>
            <p className="text-purple-300">Live interview sessions with real-time AI analysis</p>
          </div>

          <button
            onClick={loadLiveInterviews}
            className="px-6 py-3 bg-purple-500/20 text-purple-300 rounded-xl font-semibold hover:bg-purple-500/30 border border-purple-500/30 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-green-500/30 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-green-400 text-sm font-semibold uppercase tracking-wider">Live Now</div>
            <Activity className="w-5 h-5 text-green-400 animate-pulse" />
          </div>
          <div className="text-3xl font-bold text-white">
            {interviews.filter(i => i.status === 'in_progress').length}
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-purple-400 text-sm font-semibold uppercase tracking-wider">Completed Today</div>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-white">
            {interviews.filter(i => i.status === 'completed').length}
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-cyan-500/30 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-cyan-400 text-sm font-semibold uppercase tracking-wider">AI Insights</div>
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white">Active</div>
        </div>
      </div>

      {/* Interviews List */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <Brain className="w-16 h-16 text-purple-400 animate-pulse mx-auto mb-4" />
            <p className="text-purple-300">Loading AI interviews...</p>
          </div>
        ) : interviews.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-4">No active interviews</p>
            <p className="text-slate-500 text-sm">Live interviews will appear here automatically</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {interviews.map((interview, index) => (
              <motion.div
                key={interview.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-slate-900/60 backdrop-blur-xl rounded-2xl border p-6 hover:border-purple-500/50 transition-all group ${
                  interview.status === 'in_progress'
                    ? 'border-green-500/30 shadow-lg shadow-green-500/10'
                    : 'border-slate-700/50'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">
                      {interview.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <User className="w-4 h-4" />
                      <span>{interview.candidate?.name || 'Unknown Candidate'}</span>
                    </div>
                  </div>

                  {interview.status === 'in_progress' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg border border-green-500/30">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-green-400 text-sm font-semibold">LIVE</span>
                    </div>
                  )}

                  {interview.status === 'completed' && (
                    <div className="px-3 py-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
                      <span className="text-purple-400 text-sm font-semibold">Completed</span>
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                  <Clock className="w-4 h-4" />
                  <span>Duration: {formatDuration(interview.started_at, interview.ended_at)}</span>
                </div>

                {/* Scores (if available) */}
                {interview.status === 'completed' && interview.overall_score && (
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getScoreColor(interview.overall_score)}`}>
                        {Math.round(interview.overall_score)}
                      </div>
                      <div className="text-xs text-slate-500 uppercase">Overall</div>
                    </div>
                    {interview.technical_score && (
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(interview.technical_score)}`}>
                          {Math.round(interview.technical_score)}
                        </div>
                        <div className="text-xs text-slate-500 uppercase">Technical</div>
                      </div>
                    )}
                    {interview.communication_score && (
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(interview.communication_score)}`}>
                          {Math.round(interview.communication_score)}
                        </div>
                        <div className="text-xs text-slate-500 uppercase">Comm</div>
                      </div>
                    )}
                    {interview.confidence_score && (
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(interview.confidence_score)}`}>
                          {Math.round(interview.confidence_score)}
                        </div>
                        <div className="text-xs text-slate-500 uppercase">Confidence</div>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Insights Preview */}
                {interview.status === 'in_progress' && (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 text-purple-400 text-sm font-semibold mb-2">
                      <Brain className="w-4 h-4" />
                      Live AI Analysis Active
                    </div>
                    <p className="text-slate-400 text-xs">
                      Real-time analysis in progress. Join to see detailed insights.
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-4 border-t border-slate-700/30">
                  {interview.status === 'in_progress' && (
                    <button
                      onClick={() => {
                        if (interview.recruiter_meeting_url) {
                          window.open(interview.recruiter_meeting_url, '_blank');
                        } else {
                          navigate(`/interview-room/${interview.id}`);
                        }
                      }}
                      className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      Join Interview
                    </button>
                  )}

                  {interview.status === 'completed' && (
                    <button
                      onClick={() => {
                        // For the new Interview OS, the report is often available at /report or via the same room link
                        if (interview.recruiter_meeting_url) {
                           // The new platform usually has a report page, we try to guess it or just open the link
                           const reportUrl = interview.recruiter_meeting_url.includes('?') 
                             ? interview.recruiter_meeting_url.replace('/interview/', '/report/')
                             : `${interview.recruiter_meeting_url}/report`;
                           window.open(reportUrl, '_blank');
                        } else {
                           navigate(`/interviews/${interview.id}/analysis`);
                        }
                      }}
                      className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="w-5 h-5" />
                      View AI Analysis
                    </button>
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
