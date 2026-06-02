import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, ArrowLeft, BarChart3, AlertCircle, RefreshCw } from 'lucide-react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      toast.success('Reset request confirmed');
      // In a real app, this would tell the user to check their email.
      // For this simplified flow, we redirect directly to the reset page.
      navigate(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-surface font-sans items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px]"
      >
        <div className="mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 size={16} className="text-white" />
            </div>
            <span className="font-display text-xl font-black text-primary">TalentIQ</span>
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-outline mt-1">Security & Access</p>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-on-surface mb-1">Reset Password</h1>
          <p className="text-sm text-on-surface-variant">Enter your account email to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-on-surface">Work Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-60" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-12 pl-11 pr-4 rounded-xl text-sm font-medium bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-start gap-2">
              <AlertCircle size={14} className="text-error mt-0.5 shrink-0" />
              <p className="text-xs font-bold text-error">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-md"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <><span>Next Step</span><ArrowRight size={16} /></>}
          </button>
        </form>

        <button
          onClick={() => navigate('/login')}
          className="w-full mt-6 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-outline hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Login</span>
        </button>
      </motion.div>
    </main>
  );
}
