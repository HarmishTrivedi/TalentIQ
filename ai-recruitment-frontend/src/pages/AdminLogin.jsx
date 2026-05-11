import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { gsap } from 'gsap'
import { useAuthStore } from '../store'
import { Spinner } from '../components/ui'
import { BrandMark, GlassPanel, PremiumButton } from '../components/premium/PremiumUI'
import CosmicUniverse from '../components/cosmic/CosmicUniverse'
import toast from 'react-hot-toast'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, isLoading } = useAuthStore()
  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const shellRef = useRef(null)

  useEffect(() => {
    gsap.fromTo(shellRef.current?.querySelectorAll('[data-admin-reveal]') || [], { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out' })
  }, [])

  // Handle OAuth callback
  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const oauthError = searchParams.get('error')
    if (oauthError) { toast.error('Authentication failed. Please try again.'); return }
    if (accessToken && refreshToken) {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }).then(r => r.json()).then(data => {
        useAuthStore.setState({ token: accessToken, user: data })
        localStorage.setItem('user', JSON.stringify(data))
        toast.success('Welcome to TalentIQ!')
        navigate(data?.role === 'admin' ? '/admin/dashboard' : '/welcome')
      }).catch(() => toast.error('Failed to fetch user data'))
    }
  }, [searchParams, navigate])

  const handleOAuth = (provider) => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/auth/oauth/${provider}/login`
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const result = await login(form.email, form.password)
    if (result.success) navigate(result.user?.role === 'admin' ? '/admin/dashboard' : '/welcome')
    else setError(result.error || 'Invalid email or password')
  }

  return (
    <CosmicUniverse ref={shellRef} showNodes={false} className="text-white">
      <div ref={shellRef} className="relative z-10 flex min-h-screen flex-col px-5 py-5 sm:px-8">
        <header data-admin-reveal className="flex items-center justify-between">
          <BrandMark />
          <Link to="/" className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 font-sans text-sm font-bold text-slate-200 backdrop-blur-xl transition hover:bg-white/[0.09]">Home</Link>
        </header>

        <main className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1fr_1fr]">
          <section className="max-w-2xl">
            <div data-admin-reveal className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.24em] text-violet-100">
              <Shield size={14} /> Admin Portal
            </div>
            <h1 data-admin-reveal className="font-title text-5xl font-black leading-[0.96] tracking-tight text-white sm:text-7xl">
              Command Center Access
            </h1>
            <p data-admin-reveal className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Secure gateway for administrators and recruiters. Manage users, subscriptions, and system intelligence.
            </p>
            <div data-admin-reveal className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {['Admin verified', 'Encrypted access', 'Full control'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 font-sans text-sm font-bold text-slate-200 backdrop-blur-xl">{item}</div>
              ))}
            </div>
          </section>

          <GlassPanel data-admin-reveal className="mx-auto w-full max-w-md p-5 sm:p-7">
            <div className="mb-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-[0_0_34px_rgba(139,92,246,0.35)]">
                <Shield size={20} />
              </div>
              <h2 className="font-title text-2xl font-black text-white">Admin Sign In</h2>
              <p className="mt-1 font-sans text-sm text-slate-400">Google and Microsoft for quick access. Email/password also available.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PremiumButton type="button" variant="ghost" className="w-full" onClick={() => handleOAuth('google')}>
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </PremiumButton>
              <PremiumButton type="button" variant="ghost" className="w-full" onClick={() => handleOAuth('microsoft')}>
                <svg className="w-4 h-4" viewBox="0 0 23 23"><path fill="#f3f3f3" d="M0 0h23v23H0z"/><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
                Microsoft
              </PremiumButton>
            </div>
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="font-sans text-xs font-bold uppercase tracking-widest text-slate-500">or continue with email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block font-sans text-xs font-bold uppercase tracking-widest text-slate-400">Email</span>
                <div className="relative">
                  <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="input-field h-12 pl-11" placeholder="admin@company.com" required autoFocus />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block font-sans text-xs font-bold uppercase tracking-widest text-slate-400">Password</span>
                <div className="relative">
                  <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="input-field h-12 pl-11 pr-12" placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              {error && <div className="rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 font-sans text-sm text-red-100">{error}</div>}
              <PremiumButton type="submit" disabled={isLoading} className="h-12 w-full">
                {isLoading ? <Spinner size={16} className="text-slate-950" /> : <>Sign In <ArrowRight size={16} /></>}
              </PremiumButton>
            </form>

            <p className="mt-5 text-center font-sans text-sm text-slate-400">
              Need an account? <Link to="/register" className="font-bold text-violet-200 hover:text-violet-100">Register here</Link>
            </p>
          </GlassPanel>
        </main>
      </div>
    </CosmicUniverse>
  )
}
