import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, User, Mail, Briefcase, FileText,
  Plus, X, Send, ArrowLeft, Video, Code, Users, MessageCircle,
  CheckCircle, AlertCircle, Sparkles, Search, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { cn, formatDate } from '../utils/helpers';

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

  const [aiInput, setAiInput] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [candidateId]);

  const handleAiSchedule = async () => {
    if (!aiInput.trim()) return;
    setAiGenerating(true);
    try {
      // Use the same backend endpoint as the calendar
      const res = await api.post('/calendar/ai-generate', { text: aiInput });
      const events = res.data.events || [res.data];
      toast.success(`Successfully scheduled ${events.length} session(s) via AI!`);
      setAiInput('');
      // Optionally redirect to interviews list to see results
      setTimeout(() => navigate('/interviews'), 1500);
    } catch (err) {
      console.error('AI Schedule Error:', err);
      toast.error('AI failed to parse scheduling intent');
    } finally {
      setAiGenerating(false);
    }
  };

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      const jobsResponse = await api.get('/jobs');
      setJobs(jobsResponse.data.jobs || []);

      if (!candidateId) {
        const candidatesResponse = await api.get('/candidates');
        setCandidates(candidatesResponse.data.candidates || []);
      } else {
        const candidateResponse = await api.get(`/candidates/${candidateId}`);
        const cand = candidateResponse.data;
        setCandidate(cand);
        
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
      toast.error('Failed to load system data');
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
    if (!formData.candidate_id) { toast.error('Please select a candidate'); return; }
    if (!formData.title) { toast.error('Please enter interview title'); return; }
    if (!formData.scheduled_date || !formData.scheduled_time) { toast.error('Please select date and time'); return; }
    if (formData.interview_types.length === 0) { toast.error('Please select at least one interview type'); return; }

    setLoading(true);
    try {
      const scheduledDateTime = `${formData.scheduled_date}T${formData.scheduled_time}:00`;
      const payload = {
        candidate_id: formData.candidate_id,
        candidate_name: formData.candidate_name,
        candidate_email: formData.candidate_email,
        job_id: formData.job_id || null,
        title: formData.title,
        scheduled_at: scheduledDateTime,
        duration_minutes: parseInt(formData.duration_minutes),
        interview_types: formData.interview_types
      };
      await api.post('/interviews', payload);
      toast.success('Interview scheduled successfully!');
      setTimeout(() => navigate('/interviews'), 500);
    } catch (error) {
      console.error('Schedule error:', error);
      toast.error(error.response?.data?.detail || 'Failed to schedule interview');
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
    { value: 'technical', label: 'Technical', icon: Code },
    { value: 'hr', label: 'HR Round', icon: Users },
    { value: 'coding', label: 'Coding', icon: Code },
    { value: 'behavioral', label: 'Behavioral', icon: MessageCircle },
    { value: 'final', label: 'Final Round', icon: Video }
  ];

  const durations = [30, 45, 60, 90, 120];
  const today = new Date().toISOString().split('T')[0];

  if (loadingData) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary mx-auto" />
          <p className="text-outline font-bold uppercase tracking-widest text-xs">Architecting session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter bg-surface min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs mb-4 group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to overview</span>
            </button>
            <h1 className="text-3xl font-bold text-on-surface mb-1 flex items-center gap-3 leading-tight">
              <Calendar size={28} className="text-primary" />
              Session Architect
            </h1>
            <p className="text-on-surface-variant text-sm font-medium opacity-70">
              Configure and dispatch AI-powered screening sessions
            </p>
          </div>
        </div>

        {/* AI Quick/Bulk Scheduler Box */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="portal-card p-6 mb-8 bg-primary/5 border border-primary/20 shadow-xl overflow-hidden relative group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all duration-700"></div>
          
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-6 h-6 text-on-primary animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-primary text-sm uppercase tracking-wider">AI Instant Scheduler</h3>
              <p className="text-xs font-bold text-outline opacity-70 italic">"Schedule Amit at 2pm and Priya at 4pm today..."</p>
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input 
                  type="text"
                  placeholder="Tell AI who to schedule and when (supports bulk scheduling)..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSchedule()}
                  className="w-full h-14 pl-5 pr-4 bg-surface-container-lowest border border-outline-variant rounded-2xl text-sm font-bold text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-inner"
                />
              </div>
              <button 
                onClick={handleAiSchedule}
                disabled={aiGenerating || !aiInput.trim()}
                className="h-14 px-8 bg-primary hover:bg-primary-container text-white rounded-2xl transition-all flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {aiGenerating ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Dispatch AI</span>
                  </>
                )}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[9px] font-black text-outline uppercase tracking-widest bg-surface-container px-2 py-0.5 rounded">Pro Tip</span>
              <p className="text-[10px] font-bold text-outline">You can schedule multiple candidates in a single sentence to save time.</p>
            </div>
          </div>
        </motion.div>

        {/* Main Configuration Card */}
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onSubmit={handleSubmit}
          className="portal-card bg-surface-container-lowest p-8 sm:p-10 shadow-xl border-outline-variant/60"
        >
          {/* Candidate Profile Context */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary shadow-inner">
                <User size={16} />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-on-surface">Target Talent</h3>
            </div>
            
            {!candidateId && (
              <div className="mb-6 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">
                  Active Candidate Database
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-50" />
                  <select
                    value={formData.candidate_id}
                    onChange={(e) => handleCandidateChange(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Select candidate from pool...</option>
                    {candidates.map((cand) => (
                      <option key={cand.id} value={cand.id}>
                        {cand.name} ({cand.email})
                      </option>
                    ))}
                  </select>
                </div>
                {candidates.length === 0 && (
                  <p className="text-[10px] font-bold text-amber-500 mt-2 flex items-center gap-2">
                    <AlertCircle size={12} />
                    Talent pool is empty. Vectorize CVs first.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Candidate Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-50" />
                  <input
                    type="text"
                    value={formData.candidate_name}
                    onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                    className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    placeholder="E.g. Jane Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Dispatch Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-50" />
                  <input
                    type="email"
                    value={formData.candidate_email}
                    onChange={(e) => setFormData({ ...formData, candidate_email: e.target.value })}
                    className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>
            </div>

            {candidate && (
              <div className="mt-6 p-5 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                   <Sparkles size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Intelligence Insight</p>
                  <p className="text-xs font-bold text-on-surface opacity-80 leading-relaxed">
                    Matched Skills: {(candidate.skills?.technical || []).slice(0, 5).join(', ') || 'General Profile'}
                  </p>
                  <p className="text-[10px] font-black text-outline uppercase mt-1">Verified Experience: {candidate.experience_years || 0} years</p>
                </div>
              </div>
            )}
          </div>

          {/* Session Logic */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary shadow-inner">
                <Briefcase size={16} />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-on-surface">Session Parameters</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Session Branding Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                  placeholder="E.g. Technical System Design Interview"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Related Job Position (Context)</label>
                <select
                  value={formData.job_id}
                  onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select a job position</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} — {job.company}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Execution Date</label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    min={today}
                    className="w-full h-12 px-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Start Time (UTC)</label>
                  <input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Block Duration</label>
                  <select
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    className="w-full h-12 px-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none appearance-none cursor-pointer"
                  >
                    {durations.map((dur) => (
                      <option key={dur} value={dur}>{dur} minutes</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1 block mb-3">
                  Intelligence Focus Modules
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
                        className={cn(
                          "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group",
                          isSelected
                            ? "bg-primary text-on-primary border-primary shadow-lg scale-105"
                            : "bg-surface-container-low border-outline-variant text-on-surface hover:border-primary/50"
                        )}
                      >
                        <Icon size={18} className={cn("transition-transform group-hover:scale-110", isSelected ? "text-on-primary" : "text-primary opacity-70")} />
                        <span className="text-[10px] font-black uppercase tracking-tighter text-center">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Session Agenda / Requirements</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full p-4 rounded-xl text-sm font-medium bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none resize-none"
                  placeholder="Key topics to verify during AI analysis..."
                />
              </div>
            </div>
          </div>

          {/* Action Hub */}
          <div className="flex items-center justify-between pt-8 border-t border-outline-variant">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary py-3 px-8 font-bold"
            >
              Discard
            </button>

            <button
              type="submit"
              disabled={loading || !formData.candidate_id}
              className="btn-primary py-3 px-10 shadow-xl shadow-primary/20 scale-105 hover:scale-110 transition-transform disabled:opacity-50 disabled:scale-100"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <RefreshCw className="animate-spin" size={18} />
                  <span>Synchronizing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Send size={18} />
                  <span>Dispatch Invitation</span>
                </div>
              )}
            </button>
          </div>
        </motion.form>

        {/* Global Dispatch Log */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-10 p-8 portal-card bg-primary/5 border border-primary/10 rounded-[32px] shadow-sm flex flex-col md:flex-row gap-8 items-center"
        >
          <div className="w-16 h-16 rounded-[24px] bg-white border border-outline-variant flex items-center justify-center shrink-0 shadow-sm">
             <Mail size={24} className="text-primary" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-on-surface mb-2">Automated Communications Pipeline</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8">
               {[
                 "Encrypted candidate invitation dispatched immediately",
                 "Integrated meeting key generated & validated",
                 "30-minute pre-session countdown alert",
                 "Recruiter confirmation & dashboard sync"
               ].map((log, i) => (
                 <div key={i} className="flex items-center gap-2 text-xs font-bold text-outline uppercase tracking-tight">
                    <CheckCircle size={14} className="text-tertiary" />
                    <span>{log}</span>
                 </div>
               ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
