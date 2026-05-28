import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store'
import { BASE_URL, API_BASE } from '../services/api'
import toast from 'react-hot-toast'

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

// ── Google OAuth button (untouched) ──────────────────────────────────────────
function GoogleButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-gray-50 text-gray-900 font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
    >
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </button>
  )
}

// ── Input field wrapper ───────────────────────────────────────────────────────
function InputField({ icon: Icon, label, error, touched, children }) {
  const hasError = touched && error
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <Icon
          size={15}
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
            hasError ? 'text-red-400' : 'text-white/30'
          }`}
        />
        {children}
      </div>
      <AnimatePresence mode="wait">
        {hasError && (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-1.5 text-xs text-red-400"
          >
            <AlertCircle size={11} className="shrink-0" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function inputCls(touched, error, extra = '') {
  const base = `w-full h-12 rounded-xl pl-10 text-sm text-white outline-none transition-all duration-200
    bg-white/5 border placeholder:text-white/20 focus:bg-white/8
    [&:-webkit-autofill]:shadow-[0_0_0_1000px_rgb(10,10,18)_inset]
    [&:-webkit-autofill]:[-webkit-text-fill-color:#fff]`
  if (touched && error)
    return `${base} border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/15 ${extra}`
  if (touched && !error)
    return `${base} border-emerald-500/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 ${extra}`
  return `${base} border-white/10 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 ${extra}`
}

// ── Main Login component ──────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, isLoading } = useAuthStore()

  const [form, setForm] = useState({ email: '', password: '' })
  const [touched, setTouched] = useState({})
  const [errors, setErrors] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isOAuthFlow, setIsOAuthFlow] = useState(false)

  // ── OAuth callback handler ──────────────────────────────────────────────────
  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const oauthError = searchParams.get('error')

    if (oauthError) {
      toast.error('Authentication failed. Please try again.')
      return
    }
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
          navigate(data?.role === 'admin' ? '/admin/dashboard' : '/dashboard')
        })
        .catch(() => toast.error('Failed to load user data'))
    }
  }, [searchParams, navigate])

  // ── Google OAuth (untouched) ────────────────────────────────────────────────
  const handleGoogleOAuth = () => {
    setIsOAuthFlow(true)
    setTouched({})
    setErrors({})
    window.location.href = `${API_BASE}/auth/oauth/google/login`
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = useCallback((name, value) => {
    if (name === 'email') {
      if (!value.trim()) return 'Email is required'
      if (!EMAIL_RE.test(value.trim())) return 'Enter a valid email address'
    }
    if (name === 'password') {
      if (!value) return 'Password is required'
      if (value.length < 6) return 'Password must be at least 6 characters'
    }
    return ''
  }, [])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (touched[name] && !isOAuthFlow) {
      setErrors(prev => ({ ...prev, [name]: validate(name, value) }))
    }
    if (submitError) setSubmitError('')
  }, [touched, validate, submitError, isOAuthFlow])

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target
    if (!isOAuthFlow) {
      setTouched(prev => ({ ...prev, [name]: true }))
      setErrors(prev => ({ ...prev, [name]: validate(name, value) }))
    }
  }, [validate, isOAuthFlow])

  // ── Password toggle — onMouseDown prevents focus loss ──────────────────────
  const togglePassword = useCallback((e) => {
    e.preventDefault()
    setShowPw(prev => !prev)
  }, [])

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isLoading) return
    setSubmitError('')
    setIsOAuthFlow(false)

    const emailErr = validate('email', form.email)
    const pwErr = validate('password', form.password)
    setTouched({ email: true, password: true })
    setErrors({ email: emailErr, password: pwErr })
    if (emailErr || pwErr) return

    const result = await login(form.email.trim().toLowerCase(), form.password)
    if (result.success) {
      toast.success('Welcome back!')
      navigate(result.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard')
    } else {
      setSubmitError(result.error || 'Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-tertiary/5 rounded-full blur-[100px] -ml-40 -mb-40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-3 mb-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-lg group-hover:scale-105 transition-transform">
              <BarChart3 size={20} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-primary">TalentIQ</span>
          </Link>
          <p className="text-outline font-bold text-[10px] uppercase tracking-[0.2em]">Next-Gen AI Recruitment</p>
        </div>

        {/* Login Card */}
        <div className="portal-card bg-surface-container-lowest p-10 shadow-xl border-outline-variant/60">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-on-surface mb-1 leading-tight">Welcome Back</h1>
            <p className="text-on-surface-variant text-sm font-medium">Access your intelligent hiring portal</p>
          </div>

          {/* Social Sign In */}
          <div className="mb-8">
            <GoogleButton onClick={handleGoogleOAuth} />
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant" /></div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-outline">
              <span className="px-4 bg-surface-container-lowest">Or Corporate Login</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="space-y-1.5">
               <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Email ID</label>
               <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-50" size={16} />
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="name@company.com"
                    className={cn(
                      "w-full h-12 pl-11 pr-4 rounded-xl text-sm font-medium transition-all outline-none border",
                      touched.email && errors.email ? "border-error bg-error/5" : "border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5"
                    )}
                  />
               </div>
               {touched.email && errors.email && <p className="text-[10px] font-bold text-error mt-1 ml-1">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Secure Password</label>
               <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-50" size={16} />
                  <input
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="••••••••"
                    className={cn(
                      "w-full h-12 pl-11 pr-12 rounded-xl text-sm font-medium transition-all outline-none border",
                      touched.password && errors.password ? "border-error bg-error/5" : "border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5"
                    )}
                  />
                  <button
                    type="button"
                    onMouseDown={togglePassword}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
               </div>
               {touched.password && errors.password && <p className="text-[10px] font-bold text-error mt-1 ml-1">{errors.password}</p>}
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
              className="w-full btn-primary h-12 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <><span>Sign In</span> <ArrowRight size={18} /></>}
            </button>
          </form>

          <p className="text-center text-sm text-outline mt-8 font-medium">
            New to TalentIQ?{' '}
            <Link to="/register" className="text-primary font-bold hover:underline">
              Create Organization Account
            </Link>
          </p>
        </div>

        <div className="text-center mt-8">
           <Link to="/terms" className="text-[10px] font-bold text-outline hover:text-primary transition-colors uppercase tracking-widest mx-3">Legal</Link>
           <span className="text-outline opacity-30">•</span>
           <Link to="/privacy" className="text-[10px] font-bold text-outline hover:text-primary transition-colors uppercase tracking-widest mx-3">Privacy</Link>
        </div>
      </motion.div>
    </div>
  )
}
