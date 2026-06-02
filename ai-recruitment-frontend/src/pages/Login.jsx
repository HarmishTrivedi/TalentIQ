import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail, AlertCircle, BarChart3, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store'
import { BASE_URL, API_BASE } from '../services/api'
import { cn } from '../utils/helpers'
import toast from 'react-hot-toast'

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

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

  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const oauthError = searchParams.get('error')
    if (oauthError) { toast.error('Authentication failed. Please try again.'); return }
    if (accessToken && refreshToken) {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
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

  const handleGoogleOAuth = () => {
    setIsOAuthFlow(true)
    setTouched({})
    setErrors({})
    window.location.href = `${API_BASE}/auth/oauth/google/login`
  }

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
    if (touched[name] && !isOAuthFlow) setErrors(prev => ({ ...prev, [name]: validate(name, value) }))
    if (submitError) setSubmitError('')
  }, [touched, validate, submitError, isOAuthFlow])

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target
    if (!isOAuthFlow) {
      setTouched(prev => ({ ...prev, [name]: true }))
      setErrors(prev => ({ ...prev, [name]: validate(name, value) }))
    }
  }, [validate, isOAuthFlow])

  const togglePassword = useCallback((e) => { e.preventDefault(); setShowPw(prev => !prev) }, [])

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
    <main className="flex min-h-screen bg-surface font-sans">
      {/* Left: Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[440px]"
        >
          {/* Brand */}
          <div className="mb-10">
            <Link to="/" className="inline-flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BarChart3 size={16} className="text-white" />
              </div>
              <span className="font-display text-xl font-black text-primary">TalentIQ</span>
            </Link>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-outline mt-1">Enterprise Recruitment Portal</p>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-on-surface mb-1">Welcome Back</h1>
            <p className="text-sm text-on-surface-variant">Sign in to manage your talent pipeline.</p>
          </div>

          {/* Social Auth */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <button
              type="button"
              onClick={handleGoogleOAuth}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-outline-variant rounded-xl hover:bg-surface-container-low transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface">Google</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-3 border border-outline-variant rounded-xl hover:bg-surface-container-low transition-colors"
            >
              <svg className="w-5 h-5" fill="#0077b5" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a2.7 2.7 0 0 0-2.7-2.7c-1.2 0-1.9.7-2.2 1.2v-1.1h-2.6v7.9h2.7v-4.4a1.4 1.4 0 0 1 1.4-1.4 1.4 1.4 0 0 1 1.4 1.4v4.4h2.7M6.7 8.8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m1.3 9.7V10.6H5.4v7.9h2.6z"/>
              </svg>
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface">LinkedIn</span>
            </button>
          </div>

          <div className="relative flex items-center mb-8">
            <div className="flex-grow border-t border-outline-variant" />
            <span className="mx-4 text-[11px] font-semibold uppercase tracking-widest text-outline">Or continue with</span>
            <div className="flex-grow border-t border-outline-variant" />
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-on-surface">Work Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-60" />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="name@company.com"
                  className={cn(
                    "w-full h-12 pl-11 pr-4 rounded-xl text-sm font-medium transition-all outline-none border",
                    touched.email && errors.email
                      ? "border-error bg-error/5 focus:ring-2 focus:ring-error/10"
                      : "border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5"
                  )}
                />
              </div>
              <AnimatePresence>
                {touched.email && errors.email && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-1 text-[11px] font-bold text-error">
                    <AlertCircle size={11} /> {errors.email}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-on-surface">Password</label>
                <Link to="/forgot-password" size="sm" className="text-[11px] font-semibold text-primary hover:underline">Forgot Password?</Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-60" />
                <input
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="••••••••"
                  className={cn(
                    "w-full h-12 pl-11 pr-12 rounded-xl text-sm font-medium transition-all outline-none border",
                    touched.password && errors.password
                      ? "border-error bg-error/5 focus:ring-2 focus:ring-error/10"
                      : "border-outline-variant bg-surface-container-low focus:border-primary focus:ring-4 focus:ring-primary/5"
                  )}
                />
                <button type="button" onMouseDown={togglePassword}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <AnimatePresence>
                {touched.password && errors.password && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-1 text-[11px] font-bold text-error">
                    <AlertCircle size={11} /> {errors.password}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-start gap-2">
                <AlertCircle size={14} className="text-error mt-0.5 shrink-0" />
                <p className="text-xs font-bold text-error">{submitError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {isLoading
                ? <RefreshCw className="animate-spin" size={18} />
                : <><span>Sign In</span><ArrowRight size={16} /></>
              }
            </button>
          </form>

          <p className="text-center mt-8 text-sm text-on-surface-variant">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-bold hover:underline">Request Access</Link>
          </p>

          <div className="flex justify-center gap-6 mt-8">
            <Link to="/terms" className="text-[10px] font-bold uppercase tracking-widest text-outline hover:text-primary transition-colors">Legal</Link>
            <span className="text-outline opacity-30">•</span>
            <Link to="/privacy" className="text-[10px] font-bold uppercase tracking-widest text-outline hover:text-primary transition-colors">Privacy</Link>
          </div>
        </motion.div>
      </div>

      {/* Right: Marketing Panel */}
      <div className="hidden lg:flex flex-1 bg-surface-container-low border-l border-outline-variant relative overflow-hidden">
        <div className="relative z-10 w-full flex flex-col justify-center px-16">
          <div className="bg-white p-8 rounded-3xl border border-secondary/20 shadow-xl max-w-md"
            style={{ boxShadow: 'inset 0 0 12px rgba(99,102,241,0.1)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
              </div>
              <span className="font-display text-lg font-bold text-secondary">AI-Driven Efficiency</span>
            </div>
            <div className="space-y-6">
              <div className="flex items-end justify-between border-b border-outline-variant pb-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-outline mb-1">Candidate Screening Time</p>
                  <p className="text-3xl font-black text-on-surface">-72%</p>
                </div>
                <div className="h-16 w-32 flex items-end gap-1">
                  {[100, 70, 50, 28].map((h, i) => (
                    <div key={i} className={`w-full rounded-t-sm ${i === 3 ? 'bg-secondary-container animate-pulse' : 'bg-outline-variant'}`}
                      style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <p className="text-base text-on-surface-variant leading-relaxed">
                "TalentIQ's semantic matching engine helped us reduce our time-to-hire by three weeks while increasing applicant quality scores by 40%."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center text-sm font-bold text-primary">SC</div>
                <div>
                  <p className="text-sm font-bold text-on-surface">Sarah Chen</p>
                  <p className="text-xs text-outline">Director of Talent, InnovateCorp</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex gap-4">
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-outline-variant shadow-sm flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-outline mb-1">Active Pools</p>
              <p className="text-xl font-black text-on-surface">2,482</p>
              <div className="w-full h-1 bg-surface-variant mt-2 rounded-full overflow-hidden">
                <div className="w-3/4 h-full bg-primary rounded-full" />
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-outline-variant shadow-sm flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-outline mb-1">Match Rate</p>
              <p className="text-xl font-black text-on-surface">94%</p>
              <div className="w-full h-1 bg-surface-variant mt-2 rounded-full overflow-hidden">
                <div className="w-[94%] h-full bg-secondary rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-12 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>
    </main>
  )
}
