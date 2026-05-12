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
import { authApi } from '../services/api'
import { getInitials, formatDate, formatRelativeTime } from '../utils/helpers'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
      <div className="min-h-screen p-6 page-enter" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
              Account Settings
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Manage your profile, security, and preferences
            </p>
          </div>

          <div className="relative mb-5">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-11 h-11"
              placeholder="Search settings..."
            />
          </div>

          <div className="space-y-2">
            {filteredSettings.map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                onClick={() => setSearchParams({ setting: id })}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--tag-bg)' }}>
                  <Icon size={18} style={{ color: 'var(--accent-cyan)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const currentSetting = SETTINGS_MENU.find(s => s.id === activeSetting)

  return (
    <div className="min-h-screen p-6 page-enter" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setSearchParams({})}
          className="flex items-center gap-2 mb-6 text-sm font-semibold transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={16} /> Back to Settings
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            {currentSetting && <currentSetting.icon size={24} style={{ color: 'var(--accent-cyan)' }} />}
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
              {currentSetting?.label}
            </h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {currentSetting?.desc}
          </p>
        </div>

        {activeSetting === 'profile' && (
          <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputField label="Full Name" icon={User} value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your full name" />
              <InputField label="Email Address" icon={Mail} value={user?.email || ''} disabled hint="Contact support to change email" />
              <InputField label="Phone Number" icon={Phone} value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
              <InputField label="Role" icon={User} value={user?.role || ''} disabled hint="System role cannot be changed" />
              <InputField label="Company Name" icon={Building2} value={profileForm.company_name} onChange={e => setProfileForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Your company" />
              <InputField label="Role in Company" icon={Building2} value={profileForm.role_in_company} onChange={e => setProfileForm(f => ({ ...f, role_in_company: e.target.value }))} placeholder="e.g. Senior Recruiter" />
            </div>
            <button onClick={handleProfileSave} disabled={saving} className="btn-primary px-6 py-2.5 text-sm">
              {saving ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Saving…</> : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        )}

        {activeSetting === 'avatar' && (
          <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="avatar" className="w-24 h-24 rounded-2xl object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-3xl font-bold text-white">
                    {getInitials(user?.full_name || 'U')}
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarLoading}
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: 'var(--accent-cyan)', color: '#000' }}
                >
                  {avatarLoading ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <Camera size={16} />
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              </div>
              <div>
                <div className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{user?.full_name}</div>
                <div className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
                <button onClick={() => fileRef.current?.click()} className="btn-primary text-xs px-4 py-2">
                  <Upload size={12} /> Upload New Photo
                </button>
                <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>JPG, PNG or GIF. Max 5MB</p>
              </div>
            </div>
          </div>
        )}

        {activeSetting === 'password' && (
          <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {['current', 'new', 'confirm'].map(field => (
              <div key={field}>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {field === 'current' ? 'Current Password' : field === 'new' ? 'New Password' : 'Confirm New Password'}
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword[field] ? 'text' : 'password'}
                    value={passwordForm[field === 'current' ? 'current_password' : field === 'new' ? 'new_password' : 'confirm_password']}
                    onChange={e => setPasswordForm(f => ({ ...f, [field === 'current' ? 'current_password' : field === 'new' ? 'new_password' : 'confirm_password']: e.target.value }))}
                    placeholder="••••••••"
                    className="input-field pr-10"
                    style={{ paddingLeft: '2.25rem' }}
                  />
                  <button type="button" onClick={() => setShowPassword(s => ({ ...s, [field]: !s[field] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}>
                    {showPassword[field] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {field === 'new' && passwordForm.new_password && <PasswordStrength password={passwordForm.new_password} />}
              </div>
            ))}
            {passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--error-text)' }}>
                <AlertCircle size={12} /> Passwords do not match
              </div>
            )}
            <button onClick={handlePasswordChange} disabled={saving} className="btn-primary px-6 py-2.5 text-sm">
              {saving ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Updating…</> : <><Shield size={14} /> Update Password</>}
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
      </div>
    </div>
  )
}
