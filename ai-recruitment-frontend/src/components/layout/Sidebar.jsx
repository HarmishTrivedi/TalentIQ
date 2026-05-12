import React, { useState } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, Upload, Briefcase,
  Zap, MessageSquare, Sparkles, LogOut, ShieldCheck,
  Target, Sun, Moon
} from 'lucide-react'
import { useAuthStore } from '../../store'
import { useThemeStore } from '../../store/themeStore'
import { cn, getInitials } from '../../utils/helpers'
import ProfileDropdown from './ProfileDropdown'

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',     description: 'Overview & Analytics' },
  { to: '/candidates', icon: Users,           label: 'Talent Pool',   description: 'All Candidates' },
  { to: '/upload',     icon: Upload,          label: 'Upload Resume', description: 'Add New Candidate' },
  { to: '/jobs',       icon: Briefcase,       label: 'Job Positions', description: 'Manage Openings' },
  { to: '/matching',   icon: Target,          label: 'AI Matching',   description: 'Smart Candidate Match' },
  { to: '/chat',       icon: MessageSquare,   label: 'AI Assistant',  description: 'Chat with TalentIQ AI' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const isAdmin  = user?.role === 'admin'
  const isDark   = theme === 'dark'
  const [showDropdown, setShowDropdown] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const avatarSrc = user?.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${BASE_URL}${user.avatar_url}`)
    : null

  return (
    <aside
      className="w-72 h-screen flex flex-col border-r relative overflow-hidden"
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(24px)' }}
    >
      {/* Ambient glow — dark only */}
      {isDark && (
        <>
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-violet-500/5 to-transparent pointer-events-none" />
        </>
      )}

      {/* Logo */}
      <div className="px-6 py-5 border-b relative z-10" style={{ borderColor: 'var(--border)' }}>
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/40 group-hover:shadow-blue-500/60 transition-all">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Sora, sans-serif' }}>
              TalentIQ
            </div>
            <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>
              AI Hiring OS
            </div>
          </div>
        </Link>
      </div>

      {/* User Profile */}
      <div className="px-4 py-3 border-b relative z-10" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt="avatar" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {getInitials(user?.full_name || 'U')}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.full_name || 'User'}
            </div>
            <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
              {user?.role || 'Recruiter'}
            </div>
          </div>
          {/* Theme toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleTheme() }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
            style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </button>
        {showDropdown && <ProfileDropdown onClose={() => setShowDropdown(false)} />}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto relative z-10">
        {navItems.map(({ to, icon: Icon, label, description }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'group flex items-center gap-3 px-3 py-3 rounded-2xl transition-all relative overflow-hidden',
              isActive ? 'shadow-sm' : ''
            )}
            style={({ isActive }) => isActive
              ? { background: 'var(--accent-cyan)', color: '#000' }
              : { color: 'var(--text-secondary)' }
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={isActive
                    ? { background: 'rgba(0,0,0,0.15)' }
                    : { background: 'var(--bg-card-hover)' }
                  }
                >
                  <Icon
                    className="w-4 h-4 transition-all"
                    style={{ color: isActive ? '#000' : 'var(--text-secondary)' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-semibold transition-all"
                    style={{ color: isActive ? '#000' : 'var(--text-primary)' }}
                  >
                    {label}
                  </div>
                  <div
                    className="text-xs truncate"
                    style={{ color: isActive ? 'rgba(0,0,0,0.55)' : 'var(--text-muted)' }}
                  >
                    {description}
                  </div>
                </div>
              </>
            )}
          </NavLink>
        ))}

        {/* Admin Panel */}
        {isAdmin && (
          <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <Link
              to="/admin/dashboard"
              className="group flex items-center gap-3 px-3 py-3 rounded-2xl transition-all"
              style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#c4b5fd' }}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/40">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-violet-300">Admin Panel</div>
                <div className="text-xs text-violet-400/60">System Management</div>
              </div>
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t space-y-2 relative z-10" style={{ borderColor: 'var(--border)' }}>
        {/* Beta badge */}
        <div
          className="p-3 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Free Beta</span>
          </div>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>All features unlocked during beta</p>
          <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-600 w-full" />
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl transition-all text-sm font-semibold"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--error-bg)'; e.currentTarget.style.borderColor = 'var(--error-border)'; e.currentTarget.style.color = 'var(--error-text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
