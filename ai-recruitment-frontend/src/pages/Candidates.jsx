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
  ready:      'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  processing: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  uploaded:   'text-violet-400 bg-violet-400/10 border-violet-400/20',
  error:      'text-red-400 bg-red-400/10 border-red-400/20',
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
    <div className="page-enter min-h-screen pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
            <h2 className="text-4xl font-bold text-white font-display tracking-tight">Talent Pool</h2>
          </div>
          <p className="text-white/40 text-sm font-medium ml-5">
            <span className="text-blue-400 font-bold">{total}</span> candidate{total !== 1 ? 's' : ''} currently mapped in neural space
          </p>
        </div>
        <Link to="/upload" className="h-14 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold flex items-center gap-3 shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all group">
          <Upload size={18} className="group-hover:-translate-y-1 transition-transform" />
          <span>Upload Intelligence</span>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 p-3 flex flex-col md:flex-row gap-4 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-md">
        <div className="relative flex-1 group">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 h-12 bg-white/[0.03] border border-white/5 rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:border-blue-500/30 transition-all font-medium"
            placeholder="Search by neural signature, skills, or identity..."
          />
        </div>
        <div className="flex gap-2">
          <button className="h-12 px-5 rounded-xl bg-white/[0.03] border border-white/5 text-white/60 font-bold text-xs flex items-center gap-2 hover:bg-white/10 transition-all">
            <Filter size={16} /> Filter
          </button>
          <button onClick={() => load(search, page)} className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 text-white/60 flex items-center justify-center hover:bg-white/10 transition-all">
            <RefreshCw size={18} className={loading ? 'animate-spin text-blue-400' : ''} />
          </button>
        </div>
      </div>

      {/* Cards Grid with animation */}
      <div className="relative min-h-[400px]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[...Array(pageSize)].map((_, i) => (
              <div key={i} className="h-72 rounded-[32px] bg-white/[0.02] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-32 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-[40px] text-white/40">
            <EmptyState
              icon={User}
              title="Intelligence Pool Empty"
              description={search ? `No neural matches found for "${search}"` : 'Your talent pool is awaiting data. Upload candidate CVs to start.'}
              action={!search && <Link to="/upload" className="h-12 px-8 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 mt-6 block w-fit mx-auto">Import Candidates</Link>}
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
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
            >
              {candidates.map((c, idx) => {
                const skills = [...(c.skills?.technical || []), ...(c.skills?.frameworks || [])].slice(0, 3)
                const statusCls = STATUS_STYLE[c.status] || STATUS_STYLE.ready
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group relative flex flex-col rounded-[32px] bg-white/[0.02] border border-white/5 p-6 hover:bg-white/[0.04] hover:border-blue-500/20 transition-all duration-500 hover:-translate-y-2 overflow-hidden shadow-xl"
                  >
                    {/* Ambient Glow */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-600/5 rounded-full blur-[60px] group-hover:bg-blue-600/10 transition-all" />

                    {/* Top — avatar + status */}
                    <div className="flex items-start justify-between mb-5 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black text-white shrink-0 bg-gradient-to-br from-blue-600 to-violet-700 shadow-lg shadow-blue-500/10 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                          {getInitials(c.name)}
                        </div>
                        <div className="min-w-0">
                          <Link to={`/candidates/${c.id}`}
                            className="text-[15px] font-bold text-white group-hover:text-blue-400 transition-colors truncate block leading-tight font-display">
                            {c.name}
                          </Link>
                          <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">
                            {c.experience_years > 0 ? formatExperience(c.experience_years) : 'Entry Level'}
                          </p>
                        </div>
                      </div>
                      <span className={cn('text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border shrink-0', statusCls)}>
                        {c.status || 'Ready'}
                      </span>
                    </div>

                    {/* Contact info */}
                    <div className="space-y-2 mb-6 relative z-10">
                      {c.email && (
                        <div className="flex items-center gap-2.5 text-xs text-white/40 font-medium">
                          <Mail size={12} className="text-blue-500 opacity-60 shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                      {c.location && (
                        <div className="flex items-center gap-2.5 text-xs text-white/40 font-medium">
                          <MapPin size={12} className="text-blue-500 opacity-60 shrink-0" />
                          <span className="truncate">{c.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    <div className="flex-1 mb-6 relative z-10">
                      {skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {skills.map((sk, j) => (
                            <span key={j} className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-white/5 text-blue-400 border border-white/5 uppercase tracking-widest">
                              {sk}
                            </span>
                          ))}
                          {[...(c.skills?.technical || []), ...(c.skills?.frameworks || [])].length > 3 && (
                            <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-white/5 text-white/20 border border-white/5 uppercase">
                              +{[...(c.skills?.technical || []), ...(c.skills?.frameworks || [])].length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-white/10 font-bold uppercase tracking-widest italic">Neural Map Empty</span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="pt-5 border-t border-white/5 flex items-center justify-between relative z-10">
                      <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">
                        {formatRelativeTime(c.created_at)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link to={`/interviews/schedule?candidateId=${c.id}`}
                          className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-blue-400 hover:bg-blue-400/5 rounded-lg transition-all"
                          title="Schedule Interview">
                          <Calendar size={14} />
                        </Link>
                        <button
                          onClick={() => setCandidateToDelete({ id: c.id, name: c.name })}
                          className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
                          title="Delete">
                          <Trash2 size={14} />
                        </button>
                        <Link to={`/candidates/${c.id}`}
                          className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/5 rounded-lg border border-white/5 transition-all"
                          title="View Intelligence">
                          <ChevronRight size={18} />
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
        <div className="flex items-center justify-center gap-2 mt-12 animate-fadeIn">
          {/* First */}
          <button onClick={() => goToPage(1)} disabled={page === 1}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-white/20 hover:text-white border border-white/5 hover:border-blue-500/30 transition-all disabled:opacity-10"
            title="Neural Start">
            <ChevronsLeft size={16} />
          </button>

          {/* Prev */}
          <button onClick={() => goToPage(page - 1)} disabled={page === 1}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-white/20 hover:text-white border border-white/5 hover:border-blue-500/30 transition-all disabled:opacity-10">
            <ChevronLeft size={16} />
          </button>

          {/* Page numbers */}
          <div className="flex gap-2 mx-2">
            {getPageNumbers().map(p => (
              <button key={p} onClick={() => goToPage(p)}
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all border',
                  page === p
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'bg-white/5 text-white/40 border-white/5 hover:border-blue-500/30 hover:text-white'
                )}>
                {p}
              </button>
            ))}
          </div>

          {/* Next */}
          <button onClick={() => goToPage(page + 1)} disabled={page === totalPages}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-white/20 hover:text-white border border-white/5 hover:border-blue-500/30 transition-all disabled:opacity-10">
            <ChevronRight size={16} />
          </button>

          {/* Last */}
          <button onClick={() => goToPage(totalPages)} disabled={page === totalPages}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-white/20 hover:text-white border border-white/5 hover:border-blue-500/30 transition-all disabled:opacity-10"
            title="Neural End">
            <ChevronsRight size={16} />
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!candidateToDelete}
        onClose={() => setCandidateToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Purge Neural Record"
        message={`Are you sure you want to delete ${candidateToDelete?.name}? This will permanently scrub their CV, AI vectors, and all associated intelligence records.`}
      />
    </div>
  )
}

