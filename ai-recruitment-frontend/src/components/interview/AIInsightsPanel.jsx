import React from 'react';
import { motion } from 'framer-motion';
import {
  Brain, TrendingUp, MessageCircle, Code, Shield,
  AlertTriangle, CheckCircle, Activity, Eye, Zap
} from 'lucide-react';

export default function AIInsightsPanel({ analysis, interview }) {
  const scoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const riskColor = (level) => {
    if (level < 30) return 'bg-green-500/20 text-green-400 border-green-500/20';
    if (level < 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20';
    return 'bg-red-500/20 text-red-400 border-red-500/20';
  };

  const scores = [
    { 
      label: 'Technical', 
      value: analysis.technical_score || 0, 
      icon: Code,
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      label: 'Communication', 
      value: analysis.communication_score || 0, 
      icon: MessageCircle,
      color: 'from-purple-500 to-pink-500'
    },
    { 
      label: 'Confidence', 
      value: analysis.confidence_score || 0, 
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500'
    },
    { 
      label: 'Suspicion', 
      value: analysis.suspicion_level || 0, 
      icon: Shield,
      color: 'from-red-500 to-orange-500',
      inverse: true
    }
  ];

  return (
    <motion.div 
      className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 h-full overflow-auto custom-scrollbar"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">AI Insights</h3>
          <p className="text-purple-300 text-sm">Real-time Analysis</p>
        </div>
      </div>

      {/* Live Scores */}
      <div className="space-y-4 mb-6">
        {scores.map((score, index) => {
          const Icon = score.icon;
          const displayValue = score.inverse ? 100 - score.value : score.value;
          
          return (
            <motion.div
              key={score.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-black/40 rounded-xl p-4 border border-purple-500/10"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-purple-400" />
                  <span className="text-white font-semibold text-sm">{score.label}</span>
                </div>
                <span className={`text-2xl font-bold ${scoreColor(displayValue)}`}>
                  {Math.round(displayValue)}
                </span>
              </div>
              
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${score.color} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${displayValue}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Fraud Detection */}
      <div className="mb-6">
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          Fraud Detection
        </h4>
        
        <div className={`p-4 rounded-xl border ${riskColor(analysis.suspicion_level || 0)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Risk Level</span>
            <span className="text-sm">
              {analysis.suspicion_level < 30 ? 'Low' : 
               analysis.suspicion_level < 60 ? 'Medium' : 'High'}
            </span>
          </div>
          
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-300">Tab Switches</span>
              <span className="font-mono">0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-300">Copy-Paste</span>
              <span className="font-mono">0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-300">AI Probability</span>
              <span className="font-mono">{Math.round(analysis.suspicion_level || 0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Insights */}
      <div className="mb-6">
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          Live Insights
        </h4>
        
        <div className="space-y-2">
          {analysis.insights && analysis.insights.length > 0 ? (
            analysis.insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20"
              >
                <Activity className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-purple-200">{insight}</p>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-6 text-purple-300/50">
              <Eye className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Analyzing interview...</p>
            </div>
          )}
        </div>
      </div>

      {/* Key Highlights */}
      <div>
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-purple-400" />
          Key Highlights
        </h4>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>Clear communication</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>Good technical depth</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Needs more examples</span>
          </div>
        </div>
      </div>

      {/* Activity Indicator */}
      <div className="mt-6 pt-6 border-t border-purple-500/20">
        <div className="flex items-center justify-center gap-2 text-purple-300">
          <Activity className="w-4 h-4 animate-pulse" />
          <span className="text-sm">AI actively monitoring...</span>
        </div>
      </div>
    </motion.div>
  );
}
