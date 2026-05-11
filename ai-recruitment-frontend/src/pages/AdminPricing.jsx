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
          <h1 className="text-2xl font-bold text-slate-900 font-title">Pricing & Plans</h1>
          <p className="text-sm text-slate-500 mt-1">Manage subscription tiers and feature limits</p>
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
            <div key={plan.id} className={`bg-white rounded-2xl border p-6 flex flex-col gap-4 shadow-sm transition-all ${plan.is_active ? 'border-slate-200 hover:border-blue-200 hover:shadow-card' : 'border-slate-100 opacity-60'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-title">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-blue-600 font-title">${plan.price_monthly}</span>
                    <span className="text-xs text-slate-400">/mo</span>
                    {plan.price_yearly > 0 && <span className="text-xs text-slate-400 ml-2">(${plan.price_yearly}/yr)</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(plan)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Pencil size={14} /></button>
                  <button onClick={() => setPlanToDelete(plan)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[['Candidates', plan.max_candidates], ['Jobs', plan.max_jobs], ['AI Matches', plan.max_ai_matches], ['Chat Sessions', plan.max_chat_sessions]].map(([label, val]) => (
                  <div key={label} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    <p className="text-slate-400 mb-0.5">{label}</p>
                    <p className="font-bold text-slate-900 font-title">{displayLimit(val)}</p>
                  </div>
                ))}
              </div>

              {plan.features.length > 0 && (
                <ul className="space-y-1.5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <Check size={12} className="text-emerald-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-auto pt-3 border-t border-slate-100">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md font-sans ${plan.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
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
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto animate-scaleIn">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 font-title">
              <DollarSign className="text-blue-600" size={22} />
              {editing === 'new' ? 'Create Plan' : `Edit "${editing.name}"`}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Plan Name</label>
                  <input required type="text" className="input-field h-11" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Monthly Price ($)</label>
                  <input required type="number" min="0" step="0.01" className="input-field h-11" value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: parseFloat(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Yearly Price ($)</label>
                  <input required type="number" min="0" step="0.01" className="input-field h-11" value={form.price_yearly} onChange={e => setForm(f => ({ ...f, price_yearly: parseFloat(e.target.value) }))} />
                </div>
                {[['max_candidates','Max Candidates'],['max_jobs','Max Jobs'],['max_ai_matches','Max AI Matches'],['max_chat_sessions','Max Chat Sessions']].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">{label} (-1 = ∞)</label>
                    <input required type="number" min="-1" className="input-field h-11" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value) }))} />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Features</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" className="input-field h-10 flex-1 text-sm" placeholder="Add a feature..." value={featureInput}
                    onChange={e => setFeatureInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature() } }} />
                  <button type="button" onClick={addFeature} className="px-3 h-10 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all text-sm font-bold font-sans">Add</button>
                </div>
                <div className="space-y-1.5">
                  {form.features.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-700 border border-slate-100">
                      <span>{f}</span>
                      <button type="button" onClick={() => removeFeature(i)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                <label htmlFor="is_active" className="text-sm text-slate-600">Plan is active (visible to users)</label>
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
