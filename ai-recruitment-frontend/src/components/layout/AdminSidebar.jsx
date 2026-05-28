import React from 'react'
import { Link, useLocation, useNavigate, NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, Users, Activity, DollarSign, ShieldCheck, 
  LogOut, ChevronLeft, UserPlus, CreditCard, Settings,
  Shield, BarChart3, Users2, Key
} from 'lucide-react'
import { cn, getInitials } from '../../utils/helpers'
import { useAuthStore } from '../../store'
import { useThemeStore } from '../../store/themeStore'

const menu = [
  { label: 'Overview',        icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: 'User Accounts',   icon: Users,           path: '/admin/users' },
  { label: 'Subscriptions',   icon: CreditCard,      path: '/admin/subscriptions' },
  { label: 'Usage Analytics', icon: Activity,        path: '/admin/usage' },
  { label: 'Pricing & Plans', icon: DollarSign,      path: '/admin/pricing' },
]

export default function AdminSidebar() {
  const location = useLocation()
  const navigate  = useNavigate()
  const { logout, user } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <aside className="fixed left-0 top-0 h-full z-40 flex flex-col bg-inverse-surface border-r border-outline w-[260px] transition-colors duration-200 ease-in-out shrink-0 relative">
      {/* Brand Section */}
      <div className="px-6 py-8 flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary shadow-sm">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-primary-fixed">Admin Panel</h1>
            <p className="text-[10px] text-surface-variant opacity-70 uppercase tracking-wider font-bold">TalentIQ Core</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menu.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-surface-variant hover:bg-surface-variant/10 transition-all group',
              isActive && 'text-primary-fixed font-bold border-r-4 border-primary-fixed bg-surface-variant/20'
            )}
          >
            <Icon size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm">{label}</span>
          </NavLink>
        ))}

        <div className="pt-6 pb-2 px-4">
          <span className="text-[10px] font-bold text-outline uppercase tracking-[0.15em]">Security & Access</span>
        </div>
        <NavLink
          to="/admin/users"
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg text-surface-variant hover:bg-surface-variant/10 transition-all group',
            isActive && 'text-primary-fixed font-bold border-r-4 border-primary-fixed bg-surface-variant/20'
          )}
        >
          <Key size={20} className="text-amber-400" />
          <span className="text-sm">Access Control</span>
        </NavLink>
      </nav>

      {/* Bottom section */}
      <div className="px-4 py-6 border-t border-outline">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-variant/10 border border-outline mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-xs font-bold text-on-primary-fixed shrink-0">
            {getInitials(user?.full_name || 'A')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-primary-fixed truncate">{user?.full_name || 'Admin'}</p>
            <p className="text-[10px] uppercase tracking-wider text-surface-variant opacity-70">Administrator</p>
          </div>
        </div>
        
        <div className="space-y-1">
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2 text-surface-variant hover:text-primary-fixed transition-all group">
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-all" />
            <span className="text-sm font-medium">Back to Portal</span>
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-surface-variant hover:text-red-400 transition-all group"
          >
            <LogOut size={18} className="group-hover:scale-110 transition-all" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
