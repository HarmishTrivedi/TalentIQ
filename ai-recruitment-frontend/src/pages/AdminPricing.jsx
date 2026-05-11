import React, { useEffect, useState } from 'react'
import { DollarSign, Plus, Pencil, Trash2, Check, X, Infinity } from 'lucide-react'
import { adminApi } from '../services/api'
import { Spinner, EmptyState, ConfirmationModal } from '../components/ui'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  name: '', price_monthly: 0, price_yearly: 0,
  max_candidates: 50, max_jobs: 10, max_ai_matches: 100, max_chat_sessions: 20,
  features: [], is_active: true,
}

export default function AdminPricing() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [featureInput, setFeatureInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [planToDelete, setPlanToDelete] = useState(null)

  const load = () => {
    setLoading(true)
    adminApi.getPricing()
      .then(res => setPlans(res.data.plans))
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew  = () => { setForm(EMPTY_FORM); setFeatureInput(''); setEditing('new') }
  const openEdit = (plan) => { setForm({ ...plan, features: [...plan.features] }); setFeatureInput(''); setEditing(plan) }

  const addFeature    = () => { if (!featureInput.trim()) return; setForm(f => ({ ...f, features: [...f.features, featureInput.trim()] })); setFeatureInput('') }
  const removeFeature = (i) => setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true)
    try {
      if (editing === 'new') {
        const res = await adminApi.createPlan(form)
        setPlans(p => [...p, res.data]); toast.success('Plan created')
      } else {
        const res = await adminApi.updatePlan(editing.id, form)
        setPlans(p => p.map(pl => pl.id === editing.id ? res.data : pl)); toast.success('Plan updated')
      }
      setEditing(null)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save plan') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!planToDelete) return
    try {
      await adminApi.deletePlan(planToDelete.id)
      setPlans(p => p.filter(pl => pl.id !== planToDelete.id))
      toast.success('Plan deleted'); setPlanToDelete(null)
    } catch { toast.error('Failed to delete plan') }
  }

  const displayLimit = (val) => val === -1 ? <Infinity size={13} className="inline" /> : val

  return (
    <div className="p-8 space-y-6 animate-enter">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-title" style={{ color: 'var(--text-primary)' }}>Pricing & Plans</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Manage subscription tiers and feature limits</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> New Plan
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : plans.length === 0 ? (
        <EmptyState icon={DollarSign} title="No plans yet" description="Create your first pricing plan." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {plans.map(plan => (
            <div key={plan.id} className="portal-card p-6 flex flex-col gap-4" style={!plan.is_active ? { opacity: 0.6 } : {}}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold font-title" style={{ color: 'var(--text-primary)' }}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold font-title" style={{ color: 'var(--accent-cyan)' }}>${plan.price_monthly}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/mo</span>
                    {plan.price_yearly > 0 && <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>(${plan.price_yearly}/yr)</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(plan)} className="p-2 rounded-lg transition-all" style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-cyan)'; e.currentTarget.style.background = 'var(--tag-bg)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setPlanToDelete(plan)} className="p-2 rounded-lg transition-all" style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--error-text)'; e.currentTarget.style.background = 'var(--error-bg)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[['Candidates', plan.max_candidates], ['Jobs', plan.max_jobs], ['AI Matches', plan.max_ai_matches], ['Chat Sessions', plan.max_chat_sessions]].map(([label, val]) => (
                  <div key={label} className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <p style={{ color: 'var(--text-muted)' }} className="mb-0.5">{label}</p>
                    <p className="font-bold font-title" style={{ color: 'var(--text-primary)' }}>{displayLimit(val)}</p>
                  </div>
                ))}
              </div>

              {plan.features.length > 0 && (
                <ul className="space-y-1.5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <Check size={12} className="flex-shrink-0" style={{ color: 'var(--success-text)' }} /> {f}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-auto pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md font-sans"
                  style={plan.is_active
                    ? { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }
                    : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                  }>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-lg rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto animate-scaleIn" style={{ background: 'var(--modal-bg)', border: '1px solid var(--border)' }}>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 font-title" style={{ color: 'var(--text-primary)' }}>
              <DollarSign style={{ color: 'var(--accent-cyan)' }} size={22} />
              {editing === 'new' ? 'Create Plan' : `Edit "${editing.name}"`}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 font-sans" style={{ color: 'var(--text-muted)' }}>Plan Name</label>
                  <input required type="text" className="input-field h-11" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 font-sans" style={{ color: 'var(--text-muted)' }}>Monthly Price ($)</label>
                  <input required type="number" min="0" step="0.01" className="input-field h-11" value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: parseFloat(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 font-sans" style={{ color: 'var(--text-muted)' }}>Yearly Price ($)</label>
                  <input required type="number" min="0" step="0.01" className="input-field h-11" value={form.price_yearly} onChange={e => setForm(f => ({ ...f, price_yearly: parseFloat(e.target.value) }))} />
                </div>
                {[['max_candidates','Max Candidates'],['max_jobs','Max Jobs'],['max_ai_matches','Max AI Matches'],['max_chat_sessions','Max Chat Sessions']].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 font-sans" style={{ color: 'var(--text-muted)' }}>{label} (-1 = ∞)</label>
                    <input required type="number" min="-1" className="input-field h-11" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value) }))} />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5 font-sans" style={{ color: 'var(--text-muted)' }}>Features</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" className="input-field h-10 flex-1 text-sm" placeholder="Add a feature..." value={featureInput}
                    onChange={e => setFeatureInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature() } }} />
                  <button type="button" onClick={addFeature} className="px-3 h-10 rounded-xl transition-all text-sm font-bold font-sans"
                    style={{ background: 'var(--tag-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--tag-border)' }}>Add</button>
                </div>
                <div className="space-y-1.5">
                  {form.features.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      <span>{f}</span>
                      <button type="button" onClick={() => removeFeature(i)} style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--error-text)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                <label htmlFor="is_active" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Plan is active (visible to users)</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-ghost flex-1 py-3">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 py-3 flex justify-center items-center gap-2">
                  {submitting ? <Spinner size={16} /> : <><Check size={15} /> Save Plan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!planToDelete}
        onClose={() => setPlanToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Pricing Plan"
        message={`Are you sure you want to delete the "${planToDelete?.name}" plan? This cannot be undone.`}
      />
    </div>
  )
}
