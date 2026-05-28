import React, { useEffect, useState } from 'react'
import { Users, UserPlus, Trash2, Shield, Power, Search, Filter, ShieldCheck } from 'lucide-react'
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
    <div className="page-enter bg-surface">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-1 leading-tight">Access Architecture</h2>
          <p className="text-on-surface-variant text-sm font-medium opacity-70">
            Control organizational permission nodes and administrator levels
          </p>
        </div>
      </div>

      {/* High-Level Admin Provisioning */}
      <div className="portal-card mb-8 p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-surface-container-lowest border-primary/20 shadow-xl overflow-hidden relative group">
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 rounded-[22px] bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-on-surface mb-1">Provision System Administrator</h3>
            <p className="text-sm text-on-surface-variant font-medium opacity-80 leading-relaxed max-w-lg">
              Grant master-level access to new core team members. Administrators can manage all job positions, talent pools, and organizational settings.
            </p>
          </div>
        </div>
        <button onClick={() => setIsCreating(true)} className="btn-ai py-3 px-8 shadow-md relative z-10">
          <UserPlus size={20} />
          <span>Authorize Admin</span>
        </button>
        <Shield size={160} className="absolute -right-12 -bottom-12 text-primary opacity-[0.03] group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
      </div>

      {/* Global Filter Array */}
      <div className="portal-card mb-6 p-2 flex flex-col md:flex-row gap-4 bg-surface-container-lowest shadow-sm">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-50" />
          <input
            type="text"
            placeholder="Search credentials by identity or email address..."
            className="w-full pl-11 pr-4 py-2.5 bg-surface-container-low border border-transparent rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 px-2 pb-2 md:pb-0">
           <button className="btn-secondary py-2 flex items-center gap-2">
             <Filter size={16} />
             <span>Privilege</span>
           </button>
           <button className="btn-secondary py-2 flex items-center gap-2" onClick={loadUsers}>
             <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      {/* Credential Matrix */}
      <div className="portal-card overflow-hidden shadow-lg border-outline-variant/60">
        {loading ? (
          <div className="p-24 flex flex-col items-center justify-center gap-5">
             <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             <p className="text-xs font-black uppercase tracking-[0.2em] text-outline">Synchronizing Database...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-[28px] bg-surface-container border border-outline-variant flex items-center justify-center">
               <Users size={28} className="text-outline opacity-30" />
            </div>
            <p className="text-sm font-bold text-on-surface">No users match your query</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="stitch-table">
              <thead>
                <tr>
                  <th>Identity Context</th>
                  <th>Permission Level</th>
                  <th>Status</th>
                  <th className="text-right">Access Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="group hover:bg-surface-container-low transition-colors cursor-default">
                    <td>
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-[14px] flex items-center justify-center text-xs font-black text-white shadow-sm", user.role === 'admin' ? "bg-primary" : "bg-secondary")}>
                          {getInitials(user.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate leading-tight">{user.full_name}</p>
                          <p className="text-[11px] font-medium text-outline truncate mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest", 
                        user.role === 'admin' ? "bg-primary/5 text-primary border-primary/20" : "bg-surface-container-high text-outline border-outline-variant"
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm",
                          user.is_active
                            ? "text-tertiary bg-tertiary/5 border-tertiary/20 hover:bg-tertiary/10"
                            : "text-error bg-error/5 border-error/20 hover:bg-error/10"
                        )}
                      >
                        <Power size={10} />
                        {user.is_active ? 'Authenticated' : 'Revoked'}
                      </button>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 text-outline hover:text-primary transition-colors"><Shield size={16} /></button>
                        <button
                          onClick={() => setUserToDelete(user)}
                          className="p-2 text-outline hover:text-error transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Provisioning Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-xl transition-all animate-fadeIn" onClick={() => setIsCreating(false)} />
          <div className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-[32px] p-10 shadow-2xl animate-enter">
            <div className="w-12 h-12 rounded-[18px] bg-primary text-on-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
               <Shield size={24} />
            </div>
            <h3 className="text-2xl font-bold text-on-surface mb-2">Architect New Admin</h3>
            <p className="text-sm text-on-surface-variant font-medium opacity-70 mb-8 leading-relaxed">
              Create a high-privilege account with full architectural control over the TalentIQ ecosystem.
            </p>
            
            <form onSubmit={handleCreateAdmin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Full Identity</label>
                <input required type="text" className="w-full h-11 px-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" placeholder="E.g. Jane Foster"
                  value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">System Email</label>
                <input required type="email" className="w-full h-11 px-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" placeholder="admin@talent-iq.ai"
                  value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Master Password</label>
                <input required type="password" minLength={8} className="w-full h-11 px-4 rounded-xl text-sm font-bold bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" placeholder="Min. 8 characters"
                  value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
              
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setIsCreating(false)} className="btn-secondary flex-1 py-3 font-bold">Discard</button>
                <button disabled={submitting} type="submit" className="btn-primary flex-1 py-3 shadow-lg">
                  {submitting ? <RefreshCw className="animate-spin" size={18} /> : <span>Confirm Access</span>}
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
