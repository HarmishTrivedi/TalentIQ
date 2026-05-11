import React, { useEffect, useState } from 'react'
import { Users, UserPlus, Trash2, Shield, Power, Search, ShieldCheck } from 'lucide-react'
import { adminApi } from '../services/api'
import { Spinner, EmptyState, ConfirmationModal } from '../components/ui'
import toast from 'react-hot-toast'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [formData, setFormData] = useState({ email: '', full_name: '', password: '' })
  const [submitting, setSubmitting] = useState(false)

  const loadUsers = () => {
    setLoading(true)
    adminApi.listUsers()
      .then(res => setUsers(res.data))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadUsers() }, [])

  const handleToggleActive = async (user) => {
    try {
      await adminApi.updateUser(user.id, { is_active: !user.is_active })
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u))
      toast.success(`User ${user.is_active ? 'disabled' : 'enabled'}`)
    } catch { toast.error('Action failed') }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    try {
      await adminApi.deleteUser(userToDelete.id)
      setUsers(users.filter(u => u.id !== userToDelete.id))
      toast.success('User deleted permanently')
      setUserToDelete(null)
    } catch { toast.error('Failed to delete user') }
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault(); setSubmitting(true)
    try {
      await adminApi.createAdmin(formData)
      toast.success(`Admin account created for ${formData.full_name}`)
      setIsCreating(false)
      setFormData({ email: '', full_name: '', password: '' })
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create admin')
    } finally { setSubmitting(false) }
  }

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 space-y-6 animate-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-title">User Accounts</h1>
        <p className="text-sm text-slate-500 mt-1">Manage system access and administrator roles</p>
      </div>

      {/* Create Admin card */}
      <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-title">Create Admin Account</h3>
              <p className="text-sm text-slate-500 mt-0.5">New admin accounts get full platform access and can log in to the Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setIsCreating(true)} className="btn-primary flex items-center gap-2 flex-shrink-0">
            <UserPlus size={15} /> Create Admin
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filter by name or email..."
          className="input-field pl-11"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex justify-center"><Spinner size={32} /></div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="Try a different search term or create a new admin." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider font-sans">User Details</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider font-sans">Role</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider font-sans">Status</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider font-sans text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs font-title"
                          style={{ background: user.role === 'admin' ? '#2563eb' : '#8b5cf6' }}>
                          {user.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 font-title">{user.full_name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest font-sans ${
                        user.role === 'admin'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-violet-50 text-violet-700 border border-violet-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all font-sans ${
                          user.is_active
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                            : 'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200'
                        }`}
                      >
                        <Power size={11} />
                        {user.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setUserToDelete(user)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCreating(false)} />
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl animate-scaleIn">
            <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2 font-title">
              <Shield className="text-blue-600" size={22} /> Create System Administrator
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              This account will have full admin access and can log in to the Admin Panel.
            </p>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Full Name</label>
                <input required type="text" className="input-field h-11" placeholder="e.g. John Smith"
                  value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Email Address</label>
                <input required type="email" className="input-field h-11" placeholder="admin@company.com"
                  value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Password</label>
                <input required type="password" minLength={8} className="input-field h-11" placeholder="Min. 8 characters"
                  value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsCreating(false)} className="btn-ghost flex-1 py-3">Cancel</button>
                <button disabled={submitting} type="submit" className="btn-primary flex-1 py-3 flex justify-center items-center gap-2">
                  {submitting ? <Spinner size={16} /> : <><Shield size={15} /> Create Admin</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete ${userToDelete?.full_name}'s account? This action cannot be undone.`}
      />
    </div>
  )
}
