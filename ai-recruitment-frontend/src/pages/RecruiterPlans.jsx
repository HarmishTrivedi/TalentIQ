import React, { useEffect, useState } from 'react'
import { Check, Zap, Infinity, ArrowRight, Sparkles } from 'lucide-react'
import { adminApi } from '../services/api'
import { Spinner } from '../components/ui'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

function displayLimit(val) {
  if (val === -1) return <span className="flex items-center gap-1"><Infinity size={13} /> Unlimited</span>
  return val
}

const PLAN_META = {
  free:       { gradient: 'from-slate-500 to-slate-600',   popular: false, badge: null },
  pro:        { gradient: 'from-blue-500 to-violet-600',   popular: true,  badge: 'Most Popular' },
  enterprise: { gradient: 'from-violet-500 to-purple-600', popular: false, badge: 'Best Value' },
}

export default function RecruiterPlans() {
  const [plans, setPlans]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [subscribing, setSubscribing] = useState(null)
  const [cycle, setCycle]             = useState('monthly')
  const { user } = useAuthStore()

  useEffect(() => {
    adminApi.getPricing()
      .then(res => setPlans(res.data.plans.filter(p => p.is_active)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSubscribe = async (plan) => {
    if (plan.price_monthly === 0) { toast.success(`You're already on the ${plan.name} plan — it's free!`); return }
    setSubscribing(plan.id)
    try {
      await adminApi.subscribe({ plan_id: plan.id, billing_cycle: cycle })
      toast.success(`Subscribed to ${plan.name}! Your request is pending approval.`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to subscribe')
    } finally { setSubscribing(null) }
  }

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size={32} /></div>

  return (
    <div className="p-8 space-y-8 animate-enter" style={{ minHeight: '100%' }}>

      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4" style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)', color: 'var(--accent-cyan)' }}>
          <Sparkles size={12} /> Pricing Plans
        </div>
        <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>Choose your plan</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          All plans include AI-powered CV parsing, job matching, and screening chat.{' '}
          <span className="font-semibold" style={{ color: 'var(--success-text)' }}>Currently free during beta.</span>
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-sm font-semibold" style={{ color: cycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-muted)' }}>Monthly</span>
        <button
          onClick={() => setCycle(c => c === 'monthly' ? 'yearly' : 'monthly')}
          className="relative w-12 h-6 rounded-full transition-all"
          style={{ background: cycle === 'yearly' ? 'var(--accent-cyan)' : 'var(--border)' }}
        >
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: cycle === 'yearly' ? '1.5rem' : '0.125rem' }} />
        </button>
        <span className="text-sm font-semibold" style={{ color: cycle === 'yearly' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          Yearly
          <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-xs font-bold" style={{ background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }}>Save 20%</span>
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map(plan => {
          const meta    = PLAN_META[plan.id] || PLAN_META.free
          const price   = cycle === 'yearly' ? plan.price_yearly : plan.price_monthly
          const isFree  = plan.price_monthly === 0
          const isLoading = subscribing === plan.id

          return (
            <div
              key={plan.id}
              className="relative portal-card p-6 flex flex-col"
              style={meta.popular ? { borderColor: 'var(--accent-cyan)', boxShadow: 'var(--shadow-card), var(--shadow-glow)' } : {}}
            >
              {meta.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-black" style={{ background: 'var(--accent-cyan)' }}>
                    {meta.badge}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
                    <Zap size={16} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{plan.name}</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold" style={{ color: isFree ? 'var(--success-text)' : 'var(--accent-cyan)', fontFamily: 'Inter, sans-serif' }}>
                    {isFree ? 'Free' : `$${price}`}
                  </span>
                  {!isFree && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>/{cycle === 'yearly' ? 'yr' : 'mo'}</span>}
                </div>
                {!isFree && cycle === 'yearly' && (
                  <p className="text-xs font-semibold mt-1" style={{ color: 'var(--success-text)' }}>
                    Save ${((plan.price_monthly * 12) - plan.price_yearly).toFixed(0)} vs monthly
                  </p>
                )}
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                {[['CVs', plan.max_candidates], ['Jobs', plan.max_jobs], ['Matches', plan.max_ai_matches], ['Chats', plan.max_chat_sessions]].map(([label, val]) => (
                  <div key={label} className="rounded-xl px-3 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{displayLimit(val)}</p>
                  </div>
                ))}
              </div>

              {/* Features */}
              {plan.features?.length > 0 && (
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success-text)' }} />{f}
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={isLoading}
                className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all mt-auto"
                style={meta.popular
                  ? { background: 'var(--accent-cyan)', color: '#000' }
                  : isFree
                  ? { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }
                  : { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
                }
              >
                {isLoading ? <Spinner size={16} /> : isFree ? <><Check size={15} /> Current Plan</> : <>Get {plan.name} <ArrowRight size={14} /></>}
              </button>
            </div>
          )
        })}
      </div>

      <div className="max-w-xl mx-auto text-center">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          🎉 All plans are <strong style={{ color: 'var(--text-secondary)' }}>free during beta</strong>. Paid plans will activate when we launch publicly. No credit card required.
        </p>
      </div>
    </div>
  )
}
