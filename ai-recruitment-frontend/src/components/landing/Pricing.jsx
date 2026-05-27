import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Zap, Infinity, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BASE_URL, API_BASE } from '../../services/api'

const GRADIENTS = [
  'from-slate-500 to-slate-600',
  'from-blue-500 to-violet-600',
  'from-violet-500 to-purple-600',
]

function displayLimit(val) {
  if (val === -1) return <span className="flex items-center gap-1"><Infinity size={12} /> Unlimited</span>
  return val
}

export function Pricing() {
  const [plans, setPlans] = useState([])
  const [cycle, setCycle] = useState('monthly')

  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/admin/pricing`)
      .then(r => r.json())
      .then(data => setPlans((data.plans || []).filter(p => p.is_active)))
      .catch(() => {})
  }, [])

  if (plans.length === 0) return null

  return (
    <section id="pricing" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-2xl text-center mb-16"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-white/60">
            Pricing
          </div>
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl">
            Simple, <span className="text-gradient">transparent</span> pricing.
          </h2>
          <p className="mt-5 text-white/60">Choose the plan that fits your hiring needs.</p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className="text-sm font-semibold" style={{ color: cycle === 'monthly' ? '#fff' : 'rgba(255,255,255,0.4)' }}>Monthly</span>
            <button
              onClick={() => setCycle(c => c === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-12 h-6 rounded-full transition-all"
              style={{ background: cycle === 'yearly' ? '#65F7FF' : 'rgba(255,255,255,0.15)' }}
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: cycle === 'yearly' ? '1.5rem' : '0.125rem' }} />
            </button>
            <span className="text-sm font-semibold" style={{ color: cycle === 'yearly' ? '#fff' : 'rgba(255,255,255,0.4)' }}>
              Yearly
              <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Save 20%</span>
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => {
            const price = cycle === 'yearly' ? plan.price_yearly : plan.price_monthly
            const isFree = plan.price_monthly === 0
            const isPopular = i === 1

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="relative glass-strong rounded-3xl p-6 flex flex-col"
                style={isPopular ? { border: '1px solid rgba(101,247,255,0.4)', boxShadow: '0 0 40px rgba(101,247,255,0.1)' } : {}}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-black" style={{ background: '#65F7FF' }}>
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center`}>
                      <Zap size={16} className="text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white font-display">{plan.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold font-display" style={{ color: isFree ? '#6ee7b7' : '#65F7FF' }}>
                      {isFree ? 'Free' : `$${price}`}
                    </span>
                    {!isFree && <span className="text-sm text-white/40">/{cycle === 'yearly' ? 'yr' : 'mo'}</span>}
                  </div>
                  {!isFree && cycle === 'yearly' && (
                    <p className="text-xs text-emerald-400 font-semibold mt-1">
                      Save ${((plan.price_monthly * 12) - plan.price_yearly).toFixed(0)} vs monthly
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-5">
                  {[['CVs', plan.max_candidates], ['Jobs', plan.max_jobs], ['Matches', plan.max_ai_matches], ['Chats', plan.max_chat_sessions]].map(([label, val]) => (
                    <div key={label} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-bold text-white mt-0.5">{displayLimit(val)}</p>
                    </div>
                  ))}
                </div>

                {plan.features?.length > 0 && (
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2 text-sm text-white/60">
                        <Check size={14} className="flex-shrink-0 mt-0.5 text-emerald-400" />{f}
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  to="/register"
                  className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all mt-auto"
                  style={isPopular
                    ? { background: '#65F7FF', color: '#000' }
                    : isFree
                    ? { background: 'rgba(110,231,183,0.15)', color: '#6ee7b7', border: '1px solid rgba(110,231,183,0.3)' }
                    : { background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }
                  }
                >
                  {isFree ? <><Check size={15} /> Get Started Free</> : <>Get {plan.name} <ArrowRight size={14} /></>}
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
