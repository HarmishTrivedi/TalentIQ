import React, { useEffect, useState } from 'react'
import { Activity, Briefcase, Zap, MessageSquare, Clock, Search } from 'lucide-react'
import { adminApi } from '../services/api'
import { Spinner, EmptyState } from '../components/ui'
import { formatRelativeTime } from '../utils/helpers'

export default function AdminUsage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminApi.getUsageStats()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = (data?.usage || []).filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const totalJobs    = filtered.reduce((s, u) => s + u.jobs_created, 0)
  const totalMatches = filtered.reduce((s, u) => s + u.ai_matches_run, 0)
  const totalChats   = filtered.reduce((s, u) => s + u.chat_sessions, 0)

  return (
    <div className="p-8 space-y-6 animate-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-title">Usage Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Activity counts per user — no private content is shown</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Jobs Created', value: totalJobs,    icon: Briefcase,      color: '#2563eb' },
          { label: 'AI Matches Run',     value: totalMatches, icon: Zap,            color: '#10b981' },
          { label: 'Chat Sessions',      value: totalChats,   icon: MessageSquare,  color: '#8b5cf6' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 font-title">{loading ? '—' : value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          className="input-field pl-11"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex justify-center"><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Activity} title="No usage data" description="No users match your search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                  {['User', 'Role', 'Jobs', 'Matches', 'Chats', 'Messages', 'Last Active'].map(h => (
                    <th key={h} className="px-6 py-4 font-semibold uppercase tracking-wider font-sans">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(u => (
                  <tr key={u.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs font-title">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm font-title">{u.name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-sans ${
                        u.role === 'admin'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-violet-50 text-violet-700 border border-violet-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-900 font-title">{u.jobs_created}</td>
                    <td className="px-6 py-4 text-center font-bold text-emerald-600 font-title">{u.ai_matches_run}</td>
                    <td className="px-6 py-4 text-center font-bold text-violet-600 font-title">{u.chat_sessions}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-500 font-title">{u.chat_messages}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                        <Clock size={12} />
                        {u.last_active ? formatRelativeTime(u.last_active) : 'Never'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
