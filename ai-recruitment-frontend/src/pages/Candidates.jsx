import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Upload, Trash2, ChevronRight, ChevronLeft,
  User, RefreshCw, Calendar, Filter, MapPin, Mail,
  ChevronsLeft, ChevronsRight
} from 'lucide-react'
import { candidatesApi } from '../services/api'
import { EmptyState, ConfirmationModal } from '../components/ui'
import { formatRelativeTime, getInitials, formatExperience, cn } from '../utils/helpers'
import toast from 'react-hot-toast'

const STATUS_STYLE = {
  ready:      'text-tertiary bg-tertiary/10 border-tertiary/20',
  processing: 'text-primary bg-primary/10 border-primary/20',
  uploaded:   'text-secondary bg-secondary/10 border-secondary/20',
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
  const [direction, setDirection] = useState(1)
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
    <div className="page-enter pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-1">Talent Pool</h2>
          <p className="text-sm text-on-surface-variant">
            <span className="text-primary font-bold">{total}</span> candidate{total !== 1 ? 's' : ''} in your pipeline
          </p>
        </div>
        <Link to="/upload"
          className="h-12 px-6 rounded-xl bg-primary text-white font-bold flex items-center gap-2 shadow-md hover:bg-primary-container transition-all w-fit">
          <Upload size={18} />
          <span>Upload Candidates</span>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 h-11 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-outline outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
            placeholder="Search by name, skills, or location..."
          />
        </div>
        <div className="flex gap-2">
          <button className="h-11 px-4 rounded-xl bg-surface-container-lowest border border-outline-variant text-on-surface-variant font-semibold text-xs flex items-center gap-2 hover:bg-surface-container transition-all">
            <Filter size={15} /> Filter
          </button>
          <button onClick={() => load(search, page)} className="w-11 h-11 rounded-xl bg-surface-container-lowest border border-outline-variant text-outline flex items-center justify-center hover:bg-surface-container hover:text-on-surface transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin text-primary' : ''} />
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="relative min-h-[400px]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {[...Array(pageSize)].map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-surface-container-low border border-outline-variant animate-pulse" />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-24 text-center bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl">
            <EmptyState
              icon={User}
              title="Talent Pool Empty"
              description={search ? `No candidates found for "${search}"` : 'Upload candidate CVs to start building your talent pool.'}
              action={!search && (
                <Link to="/upload" className="h-11 px-6 rounded-xl bg-primary text-white font-bold hover:bg-primary-container transition-all shadow-md mt-4 inline-flex items-center gap-2">
                  <Upload size={16} /> Import Candidates
                </Link>
              )}
            />
          </div>
        ) : (
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={page + search}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5"
            >
              {candidates.map((c, idx) => {
                const skills = [...(c.skills?.technical || []), ...(c.skills?.frameworks || [])].slice(0, 3)
                const statusCls = STATUS_STYLE[c.status] || STATUS_STYLE.ready
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="group portal-card p-5 flex flex-col hover:-translate-y-1"
                  >
                    {/* Top — avatar + status */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 bg-primary shadow-sm group-hover:scale-105 transition-transform duration-300">
                          {getInitials(c.name)}
                        </div>
                        <div className="min-w-0">
                          <Link to={`/candidates/${c.id}`}
                            className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate block leading-tight">
                            {c.name}
                          </Link>
                          <p className="text-[10px] text-outline font-semibold uppercase tracking-wider mt-0.5">
                            {formatExperience(c.experience_years) || 'Not Specified'}
                          </p>
                        </div>
                      </div>
                      <span className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0', statusCls)}>
                        {c.status || 'Ready'}
                      </span>
                    </div>

                    {/* Contact info */}
                    <div className="space-y-1.5 mb-4">
                      {c.email && (
                        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                          <Mail size={11} className="text-outline shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                      {c.location && (
                        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                          <MapPin size={11} className="text-outline shrink-0" />
                          <span className="truncate">{c.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    <div className="flex-1 mb-4">
                      {skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {skills.map((sk, j) => (
                            <span key={j} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">
                              {sk}
                            </span>
                          ))}
                          {[...(c.skills?.technical || []), ...(c.skills?.frameworks || [])].length > 3 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-surface-container border border-outline-variant text-outline uppercase">
                              +{[...(c.skills?.technical || []), ...(c.skills?.frameworks || [])].length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-outline font-semibold italic">No skills mapped</span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-outline-variant flex items-center justify-between">
                      <span className="text-[10px] text-outline font-semibold">
                        {formatRelativeTime(c.created_at)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Link to={`/interviews/schedule?candidateId=${c.id}`}
                          className="w-8 h-8 flex items-center justify-center text-outline hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          title="Schedule Interview">
                          <Calendar size={14} />
                        </Link>
                        <button
                          onClick={() => setCandidateToDelete({ id: c.id, name: c.name })}
                          className="w-8 h-8 flex items-center justify-center text-outline hover:text-error hover:bg-error/5 rounded-lg transition-all"
                          title="Delete">
                          <Trash2 size={14} />
                        </button>
                        <Link to={`/candidates/${c.id}`}
                          className="w-8 h-8 flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container rounded-lg border border-outline-variant transition-all"
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
        <div className="flex items-center justify-center gap-2 mt-10">
          <button onClick={() => goToPage(1)} disabled={page === 1}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface-container-lowest border border-outline-variant text-outline hover:text-on-surface hover:border-primary transition-all disabled:opacity-30">
            <ChevronsLeft size={15} />
          </button>
          <button onClick={() => goToPage(page - 1)} disabled={page === 1}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface-container-lowest border border-outline-variant text-outline hover:text-on-surface hover:border-primary transition-all disabled:opacity-30">
            <ChevronLeft size={15} />
          </button>

          <div className="flex gap-1.5 mx-1">
            {getPageNumbers().map(p => (
              <button key={p} onClick={() => goToPage(p)}
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all border',
                  page === p
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary hover:text-on-surface'
                )}>
                {p}
              </button>
            ))}
          </div>

          <button onClick={() => goToPage(page + 1)} disabled={page === totalPages}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface-container-lowest border border-outline-variant text-outline hover:text-on-surface hover:border-primary transition-all disabled:opacity-30">
            <ChevronRight size={15} />
          </button>
          <button onClick={() => goToPage(totalPages)} disabled={page === totalPages}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface-container-lowest border border-outline-variant text-outline hover:text-on-surface hover:border-primary transition-all disabled:opacity-30">
            <ChevronsRight size={15} />
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!candidateToDelete}
        onClose={() => setCandidateToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Candidate"
        message={`Are you sure you want to delete ${candidateToDelete?.name}? This will permanently remove their CV, AI vectors, and all associated records.`}
      />
    </div>
  )
}
