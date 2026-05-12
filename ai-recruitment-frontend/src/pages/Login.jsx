import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store'
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

// ── Microsoft OAuth button ────────────────────────────────────────────────────
function MicrosoftButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/15 text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed hover:border-white/25"
      style={{ background: 'rgba(255,255,255,0.06)' }}
    >
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23">
        <path fill="#f3f3f3" d="M0 0h11v11H0z"/>
        <path fill="#f35325" d="M1 1h9v9H1z"/>
        <path fill="#81bc06" d="M12 1h10v10H12z"/>
        <path fill="#05a6f0" d="M1 12h10v10H1z"/>
        <path fill="#ffba08" d="M12 12h10v10H12z"/>
      </svg>
      Continue with Microsoft
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
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      fetch(`${apiBase}/api/v1/auth/me`, {
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
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    window.location.href = `${apiBase}/api/v1/auth/oauth/google/login`
  }

  // ── Microsoft OAuth ─────────────────────────────────────────────────────────
  const handleMicrosoftOAuth = () => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    window.location.href = `${apiBase}/api/v1/auth/oauth/microsoft/login`
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
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validate(name, value) }))
    }
    if (submitError) setSubmitError('')
  }, [touched, validate, submitError])

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    setErrors(prev => ({ ...prev, [name]: validate(name, value) }))
  }, [validate])

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
    <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-48 -top-48 h-[700px] w-[700px] rounded-full bg-blue-600/8 blur-[140px]" />
        <div className="absolute -bottom-48 -right-48 h-[700px] w-[700px] rounded-full bg-violet-600/8 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[800px] rounded-full bg-indigo-500/4 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-3 group">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #0080ff, #8c1aff)', boxShadow: '0 0 28px #0080ff45' }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">TalentIQ</span>
          </Link>
          <p className="text-white/35 text-sm">AI Hiring Intelligence Platform</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-white/[0.08] p-8"
          style={{ background: 'rgba(10, 10, 18, 0.88)', backdropFilter: 'blur(28px)' }}
        >
          <div className="mb-7">
            <h1 className="text-[22px] font-bold text-white mb-1 tracking-tight">Welcome back</h1>
            <p className="text-white/40 text-sm">Sign in to continue to your workspace</p>
          </div>

          {/* OAuth buttons */}
          <div className="space-y-2.5 mb-6">
            <GoogleButton onClick={handleGoogleOAuth} />
            <MicrosoftButton onClick={handleMicrosoftOAuth} />
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.07]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-white/25 bg-[#0a0a12]">or continue with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <InputField icon={Mail} label="Email" error={errors.email} touched={touched.email}>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
                className={inputCls(touched.email, errors.email, 'pr-4')}
              />
            </InputField>

            <InputField icon={Lock} label="Password" error={errors.password} touched={touched.password}>
              <input
                name="password"
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={inputCls(touched.password, errors.password, 'pr-11')}
              />
              <button
                type="button"
                onMouseDown={togglePassword}
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/30 hover:text-white/65 hover:bg-white/8 transition-all duration-150 focus:outline-none"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </InputField>

            {/* Submit error */}
            <AnimatePresence mode="wait">
              {submitError && (
                <motion.div
                  key="submit-err"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3"
                >
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
                  <p className="text-sm text-red-300">{submitError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.015] active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-1"
              style={{ background: 'linear-gradient(135deg, #0080ff, #8c1aff)', boxShadow: '0 0 28px #0080ff35' }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-white/35 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Create account
            </Link>
          </p>
        </div>

        <p className="text-center text-white/20 text-xs mt-5">
          By signing in, you agree to TalentIQ's{' '}
          <Link to="/terms" className="hover:text-white/40 transition-colors">Terms</Link>
          {' '}and{' '}
          <Link to="/privacy" className="hover:text-white/40 transition-colors">Privacy Policy</Link>
        </p>
      </motion.div>
    </div>
  )
}
