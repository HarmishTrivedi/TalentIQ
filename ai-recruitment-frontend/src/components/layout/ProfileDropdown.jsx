import React, { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Settings, Shield, Bell, Sun, Moon,
  LogOut, ChevronRight, Building2, Crown
} from 'lucide-react'
import { useAuthStore } from '../../store'
import { useThemeStore } from '../../store/themeStore'
import { getInitials } from '../../utils/helpers'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ProfileDropdown({ onClose }) {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const ref = useRef(null)
  const isDark = theme === 'dark'

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const go = (path) => { navigate(path); onClose() }
  const handleLogout = () => { logout(); navigate('/login') }

  const avatarSrc = user?.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${BASE_URL}${user.avatar_url}`)
    : null

  const menuItems = [
    { icon: User, label: 'My Profile', sub: 'View & edit profile', action: () => go('/account?tab=profile') },
    { icon: Settings, label: 'Account Settings', sub: 'Preferences & info', action: () => go('/account?tab=profile') },
    { icon: Shield, label: 'Security', sub: 'Password & sessions', action: () => go('/account?tab=security') },
    { icon: Bell, label: 'Notifications', sub: 'Alerts & emails', action: () => go('/account?tab=preferences') },
  ]

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-4 right-4 mb-2 rounded-2xl overflow-hidden animate-scaleIn z-50"
      style={{
        background: isDark ? 'rgba(10,10,20,0.97)' : 'rgba(255,255,255,0.98)',
        border: '1px solid var(--border)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
        backdropFilter: 'blur(24px)',
        transformOrigin: 'bottom center',
      }}
    >
      {/* User header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white">
                {getInitials(user?.full_name || 'U')}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2"
              style={{ borderColor: isDark ? '#0a0a14' : '#fff' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.full_name || 'User'}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
            <div className="flex items-center gap-1 mt-0.5">
              {user?.role === 'admin' && <Crown size={10} className="text-amber-400" />}
              <span className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: user?.role === 'admin' ? '#fbbf24' : 'var(--accent-cyan)' }}>
                {user?.role || 'Recruiter'}
              </span>
            </div>
          </div>
        </div>
        {user?.company_name && (
          <div className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-card-hover)' }}>
            <Building2 size={11} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              {user.company_name}
            </span>
          </div>
        )}
      </div>

      {/* Menu items */}
      <div className="p-2">
        {menuItems.map(({ icon: Icon, label, sub, action }) => (
          <button
            key={label}
            onClick={action}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group text-left"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--bg-card)' }}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</div>
            </div>
            <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
          </button>
        ))}
      </div>

      {/* Theme + Logout */}
      <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-1"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--bg-card)' }}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
          style={{ color: 'var(--error-text)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--error-bg)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)' }}>
            <LogOut size={14} style={{ color: 'var(--error-text)' }} />
          </div>
          <span className="text-xs font-semibold">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
