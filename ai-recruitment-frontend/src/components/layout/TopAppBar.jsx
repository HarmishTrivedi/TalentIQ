import React from 'react'
import { Search, Bell, Settings, LayoutGrid, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../store'
import { getInitials } from '../../utils/helpers'
import { BASE_URL } from '../../services/api'

export default function TopAppBar() {
  const { user } = useAuthStore()
  
  const avatarSrc = user?.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${BASE_URL}${user.avatar_url}`)
    : null

  return (
    <header className="h-16 flex items-center justify-between px-8 bg-surface-container-lowest border-b border-outline-variant z-30 transition-all duration-150">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-70" />
          <input 
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-full text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
            placeholder="Search candidates, jobs, or tasks..." 
            type="text"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all">
          <Bell size={20} />
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all">
          <Settings size={20} />
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all">
          <LayoutGrid size={20} />
        </button>
        
        <div className="h-8 w-[1px] bg-outline-variant mx-2"></div>
        
        <div className="flex items-center gap-3 pl-2 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-on-surface">{user?.full_name || 'Alex Rivera'}</p>
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant opacity-70">{user?.role || 'Senior Recruiter'}</p>
          </div>
          
          <div className="relative">
            {avatarSrc ? (
              <img 
                src={avatarSrc} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border-2 border-primary-container object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-primary-container bg-primary text-on-primary flex items-center justify-center text-xs font-bold">
                {getInitials(user?.full_name || 'U')}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
          </div>
        </div>
      </div>
    </header>
  )
}
