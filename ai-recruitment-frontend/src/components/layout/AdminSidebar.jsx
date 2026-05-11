import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Activity, DollarSign, ShieldCheck, LogOut, ChevronLeft, UserPlus, CreditCard, Sun, Moon } from 'lucide-react'
import { cn, getInitials } from '../../utils/helpers'
import { useAuthStore } from '../../store'
import { useThemeStore } from '../../store/themeStore'

const menu = [
  { label: 'Overview',        icon: LayoutDashboard, path: '/admin/dashboard'     },
  { label: 'User Accounts',   icon: Users,           path: '/admin/users'         },
  { label: 'Subscriptions',   icon: CreditCard,      path: '/admin/subscriptions' },
  { label: 'Usage Analytics', icon: Activity,        path: '/admin/usage'         },
  { label: 'Pricing & Plans', icon: DollarSign,      path: '/admin/pricing'       },
]

export default function AdminSidebar() {
  const location = useLocation()
  const navigate  = useNavigate()
  const { logout, user } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col border-r" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>

      {/* Brand */}
      <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/40">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>Admin Panel</div>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-violet)' }}>TalentIQ Core</div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {getInitials(user?.full_name || 'A')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{user?.full_name || 'Admin'}</div>
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-violet)' }}>Administrator</div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} title={isDark ? 'Light Mode' : 'Dark Mode'}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <button onClick={handleLogout} title="Sign out"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--error-text)'; e.currentTarget.style.background = 'var(--error-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}>
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {menu.map((item) => {
          const active = location.pathname === item.path
          return (
            <Link key={item.path} to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all"
              style={active
                ? { background: 'var(--accent-cyan)', color: '#000' }
                : { color: 'var(--text-secondary)' }
              }
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
            >
              <item.icon size={16} style={{ color: active ? '#000' : 'var(--text-muted)' }} />
              {item.label}
            </Link>
          )
        })}

        <div className="pt-3 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <Link to="/admin/users"
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all"
            style={{ color: 'var(--accent-violet)', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
            <UserPlus size={16} style={{ color: 'var(--accent-violet)' }} />
            Create Admin Account
          </Link>
        </div>
      </nav>

      {/* Back to portal */}
      <div className="px-4 pb-5">
        <Link to="/dashboard"
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <ChevronLeft size={15} /> Back to Portal
        </Link>
      </div>
    </aside>
  )
}
