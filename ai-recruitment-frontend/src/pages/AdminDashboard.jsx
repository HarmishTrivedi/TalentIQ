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
    <div className="page-enter bg-surface">
      
      {/* Platform Status Banner */}
      <div className="portal-card mb-8 p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-br from-primary to-primary-container border-none shadow-2xl relative overflow-hidden group">
        <div className="relative z-10 flex items-center gap-6">
           <div className="w-16 h-16 rounded-[22px] bg-white/10 flex items-center justify-center text-white backdrop-blur-md shadow-xl transition-transform group-hover:scale-105">
              <ShieldAlert size={32} />
           </div>
           <div>
              <div className="flex items-center gap-2 mb-1">
                 <span className="px-2 py-0.5 rounded bg-white/20 text-[9px] font-black text-white uppercase tracking-[0.2em]">Master Access</span>
                 <span className="text-xs text-white/70 font-bold">{getGreeting()}</span>
              </div>
              <h2 className="text-3xl font-black text-white leading-tight">Control Node: {firstName}</h2>
              <p className="text-sm text-on-primary-container opacity-80 font-medium leading-relaxed max-w-lg mt-1">
                 Oversee global platform operations, monitor computational usage, and manage organizational access levels.
              </p>
           </div>
        </div>
        <div className="absolute -right-12 -bottom-12 text-white opacity-[0.03] group-hover:scale-110 transition-transform duration-700 pointer-events-none">
           <Zap size={240} />
        </div>
      </div>

      {/* Primary KPI Matrix */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="kpi-card">
           <span className="text-[10px] font-black uppercase tracking-widest text-outline">Compute Users</span>
           <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-display text-on-surface">{stats.users.total}</span>
              <span className="text-[10px] font-bold text-tertiary">↑ 12%</span>
           </div>
           <Users size={16} className="absolute right-4 bottom-4 text-primary opacity-20" />
        </div>
        <div className="kpi-card">
           <span className="text-[10px] font-black uppercase tracking-widest text-outline">Resumes Vectorized</span>
           <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-display text-on-surface">{stats.platform.total_candidates}</span>
              <span className="text-[10px] font-bold text-tertiary">↑ 8%</span>
           </div>
           <FileText size={16} className="absolute right-4 bottom-4 text-primary opacity-20" />
        </div>
        <div className="kpi-card">
           <span className="text-[10px] font-black uppercase tracking-widest text-outline">Intelligence Matches</span>
           <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-display text-on-surface">{stats.platform.total_matches}</span>
              <span className="text-[10px] font-bold text-tertiary">↑ 24%</span>
           </div>
           <Zap size={16} className="absolute right-4 bottom-4 text-primary opacity-20" />
        </div>
        <div className="kpi-card">
           <span className="text-[10px] font-black uppercase tracking-widest text-outline">AI Session Hours</span>
           <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-display text-on-surface">{stats.platform.total_chats}</span>
              <span className="text-[10px] font-bold text-primary">Live</span>
           </div>
           <MessageSquare size={16} className="absolute right-4 bottom-4 text-primary opacity-20" />
        </div>
      </div>

      {/* Analytics & Distribution Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Activity Stream Visualizer */}
        <div className="lg:col-span-2 portal-card p-8 bg-surface-container-lowest shadow-lg">
          <div className="flex items-center justify-between mb-8 border-b border-outline-variant/30 pb-4">
            <div>
              <h3 className="text-lg font-bold text-on-surface uppercase tracking-tight">Platform Velocity</h3>
              <p className="text-xs text-outline font-medium">Weekly telemetry across core metrics</p>
            </div>
            <div className="flex gap-2">
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> <span className="text-[10px] font-black uppercase text-outline">Users</span></div>
               <div className="flex items-center gap-1.5 ml-3"><div className="w-2 h-2 rounded-full bg-tertiary" /> <span className="text-[10px] font-black uppercase text-outline">Matches</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={mockActivity} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#004ac6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#004ac6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#006058" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#006058" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill: '#737686', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#737686', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #c3c6d7', borderRadius: 16, fontSize: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="users"   stroke="#004ac6" strokeWidth={3} fill="url(#colorUsers)"   name="New Users"  />
              <Area type="monotone" dataKey="matches" stroke="#006058" strokeWidth={3} fill="url(#colorMatches)" name="AI Events" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Access Distribution */}
        <div className="portal-card p-8 bg-surface-container-low shadow-lg border-dashed">
          <h3 className="text-lg font-bold text-on-surface uppercase tracking-tight mb-8 border-b border-outline-variant/30 pb-4">Access Distribution</h3>
          <div className="space-y-4">
            {[
              { label: 'Administrators', value: stats.users.admins,    color: '#004ac6', tag: 'SYS' },
              { label: 'Recruiters',     value: stats.users.recruiters, color: '#4b41e1', tag: 'CORP' },
            ].map(({ label, value, color, tag }) => (
              <div key={label} className="flex items-center justify-between p-5 rounded-[22px] bg-surface-container-lowest border border-outline-variant/50 shadow-sm transition-transform hover:scale-[1.02]">
                <div>
                  <p className="text-2xl font-black font-display leading-none mb-1" style={{ color }}>{value}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-outline">{label}</p>
                </div>
                <div className="w-10 h-10 rounded-[14px] flex items-center justify-center font-black text-[10px] tracking-widest text-white shadow-md"
                  style={{ background: color }}>
                  {tag}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-6 border-t border-outline-variant/30">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-3">
              <span>Average Match Precision</span>
              <span className="text-tertiary">{stats.platform.avg_match_score}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-container-highest shadow-inner overflow-hidden">
              <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${stats.platform.avg_match_score}%` }}
                 className="h-full rounded-full bg-tertiary shadow-glow" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Ingress + Operational Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Ingress Table */}
        <div className="lg:col-span-2 portal-card overflow-hidden shadow-xl border-outline-variant/60">
          <div className="px-8 py-6 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-primary" />
              <h3 className="text-lg font-bold text-on-surface">Data Ingress Log</h3>
            </div>
            <Link to="/admin/users" className="btn-secondary py-1.5 px-4 text-xs font-bold shadow-sm flex items-center gap-2">
              <span>Full Manifest</span>
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
             <table className="stitch-table">
               <thead>
                 <tr>
                   <th>Identity Context</th>
                   <th>Access Role</th>
                   <th>Status</th>
                   <th className="text-right">Ingress Date</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-outline-variant">
                 {stats.recent_users.map(u => (
                   <tr key={u.id} className="group hover:bg-surface-container-low transition-colors cursor-default">
                     <td className="py-4">
                       <div>
                         <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors leading-tight">{u.name}</p>
                         <p className="text-[11px] font-medium text-outline truncate mt-0.5">{u.email}</p>
                       </div>
                     </td>
                     <td className="py-4">
                       <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest", 
                         u.role === 'admin' ? "bg-primary/5 text-primary border-primary/20" : "bg-surface-container-high text-outline border-outline-variant"
                       )}>
                         {u.role}
                       </span>
                     </td>
                     <td className="py-4">
                       <div className="flex items-center gap-2">
                         <div className={cn("w-1.5 h-1.5 rounded-full", u.is_active ? "bg-tertiary shadow-glow" : "bg-error")} />
                         <span className="text-[10px] font-black uppercase tracking-widest text-outline">{u.is_active ? 'Authenticated' : 'Revoked'}</span>
                       </div>
                     </td>
                     <td className="py-4 text-right">
                        <span className="text-[11px] font-bold text-outline uppercase tracking-wider">{formatRelativeTime(u.joined)}</span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>

        {/* Control Center Actions */}
        <div className="portal-card p-8 bg-surface-container-lowest shadow-xl border-outline-variant/60">
          <h3 className="text-lg font-bold text-on-surface uppercase tracking-tight mb-8 border-b border-outline-variant/30 pb-4">Architectural Controls</h3>
          <div className="space-y-3">
            {[
              { label: 'Control Access Nodes',  desc: 'Authenticate & revoke credentials',  to: '/admin/users',          icon: ShieldAlert, color: '#004ac6' },
              { label: 'Financial Matrix',      desc: 'Review compute subscription logs',  to: '/admin/subscriptions',  icon: TrendingUp,  color: '#4b41e1' },
              { label: 'Compute Analytics',     desc: 'Global computational telemetry',    to: '/admin/usage',          icon: Activity,    color: '#006058' },
              { label: 'Service Packaging',     desc: 'Configure intelligence tiers',      to: '/admin/pricing',        icon: DollarSign,  color: '#006058' },
            ].map(({ label, desc, to, icon: Icon, color }) => (
              <Link key={label} to={to}
                className="flex items-start gap-4 p-4 rounded-2xl bg-surface-container-low border border-transparent hover:border-primary/40 hover:bg-white transition-all group shadow-sm">
                <div className="w-10 h-10 rounded-[14px] bg-white border border-outline-variant flex items-center justify-center shrink-0 text-primary shadow-inner group-hover:scale-110 transition-transform">
                   <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors leading-tight mb-1">{label}</p>
                  <p className="text-[10px] font-medium text-outline leading-tight">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
