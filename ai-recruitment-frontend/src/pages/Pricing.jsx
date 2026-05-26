import React from 'react'
import { Check, Sparkles, Zap, Crown, Rocket, Star } from 'lucide-react'
import toast from 'react-hot-toast'

const PLANS = [
  {
    name: 'Free Beta',
    price: '$0',
    period: 'forever',
    description: 'Currently active — all features unlocked during beta',
    icon: Sparkles,
    color: 'from-blue-500 to-cyan-500',
    features: [
      'Unlimited CV uploads',
      'AI-powered resume parsing',
      'Smart candidate matching',
      'Job description generator',
      'AI recruiter copilot chat',
      'Advanced analytics dashboard',
      'Interview question generator',
      'Bulk CV upload',
      'Vector search & semantic matching',
      'Full API access',
    ],
    badge: 'Active Now',
    badgeColor: 'bg-emerald-500',
    current: true,
  },
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    description: 'Perfect for small teams and startups',
    icon: Zap,
    color: 'from-violet-500 to-purple-500',
    features: [
      'Up to 100 candidates',
      'Up to 10 active jobs',
      'AI resume parsing',
      'Basic matching algorithm',
      'Email support',
      '5 GB storage',
    ],
    badge: 'Coming Soon',
    badgeColor: 'bg-violet-500',
  },
  {
    name: 'Professional',
    price: '$149',
    period: '/month',
    description: 'For growing recruitment teams',
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    features: [
      'Up to 500 candidates',
      'Up to 50 active jobs',
      'Advanced AI matching',
      'Bulk upload (50 CVs at once)',
      'Priority support',
      'Custom branding',
      '50 GB storage',
      'Team collaboration',
      'Advanced analytics',
    ],
    badge: 'Most Popular',
    badgeColor: 'bg-amber-500',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with custom needs',
    icon: Rocket,
    color: 'from-pink-500 to-rose-500',
    features: [
      'Unlimited candidates',
      'Unlimited jobs',
      'White-label solution',
      'Dedicated account manager',
      'Custom AI training',
      'On-premise deployment option',
      'Unlimited storage',
      'SLA guarantee',
      'Custom integrations',
      'Advanced security',
    ],
    badge: 'Contact Sales',
    badgeColor: 'bg-pink-500',
  },
]

export default function Pricing() {
  const contactSales = () => {
    window.location.href = 'mailto:sales@talentiq.ai?subject=TalentIQ%20Enterprise%20Pricing'
  }

  const handlePlanAction = (plan) => {
    if (plan.name === 'Enterprise') {
      contactSales()
      return
    }
    toast('Paid plans will be available after the free beta.')
  }

  return (
    <div className="p-6 page-enter">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
            <Star size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-cyan)' }}>
              Pricing Plans
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
            Choose Your Plan
          </h1>
          <p className="text-base max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Currently in free beta — all features unlocked. Future pricing will be announced before launch.
          </p>
        </div>

        {/* Beta notice */}
        <div className="mb-8 p-6 rounded-3xl text-center"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1))', border: '1px solid rgba(16,185,129,0.3)' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles size={20} style={{ color: '#10b981' }} />
            <h3 className="text-lg font-bold" style={{ color: '#10b981', fontFamily: 'Inter, sans-serif' }}>
              Free Beta Access
            </h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            You're currently enjoying full platform access at no cost. All premium features are unlocked during our beta period.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {PLANS.map((plan, i) => (
            <div
              key={i}
              className="rounded-3xl p-6 transition-all relative overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: plan.current ? '2px solid var(--accent-cyan)' : plan.popular ? '2px solid #f59e0b' : '1px solid var(--border)',
                boxShadow: plan.current ? '0 0 40px rgba(103,232,249,0.2)' : plan.popular ? '0 0 40px rgba(245,158,11,0.15)' : 'none',
              }}
            >
              {/* Badge */}
              <div className="absolute top-4 right-4">
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold text-white ${plan.badgeColor}`}>
                  {plan.badge}
                </span>
              </div>

              {/* Icon */}
              <div className="mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${plan.color.split(' ')[1]}, ${plan.color.split(' ')[3]})` }}
                >
                  <plan.icon size={24} className="text-white" />
                </div>
              </div>

              {/* Name & description */}
              <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                {plan.name}
              </h3>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                {plan.description}
              </p>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {plan.period}
                    </span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: plan.current ? 'var(--accent-cyan)' : 'var(--success-text)' }} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handlePlanAction(plan)}
                disabled={plan.current}
                className="w-full h-11 rounded-2xl font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={plan.current
                  ? { background: 'var(--accent-cyan)', color: '#000' }
                  : plan.popular
                  ? { background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff' }
                  : { background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
                }
              >
                {plan.current ? 'Current Plan' : plan.name === 'Enterprise' ? 'Contact Sales' : 'Coming Soon'}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'How long will the free beta last?',
                a: 'The free beta will continue until we officially launch. All beta users will be notified at least 30 days before any pricing changes.',
              },
              {
                q: 'Will my data be preserved after beta?',
                a: 'Yes! All your candidates, jobs, and match data will be preserved. You can choose a paid plan or export your data.',
              },
              {
                q: 'Can I upgrade or downgrade plans?',
                a: 'Once launched, you can upgrade or downgrade at any time. Changes will be reflected in your next billing cycle.',
              },
              {
                q: 'Do you offer discounts for annual billing?',
                a: 'Yes, annual plans will receive a 20% discount compared to monthly billing.',
              },
            ].map(({ q, a }, i) => (
              <div key={i} className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                  {q}
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mt-12 text-center p-8 rounded-3xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
            Need a custom solution?
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Contact our sales team for enterprise pricing and custom features.
          </p>
          <button onClick={contactSales} className="btn-primary px-8 h-11">
            <Rocket size={16} /> Contact Sales
          </button>
        </div>
      </div>
    </div>
  )
}
