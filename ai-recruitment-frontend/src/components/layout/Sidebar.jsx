import React, { useState, useRef } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, Upload, Briefcase,
  MessageSquare, Sparkles, LogOut, ShieldCheck,
  Target, Sun, Moon, Settings, Building2, 
  Crown, ChevronRight, DollarSign,
  Brain, Wand2, Calendar, HelpCircle, Plus, Bell, BarChart3
} from 'lucide-react'
import { useAuthStore } from '../../store'
import { useThemeStore } from '../../store/themeStore'
import { cn, getInitials } from '../../utils/helpers'
import { BASE_URL } from '../../services/api'

const navItems = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/candidates',    icon: Users,           label: 'Candidates' },
  { to: '/jobs',          icon: Briefcase,       label: 'Jobs' },
  { to: '/interviews',    icon: Brain,           label: 'Interviews' },
  { to: '/account',       icon: Settings,        label: 'Settings' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="fixed left-0 top-0 h-full z-40 flex flex-col bg-surface-container-lowest border-r border-outline-variant w-[260px] transition-colors duration-200 ease-in-out shrink-0 relative">
      {/* Brand Section */}
      <div className="px-6 py-8 flex flex-col gap-1">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary shadow-sm group-hover:scale-105 transition-transform">
            <BarChart3 size={18} />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-primary">TalentIQ</h1>
            <p className="text-[10px] text-on-surface-variant opacity-70 uppercase tracking-wider font-bold">AI Recruitment</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container transition-all group',
              isActive && 'text-primary font-bold border-r-4 border-primary bg-surface-container'
            )}
          >
            <Icon size={20} className={cn("group-hover:scale-110 transition-transform",)} />
            <span className="text-sm">{label}</span>
          </NavLink>
        ))}

        {/* AI Features Section */}
        <div className="pt-4 pb-2 px-4">
          <span className="text-[10px] font-bold text-outline uppercase tracking-[0.15em]">AI Intelligence</span>
        </div>
        <NavLink
          to="/matching"
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container transition-all group',
            isActive && 'text-primary font-bold border-r-4 border-primary bg-surface-container'
          )}
        >
          <Sparkles size={20} className="text-violet-500" />
          <span className="text-sm">AI Matching</span>
        </NavLink>
        <NavLink
          to="/ai-interviews"
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container transition-all group',
            isActive && 'text-primary font-bold border-r-4 border-primary bg-surface-container'
          )}
        >
          <Target size={20} className="text-violet-500" />
          <span className="text-sm">Interview Analytics</span>
        </NavLink>
        <NavLink
          to="/questions/generate"
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container transition-all group',
            isActive && 'text-primary font-bold border-r-4 border-primary bg-surface-container'
          )}
        >
          <Wand2 size={20} className="text-violet-500" />
          <span className="text-sm">Question Gen</span>
        </NavLink>
      </nav>

      {/* Post Job Button & Quick Links */}
      <div className="px-4 py-6 border-t border-outline-variant">
        <Link 
          to="/jobs" 
          className="w-full bg-primary text-on-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-sm mb-6"
        >
          <Plus size={18} />
          <span>Post New Job</span>
        </Link>
        
        <div className="space-y-1">
          <Link to="/help" className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-primary transition-all group">
            <HelpCircle size={18} className="group-hover:scale-110 transition-all" />
            <span className="text-sm font-medium">Help Center</span>
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-error transition-all group"
          >
            <LogOut size={18} className="group-hover:scale-110 transition-all" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
