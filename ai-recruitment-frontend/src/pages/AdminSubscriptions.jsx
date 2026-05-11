import React, { useEffect, useState } from 'react'
import {
  CreditCard, CheckCircle, XCircle, Clock, DollarSign,
  Users, TrendingUp, Search, RefreshCw, ChevronDown, Check, X
} from 'lucide-react'
import { adminApi } from '../services/api'
import { Spinner, EmptyState } from '../components/ui'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  active:    { label: 'Active',    icon: CheckCircle, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending:   { label: 'Pending',   icon: Clock,       cls: 'bg-amber-50  text-amber-700  border-amber-200'  },
  cancelled: { label: 'Cancelled', icon: XCircle,     cls: 'bg-red-50    text-red-600    border-red-200'    },
}

const PLAN_COLORS = {
  free:       '#64748b',
  pro:        '#2563eb',
  enterprise: '#7c3aed',
}

function SummaryCard({ label, value, icon: Icon, color, prefix = '' }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}12` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 font-title">{prefix}{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function AdminSubscriptions() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')   // all | active | pending | cancelled
  const [updating, setUpdating] = useState(null)  // sub id being updated

  const load = () => {
    setLoading(true)
    adminApi.getSubscriptions()
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load subscriptions'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleStatus = async (sub, newStatus) => {
    setUpdating(sub.id)
    try {
      await adminApi.updateSubscription(sub.id, newStatus)
      setData(prev => ({
        ...prev,
        subscriptions: prev.subscriptions.map(s =>
          s.id === sub.id ? { ...s, status: newStatus } : s
        ),
        summary: recalcSummary(
          prev.subscriptions.map(s => s.id === sub.id ? { ...s, status: newStatus } : s)
        ),
      }))
      toast.success(`Subscription ${newStatus}`)
    } catch { toast.error('Failed to update') }
    finally { setUpdating(null) }
  }

  const recalcSummary = (subs) => ({
    total:         subs.length,
    active:        subs.filter(s => s.status === 'active').length,
    pending:       subs.filter(s => s.status === 'pending').length,
    cancelled:     subs.filter(s => s.status === 'cancelled').length,
    total_revenue: subs.filter(s => s.status === 'active').reduce((a, s) => a + s.price, 0),
  })

  const subs = (data?.subscriptions || []).filter(s => {
    const matchSearch =
      s.user_name.toLowerCase().includes(search.toLowerCase()) ||
      s.user_email.toLowerCase().includes(search.toLowerCase()) ||
      s.plan_name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || s.status === filter
    return matchSearch && matchFilter
  })

  const summary = data?.summary || {}

  return (
    <div className="p-8 space-y-6 animate-enter">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-title">Subscription Entries</h1>
          <p className="text-sm text-slate-500 mt-1">
            All plan purchases — review, approve or cancel subscriptions
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium font-sans transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard label="Total Subscriptions" value={summary.total    ?? '—'} icon={CreditCard}  color="#2563eb" />
        <SummaryCard label="Active"               value={summary.active   ?? '—'} icon={CheckCircle} color="#10b981" />
        <SummaryCard label="Pending Approval"     value={summary.pending  ?? '—'} icon={Clock}       color="#f59e0b" />
        <SummaryCard label="Cancelled"            value={summary.cancelled ?? '—'} icon={XCircle}    color="#ef4444" />
        <SummaryCard label="Total Revenue"        value={summary.total_revenue != null ? summary.total_revenue.toFixed(2) : '—'} icon={DollarSign} color="#7c3aed" prefix="$" />
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or plan..."
            className="input-field pl-11 h-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'pending', 'cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider font-sans transition-all border ${
                filter === f
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex justify-center"><Spinner size={32} /></div>
        ) : subs.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No subscriptions found"
            description={filter !== 'all' ? `No ${filter} subscriptions match your search.` : 'No one has subscribed to a plan yet.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider font-sans">Customer</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider font-sans">Plan</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider font-sans">Billing</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider font-sans">Amount</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider font-sans">Limits</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider font-sans">Status</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider font-sans">Date</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider font-sans text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subs.map(sub => {
                  const statusCfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending
                  const StatusIcon = statusCfg.icon
                  const planColor = PLAN_COLORS[sub.plan_id] || '#2563eb'
                  const isUpdating = updating === sub.id

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">

                      {/* Customer */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm font-title flex-shrink-0">
                            {sub.user_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm font-title">{sub.user_name}</p>
                            <p className="text-xs text-slate-400">{sub.user_email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: planColor }} />
                          <span className="font-bold text-slate-900 text-sm font-title">{sub.plan_name}</span>
                        </div>
                        {sub.features?.length > 0 && (
                          <p className="text-[11px] text-slate-400 mt-0.5 max-w-[160px] truncate">
                            {sub.features.slice(0, 2).join(' · ')}
                          </p>
                        )}
                      </td>

                      {/* Billing cycle */}
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-sans border ${
                          sub.billing_cycle === 'yearly'
                            ? 'bg-violet-50 text-violet-700 border-violet-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {sub.billing_cycle}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 font-title">
                          {sub.price === 0 ? (
                            <span className="text-emerald-600">Free</span>
                          ) : (
                            <>${sub.price.toFixed(2)}</>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          /{sub.billing_cycle === 'yearly' ? 'yr' : 'mo'}
                        </p>
                      </td>

                      {/* Limits */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5 text-[11px] text-slate-500">
                          <div className="flex gap-1">
                            <span className="text-slate-400">CVs:</span>
                            <span className="font-semibold text-slate-700">{sub.max_candidates === -1 ? '∞' : sub.max_candidates}</span>
                          </div>
                          <div className="flex gap-1">
                            <span className="text-slate-400">Jobs:</span>
                            <span className="font-semibold text-slate-700">{sub.max_jobs === -1 ? '∞' : sub.max_jobs}</span>
                          </div>
                          <div className="flex gap-1">
                            <span className="text-slate-400">Matches:</span>
                            <span className="font-semibold text-slate-700">{sub.max_ai_matches === -1 ? '∞' : sub.max_ai_matches}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border font-sans ${statusCfg.cls}`}>
                          <StatusIcon size={11} />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(sub.subscribed_at).toLocaleDateString('en-US', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                        <br />
                        <span className="text-slate-300">
                          {new Date(sub.subscribed_at).toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {isUpdating ? (
                          <Spinner size={18} />
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {sub.status !== 'active' && (
                              <button
                                onClick={() => handleStatus(sub, 'active')}
                                title="Approve"
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold font-sans transition-all"
                              >
                                <Check size={12} /> Approve
                              </button>
                            )}
                            {sub.status !== 'cancelled' && (
                              <button
                                onClick={() => handleStatus(sub, 'cancelled')}
                                title="Cancel"
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-bold font-sans transition-all"
                              >
                                <X size={12} /> Cancel
                              </button>
                            )}
                            {sub.status === 'cancelled' && (
                              <button
                                onClick={() => handleStatus(sub, 'pending')}
                                title="Reopen"
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold font-sans transition-all"
                              >
                                <RefreshCw size={12} /> Reopen
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && subs.length > 0 && (
        <p className="text-xs text-slate-400 text-right font-sans">
          Showing {subs.length} of {data?.subscriptions?.length ?? 0} entries
        </p>
      )}
    </div>
  )
}
