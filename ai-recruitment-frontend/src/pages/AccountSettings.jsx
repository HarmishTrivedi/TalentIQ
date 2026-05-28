import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  User, Shield, Settings, Camera, Eye, EyeOff,
  Save, Check, AlertCircle, Building2, Phone,
  Mail, Calendar, Clock, Activity, Bell, Sun, Moon,
  LogOut, Smartphone, Globe, Lock, KeyRound, Upload,
  ArrowLeft, Search, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store'
import { useThemeStore } from '../store/themeStore'
import { authApi, BASE_URL } from '../services/api'
import { getInitials, formatDate, formatRelativeTime } from '../utils/helpers'

const SETTINGS_MENU = [
  { id: 'profile', label: 'Profile Information', icon: User, desc: 'Update your personal details' },
  { id: 'avatar', label: 'Profile Picture', icon: Camera, desc: 'Change your avatar' },
  { id: 'password', label: 'Change Password', icon: KeyRound, desc: 'Update your password' },
  { id: 'security', label: 'Security & Sessions', icon: Shield, desc: 'Manage active sessions' },
  { id: 'appearance', label: 'Appearance', icon: Sun, desc: 'Theme and display settings' },
  { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Email and alert preferences' },
  { id: 'dashboard', label: 'Dashboard Settings', icon: Settings, desc: 'Customize your dashboard' },
]

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
    { label: 'Special char', ok: /[^A-Za-z0-9]/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e']
  const labels = ['Weak', 'Fair', 'Good', 'Strong']

  if (!password) return null
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? colors[score - 1] : 'var(--border)' }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {checks.map(c => (
            <span key={c.label} className="text-[10px] flex items-center gap-1"
              style={{ color: c.ok ? '#22c55e' : 'var(--text-muted)' }}>
              <Check size={8} style={{ opacity: c.ok ? 1 : 0.3 }} />
              {c.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span className="text-[10px] font-semibold" style={{ color: colors[score - 1] }}>
            {labels[score - 1]}
          </span>
        )}
      </div>
    </div>
  )
}

function InputField({ label, icon: Icon, value, onChange, type = 'text', placeholder, disabled, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className="input-field"
          style={{ paddingLeft: Icon ? '2.25rem' : undefined, opacity: disabled ? 0.6 : 1 }}
        />
      </div>
      {hint && <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  )
}

export default function AccountSettings() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSetting = searchParams.get('setting')
  const { user, updateUser } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const [searchQuery, setSearchQuery] = useState('')

  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    company_name: user?.company_name || '',
    role_in_company: user?.role_in_company || '',
  })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('talentiq-prefs') || '{}') } catch { return {} }
  })
  const fileRef = useRef()

  const avatarSrc = user?.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${BASE_URL}${user.avatar_url}`)
    : null

  const filteredSettings = SETTINGS_MENU.filter(s =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.desc.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleProfileSave = async () => {
    setSaving(true)
    try {
      const res = await authApi.updateProfile(profileForm)
      updateUser(res.data)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error('Please fill all fields'); return
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match'); return
    }
    if (passwordForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters'); return
    }
    setSaving(true)
    try {
      await authApi.changePassword({ current_password: passwordForm.current_password, new_password: passwordForm.new_password })
      toast.success('Password changed successfully!')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    setAvatarLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await authApi.uploadAvatar(fd)
      updateUser({ avatar_url: res.data.avatar_url })
      toast.success('Avatar updated!')
    } catch {
      toast.error('Failed to upload avatar')
    } finally {
      setAvatarLoading(false)
    }
  }

  const savePrefs = (updated) => {
    const next = { ...prefs, ...updated }
    setPrefs(next)
    localStorage.setItem('talentiq-prefs', JSON.stringify(next))
    toast.success('Preferences saved!')
  }

  const Toggle = ({ label, sub, checked, onChange }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <div>
        <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {sub && <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0"
        style={{ background: checked ? 'var(--accent-cyan)' : 'var(--border)' }}
      >
        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
          style={{ left: checked ? '1.25rem' : '0.125rem' }} />
      </button>
    </div>
  )

  if (!activeSetting) {
    return (
      <div className="page-enter bg-surface">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-on-surface mb-2">Workspace Settings</h1>
            <p className="text-on-surface-variant text-sm font-medium opacity-70">
              Personalize your recruitment environment and security protocols
            </p>
          </div>

          <div className="portal-card mb-8 p-2 bg-surface-container-lowest shadow-sm">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-50" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-transparent border-none text-sm font-medium focus:ring-0 outline-none"
                placeholder="Search for a specific setting..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSettings.map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                onClick={() => setSearchParams({ setting: id })}
                className="portal-card p-6 flex items-start gap-5 text-left bg-surface-container-lowest border-outline-variant/60 shadow-md hover:border-primary/50 transition-all"
              >
                <div className="w-12 h-12 rounded-[18px] bg-primary/5 flex items-center justify-center flex-shrink-0 text-primary shadow-inner transition-transform group-hover:scale-105">
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="text-base font-bold text-on-surface mb-1">{label}</div>
                  <div className="text-xs text-on-surface-variant font-medium opacity-70 leading-relaxed">{desc}</div>
                </div>
                <ChevronRight size={18} className="text-outline mt-1.5" />
              </button>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-outline-variant flex justify-center">
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary py-3 px-8 flex items-center gap-2 text-sm font-bold shadow-sm"
            >
              <ArrowLeft size={18} /> 
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentSetting = SETTINGS_MENU.find(s => s.id === activeSetting)

  return (
    <div className="page-enter bg-surface min-h-screen">
      <div className="max-w-3xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-8">
           <button 
             onClick={() => setSearchParams({})}
             className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs group"
           >
             <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
             <span>Settings Home</span>
           </button>
        </div>

        <div className="flex items-center gap-5 mb-10">
          <div className="w-14 h-14 rounded-[22px] bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20">
             {currentSetting && <currentSetting.icon size={28} />}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-on-surface leading-tight">
              {currentSetting?.label}
            </h1>
            <p className="text-on-surface-variant text-sm font-medium opacity-70">
              {currentSetting?.desc}
            </p>
          </div>
        </div>

        {activeSetting === 'profile' && (
          <div className="portal-card p-8 bg-surface-container-lowest shadow-xl border-outline-variant/60">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-10">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Full Name</label>
                 <input value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} className="w-full h-11 px-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" />
              </div>
              <div className="space-y-1.5 opacity-60">
                 <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Verified Email</label>
                 <input value={user?.email || ''} disabled className="w-full h-11 px-4 rounded-xl text-sm font-bold bg-surface-container border border-outline-variant cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Work Phone</label>
                 <input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} className="w-full h-11 px-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" />
              </div>
              <div className="space-y-1.5 opacity-60">
                 <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">System Role</label>
                 <input value={user?.role || ''} disabled className="w-full h-11 px-4 rounded-xl text-sm font-bold bg-surface-container border border-outline-variant cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Organization</label>
                 <input value={profileForm.company_name} onChange={e => setProfileForm(f => ({ ...f, company_name: e.target.value }))} className="w-full h-11 px-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Internal Title</label>
                 <input value={profileForm.role_in_company} onChange={e => setProfileForm(f => ({ ...f, role_in_company: e.target.value }))} className="w-full h-11 px-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" />
              </div>
            </div>
            <button onClick={handleProfileSave} disabled={saving} className="btn-primary py-3 px-8 shadow-lg disabled:opacity-50">
              {saving ? <RefreshCw className="animate-spin" size={18} /> : <><Save size={18} /> <span>Save Profile Intelligence</span></>}
            </button>
          </div>
        )}

        {activeSetting === 'avatar' && (
          <div className="portal-card p-10 bg-surface-container-lowest shadow-xl border-outline-variant/60 flex flex-col items-center text-center">
            <div className="relative mb-8">
              <div className="w-40 h-40 rounded-[48px] overflow-hidden bg-surface-container border-4 border-white shadow-2xl">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-5xl font-black text-white">
                    {getInitials(user?.full_name || 'U')}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={avatarLoading}
                className="absolute -bottom-2 -right-2 w-14 h-14 rounded-3xl bg-white border border-outline-variant shadow-xl flex items-center justify-center text-primary hover:scale-110 active:scale-95 transition-all z-10"
              >
                {avatarLoading ? <RefreshCw className="animate-spin" size={20} /> : <Camera size={24} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-1">{user?.full_name}</h3>
            <p className="text-sm text-outline font-medium mb-8">Recruiter ID: {user?.id?.slice(0, 8)}</p>
            <div className="flex gap-3">
               <button onClick={() => fileRef.current?.click()} className="btn-primary py-2.5 px-6">Upload High-Res Portrait</button>
               <button className="btn-secondary py-2.5 px-6">Remove</button>
            </div>
            <p className="text-[10px] mt-6 text-outline font-black uppercase tracking-widest">Recommended: 800x800px JPG or PNG</p>
          </div>
        )}

        {activeSetting === 'password' && (
          <div className="portal-card p-8 bg-surface-container-lowest shadow-xl border-outline-variant/60 space-y-6">
            {['current', 'new', 'confirm'].map(field => (
              <div key={field} className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">
                  {field === 'current' ? 'Current Access Key' : field === 'new' ? 'New Security Key' : 'Verify New Key'}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-50" />
                  <input
                    type={showPassword[field] ? 'text' : 'password'}
                    value={passwordForm[field === 'current' ? 'current_password' : field === 'new' ? 'new_password' : 'confirm_password']}
                    onChange={e => setPasswordForm(f => ({ ...f, [field === 'current' ? 'current_password' : field === 'new' ? 'new_password' : 'confirm_password']: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full h-12 pl-11 pr-12 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                  />
                  <button type="button" onClick={() => setShowPassword(s => ({ ...s, [field]: !s[field] }))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                    {showPassword[field] ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {field === 'new' && passwordForm.new_password && <PasswordStrength password={passwordForm.new_password} />}
              </div>
            ))}
            <button onClick={handlePasswordChange} disabled={saving} className="btn-primary py-3 px-8 shadow-lg mt-4 disabled:opacity-50">
              {saving ? <RefreshCw className="animate-spin" size={18} /> : <><Shield size={18} /> <span>Update Security Key</span></>}
            </button>
          </div>
        )}

        {activeSetting === 'security' && (
          <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--success-bg)' }}>
                <Globe size={14} style={{ color: 'var(--success-text)' }} />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Current Session</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Web Browser · Active now</div>
              </div>
              <span className="badge badge-green text-[10px]">Current</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Session management with multiple device support is coming soon.
            </p>
          </div>
        )}

        {activeSetting === 'appearance' && (
          <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Easy on the eyes' },
                { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean & bright' },
              ].map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className="p-4 rounded-xl text-left transition-all"
                  style={{
                    background: theme === id ? 'var(--accent-glow)' : 'var(--bg-card-hover)',
                    border: `1px solid ${theme === id ? 'var(--accent-cyan)' : 'var(--border)'}`,
                  }}
                >
                  <Icon size={18} className="mb-2" style={{ color: theme === id ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                  {theme === id && (
                    <div className="flex items-center gap-1 mt-1">
                      <Check size={10} style={{ color: 'var(--accent-cyan)' }} />
                      <span className="text-[10px]" style={{ color: 'var(--accent-cyan)' }}>Active</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSetting === 'notifications' && (
          <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Toggle label="Email Notifications" sub="Receive updates via email" checked={prefs.emailNotifs !== false} onChange={v => savePrefs({ emailNotifs: v })} />
            <Toggle label="Match Alerts" sub="When new candidates match your jobs" checked={prefs.matchAlerts !== false} onChange={v => savePrefs({ matchAlerts: v })} />
            <Toggle label="Weekly Digest" sub="Summary of platform activity" checked={!!prefs.weeklyDigest} onChange={v => savePrefs({ weeklyDigest: v })} />
            <Toggle label="Security Alerts" sub="Login from new devices" checked={prefs.securityAlerts !== false} onChange={v => savePrefs({ securityAlerts: v })} />
          </div>
        )}

        {activeSetting === 'dashboard' && (
          <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Toggle label="Compact View" sub="Show more items in less space" checked={!!prefs.compactView} onChange={v => savePrefs({ compactView: v })} />
            <Toggle label="Show Analytics" sub="Display charts on dashboard" checked={prefs.showAnalytics !== false} onChange={v => savePrefs({ showAnalytics: v })} />
          </div>
        )}

        {/* Back Button at Bottom */}
        <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setSearchParams({})}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <ArrowLeft size={16} /> Back to Settings Menu
          </button>
        </div>
      </div>
    </div>
  )
}
