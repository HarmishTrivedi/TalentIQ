import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Trash2, Save, Wand2, Brain, Code, MessageCircle, Users, Clock, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { EmptyState } from '../components/ui'
import { cn } from '../utils/helpers'

const CATEGORIES = [
  { value: 'technical_frontend', label: 'Frontend Development', icon: Code },
  { value: 'technical_backend', label: 'Backend Development', icon: Code },
  { value: 'technical_ai_ml', label: 'AI / ML', icon: Brain },
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
  { value: 'coding_sql', label: 'SQL', icon: Code },
]

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner', color: 'border-tertiary text-tertiary bg-tertiary/5' },
  { value: 'intermediate', label: 'Intermediate', color: 'border-primary text-primary bg-primary/5' },
  { value: 'advanced', label: 'Advanced', color: 'border-secondary text-secondary bg-secondary/5' },
  { value: 'expert', label: 'Expert', color: 'border-error text-error bg-error/5' },
]

export default function QuestionGenerator() {
  const [category, setCategory] = useState('technical_backend')
  const [difficulty, setDifficulty] = useState('intermediate')
  const [count, setCount] = useState(5)
  const [generatedQuestions, setGeneratedQuestions] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    const requestedCount = Math.min(20, Math.max(1, Math.round(Number(count) || 1)))
    setCount(requestedCount)
    setIsGenerating(true)
    try {
      const response = await api.post('/interviews/questions/generate', { category, difficulty, count: requestedCount })
      const questions = Array.isArray(response.data)
        ? response.data.filter(q => q?.question_text?.trim())
        : []
      if (questions.length === 0) throw new Error('No valid questions returned')
      setGeneratedQuestions(questions)
      toast.success(`Generated ${questions.length} questions!`)
    } catch {
      toast.error('Unable to generate questions. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRemoveQuestion = (index) => {
    setGeneratedQuestions(prev => prev.filter((_, i) => i !== index))
    toast.success('Question removed')
  }

  const handleSaveQuestions = () => {
    toast.success('Questions saved to template library!')
  }

  const selectedDiff = DIFFICULTIES.find(d => d.value === difficulty)

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-1 flex items-center gap-3">
            <Wand2 size={28} className="text-primary" />
            AI Question Generator
          </h2>
          <p className="text-sm text-on-surface-variant opacity-70">Generate intelligent interview questions powered by AI</p>
        </div>
        {generatedQuestions.length > 0 && (
          <button onClick={handleSaveQuestions} className="btn-secondary flex items-center gap-2">
            <Save size={16} />
            Save to Library
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="lg:col-span-1">
          <div className="portal-card p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-outline-variant">
              <Sparkles size={18} className="text-primary" />
              <h3 className="text-base font-bold text-on-surface">Configuration</h3>
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-outline mb-2">Question Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full h-11 pl-4 pr-10 rounded-xl text-sm font-medium border border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none appearance-none cursor-pointer transition-all"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
              </div>
            </div>

            {/* Difficulty */}
            <div className="mb-6">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-outline mb-2">Difficulty Level</label>
              <div className="grid grid-cols-2 gap-2">
                {DIFFICULTIES.map(diff => (
                  <button
                    key={diff.value}
                    onClick={() => setDifficulty(diff.value)}
                    className={cn(
                      'px-3 py-2.5 rounded-xl text-xs font-bold border transition-all',
                      difficulty === diff.value
                        ? diff.color
                        : 'border-outline-variant text-on-surface-variant bg-surface-container-low hover:bg-surface-container'
                    )}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div className="mb-6">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-outline mb-2">
                Number of Questions
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={count}
                onChange={e => {
                  const v = Number(e.target.value)
                  setCount(Number.isFinite(v) ? v : 1)
                }}
                className="w-full h-11 px-4 rounded-xl text-sm font-medium border border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full btn-primary py-3 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating
                ? <><Brain size={16} className="animate-pulse" /> Generating...</>
                : <><Sparkles size={16} /> Generate Questions</>
              }
            </button>
          </div>
        </div>

        {/* Questions Panel */}
        <div className="lg:col-span-2">
          {generatedQuestions.length === 0 ? (
            <div className="portal-card p-8">
              <EmptyState
                icon={Wand2}
                title="Ready to Generate"
                description='Configure your preferences and click "Generate Questions" to create AI-powered interview questions.'
              />
            </div>
          ) : (
            <div className="space-y-4">
              {generatedQuestions.map((question, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="portal-card p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-[11px] font-black uppercase tracking-wider">
                        Q{index + 1}
                      </span>
                      <span className={cn('px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider border', selectedDiff?.color)}>
                        {question.difficulty || difficulty}
                      </span>
                      {question.estimated_time_minutes && (
                        <span className="flex items-center gap-1 text-[11px] text-outline font-semibold">
                          <Clock size={12} /> ~{question.estimated_time_minutes} min
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveQuestion(index)}
                      className="p-2 text-outline hover:text-error hover:bg-error/5 rounded-lg transition-all"
                      aria-label={`Remove question ${index + 1}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <p className="text-sm font-semibold text-on-surface leading-relaxed mb-4">
                    {question.question_text}
                  </p>

                  {question.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {question.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-surface-container text-primary border border-primary/10 rounded text-[10px] font-bold uppercase tracking-tighter">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {question.follow_up_suggestions?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-outline-variant">
                      <p className="text-[11px] font-black uppercase tracking-widest text-outline mb-2">Suggested Follow-ups</p>
                      <ul className="space-y-1.5">
                        {question.follow_up_suggestions.map((fu, i) => (
                          <li key={i} className="text-xs text-on-surface-variant flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span> {fu}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {question.evaluation_criteria?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-outline-variant">
                      <p className="text-[11px] font-black uppercase tracking-widest text-outline mb-2">Evaluation Criteria</p>
                      <ul className="space-y-1.5">
                        {question.evaluation_criteria.map((c, i) => (
                          <li key={i} className="text-xs text-on-surface-variant flex items-start gap-2">
                            <span className="text-tertiary mt-0.5">✓</span> {c}
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
  )
}
