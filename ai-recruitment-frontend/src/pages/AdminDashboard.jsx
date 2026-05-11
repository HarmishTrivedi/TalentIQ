import React, { useEffect, useState } from 'react'
import { Users, FileText, MessageSquare, Zap, ShieldAlert, Clock, TrendingUp } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { adminApi } from '../services/api'
import { Spinner, EmptyState } from '../components/ui'
import { formatRelativeTime } from '../utils/helpers'
import { useAuthStore } from '../store'
import { Link } from 'react-router-dom'

const mockActivity = [
  { name: 'Mon', users: 2, matches: 8 },
  { name: 'Tue', users: 5, matches: 14 },
  { name: 'Wed', users: 3, matches: 10 },
  { name: 'Thu', users: 7, matches: 19 },
  { name: 'Fri', users: 4, matches: 16 },
  { name: 'Sat', users: 6, matches: 22 },
  { name: 'Sun', users: 8, matches: 25 },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-200 hover:shadow-card transition-all">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 font-title">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    adminApi.getPlatformStats()
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-8 flex justify-center items-center h-full">
      <Spinner size={36} className="text-blue-600" />
    </div>
  )

  if (!stats) return (
    <div className="p-8">
      <EmptyState icon={ShieldAlert} title="No Stats Available" description="Could not load platform statistics." />
    </div>
  )

  const firstName = user?.full_name?.split(' ')[0] || 'Admin'

  return (
    <div className="p-8 space-y-6 animate-enter">

      {/* Hello Admin banner */}
      <div className="relative overflow-hidden rounded-2xl p-7 bg-gradient-to-br from-blue-50 to-white border border-blue-100">
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-[10px] font-bold text-white uppercase tracking-widest font-sans">
              System Admin
            </span>
            <span className="text-xs text-blue-500 font-sans">{getGreeting()}</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-1 font-title">
            Hello Admin, <span className="text-blue-600">{firstName}</span> 🛡️
          </h2>
          <p className="text-sm text-slate-600 max-w-xl">
            You have full control over the TalentIQ platform. Monitor usage, manage users, and configure pricing from here.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"    value={stats.users.total}                  icon={Users}         color="#2563eb" />
        <StatCard label="CVs Processed"  value={stats.platform.total_candidates}    icon={FileText}      color="#f59e0b" />
        <StatCard label="AI Matchings"   value={stats.platform.total_matches}       icon={Zap}           color="#10b981" />
        <StatCard label="AI Chats"       value={stats.platform.total_chats}         icon={MessageSquare} color="#8b5cf6" />
      </div>

      {/* Chart + User breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-900 font-title">Platform Activity</h3>
              <p className="text-xs text-slate-500">New users & AI matches this week</p>
            </div>
            <span className="badge badge-blue">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={mockActivity} margin={{ top: 5, right: 0, bottom: 0, left: -30 }}>
              <defs>
                <linearGradient id="adminUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="adminMatches" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: '#64748b' }}
                itemStyle={{ color: '#0f172a' }}
              />
              <Area type="monotone" dataKey="users"   stroke="#2563eb" strokeWidth={2} fill="url(#adminUsers)"   name="New Users"  />
              <Area type="monotone" dataKey="matches" stroke="#10b981" strokeWidth={2} fill="url(#adminMatches)" name="AI Matches" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* User distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-900 font-title flex items-center gap-2">
            <Users size={15} className="text-blue-600" /> User Distribution
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Administrators', value: stats.users.admins,    color: '#2563eb', tag: 'ADM' },
              { label: 'Recruiters',     value: stats.users.recruiters, color: '#8b5cf6', tag: 'REC' },
            ].map(({ label, value, color, tag }) => (
              <div key={label} className="flex items-center justify-between p-4 rounded-xl border"
                style={{ background: `${color}08`, borderColor: `${color}20` }}>
                <div>
                  <p className="text-xl font-bold text-slate-900 font-title">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs font-sans"
                  style={{ background: `${color}15`, color }}>
                  {tag}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-sans">
              <span>Avg Match Score</span>
              <span className="text-emerald-600 font-bold">{stats.platform.avg_match_score}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${stats.platform.avg_match_score}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent users + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 font-title flex items-center gap-2">
              <Clock size={15} className="text-blue-600" /> Recently Joined
            </h3>
            <Link to="/admin/users" className="text-xs text-blue-600 hover:text-blue-700 transition-colors font-sans">
              View all →
            </Link>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-3 font-semibold font-sans">User</th>
                <th className="px-6 py-3 font-semibold font-sans">Role</th>
                <th className="px-6 py-3 font-semibold font-sans">Status</th>
                <th className="px-6 py-3 font-semibold font-sans">Joined</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {stats.recent_users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div>
                      <p className="font-semibold text-slate-900 font-title">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-sans ${
                      u.role === 'admin'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-violet-50 text-violet-700 border border-violet-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                      <span className="text-xs text-slate-500">{u.is_active ? 'Active' : 'Disabled'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-400 text-xs">{formatRelativeTime(u.joined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
          <h3 className="font-semibold text-slate-900 font-title mb-4">Quick Actions</h3>
          {[
            { label: 'Manage Users',        desc: 'Enable, disable, delete accounts',  to: '/admin/users',          color: '#2563eb' },
            { label: 'Subscriptions',        desc: 'Review all plan purchases',         to: '/admin/subscriptions',  color: '#7c3aed' },
            { label: 'Usage Analytics',      desc: 'See what users are doing',          to: '/admin/usage',          color: '#f59e0b' },
            { label: 'Pricing & Plans',      desc: 'Configure subscription tiers',      to: '/admin/pricing',        color: '#10b981' },
          ].map(({ label, desc, to, color }) => (
            <Link key={label} to={to}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors font-title">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
