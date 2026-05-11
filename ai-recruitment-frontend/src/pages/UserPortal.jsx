import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles, Users, Upload, Briefcase, Zap,
  MessageSquare, LayoutDashboard, LogOut,
  CheckCircle, ArrowRight, ShieldCheck
} from 'lucide-react'
import { useAuthStore } from '../store'
import { getInitials } from '../utils/helpers'

const FEATURES = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    desc: 'View your stats, recent activity and top matches',
    to: '/dashboard',
    color: '#2563eb',
  },
  {
    icon: Upload,
    label: 'Upload CVs',
    desc: 'Upload candidate resumes — AI parses them instantly',
    to: '/upload',
    color: '#7c3aed',
  },
  {
    icon: Users,
    label: 'Candidates',
    desc: 'Browse and manage your candidate database',
    to: '/candidates',
    color: '#0891b2',
  },
  {
    icon: Briefcase,
    label: 'Jobs',
    desc: 'Post job listings and let AI extract requirements',
    to: '/jobs',
    color: '#059669',
  },
  {
    icon: Zap,
    label: 'AI Matching',
    desc: 'Run AI-powered candidate-to-job matching',
    to: '/matching',
    color: '#d97706',
  },
  {
    icon: MessageSquare,
    label: 'AI Chat',
    desc: 'Screen candidates with an AI interview assistant',
    to: '/chat',
    color: '#db2777',
  },
]

const PLAN_FEATURES = [
  'Unlimited CV uploads & AI parsing',
  'Unlimited job postings',
  'Unlimited AI candidate matching',
  'AI screening chat assistant',
  'Full dashboard & analytics',
  'Free during beta — no card needed',
]

export default function UserPortal() {
  const navigate  = useNavigate()
  const { user, logout } = useAuthStore()
  const firstName = user?.full_name?.split(' ')[0] || 'Recruiter'

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-base font-bold text-slate-900 font-title">TalentIQ</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-xs font-bold text-white font-title">
              {getInitials(user?.full_name || 'U')}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 font-title leading-none">{user?.full_name}</p>
              <p className="text-[11px] text-blue-600 font-bold uppercase tracking-wider font-sans">Recruiter</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors font-sans"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-blue-600 to-blue-700">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute bottom-0 right-20 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative">
            <p className="text-blue-200 text-sm font-sans mb-1">Welcome back</p>
            <h1 className="text-3xl font-bold text-white font-title mb-2">
              Hello Recruiter, {firstName}! 👋
            </h1>
            <p className="text-blue-100 text-sm max-w-lg">
              Everything you need to find the perfect candidates is ready. Pick a feature below to get started.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-white text-blue-600 text-sm font-bold hover:bg-blue-50 transition-all font-sans shadow-sm"
            >
              Go to Dashboard <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Feature grid */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-title mb-4">All Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, label, desc, to, color }) => (
              <Link
                key={to}
                to={to}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-blue-200 hover:shadow-card transition-all group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all group-hover:scale-110"
                  style={{ background: `${color}12` }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm font-title mb-1">{label}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                <div className="flex items-center gap-1 mt-3 text-xs font-semibold font-sans transition-colors"
                  style={{ color }}>
                  Open <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Current plan */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-title">Your Current Plan</h2>
              <p className="text-sm text-slate-500 mt-0.5">All features unlocked during beta</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 font-sans">
              Free Beta
            </span>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                <Sparkles size={22} className="text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 font-title">Free Plan</p>
                <p className="text-sm text-slate-500">$0 / month — No credit card required</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PLAN_FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Admin panel hint for admins */}
        {user?.role === 'admin' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-blue-600" />
              <div>
                <p className="text-sm font-bold text-slate-900 font-title">You have Admin access</p>
                <p className="text-xs text-slate-500">Manage users, subscriptions, pricing and platform analytics</p>
              </div>
            </div>
            <Link to="/admin/dashboard"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all font-sans flex-shrink-0">
              Admin Panel
            </Link>
          </div>
        )}

      </main>
    </div>
  )
}
