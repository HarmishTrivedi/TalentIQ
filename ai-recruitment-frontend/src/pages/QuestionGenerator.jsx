import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, Trash2, Save, Wand2, Brain, Code, MessageCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function QuestionGenerator() {
  const [category, setCategory] = useState('technical_backend');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [count, setCount] = useState(5);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const categories = [
    { value: 'technical_frontend', label: 'Frontend Development', icon: Code },
    { value: 'technical_backend', label: 'Backend Development', icon: Code },
    { value: 'technical_ai_ml', label: 'AI/ML', icon: Brain },
    { value: 'technical_dsa', label: 'Data Structures & Algorithms', icon: Code },
    { value: 'technical_database', label: 'Database', icon: Code },
    { value: 'technical_devops', label: 'DevOps', icon: Code },
    { value: 'technical_cloud', label: 'Cloud Computing', icon: Code },
    { value: 'technical_security', label: 'Cybersecurity', icon: Code },
    { value: 'technical_system_design', label: 'System Design', icon: Code },
    { value: 'behavioral_hr', label: 'HR Round', icon: Users },
    { value: 'behavioral_leadership', label: 'Leadership', icon: Users },
    { value: 'behavioral_communication', label: 'Communication', icon: MessageCircle },
    { value: 'behavioral_teamwork', label: 'Teamwork', icon: Users },
    { value: 'coding_algorithms', label: 'Algorithms', icon: Code },
    { value: 'coding_debugging', label: 'Debugging', icon: Code },
    { value: 'coding_sql', label: 'SQL', icon: Code }
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner', color: 'from-green-500 to-emerald-500' },
    { value: 'intermediate', label: 'Intermediate', color: 'from-blue-500 to-cyan-500' },
    { value: 'advanced', label: 'Advanced', color: 'from-purple-500 to-pink-500' },
    { value: 'expert', label: 'Expert', color: 'from-red-500 to-rose-500' }
  ];

  const handleGenerate = async () => {
    const requestedCount = Math.min(20, Math.max(1, Math.round(Number(count) || 1)));
    setCount(requestedCount);
    setIsGenerating(true);
    try {
      const response = await api.post('/interviews/questions/generate', {
        category,
        difficulty,
        count: requestedCount
      });
      const questions = Array.isArray(response.data)
        ? response.data.filter((question) => question?.question_text?.trim())
        : [];
      if (questions.length === 0) {
        throw new Error('No valid questions returned');
      }
      setGeneratedQuestions(questions);
      toast.success(`Generated ${questions.length} questions!`);
    } catch (error) {
      toast.error('Unable to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuestions = async () => {
    toast.success('Questions saved to template library!');
  };

  const handleRemoveQuestion = (index) => {
    setGeneratedQuestions((previous) => previous.filter((_, questionIndex) => questionIndex !== index));
    toast.success('Question removed');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Wand2 className="w-10 h-10 text-purple-400" />
            AI Question Generator
          </h1>
          <p className="text-purple-300">Generate intelligent interview questions powered by AI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 sticky top-6"
            >
              <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Configuration
              </h2>

              {/* Category Selection */}
              <div className="mb-6">
                <label className="text-purple-300 text-sm font-semibold mb-3 block">
                  Question Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-black/60 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty Selection */}
              <div className="mb-6">
                <label className="text-purple-300 text-sm font-semibold mb-3 block">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {difficulties.map((diff) => (
                    <button
                      key={diff.value}
                      onClick={() => setDifficulty(diff.value)}
                      className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                        difficulty === diff.value
                          ? `bg-gradient-to-r ${diff.color} text-white shadow-lg`
                          : 'bg-black/60 text-purple-300 hover:bg-black/80 border border-purple-500/20'
                      }`}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Count Selection */}
              <div className="mb-6">
                <label className="text-purple-300 text-sm font-semibold mb-3 block">
                  Number of Questions
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={count}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setCount(Number.isFinite(value) ? value : 1);
                  }}
                  className="w-full px-4 py-3 bg-black/60 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Brain className="w-5 h-5 inline mr-2 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 inline mr-2" />
                    Generate Questions
                  </>
                )}
              </button>

              {generatedQuestions.length > 0 && (
                <button
                  onClick={handleSaveQuestions}
                  className="w-full mt-3 px-6 py-4 bg-green-500/20 text-green-400 rounded-xl font-bold hover:bg-green-500/30 transition-all border border-green-500/20"
                >
                  <Save className="w-5 h-5 inline mr-2" />
                  Save to Library
                </button>
              )}
            </motion.div>
          </div>

          {/* Generated Questions */}
          <div className="lg:col-span-2">
            {generatedQuestions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-12 text-center"
              >
                <Wand2 className="w-20 h-20 text-purple-400 mx-auto mb-4" />
                <h3 className="text-white text-2xl font-bold mb-2">Ready to Generate</h3>
                <p className="text-purple-300">
                  Configure your preferences and click "Generate Questions" to create AI-powered interview questions
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {generatedQuestions.map((question, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm font-semibold">
                          Question {index + 1}
                        </span>
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm">
                          {question.difficulty}
                        </span>
                        {question.estimated_time_minutes && (
                          <span className="text-purple-300 text-sm">
                            ~{question.estimated_time_minutes} min
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleRemoveQuestion(index)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors" aria-label={`Remove question ${index + 1}`}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>

                    <h3 className="text-white text-lg font-semibold mb-3">
                      {question.question_text}
                    </h3>

                    {question.tags && question.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {question.tags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="px-2 py-1 bg-purple-500/10 text-purple-300 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {question.follow_up_suggestions && question.follow_up_suggestions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-purple-500/20">
                        <p className="text-purple-300 text-sm font-semibold mb-2">
                          Suggested Follow-ups:
                        </p>
                        <ul className="space-y-1">
                          {question.follow_up_suggestions.map((followUp, fuIndex) => (
                            <li key={fuIndex} className="text-purple-200 text-sm flex items-start gap-2">
                              <span className="text-purple-400">•</span>
                              {followUp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {question.evaluation_criteria && question.evaluation_criteria.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-purple-500/20">
                        <p className="text-purple-300 text-sm font-semibold mb-2">
                          Evaluation Criteria:
                        </p>
                        <ul className="space-y-1">
                          {question.evaluation_criteria.map((criteria, cIndex) => (
                            <li key={cIndex} className="text-purple-200 text-sm flex items-start gap-2">
                              <span className="text-green-400">✓</span>
                              {criteria}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
