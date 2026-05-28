import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Upload, Trash2, ChevronRight, User, RefreshCw, ChevronLeft, Calendar } from 'lucide-react'
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
  const [pageSize] = useState(8)
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
    <div className="page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-1">Talent Pool</h2>
          <p className="text-on-surface-variant text-sm opacity-70">
            {total} candidate{total !== 1 ? 's' : ''} in your workspace
          </p>
        </div>
        <Link to="/upload" className="btn-primary">
          <Upload size={18} />
          <span>Upload CV</span>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="portal-card mb-6 p-2 flex flex-col md:flex-row gap-4 bg-surface-container-lowest">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline opacity-70" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-surface-container-low border border-transparent rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
            placeholder="Search candidates by name, email, or skill..."
          />
        </div>
        <div className="flex gap-2 px-2 pb-2 md:pb-0">
           <button className="btn-secondary py-2 flex items-center gap-2">
             <Filter size={16} />
             <span>Filter</span>
           </button>
           <button className="btn-secondary py-2 flex items-center gap-2">
             <RefreshCw size={16} className={loading ? 'animate-spin' : ''} onClick={() => load(search, page)} />
           </button>
        </div>
      </div>

      {/* List */}
      <div className="portal-card overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-outline">Loading talent pool...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-20 text-center">
            <EmptyState
              icon={User}
              title="No candidates found"
              description={search ? `No candidates match "${search}"` : "Your talent pool is empty. Start by uploading CVs."}
              action={!search && <Link to="/upload" className="btn-primary">Upload CV</Link>}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="stitch-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Experience</th>
                  <th>Core Skills</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {candidates.map(c => {
                  const skills = [...(c.skills?.technical || []), ...(c.skills?.frameworks || [])].slice(0, 3)
                  return (
                    <tr key={c.id} className="group transition-all">
                      <td>
                        <Link to={`/candidates/${c.id}`} className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 bg-gradient-to-br from-blue-500 to-violet-600 shadow-sm">
                            {getInitials(c.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">{c.name}</div>
                            <div className="text-[11px] text-outline truncate">{c.email}</div>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-on-surface-variant">
                          {c.experience_years > 0 ? formatExperience(c.experience_years) : 'Entry Level'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {skills.length > 0 ? (
                            skills.map((sk, j) => (
                              <span key={j} className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container-high text-primary border border-primary/10 uppercase tracking-tighter">
                                {sk}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-outline opacity-50 italic">No skills listed</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'ready' ? 'bg-tertiary' : 'bg-amber-400'}`} />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                            {c.status || 'Ready'}
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/interviews/schedule?candidateId=${c.id}`}
                            className="p-2 text-outline hover:text-primary transition-colors"
                            title="Schedule Interview"
                          >
                            <Calendar size={16} />
                          </Link>
                          <button
                            onClick={() => setCandidateToDelete({ id: c.id, name: c.name })}
                            className="p-2 text-outline hover:text-error transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                          <Link
                            to={`/candidates/${c.id}`}
                            className="p-2 text-outline hover:text-primary transition-colors"
                            title="View Profile"
                          >
                            <ChevronRight size={18} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && candidates.length > 0 && total > pageSize && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {/* First Page */}
          <button
            onClick={() => { setPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={page === 1}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            title="First page"
          >
            <ChevronLeft size={14} />
            <ChevronLeft size={14} style={{ marginLeft: -8 }} />
          </button>
          
          {/* Previous */}
          <button
            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={page === 1}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            title="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Page Numbers */}
          {(() => {
            const totalPages = Math.ceil(total / pageSize)
            const pages = []
            let startPage = Math.max(1, page - 2)
            let endPage = Math.min(totalPages, page + 2)
            
            if (page <= 3) endPage = Math.min(5, totalPages)
            if (page > totalPages - 3) startPage = Math.max(1, totalPages - 4)
            
            for (let i = startPage; i <= endPage; i++) {
              pages.push(
                <button
                  key={i}
                  onClick={() => { setPage(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold transition-all"
                  style={page === i
                    ? { background: 'var(--accent-cyan)', color: '#000', border: '1px solid var(--accent-cyan)' }
                    : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
                  }
                >
                  {i}
                </button>
              )
            }
            return pages
          })()}

          {/* Next */}
          <button
            onClick={() => { setPage(p => Math.min(Math.ceil(total / pageSize), p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={page === Math.ceil(total / pageSize)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            title="Next page"
          >
            <ChevronRight size={16} />
          </button>

          {/* Last Page */}
          <button
            onClick={() => { setPage(Math.ceil(total / pageSize)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={page === Math.ceil(total / pageSize)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            title="Last page"
          >
            <ChevronRight size={14} />
            <ChevronRight size={14} style={{ marginLeft: -8 }} />
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
