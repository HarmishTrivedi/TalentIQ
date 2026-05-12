import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Upload, Trash2, ChevronRight, User, RefreshCw, ChevronLeft } from 'lucide-react'
import { candidatesApi } from '../services/api'
import { SkeletonCard, EmptyState, TagList, Badge, ConfirmationModal } from '../components/ui'
import { formatRelativeTime, getInitials, formatExperience, truncate } from '../utils/helpers'
import toast from 'react-hot-toast'

const STATUS_COLORS = { ready: 'green', processing: 'yellow', uploaded: 'blue', error: 'red' }

export default function Candidates() {
  const [candidates, setCandidates] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12)
  const [deleting, setDeleting] = useState(null)
  const [candidateToDelete, setCandidateToDelete] = useState(null)

  const load = async (q = '', p = 1) => {
    setLoading(true)
    try {
      const res = await candidatesApi.list({ search: q || undefined, page: p, page_size: pageSize })
      setCandidates(res.data.candidates)
      setTotal(res.data.total)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load('', 1) }, [])
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(search, 1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { load(search, page) }, [page])

  const confirmDelete = async () => {
    if (!candidateToDelete) return
    const { id, name } = candidateToDelete
    setDeleting(id)
    try {
      await candidatesApi.delete(id)
      setCandidates(p => p.filter(c => c.id !== id))
      toast.success('Candidate deleted permanently')
    } catch { toast.error('Failed to delete candidate') }
    finally { setDeleting(null); setCandidateToDelete(null) }
  }

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
            Talent Pool
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {total} candidate{total !== 1 ? 's' : ''} in your workspace
          </p>
        </div>
        <Link to="/upload" className="btn-primary">
          <Upload size={15} /> Upload CV
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-11 h-11"
          placeholder="Search by name or email..."
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(6)].map((_, i) => <div key={i} className="flex-shrink-0 w-80"><SkeletonCard /></div>)}
        </div>
      ) : candidates.length === 0 ? (
        <EmptyState
          icon={User}
          title="No candidates yet"
          description="Upload CVs to start building your candidate database."
          action={<Link to="/upload" className="btn-primary">Upload First CV</Link>}
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 stagger">
          {candidates.map(c => {
            const skills = [...(c.skills?.technical || []), ...(c.skills?.frameworks || [])].slice(0, 5)
            return (
              <div key={c.id} className="portal-card p-5 group relative flex-shrink-0 w-80">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 bg-gradient-to-br from-blue-500 to-violet-600">
                    {getInitials(c.name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{c.name}</h3>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.email || 'No email'}</p>
                    {c.experience_years > 0 && (
                      <p className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                        {formatExperience(c.experience_years)} exp
                      </p>
                    )}
                  </div>
                </div>

                {c.summary && (
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {truncate(c.summary, 100)}
                  </p>
                )}

                {skills.length > 0 && <TagList tags={skills} max={4} />}

                <div
                  className="flex items-center justify-end mt-4 pt-3 gap-1"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setCandidateToDelete({ id: c.id, name: c.name })}
                      disabled={deleting === c.id}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--error-text)'; e.currentTarget.style.background = 'var(--error-bg)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      <Trash2 size={13} />
                    </button>
                    <Link
                      to={`/candidates/${c.id}`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                      style={{ color: 'var(--accent-cyan)', background: 'var(--tag-bg)' }}
                    >
                      View <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && candidates.length > 0 && total > pageSize && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Page {page} of {Math.ceil(total / pageSize)}
          </span>
          <button
            onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
            disabled={page === Math.ceil(total / pageSize)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!candidateToDelete}
        onClose={() => setCandidateToDelete(null)}
        onConfirm={confirmDelete}
        loading={!!deleting}
        title="Delete Candidate"
        message={`Are you sure you want to delete ${candidateToDelete?.name}? This will permanently remove their CV, AI analysis, and all match history.`}
      />
    </div>
  )
}
