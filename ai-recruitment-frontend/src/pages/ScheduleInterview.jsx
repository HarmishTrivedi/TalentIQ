import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, User, Mail, Briefcase, FileText,
  Plus, X, Send, ArrowLeft, Video, Code, Users, MessageCircle,
  CheckCircle, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function ScheduleInterview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get('candidateId');
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  
  const [formData, setFormData] = useState({
    candidate_id: candidateId || '',
    candidate_name: '',
    candidate_email: '',
    job_id: '',
    title: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    interview_types: [],
    description: '',
    notes: ''
  });

  useEffect(() => {
    loadInitialData();
  }, [candidateId]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      // Load jobs
      const jobsResponse = await api.get('/jobs');
      setJobs(jobsResponse.data.jobs || []);

      // Load candidates if no candidateId provided
      if (!candidateId) {
        const candidatesResponse = await api.get('/candidates');
        setCandidates(candidatesResponse.data.candidates || []);
      } else {
        // Load specific candidate
        const candidateResponse = await api.get(`/candidates/${candidateId}`);
        const cand = candidateResponse.data;
        setCandidate(cand);
        
        // Auto-fill form
        setFormData(prev => ({
          ...prev,
          candidate_id: candidateId,
          candidate_name: cand.name,
          candidate_email: cand.email || '',
          title: `Interview with ${cand.name}`,
          description: `Technical interview for ${cand.name}\n\nSkills: ${(cand.skills?.technical || []).join(', ')}\nExperience: ${cand.experience_years || 0} years`
        }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCandidateChange = async (selectedCandidateId) => {
    if (!selectedCandidateId) {
      setFormData(prev => ({
        ...prev,
        candidate_id: '',
        candidate_name: '',
        candidate_email: '',
        title: '',
        description: ''
      }));
      setCandidate(null);
      return;
    }

    try {
      const response = await api.get(`/candidates/${selectedCandidateId}`);
      const cand = response.data;
      setCandidate(cand);
      
      setFormData(prev => ({
        ...prev,
        candidate_id: selectedCandidateId,
        candidate_name: cand.name,
        candidate_email: cand.email || '',
        title: `Interview with ${cand.name}`,
        description: `Technical interview for ${cand.name}\n\nSkills: ${(cand.skills?.technical || []).join(', ')}\nExperience: ${cand.experience_years || 0} years`
      }));
    } catch (error) {
      console.error('Failed to load candidate:', error);
      toast.error('Failed to load candidate details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.candidate_id) {
      toast.error('Please select a candidate');
      return;
    }
    
    if (!formData.title) {
      toast.error('Please enter interview title');
      return;
    }
    
    if (!formData.scheduled_date || !formData.scheduled_time) {
      toast.error('Please select date and time');
      return;
    }

    if (formData.interview_types.length === 0) {
      toast.error('Please select at least one interview type');
      return;
    }

    setLoading(true);
    
    try {
      // Combine date and time into ISO string
      const scheduledDateTime = `${formData.scheduled_date}T${formData.scheduled_time}:00`;
      
      const payload = {
        candidate_id: formData.candidate_id,
        job_id: formData.job_id || null,
        title: formData.title,
        scheduled_at: scheduledDateTime,
        duration_minutes: parseInt(formData.duration_minutes),
        interview_types: formData.interview_types
      };

      console.log('Submitting interview:', payload);
      
      const response = await api.post('/interviews', payload);
      
      console.log('Interview created:', response.data);
      
      toast.success('Interview scheduled successfully!');
      
      // Navigate to interviews page
      setTimeout(() => {
        navigate('/interviews');
      }, 500);
      
    } catch (error) {
      console.error('Schedule error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to schedule interview';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const toggleInterviewType = (type) => {
    setFormData(prev => {
      const types = prev.interview_types.includes(type)
        ? prev.interview_types.filter(t => t !== type)
        : [...prev.interview_types, type];
      return { ...prev, interview_types: types };
    });
  };

  const interviewTypes = [
    { value: 'technical', label: 'Technical', icon: Code, color: 'from-blue-500 to-cyan-500' },
    { value: 'hr', label: 'HR Round', icon: Users, color: 'from-green-500 to-emerald-500' },
    { value: 'coding', label: 'Coding', icon: Code, color: 'from-purple-500 to-pink-500' },
    { value: 'behavioral', label: 'Behavioral', icon: MessageCircle, color: 'from-orange-500 to-red-500' },
    { value: 'final', label: 'Final Round', icon: Video, color: 'from-indigo-500 to-purple-500' }
  ];

  const durations = [30, 45, 60, 90, 120];

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-purple-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Calendar className="w-10 h-10 text-purple-400" />
            Schedule Interview
          </h1>
          <p className="text-purple-300">
            {candidateId ? 'Candidate details auto-filled' : 'Create a new interview'}
          </p>
        </div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-black/40 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8"
        >
          {/* Candidate Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400" />
              Candidate Information
            </h2>
            
            {!candidateId && (
              <div className="mb-4">
                <label className="block text-purple-300 text-sm font-semibold mb-2">
                  Select Candidate *
                </label>
                <select
                  value={formData.candidate_id}
                  onChange={(e) => handleCandidateChange(e.target.value)}
                  className="w-full px-4 py-3 bg-black/60 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  required
                >
                  <option value="">Choose a candidate...</option>
                  {candidates.map((cand) => (
                    <option key={cand.id} value={cand.id}>
                      {cand.name} - {cand.email}
                    </option>
                  ))}
                </select>
                {candidates.length === 0 && (
                  <p className="text-sm text-orange-400 mt-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    No candidates found. Please upload candidate CVs first.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-300 text-sm font-semibold mb-2">
                  Candidate Name *
                </label>
                <input
                  type="text"
                  value={formData.candidate_name}
                  onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                  className="w-full px-4 py-3 bg-black/60 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm font-semibold mb-2">
                  Candidate Email *
                </label>
                <input
                  type="email"
                  value={formData.candidate_email}
                  onChange={(e) => setFormData({ ...formData, candidate_email: e.target.value })}
                  className="w-full px-4 py-3 bg-black/60 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            {candidate && (
              <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-purple-200 mb-2">
                      <strong>Skills:</strong> {(candidate.skills?.technical || []).join(', ') || 'N/A'}
                    </p>
                    <p className="text-sm text-purple-200">
                      <strong>Experience:</strong> {candidate.experience_years || 0} years
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interview Details */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-400" />
              Interview Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-purple-300 text-sm font-semibold mb-2">
                  Interview Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-black/60 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  placeholder="Senior Frontend Developer Interview"
                  required
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm font-semibold mb-2">
                  Job Position (Optional)
                </label>
                <select
                  value={formData.job_id}
                  onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                  className="w-full px-4 py-3 bg-black/60 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                >
                  <option value="">Select a job position</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} - {job.company}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-purple-300 text-sm font-semibold mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    min={today}
                    className="w-full px-4 py-3 bg-black/60 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-purple-300 text-sm font-semibold mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    className="w-full px-4 py-3 bg-black/60 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-purple-300 text-sm font-semibold mb-2">
                    Duration (min)
                  </label>
                  <select
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-black/60 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  >
                    {durations.map((dur) => (
                      <option key={dur} value={dur}>{dur} minutes</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-purple-300 text-sm font-semibold mb-2">
                  Interview Types * (Select at least one)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {interviewTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.interview_types.includes(type.value);
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => toggleInterviewType(type.value)}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? `bg-gradient-to-r ${type.color} border-transparent text-white shadow-lg transform scale-105`
                            : 'bg-black/60 border-purple-500/20 text-purple-300 hover:border-purple-500/40'
                        }`}
                      >
                        <Icon className="w-5 h-5 mx-auto mb-2" />
                        <span className="text-xs font-semibold block">{type.label}</span>
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 mx-auto mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {formData.interview_types.length > 0 && (
                  <div className="mt-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <p className="text-sm text-green-200 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <strong>Selected:</strong> {formData.interview_types.map(t => 
                        interviewTypes.find(opt => opt.value === t)?.label
                      ).join(', ')}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-purple-300 text-sm font-semibold mb-2">
                  Description / Agenda
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-black/60 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                  placeholder="Interview agenda, topics to cover, etc."
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm font-semibold mb-2">
                  Notes (Internal)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-black/60 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                  placeholder="Internal notes for recruiters..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-purple-500/20">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-black/60 text-purple-300 rounded-xl font-semibold hover:bg-black/80 transition-all border border-purple-500/20"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || !formData.candidate_id}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Scheduling...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Schedule Interview
                </>
              )}
            </button>
          </div>
        </motion.form>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl"
        >
          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            Automatic Email Notifications
          </h3>
          <ul className="space-y-2 text-sm text-blue-200">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              Interview invitation will be sent to candidate immediately
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              Meeting link will be included in the email
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              Reminder will be sent 30 minutes before the interview
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              Recruiter will receive a confirmation email
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
