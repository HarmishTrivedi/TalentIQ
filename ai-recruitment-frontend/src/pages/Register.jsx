import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, Eye, EyeOff, Lock, Mail, RefreshCw,
  User, Building2, Briefcase, Sparkles, AlertCircle, Check, X, BarChart3, Target, ShieldCheck
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../utils/helpers'
import { gsap } from 'gsap'
import { useAuthStore } from '../store'
import { Spinner } from '../components/ui'
import { BrandMark, GlassPanel, PremiumButton } from '../components/premium/PremiumUI'
import { BASE_URL, API_BASE } from '../services/api'
import toast from 'react-hot-toast'

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
const PHONE_RE = /^(\+?\d{1,4}[\s\-]?)?(\(?\d{1,4}\)?[\s\-]?)?\d{3,4}[\s\-]?\d{3,4}([\s\-]?\d{1,4})?$/

const ROLE_OPTIONS = [
  'HR Manager',
  'Technical Recruiter',
  'Talent Acquisition Specialist',
  'Hiring Manager',
  'Founder / Co-Founder',
  'People Operations Lead',
  'Recruitment Consultant',
  'Other',
]

const PW_RULES = [
  { key: 'len',   label: 'At least 8 characters',   test: pw => pw.length >= 8 },
  { key: 'upper', label: '1 uppercase letter (A–Z)', test: pw => /[A-Z]/.test(pw) },
  { key: 'num',   label: '1 number (0–9)',           test: pw => /[0-9]/.test(pw) },
  { key: 'sym',   label: '1 symbol (!@#$…)',         test: pw => /[^A-Za-z0-9]/.test(pw) },
]

function validate(name, value, form) {
  switch (name) {
    case 'full_name':
      if (!value.trim()) return 'Full name is required'
      if (value.trim().length < 2) return 'Name must be at least 2 characters'
      if (!/^[a-zA-Z\s'\-\.]+$/.test(value.trim())) return 'Letters, spaces, hyphens and apostrophes only'
      return ''
    case 'email':
      if (!value.trim()) return 'Email is required'
      if (!EMAIL_RE.test(value.trim())) return 'Enter a valid email address'
      return ''
    case 'company_name':
      if (!value.trim()) return 'Company name is required'
      if (value.trim().length < 2) return 'Must be at least 2 characters'
      return ''
    case 'role_in_company':
      if (!value.trim()) return 'Your role is required'
      return ''
    case 'phone':
      if (value && !PHONE_RE.test(value.trim())) return 'Enter a valid phone number'
      return ''
    case 'password':
      if (!value) return 'Password is required'
      if (value.length < 8) return 'At least 8 characters required'
      if (!/[A-Z]/.test(value)) return 'Include at least one uppercase letter'
      if (!/[0-9]/.test(value)) return 'Include at least one number'
      return ''
    case 'confirm_password':
      if (!value) return 'Please confirm your password'
      if (value !== form.password) return 'Passwords do not match'
      return ''
    default:
      return ''
  }
}

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' }
  if (score <= 2) return { score, label: 'Fair', color: '#f97316' }
  if (score <= 3) return { score, label: 'Good', color: '#eab308' }
  if (score <= 4) return { score, label: 'Strong', color: '#22c55e' }
  return { score, label: 'Very Strong', color: '#06b6d4' }
}

function Field({ icon: Icon, label, error, touched, required, isPassword = false, children }) {
  const hasError = touched && error
  const isValid = touched && !error
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
        {required && <span className="text-cyan-400">*</span>}
      </label>
      <div className="relative">
        <Icon
          size={14}
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${
            hasError ? 'text-red-400' : isValid ? 'text-emerald-400' : 'text-slate-500'
          }`}
        />
        {children}
        {!isPassword && hasError && (
          <AlertCircle size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none" />
        )}
        {!isPassword && isValid && (
          <Check size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
        )}
      </div>
      {hasError && (
        <p className="flex items-center gap-1 text-[11px] text-red-400">
          <X size={10} className="shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

function inputCls(touched, error, extra = '') {
  const base = `w-full h-11 rounded-xl pl-9 text-sm text-white outline-none transition-all duration-200
    bg-white/[0.04] border placeholder:text-slate-600
    focus:bg-white/[0.07] focus:ring-2 focus:ring-offset-0
    [&:-webkit-autofill]:shadow-[0_0_0_1000px_rgb(10,12,22)_inset]
    [&:-webkit-autofill]:[-webkit-text-fill-color:#fff]`
  if (touched && error)
    return `${base} border-red-500/50 focus:border-red-400 focus:ring-red-500/20 ${extra}`
  if (touched && !error)
    return `${base} border-emerald-500/40 focus:border-emerald-400 focus:ring-emerald-500/20 ${extra}`
  return `${base} border-white/10 focus:border-cyan-400/60 focus:ring-cyan-400/15 ${extra}`
}

function PasswordStrengthBar({ password }) {
  const { score, label, color } = getPasswordStrength(password)
  if (!password) return null
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= score ? color : '#e6eeff' }}
            />
          ))}
        </div>
        <span className="text-[10px] font-bold w-16 text-right" style={{ color }}>{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {PW_RULES.map(r => {
          const ok = r.test(password)
          return (
            <div key={r.key} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full flex items-center justify-center transition-all duration-200 ${ok ? 'bg-tertiary' : 'bg-surface-container-high'}`}>
                {ok && <Check size={8} className="text-white" />}
              </div>
              <span className={`text-[10px] transition-colors duration-200 ${ok ? 'text-tertiary' : 'text-outline'}`}>{r.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const GoogleIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { register, isLoading } = useAuthStore()
  const shellRef = useRef(null)

  const [form, setForm] = useState({
    full_name: '', email: '', company_name: '',
    role_in_company: '', phone: '', password: '', confirm_password: '',
  })
  const [touched, setTouched] = useState({})
  const [errors, setErrors] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [showCPw, setShowCPw] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isOAuthFlow, setIsOAuthFlow] = useState(false)

  useEffect(() => {
    const els = shellRef.current?.querySelectorAll('[data-reveal]') || []
    if (els.length) {
      gsap.fromTo(els, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, stagger: 0.05, ease: 'power3.out' })
    }
  }, [])

  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const oauthError = searchParams.get('error')
    if (oauthError) { toast.error('Authentication failed. Please try again.'); return }
    if (accessToken && refreshToken) {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(r => r.json())
        .then(data => {
          useAuthStore.setState({ token: accessToken, user: data })
          localStorage.setItem('user', JSON.stringify(data))
          toast.success('Welcome to TalentIQ!')
          navigate(data?.role === 'admin' ? '/admin/dashboard' : '/welcome')
        })
        .catch(() => toast.error('Failed to fetch user data'))
    }
  }, [searchParams, navigate])

  const handleGoogleOAuth = () => {
    setIsOAuthFlow(true)
    setTouched({})
    setErrors({})
    window.location.href = `${API_BASE}/auth/oauth/google/login`
  }

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm(prev => {
      const next = { ...prev, [name]: value }
      if (touched[name] && !isOAuthFlow) {
        setErrors(errs => ({ ...errs, [name]: validate(name, value, next) }))
      }
      if (name === 'password' && touched.confirm_password && !isOAuthFlow) {
        setErrors(errs => ({ ...errs, confirm_password: validate('confirm_password', next.confirm_password, next) }))
      }
      return next
    })
    if (submitError) setSubmitError('')
  }, [touched, submitError, isOAuthFlow])

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target
    if (!isOAuthFlow) {
      setTouched(prev => ({ ...prev, [name]: true }))
      setErrors(prev => ({ ...prev, [name]: validate(name, value, form) }))
    }
  }, [form, isOAuthFlow])

  const togglePw = useCallback((e) => { e.preventDefault(); setShowPw(p => !p) }, [])
  const toggleCPw = useCallback((e) => { e.preventDefault(); setShowCPw(p => !p) }, [])

  const validateAll = () => {
    const fields = Object.keys(form)
    const allTouched = fields.reduce((acc, k) => ({ ...acc, [k]: true }), {})
    const allErrors = fields.reduce((acc, k) => ({ ...acc, [k]: validate(k, form[k], form) }), {})
    setTouched(allTouched)
    setErrors(allErrors)
    return Object.values(allErrors).every(e => !e)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (isLoading) return
    setSubmitError('')
    setIsOAuthFlow(false)
    if (!validateAll()) return

    const { score } = getPasswordStrength(form.password)
    if (score < 3) {
      setErrors(prev => ({ ...prev, password: 'Password is too weak. Add uppercase, numbers and symbols.' }))
      setTouched(prev => ({ ...prev, password: true }))
      return
    }

    if (form.password !== form.confirm_password) {
      setErrors(prev => ({ ...prev, confirm_password: 'Passwords do not match' }))
      setTouched(prev => ({ ...prev, confirm_password: true }))
      return
    }

    const result = await register({
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      phone: form.phone.trim() || null,
      role: 'recruiter',
      company_name: form.company_name.trim() || null,
      role_in_company: form.role_in_company.trim() || null,
    })

    if (result.success) {
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } else {
      setSubmitError(result.error || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -ml-48 -mt-48" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-tertiary/5 rounded-full blur-[100px] -mr-40 -mb-40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-4xl"
      >
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Info Side */}
          <div className="hidden lg:block">
            <Link to="/" className="inline-flex items-center gap-3 mb-10 group">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-on-primary shadow-lg group-hover:scale-105 transition-transform">
                <BarChart3 size={24} />
              </div>
              <span className="text-3xl font-black tracking-tight text-primary">TalentIQ</span>
            </Link>
            
            <h1 className="text-5xl font-black text-on-surface leading-[1.1] mb-6">
              Ignite your <span className="text-primary">recruitment pipeline</span> with AI.
            </h1>
            <p className="text-lg text-on-surface-variant font-medium leading-relaxed mb-10 opacity-80">
              Transform your hiring process with autonomous CV parsing, intelligent match scoring, and predictive interview analytics.
            </p>
            
            <div className="space-y-4">
              {[
                { icon: Sparkles, text: "Advanced LLM-based profile vectorization", color: "text-primary" },
                { icon: Target, text: "95% accuracy in cross-domain matching", color: "text-tertiary" },
                { icon: ShieldCheck, text: "Enterprise-grade security and data privacy", color: "text-secondary" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center shadow-sm", item.color)}>
                    <item.icon size={20} />
                  </div>
                  <span className="font-bold text-on-surface-variant text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form Side */}
          <div className="portal-card bg-surface-container-lowest p-8 sm:p-10 shadow-2xl border-outline-variant/60">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-on-surface mb-1">Create Organization</h2>
              <p className="text-on-surface-variant text-sm font-medium">Join 500+ teams hiring with TalentIQ</p>
            </div>

            <button
              onClick={handleGoogleOAuth}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface font-bold text-sm transition-all border border-outline-variant/40 mb-6"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant" /></div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em] text-outline">
                <span className="px-4 bg-surface-container-lowest">Or join manually</span>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Admin Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline opacity-50" />
                    <input
                      name="full_name"
                      type="text"
                      value={form.full_name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Jane Doe"
                      className={cn(
                        "w-full h-11 pl-10 pr-4 rounded-xl text-xs font-bold transition-all outline-none border",
                        touched.full_name && errors.full_name ? "border-error bg-error/5" : "border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Work Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline opacity-50" />
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="jane@company.com"
                      className={cn(
                        "w-full h-11 pl-10 pr-4 rounded-xl text-xs font-bold transition-all outline-none border",
                        touched.email && errors.email ? "border-error bg-error/5" : "border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Organization</label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline opacity-50" />
                    <input
                      name="company_name"
                      type="text"
                      value={form.company_name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Acme Inc."
                      className={cn(
                        "w-full h-11 pl-10 pr-4 rounded-xl text-xs font-bold transition-all outline-none border",
                        touched.company_name && errors.company_name ? "border-error bg-error/5" : "border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Your Role</label>
                  <div className="relative">
                    <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline opacity-50" />
                    <select
                      name="role_in_company"
                      value={form.role_in_company}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={cn(
                        "w-full h-11 pl-10 pr-4 rounded-xl text-xs font-bold transition-all outline-none border appearance-none cursor-pointer",
                        touched.role_in_company && errors.role_in_company ? "border-error bg-error/5" : "border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5"
                      )}
                    >
                      <option value="">Select Role</option>
                      {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline opacity-50" />
                  <input
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="••••••••"
                    className={cn(
                      "w-full h-11 pl-10 pr-12 rounded-xl text-xs font-bold transition-all outline-none border",
                      touched.password && errors.password ? "border-error bg-error/5" : "border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5"
                    )}
                  />
                  <button type="button" onMouseDown={togglePw} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthBar password={form.password} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline opacity-50" />
                  <input
                    name="confirm_password"
                    type={showCPw ? 'text' : 'password'}
                    value={form.confirm_password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="••••••••"
                    className={cn(
                      "w-full h-11 pl-10 pr-12 rounded-xl text-xs font-bold transition-all outline-none border",
                      touched.confirm_password && errors.confirm_password ? "border-error bg-error/5" : "border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5"
                    )}
                  />
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-lg bg-error/10 border border-error/20 flex items-start gap-2 animate-enter">
                   <AlertCircle size={14} className="text-error mt-0.5" />
                   <p className="text-xs font-bold text-error">{submitError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary h-12 shadow-lg mt-4 disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <span>Create Account</span>}
              </button>
            </form>

            <p className="text-center text-sm text-outline mt-6 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
