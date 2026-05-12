import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, Eye, EyeOff, Lock, Mail,
  Phone, User, Building2, Briefcase, Sparkles, AlertCircle, Check, X
} from 'lucide-react'
import { gsap } from 'gsap'
import { useAuthStore } from '../store'
import { Spinner } from '../components/ui'
import { BrandMark, GlassPanel, PremiumButton } from '../components/premium/PremiumUI'
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
              style={{ background: i <= score ? color : 'rgba(255,255,255,0.08)' }}
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
              <div className={`w-3 h-3 rounded-full flex items-center justify-center transition-all duration-200 ${ok ? 'bg-emerald-500' : 'bg-white/10'}`}>
                {ok && <Check size={8} className="text-white" />}
              </div>
              <span className={`text-[10px] transition-colors duration-200 ${ok ? 'text-emerald-400' : 'text-slate-500'}`}>{r.label}</span>
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
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/auth/me`, {
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
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/auth/oauth/google/login`
  }

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm(prev => {
      const next = { ...prev, [name]: value }
      if (touched[name]) {
        setErrors(errs => ({ ...errs, [name]: validate(name, value, next) }))
      }
      if (name === 'password' && touched.confirm_password) {
        setErrors(errs => ({ ...errs, confirm_password: validate('confirm_password', next.confirm_password, next) }))
      }
      return next
    })
    if (submitError) setSubmitError('')
  }, [touched, submitError])

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    setErrors(prev => ({ ...prev, [name]: validate(name, value, form) }))
  }, [form])

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
    <div className="relative min-h-screen overflow-hidden bg-[#07080f] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-violet-600/8 blur-[130px]" />
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-cyan-500/8 blur-[130px]" />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/5 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div ref={shellRef} className="relative z-10 flex min-h-screen flex-col px-5 py-5 sm:px-8">

        <header data-reveal className="flex items-center justify-between mb-2">
          <BrandMark />
          <Link
            to="/login"
            className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-slate-200 backdrop-blur-xl transition hover:bg-white/[0.09]"
          >
            Sign in
          </Link>
        </header>

        <main className="grid flex-1 items-center gap-6 py-4 lg:grid-cols-[0.9fr_1.1fr]">

          <section className="hidden lg:block max-w-xl">
            <div data-reveal className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-fuchsia-100">
              <Sparkles size={13} /> Recruiter Platform
            </div>
            <h1 data-reveal className="font-title text-5xl font-black leading-[0.96] tracking-tight text-white">
              Ignite your recruitment galaxy.
            </h1>
            <p data-reveal className="mt-5 text-base leading-7 text-slate-400">
              CV parsing, AI matching, interview reasoning, and Talent DNA scoring — all in one living core.
            </p>
            <div data-reveal className="mt-7 space-y-2.5">
              {[
                'Google OAuth for instant sign-up',
                'Secure email/password authentication',
                'Enterprise-grade password security',
              ].map(item => (
                <div key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-300">
                  <Check size={15} className="shrink-0 text-emerald-400" /> {item}
                </div>
              ))}
            </div>
          </section>

          <GlassPanel data-reveal className="mx-auto w-full max-w-lg p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="font-title text-xl font-black text-white">Create your account</h2>
              <p className="mt-1 text-xs text-slate-500">
                Fields marked <span className="text-cyan-400">*</span> are required
              </p>
            </div>

            <div className="mb-5">
              <PremiumButton type="button" variant="ghost" className="w-full text-sm" onClick={handleGoogleOAuth}>
                <GoogleIcon /> Continue with Google
              </PremiumButton>
            </div>

            <div className="mb-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.07]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">or register with email</span>
              <div className="h-px flex-1 bg-white/[0.07]" />
            </div>

            <form onSubmit={submit} noValidate autoComplete="on">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">

                <Field icon={User} label="Full Name" error={errors.full_name} touched={touched.full_name} required>
                  <input
                    name="full_name"
                    type="text"
                    value={form.full_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Jane Smith"
                    autoComplete="name"
                    autoFocus
                    className={inputCls(touched.full_name, errors.full_name, 'pr-9')}
                  />
                </Field>

                <Field icon={Mail} label="Work Email" error={errors.email} touched={touched.email} required>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="you@company.com"
                    autoComplete="email"
                    inputMode="email"
                    className={inputCls(touched.email, errors.email, 'pr-9')}
                  />
                </Field>

                <Field icon={Building2} label="Company Name" error={errors.company_name} touched={touched.company_name} required>
                  <input
                    name="company_name"
                    type="text"
                    value={form.company_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Acme Corp"
                    autoComplete="organization"
                    className={inputCls(touched.company_name, errors.company_name, 'pr-9')}
                  />
                </Field>

                <Field icon={Briefcase} label="Role in Company" error={errors.role_in_company} touched={touched.role_in_company} required>
                  <select
                    name="role_in_company"
                    value={form.role_in_company}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`${inputCls(touched.role_in_company, errors.role_in_company, 'pr-9')} appearance-none cursor-pointer`}
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">Select your role</option>
                    {ROLE_OPTIONS.map(r => (
                      <option key={r} value={r} className="bg-slate-900">{r}</option>
                    ))}
                  </select>
                </Field>

                <Field icon={Phone} label="Phone (optional)" error={errors.phone} touched={touched.phone}>
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    inputMode="tel"
                    className={inputCls(touched.phone, errors.phone, 'pr-9')}
                  />
                </Field>

                <div className="hidden sm:block" />

                <div className="sm:col-span-2">
                  <Field icon={Lock} label="Password" error={errors.password} touched={touched.password} required isPassword>
                    <input
                      name="password"
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Min. 8 chars, 1 uppercase, 1 number"
                      autoComplete="new-password"
                      className={inputCls(touched.password, errors.password, 'pr-10')}
                    />
                    <button
                      type="button"
                      onMouseDown={togglePw}
                      tabIndex={-1}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:text-slate-200 focus:outline-none"
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </Field>
                  <PasswordStrengthBar password={form.password} />
                </div>

                <div className="sm:col-span-2">
                  <Field icon={Lock} label="Confirm Password" error={errors.confirm_password} touched={touched.confirm_password} required isPassword>
                    <input
                      name="confirm_password"
                      type={showCPw ? 'text' : 'password'}
                      value={form.confirm_password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      className={inputCls(touched.confirm_password, errors.confirm_password, 'pr-10')}
                    />
                    <button
                      type="button"
                      onMouseDown={toggleCPw}
                      tabIndex={-1}
                      aria-label={showCPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:text-slate-200 focus:outline-none"
                    >
                      {showCPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </Field>
                  {form.confirm_password && (
                    <div className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold ${
                      form.confirm_password === form.password ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {form.confirm_password === form.password
                        ? <><Check size={11} /> Passwords match</>
                        : <><X size={11} /> Passwords do not match</>
                      }
                    </div>
                  )}
                </div>

              </div>

              {submitError && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
                  <p className="text-sm text-red-300">{submitError}</p>
                </div>
              )}

              <PremiumButton type="submit" disabled={isLoading} className="mt-5 h-11 w-full">
                {isLoading
                  ? <Spinner size={15} className="text-slate-950" />
                  : <><span>Create Account</span><ArrowRight size={15} /></>
                }
              </PremiumButton>

              <p className="mt-4 text-center text-xs text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-cyan-300 transition hover:text-cyan-200">
                  Sign in
                </Link>
              </p>
            </form>
          </GlassPanel>

        </main>
      </div>
    </div>
  )
}
