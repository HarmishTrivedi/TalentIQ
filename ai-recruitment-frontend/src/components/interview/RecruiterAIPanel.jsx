import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, TrendingUp, AlertTriangle, CheckCircle, Code,
  MessageCircle, Shield, Eye, Zap, Activity, Target
} from 'lucide-react';

export default function RecruiterAIPanel({ interviewId }) {
  const [analysis, setAnalysis] = useState({
    technical_score: 0,
    communication_score: 0,
    confidence_score: 0,
    coding_score: 0,
    suspicion_level: 0,
    ai_assistance_probability: 0,
    insights: [],
    strengths: [],
    weaknesses: [],
    current_answer_quality: 0,
    missing_points: [],
    correct_points: [],
    incorrect_points: [],
    tab_switches: 0,
    copy_paste: 0,
    long_pauses: 0
  });
  const [isInterviewActive, setIsInterviewActive] = useState(false);

  useEffect(() => {
    // Only update scores when interview is actually active
    // In production, this would come from WebSocket real-time data
    if (!isInterviewActive) return;

    const interval = setInterval(() => {
      // Real-time updates would come from backend WebSocket
      setAnalysis(prev => ({
        ...prev,
        technical_score: Math.min(100, prev.technical_score + Math.random() * 2),
        communication_score: Math.min(100, prev.communication_score + Math.random() * 1.5),
        confidence_score: Math.min(100, prev.confidence_score + Math.random() * 2)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [isInterviewActive]);

  const ScoreCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-black/40 rounded-xl p-4 border border-purple-500/10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-purple-400" />
          <span className="text-white font-semibold text-sm">{label}</span>
        </div>
        <span className={`text-2xl font-bold ${color}`}>
          {Math.round(value)}
        </span>
      </div>
      <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );

  const getRiskColor = (level) => {
    if (level < 30) return 'text-green-400';
    if (level < 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskBadge = (level) => {
    if (level < 30) return { label: 'Low Risk', color: 'bg-green-500/20 text-green-400 border-green-500/20' };
    if (level < 60) return { label: 'Medium Risk', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20' };
    return { label: 'High Risk', color: 'bg-red-500/20 text-red-400 border-red-500/20' };
  };

  const riskBadge = getRiskBadge(analysis.suspicion_level);

  return (
    <div className="h-full bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-4 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-purple-500/20">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Live AI Analysis</h3>
          <p className="text-purple-300 text-xs">Recruiter Only</p>
        </div>
      </div>

      {/* Real-time Scores */}
      <div className="space-y-3 mb-6">
        <ScoreCard
          label="Technical"
          value={analysis.technical_score}
          icon={Code}
          color="from-blue-500 to-cyan-500"
        />
        <ScoreCard
          label="Communication"
          value={analysis.communication_score}
          icon={MessageCircle}
          color="from-purple-500 to-pink-500"
        />
        <ScoreCard
          label="Confidence"
          value={analysis.confidence_score}
          icon={TrendingUp}
          color="from-green-500 to-emerald-500"
        />
        <ScoreCard
          label="Coding"
          value={analysis.coding_score}
          icon={Code}
          color="from-yellow-500 to-orange-500"
        />
      </div>

      {/* Fraud Detection */}
      <div className="mb-6">
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-purple-400" />
          Fraud Detection
        </h4>
        
        <div className={`p-4 rounded-xl border ${riskBadge.color} mb-3`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">{riskBadge.label}</span>
            <span className={`text-lg font-bold ${getRiskColor(analysis.suspicion_level)}`}>
              {Math.round(analysis.suspicion_level)}%
            </span>
          </div>
          <div className="text-xs opacity-80">
            AI Assistance: {Math.round(analysis.ai_assistance_probability)}%
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 bg-purple-500/10 rounded-lg">
            <span className="text-purple-300">Tab Switches</span>
            <span className="text-white font-mono">{analysis.tab_switches}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-purple-500/10 rounded-lg">
            <span className="text-purple-300">Copy-Paste</span>
            <span className="text-white font-mono">{analysis.copy_paste}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-purple-500/10 rounded-lg">
            <span className="text-purple-300">Long Pauses</span>
            <span className="text-white font-mono">{analysis.long_pauses}</span>
          </div>
        </div>
      </div>

      {/* Current Answer Analysis */}
      <div className="mb-6">
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
          <Target className="w-4 h-4 text-purple-400" />
          Current Answer Quality
        </h4>
        
        <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-300 text-sm">Quality Score</span>
            <span className="text-white text-xl font-bold">
              {Math.round(analysis.current_answer_quality)}%
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
              style={{ width: `${analysis.current_answer_quality}%` }}
            />
          </div>
        </div>

        {/* Correct Points */}
        {analysis.correct_points.length > 0 && (
          <div className="mb-3">
            <p className="text-green-400 text-xs font-semibold mb-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Correct Points
            </p>
            <div className="space-y-1">
              {analysis.correct_points.map((point, i) => (
                <div key={i} className="text-xs text-green-300 flex items-start gap-2 p-2 bg-green-500/10 rounded-lg">
                  <span className="text-green-400">✓</span>
                  {point}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incorrect Points */}
        {analysis.incorrect_points.length > 0 && (
          <div className="mb-3">
            <p className="text-red-400 text-xs font-semibold mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Incorrect/Missing
            </p>
            <div className="space-y-1">
              {analysis.incorrect_points.map((point, i) => (
                <div key={i} className="text-xs text-red-300 flex items-start gap-2 p-2 bg-red-500/10 rounded-lg">
                  <span className="text-red-400">✗</span>
                  {point}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing Technical Points */}
        {analysis.missing_points.length > 0 && (
          <div>
            <p className="text-yellow-400 text-xs font-semibold mb-2 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Should Have Mentioned
            </p>
            <div className="space-y-1">
              {analysis.missing_points.map((point, i) => (
                <div key={i} className="text-xs text-yellow-300 flex items-start gap-2 p-2 bg-yellow-500/10 rounded-lg">
                  <span className="text-yellow-400">!</span>
                  {point}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live Insights */}
      <div className="mb-6">
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-purple-400" />
          Live Insights
        </h4>
        
        <div className="space-y-2">
          {analysis.insights.length > 0 ? (
            analysis.insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 text-xs"
              >
                <Activity className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-purple-200">{insight}</p>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-6 text-purple-300/50">
              <Eye className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs">Analyzing interview...</p>
            </div>
          )}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div>
          <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-1 text-xs">
            <CheckCircle className="w-3 h-3" />
            Strengths
          </h4>
          <div className="space-y-1">
            {analysis.strengths.slice(0, 3).map((strength, i) => (
              <div key={i} className="text-xs text-green-300 p-2 bg-green-500/10 rounded-lg">
                {strength}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-yellow-400 font-semibold mb-2 flex items-center gap-1 text-xs">
            <AlertTriangle className="w-3 h-3" />
            Weaknesses
          </h4>
          <div className="space-y-1">
            {analysis.weaknesses.slice(0, 3).map((weakness, i) => (
              <div key={i} className="text-xs text-yellow-300 p-2 bg-yellow-500/10 rounded-lg">
                {weakness}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Indicator */}
      <div className="pt-4 border-t border-purple-500/20">
        <div className="flex items-center justify-center gap-2 text-purple-300">
          {isInterviewActive ? (
            <>
              <Activity className="w-4 h-4 animate-pulse" />
              <span className="text-xs">AI actively monitoring...</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span className="text-xs">Waiting for interview to start...</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
