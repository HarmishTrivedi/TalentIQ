import React, { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  User, Shield, Settings, Camera, Eye, EyeOff,
  Save, Check, AlertCircle, Building2, Phone,
  Mail, Calendar, Clock, Activity, Bell, Sun, Moon,
  LogOut, Smartphone, Globe, Lock, KeyRound, Upload
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store'
import { useThemeStore } from '../store/themeStore'
import { authApi } from '../services/api'
import { getInitials, formatDate, formatRelativeTime } from '../utils/helpers'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'preferences', label: 'Preferences', icon: Settings },
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

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab({ user, onUpdate }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    company_name: user?.company_name || '',
    role_in_company: user?.role_in_company || '',
  })
  const [saving, setSaving] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const fileRef = useRef()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await authApi.updateProfile(form)
      onUpdate(res.data)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
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
      onUpdate({ avatar_url: res.data.avatar_url })
      toast.success('Avatar updated!')
    } catch {
      toast.error('Failed to upload avatar')
    } finally {
      setAvatarLoading(false)
    }
  }

  const avatarSrc = user?.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${BASE_URL}${user.avatar_url}`)
    : null

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="relative flex-shrink-0">
          {avatarSrc ? (
            <img src={avatarSrc} alt="avatar" className="w-20 h-20 rounded-2xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-2xl font-bold text-white">
              {getInitials(user?.full_name || 'U')}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={avatarLoading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'var(--accent-cyan)', color: '#000' }}
          >
            {avatarLoading ? (
              <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Camera size={12} />
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
        </div>
        <div>
          <div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{user?.full_name}</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="badge badge-blue text-[10px]">{user?.role || 'Recruiter'}</span>
            <span className="badge badge-green text-[10px]">Active</span>
          </div>
        </div>
      </div>

      {/* Account info */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Calendar, label: 'Member since', value: formatDate(user?.created_at) },
          { icon: Clock, label: 'Last login', value: user?.last_login ? formatRelativeTime(user.last_login) : 'N/A' },
          { icon: Activity, label: 'Account status', value: user?.is_active ? 'Active' : 'Inactive', green: user?.is_active },
          { icon: Mail, label: 'Email verified', value: 'Verified', green: true },
        ].map(({ icon: Icon, label, value, green }) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={11} style={{ color: 'var(--text-muted)' }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
            <div className="text-xs font-semibold" style={{ color: green ? 'var(--success-text)' : 'var(--text-primary)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Personal Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField label="Full Name" icon={User} value={form.full_name} onChange={set('full_name')} placeholder="Your full name" />
          <InputField label="Email Address" icon={Mail} value={user?.email || ''} disabled hint="Contact support to change email" />
          <InputField label="Phone Number" icon={Phone} value={form.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" />
          <InputField label="Role" icon={User} value={user?.role || ''} disabled hint="System role cannot be changed here" />
          <InputField label="Company Name" icon={Building2} value={form.company_name} onChange={set('company_name')} placeholder="Your company" />
          <InputField label="Role in Company" icon={Building2} value={form.role_in_company} onChange={set('role_in_company')} placeholder="e.g. Senior Recruiter" />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-6 py-2.5 text-sm"
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Saving…</>
          ) : (
            <><Save size={14} /> Save Changes</>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Security Tab ──────────────────────────────────────────────────────────────
function SecurityTab() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const toggle = (k) => setShow(s => ({ ...s, [k]: !s[k] }))

  const handleChange = async () => {
    if (!form.current_password || !form.new_password || !form.confirm_password) {
      toast.error('Please fill all fields'); return
    }
    if (form.new_password !== form.confirm_password) {
      toast.error('New passwords do not match'); return
    }
    if (form.new_password.length < 8) {
      toast.error('Password must be at least 8 characters'); return
    }
    setSaving(true)
    try {
      await authApi.changePassword({ current_password: form.current_password, new_password: form.new_password })
      toast.success('Password changed successfully!')
      setForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const PasswordInput = ({ label, field }) => (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="relative">
        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        <input
          type={show[field] ? 'text' : 'password'}
          value={form[field]}
          onChange={set(field === 'current' ? 'current_password' : field === 'new' ? 'new_password' : 'confirm_password')}
          placeholder="••••••••"
          className="input-field pr-10"
          style={{ paddingLeft: '2.25rem' }}
        />
        <button type="button" onClick={() => toggle(field)}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}>
          {show[field] ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Change password */}
      <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <KeyRound size={16} style={{ color: 'var(--accent-cyan)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Change Password</h3>
        </div>
        <PasswordInput label="Current Password" field="current" />
        <PasswordInput label="New Password" field="new" />
        {form.new_password && <PasswordStrength password={form.new_password} />}
        <PasswordInput label="Confirm New Password" field="confirm" />
        {form.confirm_password && form.new_password !== form.confirm_password && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--error-text)' }}>
            <AlertCircle size={12} /> Passwords do not match
          </div>
        )}
        <button onClick={handleChange} disabled={saving} className="btn-primary px-6 py-2.5 text-sm">
          {saving ? (
            <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Updating…</>
          ) : (
            <><Shield size={14} /> Update Password</>
          )}
        </button>
      </div>

      {/* Session info */}
      <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Smartphone size={16} style={{ color: 'var(--accent-cyan)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Active Sessions</h3>
        </div>
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

      {/* Security tips */}
      <div className="p-4 rounded-2xl" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
        <div className="flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--warning-text)' }} />
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--warning-text)' }}>Security Tips</div>
            <ul className="text-[10px] space-y-0.5" style={{ color: 'var(--warning-text)', opacity: 0.8 }}>
              <li>• Use a unique password not used on other sites</li>
              <li>• Include uppercase, numbers, and special characters</li>
              <li>• Never share your password with anyone</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Preferences Tab ───────────────────────────────────────────────────────────
function PreferencesTab() {
  const { theme, setTheme } = useThemeStore()
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('talentiq-prefs') || '{}') } catch { return {} }
  })

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

  return (
    <div className="space-y-6">
      {/* Theme */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Appearance</h3>
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

      {/* Notifications */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} style={{ color: 'var(--accent-cyan)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
        </div>
        <Toggle label="Email Notifications" sub="Receive updates via email" checked={prefs.emailNotifs !== false} onChange={v => savePrefs({ emailNotifs: v })} />
        <Toggle label="Match Alerts" sub="When new candidates match your jobs" checked={prefs.matchAlerts !== false} onChange={v => savePrefs({ matchAlerts: v })} />
        <Toggle label="Weekly Digest" sub="Summary of platform activity" checked={!!prefs.weeklyDigest} onChange={v => savePrefs({ weeklyDigest: v })} />
        <Toggle label="Security Alerts" sub="Login from new devices" checked={prefs.securityAlerts !== false} onChange={v => savePrefs({ securityAlerts: v })} />
      </div>

      {/* Dashboard */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Dashboard</h3>
        <Toggle label="Compact View" sub="Show more items in less space" checked={!!prefs.compactView} onChange={v => savePrefs({ compactView: v })} />
        <Toggle label="Show Analytics" sub="Display charts on dashboard" checked={prefs.showAnalytics !== false} onChange={v => savePrefs({ showAnalytics: v })} />
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AccountSettings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'profile'
  const { user, updateUser } = useAuthStore()

  const setTab = (id) => setSearchParams({ tab: id })

  const handleUpdate = (data) => updateUser(data)

  const avatarSrc = user?.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${BASE_URL}${user.avatar_url}`)
    : null

  return (
    <div className="min-h-screen p-6 page-enter" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
            Account Settings
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Manage your profile, security, and preferences
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-2xl mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={activeTab === id
                ? { background: 'var(--accent-cyan)', color: '#000' }
                : { color: 'var(--text-secondary)' }
              }
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="animate-enter">
          {activeTab === 'profile' && <ProfileTab user={user} onUpdate={handleUpdate} />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'preferences' && <PreferencesTab />}
        </div>
      </div>
    </div>
  )
}
