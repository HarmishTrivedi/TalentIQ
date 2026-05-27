import React, { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  LayoutDashboard, Users, Upload, Briefcase,
  MessageSquare, Sparkles, LogOut, ShieldCheck,
  Target, Sun, Moon, User, Settings, Shield,
  Bell, ChevronUp, Building2, Crown, ChevronRight, DollarSign,
  Video, Brain, Wand2, Calendar
} from 'lucide-react'
import { useAuthStore } from '../../store'
import { useThemeStore } from '../../store/themeStore'
import { cn, getInitials } from '../../utils/helpers'
import { BASE_URL } from '../../services/api'
import NotificationCenter from './NotificationCenter'

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',     description: 'Overview & Analytics' },
  { to: '/calendar',   icon: Calendar,        label: 'Smart Calendar', description: 'Schedule & Tasks' },
  { to: '/upload',     icon: Upload,          label: 'Upload Resume', description: 'Bulk CV Upload' },
  { to: '/candidates', icon: Users,           label: 'Talent Pool',   description: 'All Candidates' },
  { to: '/jobs',       icon: Briefcase,       label: 'Job Positions', description: 'Manage Openings' },
  { to: '/matching',   icon: Target,          label: 'AI Matching',   description: 'Smart Candidate Match' },
  { to: '/interview-schedule', icon: Calendar, label: 'Interview List', description: 'Manage Interviews' },
  { to: '/ai-interviews', icon: Brain,        label: 'AI Interviews', description: 'Live Interview Intelligence' },
  { to: '/questions/generate', icon: Wand2,   label: 'Question Gen',  description: 'AI Question Generator' },
  { to: '/chat',       icon: MessageSquare,   label: 'AI Assistant',  description: 'Chat with TalentIQ AI' },
  { to: '/pricing',    icon: DollarSign,      label: 'Pricing',       description: 'Plans & Billing' },
]

// ── Profile Dropdown rendered via portal (no clipping) ────────────────────────
function ProfileDropdownPortal({ anchorRef, onClose }) {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const dropRef = useRef(null)
  const isDark = theme === 'dark'
  const [pos, setPos] = useState({ bottom: 0, left: 0, width: 0 })

  // Calculate position from anchor
  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      setPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [anchorRef])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])

  const go = (path) => { navigate(path); onClose() }
  const handleLogout = () => { logout(); navigate('/login') }

  const avatarSrc = user?.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${BASE_URL}${user.avatar_url}`)
    : null

  const menuItems = [
    { icon: Settings, label: 'Account Settings', sub: 'Manage your account', path: '/account' },
  ]

  return createPortal(
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        bottom: pos.bottom,
        left: pos.left,
        width: pos.width,
        zIndex: 9999,
        background: isDark ? 'rgba(8,8,18,0.98)' : 'rgba(255,255,255,0.99)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        boxShadow: isDark
          ? '0 -16px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06), 0 0 40px rgba(103,232,249,0.04)'
          : '0 -8px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        animation: 'dropdownSlideUp 0.2s cubic-bezier(0.16,1,0.3,1) forwards',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes dropdownSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>

      {/* User header */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" className="w-11 h-11 rounded-xl object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white">
                {getInitials(user?.full_name || 'U')}
              </div>
            )}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500"
              style={{ border: `2px solid ${isDark ? '#08081a' : '#fff'}` }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.full_name || 'User'}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
            <div className="flex items-center gap-1 mt-0.5">
              {user?.role === 'admin' && <Crown size={9} style={{ color: '#fbbf24' }} />}
              <span className="text-[10px] uppercase tracking-wider font-bold"
                style={{ color: user?.role === 'admin' ? '#fbbf24' : 'var(--accent-cyan)' }}>
                {user?.role || 'Recruiter'}
              </span>
            </div>
          </div>
        </div>
        {user?.company_name && (
          <div className="flex items-center gap-1.5 mt-2.5 px-2.5 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
            <Building2 size={11} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs truncate font-medium" style={{ color: 'var(--text-secondary)' }}>
              {user.company_name}
            </span>
          </div>
        )}
      </div>

      {/* Menu items */}
      <div className="p-2">
        {menuItems.map(({ icon: Icon, label, sub, path }) => (
          <button
            key={label}
            onClick={() => go(path)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg-card-hover)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Icon size={13} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</div>
            </div>
            <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)', margin: '0 12px' }} />

      {/* Theme + Logout */}
      <div className="p-2">
        <button
          onClick={() => { toggleTheme(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-1"
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {isDark ? <Sun size={13} style={{ color: '#fbbf24' }} /> : <Moon size={13} style={{ color: '#6366f1' }} />}
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
          onMouseEnter={e => e.currentTarget.style.background = 'var(--error-bg)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
            <LogOut size={13} style={{ color: 'var(--error-text)' }} />
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--error-text)' }}>Sign Out</span>
        </button>
      </div>
    </div>,
    document.body
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const isDark  = theme === 'dark'
  const [showDropdown, setShowDropdown] = useState(false)
  const profileRef = useRef(null)

  const handleLogout = () => { logout(); navigate('/login') }

  const avatarSrc = user?.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${BASE_URL}${user.avatar_url}`)
    : null

  return (
    <aside
      className="w-72 h-screen flex flex-col border-r relative"
      style={{
        background: 'var(--sidebar-bg)',
        borderColor: 'var(--border)',
        backdropFilter: 'blur(24px)',
        flexShrink: 0,
      }}
    >
      {/* Ambient glow */}
      {isDark && (
        <>
          <div className="absolute top-0 left-0 w-full h-32 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(59,130,246,0.04), transparent)' }} />
          <div className="absolute bottom-0 left-0 w-full h-32 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(139,92,246,0.04), transparent)' }} />
        </>
      )}

      {/* Logo */}
      <div className="px-6 py-5 border-b flex-shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all">
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
        <NotificationCenter />
      </div>

      {/* Navigation — scrollable middle */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, description }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'group flex items-center gap-3 px-3 py-3 rounded-2xl transition-all',
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
                  style={isActive ? { background: 'rgba(0,0,0,0.15)' } : { background: 'var(--bg-card-hover)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: isActive ? '#000' : 'var(--text-secondary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: isActive ? '#000' : 'var(--text-primary)' }}>
                    {label}
                  </div>
                  <div className="text-xs truncate" style={{ color: isActive ? 'rgba(0,0,0,0.55)' : 'var(--text-muted)' }}>
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
              className="flex items-center gap-3 px-3 py-3 rounded-2xl transition-all"
              style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)' }}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
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

      {/* Bottom section — fixed at bottom */}
      <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
        {/* Beta badge */}
        <div className="p-3 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Free Beta</span>
          </div>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>All features unlocked during beta</p>
          <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-600 w-full" />
          </div>
        </div>

        {/* Profile card — clickable, opens dropdown */}
        <button
          ref={profileRef}
          onClick={() => setShowDropdown(v => !v)}
          className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left"
          style={{
            background: showDropdown ? 'var(--bg-card-hover)' : 'var(--bg-card)',
            border: `1px solid ${showDropdown ? 'var(--accent-cyan)' : 'var(--border)'}`,
            boxShadow: showDropdown ? '0 0 0 3px var(--accent-glow)' : 'none',
          }}
        >
          {/* Avatar */}
          {avatarSrc ? (
            <img src={avatarSrc} alt="avatar" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {getInitials(user?.full_name || 'U')}
            </div>
          )}

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.full_name || 'User'}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
              {user?.role || 'Recruiter'}
            </div>
          </div>

          {/* Chevron indicator */}
          <ChevronUp
            size={14}
            style={{
              color: 'var(--text-muted)',
              flexShrink: 0,
              transition: 'transform 0.2s ease',
              transform: showDropdown ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
          />
        </button>
      </div>

      {/* Portal dropdown */}
      {showDropdown && (
        <ProfileDropdownPortal
          anchorRef={profileRef}
          onClose={() => setShowDropdown(false)}
        />
      )}
    </aside>
  )
}
