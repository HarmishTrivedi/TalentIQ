import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Check, BarChart3, AlertCircle, RefreshCw } from 'lucide-react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Session expired. Start again.'); navigate('/forgot-password'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(email, form.password);
      toast.success('Password updated successfully!');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update password');
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
        <div className="mb-10 text-center">
          <div className="inline-flex w-12 h-12 bg-primary rounded-xl items-center justify-center mb-4">
            <BarChart3 size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-on-surface mb-1">Set New Password</h1>
          <p className="text-sm text-on-surface-variant">Update credentials for <span className="font-bold text-primary">{email}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant shadow-xl">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-on-surface">New Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-60" />
              <input
                required
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full h-12 pl-11 pr-12 rounded-xl text-sm font-medium bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-on-surface">Confirm New Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-60" />
              <input
                required
                type={showPw ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="••••••••"
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
            className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-md active:scale-[0.98]"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <><span>Update Password</span><Check size={16} /></>}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
