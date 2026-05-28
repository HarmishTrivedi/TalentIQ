import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Upload, Trash2, ChevronRight, ChevronLeft,
  User, RefreshCw, Calendar, Filter, MapPin, Mail,
  Briefcase, Award, ChevronsLeft, ChevronsRight, Brain
} from 'lucide-react'
import { candidatesApi } from '../services/api'
import { EmptyState, ConfirmationModal } from '../components/ui'
import { formatRelativeTime, getInitials, formatExperience, cn } from '../utils/helpers'
import toast from 'react-hot-toast'

const STATUS_STYLE = {
  ready:      'text-tertiary bg-tertiary/10 border-tertiary/20',
  processing: 'text-amber-600 bg-amber-50 border-amber-200',
  uploaded:   'text-primary bg-primary/5 border-primary/20',
  error:      'text-error bg-error/10 border-error/20',
}

export default function Candidates() {
  const [candidates, setCandidates] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(8)
  const [candidateToDelete, setCandidateToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const prevPage = useRef(1)

  const load = async (q = '', p = 1) => {
    setLoading(true)
    try {
      const res = await candidatesApi.list({ search: q || undefined, page: p, page_size: pageSize })
      setCandidates(res.data.candidates || [])
      setTotal(res.data.total || 0)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load('', 1) }, [])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(search, 1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setDirection(page >= prevPage.current ? 1 : -1)
    prevPage.current = page
    load(search, page)
  }, [page])

  const goToPage = (p) => {
    const totalPages = Math.ceil(total / pageSize)
    if (p < 1 || p > totalPages) return
    setPage(p)
  }

  const confirmDelete = async () => {
    if (!candidateToDelete) return
    setDeleting(true)
    try {
      await candidatesApi.delete(candidateToDelete.id)
      setCandidates(prev => prev.filter(c => c.id !== candidateToDelete.id))
      setTotal(t => t - 1)
      toast.success('Candidate deleted permanently')
      setCandidateToDelete(null)
    } catch { toast.error('Failed to delete candidate') }
    finally { setDeleting(false) }
  }

  const totalPages = Math.ceil(total / pageSize)

  // Page number range
  const getPageNumbers = () => {
    const pages = []
    let start = Math.max(1, page - 2)
    let end = Math.min(totalPages, page + 2)
    if (page <= 3) end = Math.min(5, totalPages)
    if (page > totalPages - 3) start = Math.max(1, totalPages - 4)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
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
      <div className="portal-card mb-6 p-2 flex flex-col md:flex-row gap-3 bg-surface-container-lowest">
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
            <Filter size={16} /> Filter
          </button>
          <button onClick={() => load(search, page)} className="btn-secondary py-2 flex items-center gap-2">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Cards Grid with animation */}
      <div className="relative overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-outline">Loading talent pool...</p>
          </div>
        ) : candidates.length === 0 ? (
          <EmptyState
            icon={User}
            title="No candidates found"
            description={search ? `No candidates match "${search}"` : 'Your talent pool is empty. Start by uploading CVs.'}
            action={!search && <Link to="/upload" className="btn-primary">Upload CV</Link>}
          />
        ) : (
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={page + search}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5"
            >
              {candidates.map((c, idx) => {
                const skills = [...(c.skills?.technical || []), ...(c.skills?.frameworks || [])].slice(0, 4)
                const statusCls = STATUS_STYLE[c.status] || STATUS_STYLE.ready
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="portal-card p-5 flex flex-col bg-surface-container-lowest shadow-md group hover:shadow-xl hover:border-primary/30 transition-all"
                  >
                    {/* Top — avatar + status */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black text-white shrink-0 bg-gradient-to-br from-primary to-secondary shadow-md">
                          {getInitials(c.name)}
                        </div>
                        <div className="min-w-0">
                          <Link to={`/candidates/${c.id}`}
                            className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate block leading-tight">
                            {c.name}
                          </Link>
                          <p className="text-[11px] text-outline truncate mt-0.5">
                            {c.experience_years > 0 ? formatExperience(c.experience_years) + ' exp' : 'Entry Level'}
                          </p>
                        </div>
                      </div>
                      <span className={cn('text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0', statusCls)}>
                        {c.status || 'Ready'}
                      </span>
                    </div>

                    {/* Contact info */}
                    <div className="space-y-1.5 mb-4">
                      {c.email && (
                        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                          <Mail size={12} className="text-outline opacity-60 shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                      {c.location && (
                        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                          <MapPin size={12} className="text-outline opacity-60 shrink-0" />
                          <span className="truncate">{c.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    <div className="flex-1 mb-4">
                      {skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {skills.map((sk, j) => (
                            <span key={j} className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container text-primary border border-primary/10 uppercase tracking-tighter">
                              {sk}
                            </span>
                          ))}
                          {[...(c.skills?.technical || []), ...(c.skills?.frameworks || [])].length > 4 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container text-outline border border-outline-variant">
                              +{[...(c.skills?.technical || []), ...(c.skills?.frameworks || [])].length - 4}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-outline opacity-50 italic">No skills listed</span>
                      )}
                    </div>

                    {/* AI summary snippet */}
                    {c.summary && (
                      <p className="text-[11px] text-on-surface-variant leading-relaxed mb-4 line-clamp-2 italic opacity-80">
                        "{c.summary}"
                      </p>
                    )}

                    {/* Footer */}
                    <div className="pt-3 border-t border-outline-variant flex items-center justify-between">
                      <span className="text-[10px] text-outline font-mono">
                        {formatRelativeTime(c.created_at)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Link to={`/interviews/schedule?candidateId=${c.id}`}
                          className="p-1.5 text-outline hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          title="Schedule Interview">
                          <Calendar size={14} />
                        </Link>
                        <button
                          onClick={() => setCandidateToDelete({ id: c.id, name: c.name })}
                          className="p-1.5 text-outline hover:text-error hover:bg-error/5 rounded-lg transition-all"
                          title="Delete">
                          <Trash2 size={14} />
                        </button>
                        <Link to={`/candidates/${c.id}`}
                          className="p-1.5 text-outline hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          title="View Profile">
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Pagination */}
      {!loading && total > pageSize && (
        <div className="flex items-center justify-center gap-1.5 mt-10">
          {/* First */}
          <button onClick={() => goToPage(1)} disabled={page === 1}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="First page">
            <ChevronsLeft size={15} />
          </button>

          {/* Prev */}
          <button onClick={() => goToPage(page - 1)} disabled={page === 1}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous page">
            <ChevronLeft size={15} />
          </button>

          {/* Page numbers */}
          {getPageNumbers().map(p => (
            <button key={p} onClick={() => goToPage(p)}
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold border transition-all',
                page === p
                  ? 'bg-primary text-on-primary border-primary shadow-md'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary hover:text-primary'
              )}>
              {p}
            </button>
          ))}

          {/* Next */}
          <button onClick={() => goToPage(page + 1)} disabled={page === totalPages}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next page">
            <ChevronRight size={15} />
          </button>

          {/* Last */}
          <button onClick={() => goToPage(totalPages)} disabled={page === totalPages}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Last page">
            <ChevronsRight size={15} />
          </button>

          {/* Page info */}
          <span className="ml-3 text-xs text-outline font-medium">
            Page {page} of {totalPages} · {total} total
          </span>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!candidateToDelete}
        onClose={() => setCandidateToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Candidate"
        message={`Are you sure you want to delete ${candidateToDelete?.name}? This will permanently remove their CV, AI analysis, and all match history.`}
      />
    </div>
  )
}
