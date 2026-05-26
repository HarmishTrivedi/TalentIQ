import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Download, Share2, Brain, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, Code, MessageCircle, Shield, Clock,
  Target, Award, ThumbsUp, ThumbsDown, Eye, Activity, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function InterviewAnalysis() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [interview, setInterview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysis();
  }, [interviewId]);

  const loadAnalysis = async () => {
    try {
      const [interviewRes, analysisRes] = await Promise.all([
        api.get(`/interviews/${interviewId}`),
        api.get(`/interviews/${interviewId}/analysis`)
      ]);
      
      setInterview(interviewRes.data);
      setAnalysis(analysisRes.data);
    } catch (error) {
      toast.error('Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `TalentIQ interview analysis${interview?.title ? ` - ${interview.title}` : ''}`,
      text: 'View the TalentIQ interview analysis report.',
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Report link copied');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        toast.error('Unable to share report');
      }
    }
  };

  const handleExport = () => {
    toast.success('Use the print dialog to save the report as PDF');
    window.print();
  };

  const getRecommendationColor = (recommendation) => {
    const colors = {
      'strong_hire': 'from-green-500 to-emerald-500',
      'hire': 'from-blue-500 to-cyan-500',
      'maybe': 'from-yellow-500 to-orange-500',
      'no_hire': 'from-red-500 to-rose-500'
    };
    return colors[recommendation] || colors.maybe;
  };

  const getRiskBadge = (level) => {
    const badges = {
      'low': { color: 'bg-green-500/20 text-green-400 border-green-500/20', icon: CheckCircle },
      'medium': { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20', icon: AlertTriangle },
      'high': { color: 'bg-red-500/20 text-red-400 border-red-500/20', icon: XCircle }
    };
    return badges[level] || badges.low;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-purple-400 animate-pulse mx-auto mb-4" />
          <p className="text-white text-xl">Generating AI Analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <p className="text-white text-xl">Analysis not available</p>
        </div>
      </div>
    );
  }

  const riskBadge = getRiskBadge(analysis.fraud_risk_level);
  const RiskIcon = riskBadge.icon;
  const reportTranscript = location.state?.transcript || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/interviews')}
                className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-purple-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Brain className="w-8 h-8 text-purple-400" />
                  Interview Analysis Report
                </h1>
                <p className="text-purple-300 text-sm mt-1">{interview?.title}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleShare} className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all border border-purple-500/20">
                <Share2 className="w-4 h-4 inline mr-2" />
                Share
              </button>
              <button onClick={handleExport} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all">
                <Download className="w-4 h-4 inline mr-2" />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overall Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Overall Rating */}
              <div className="text-center">
                <div className="relative inline-block">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-purple-500/20"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="url(#gradient)"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - analysis.overall_rating / 100)}`}
                      className="transition-all duration-1000"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div>
                      <div className="text-5xl font-bold text-white">
                        {Math.round(analysis.overall_rating)}
                      </div>
                      <div className="text-purple-300 text-sm">Overall</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="flex flex-col justify-center">
                <h3 className="text-purple-300 text-sm font-semibold mb-3">Hiring Recommendation</h3>
                <div className={`inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r ${getRecommendationColor(analysis.hiring_recommendation)} rounded-2xl text-white font-bold text-2xl mb-4`}>
                  {analysis.hiring_recommendation === 'strong_hire' && <ThumbsUp className="w-8 h-8" />}
                  {analysis.hiring_recommendation === 'hire' && <CheckCircle className="w-8 h-8" />}
                  {analysis.hiring_recommendation === 'maybe' && <AlertTriangle className="w-8 h-8" />}
                  {analysis.hiring_recommendation === 'no_hire' && <ThumbsDown className="w-8 h-8" />}
                  {analysis.hiring_recommendation.replace('_', ' ').toUpperCase()}
                </div>
                <p className="text-purple-200 text-sm">
                  {analysis.ai_summary?.substring(0, 150)}...
                </p>
              </div>

              {/* Key Metrics */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <span className="text-blue-300 flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Technical
                  </span>
                  <span className="text-white font-bold text-xl">{Math.round(analysis.technical_rating)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <span className="text-purple-300 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Communication
                  </span>
                  <span className="text-white font-bold text-xl">{Math.round(analysis.communication_rating)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                  <span className="text-green-300 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Confidence
                  </span>
                  <span className="text-white font-bold text-xl">{Math.round(analysis.confidence_rating)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                  <span className="text-yellow-300 flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Coding
                  </span>
                  <span className="text-white font-bold text-xl">{Math.round(analysis.coding_rating)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Fraud Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6"
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <Shield className="w-6 h-6 text-purple-400" />
                AI Fraud Detection Analysis
              </h2>

              <div className={`p-4 rounded-xl border ${riskBadge.color} mb-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RiskIcon className="w-6 h-6" />
                    <div>
                      <div className="font-bold text-lg">
                        {analysis.fraud_risk_level.toUpperCase()} RISK
                      </div>
                      <div className="text-sm opacity-80">
                        AI Assistance Probability: {Math.round(analysis.ai_assistance_probability)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                  <div className="text-purple-300 text-sm mb-1">Tab Switches</div>
                  <div className="text-white text-2xl font-bold">{analysis.tab_switching_count}</div>
                </div>
                <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                  <div className="text-purple-300 text-sm mb-1">Copy-Paste</div>
                  <div className="text-white text-2xl font-bold">{analysis.copy_paste_count}</div>
                </div>
                <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                  <div className="text-purple-300 text-sm mb-1">Suspicious Events</div>
                  <div className="text-white text-2xl font-bold">
                    {(analysis.plagiarism_indicators?.length || 0)}
                  </div>
                </div>
              </div>

              {analysis.plagiarism_indicators && analysis.plagiarism_indicators.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-white font-semibold text-sm mb-2">Detected Indicators:</h3>
                  {analysis.plagiarism_indicators.map((indicator, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="text-red-200 text-sm">{indicator}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Transcript */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6"
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-purple-400" />
                Interview Transcript
              </h2>
              {reportTranscript.length ? (
                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                  {reportTranscript.map((line, index) => (
                    <div key={`${line.timestamp}-${index}`} className="rounded-xl bg-purple-500/10 border border-purple-500/10 p-3">
                      <div className="flex items-center gap-2 mb-1 text-xs">
                        <span className="font-semibold text-purple-300 capitalize">{line.speaker}</span>
                        <span className="text-purple-300/50">{new Date(line.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-purple-100">{line.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-purple-300/70">Transcript was not carried in this browser session. Stored analysis remains available above.</p>
              )}
            </motion.div>

            {/* Technical Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6"
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <Code className="w-6 h-6 text-purple-400" />
                Technical Analysis
              </h2>

              {analysis.technical_fit && (
                <div className="prose prose-invert max-w-none mb-4">
                  <p className="text-purple-200">{analysis.technical_fit}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {analysis.candidate_strengths?.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-purple-200">
                        <Award className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Weaknesses
                  </h3>
                  <ul className="space-y-2">
                    {analysis.candidate_weaknesses?.map((weakness, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-purple-200">
                        <Target className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Communication Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6"
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-purple-400" />
                Communication Analysis
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                  <div className="text-purple-300 text-sm mb-2">Speech Clarity</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${analysis.speech_clarity || 75}%` }}
                      />
                    </div>
                    <span className="text-white font-bold">{Math.round(analysis.speech_clarity || 75)}</span>
                  </div>
                </div>

                <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                  <div className="text-purple-300 text-sm mb-2">Professionalism</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                        style={{ width: `${analysis.professionalism || 80}%` }}
                      />
                    </div>
                    <span className="text-white font-bold">{Math.round(analysis.professionalism || 80)}</span>
                  </div>
                </div>

                <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                  <div className="text-purple-300 text-sm mb-1">Filler Words</div>
                  <div className="text-white text-2xl font-bold">{analysis.filler_words_count || 12}</div>
                </div>

                <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                  <div className="text-purple-300 text-sm mb-1">Speaking Speed</div>
                  <div className="text-white text-2xl font-bold">{Math.round(analysis.speaking_speed_wpm || 125)} WPM</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Interview Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6"
            >
              <h3 className="text-white font-bold mb-4">Interview Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300">Duration</span>
                  <span className="text-white font-semibold">{interview?.duration_minutes || 0} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-300">Date</span>
                  <span className="text-white font-semibold">
                    {new Date(interview?.started_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-300">Questions</span>
                  <span className="text-white font-semibold">{interview?.questions?.length || 0}</span>
                </div>
              </div>
            </motion.div>

            {/* Improvement Areas */}
            {analysis.improvement_areas && analysis.improvement_areas.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6"
              >
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  Improvement Areas
                </h3>
                <ul className="space-y-2">
                  {analysis.improvement_areas.map((area, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-purple-200">
                      <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      {area}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Next Steps */}
            {analysis.next_round_suggestion && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6"
              >
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  Next Round Suggestion
                </h3>
                <p className="text-purple-200 text-sm">{analysis.next_round_suggestion}</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
