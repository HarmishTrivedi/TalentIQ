import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Send, Plus, MessageSquare, Sparkles, User, Trash2,
  Bot, ChevronDown, Copy, RotateCcw, Zap, Users,
  Briefcase, Brain, Search, Filter, ChevronRight,
  Wand2, Target, FileText, Hash, Edit2, Check, X
} from 'lucide-react'
import { chatApi, candidatesApi, jobsApi } from '../services/api'
import { Spinner, ConfirmationModal } from '../components/ui'
import { formatRelativeTime, getInitials } from '../utils/helpers'
import toast from 'react-hot-toast'

// ── Markdown-like renderer ────────────────────────────────────────────────────
function RenderContent({ content }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} className="font-bold text-base mt-2" style={{ color: 'var(--text-primary)' }}>{line.slice(4)}</h3>
        if (line.startsWith('## '))  return <h2 key={i} className="font-bold text-lg mt-3" style={{ color: 'var(--text-primary)' }}>{line.slice(3)}</h2>
        if (line.startsWith('# '))   return <h1 key={i} className="font-bold text-xl mt-3" style={{ color: 'var(--text-primary)' }}>{line.slice(2)}</h1>
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent-cyan)' }} />
              <span dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />
            </div>
          )
        }
        if (/^\d+\.\s/.test(line)) {
          const num = line.match(/^(\d+)\./)[1]
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="font-bold text-xs mt-0.5 flex-shrink-0 w-5 text-right" style={{ color: 'var(--accent-cyan)' }}>{num}.</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^\d+\.\s/, '')) }} />
            </div>
          )
        }
        if (line.trim() === '') return <div key={i} className="h-1" />
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
      })}
    </div>
  )
}

function formatInline(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, `<code style="background:var(--bg-card-hover);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.85em">$1</code>`)
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ message, onCopy }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [timeAgo, setTimeAgo] = useState(() => formatRelativeTime(message.created_at))

  // Update time display every 1 second for real-time accuracy
  useEffect(() => {
    // Update immediately
    setTimeAgo(formatRelativeTime(message.created_at))
    
    // Then update every second
    const interval = setInterval(() => {
      setTimeAgo(formatRelativeTime(message.created_at))
    }, 1000) // Update every 1 second for real-time
    
    return () => clearInterval(interval)
  }, [message.created_at])

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy?.()
  }

  return (
    <div className={`flex gap-3 group ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start mb-4`}>
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={isUser
          ? { background: 'linear-gradient(135deg, #3b82f6, #7c3aed)' }
          : { background: 'var(--bg-card)', border: '1px solid var(--border)' }
        }
      >
        {isUser
          ? <User size={14} className="text-white" />
          : <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className="px-4 py-3 rounded-2xl"
          style={isUser
            ? { background: 'linear-gradient(135deg, #3b82f6, #7c3aed)', color: '#fff', borderBottomRightRadius: 6 }
            : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderBottomLeftRadius: 6 }
          }
        >
          {isUser
            ? <p className="text-sm leading-relaxed">{message.content}</p>
            : <RenderContent content={message.content} />
          }
        </div>

        {/* Actions */}
        <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'flex-row-reverse' : ''}`}>
          {isUser && (
            <span className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
              {timeAgo}
            </span>
          )}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}
              title="Copy"
            >
              <Copy size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start mb-4">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />
      </div>
      <div className="px-4 py-3 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: 'var(--accent-cyan)',
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Quick Suggestions ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: Brain,    text: "Show me top 5 frontend candidates with React experience" },
  { icon: Users,    text: "Which candidates have both React and Node.js skills?" },
  { icon: Zap,      text: "Compare the top 3 candidates for my latest job" },
  { icon: Briefcase,text: "Generate interview questions for a senior developer role" },
  { icon: Brain,    text: "Why did candidate X score low on job Y?" },
  { icon: Users,    text: "Find candidates with AWS and less than 3 years experience" },
]

export default function ChatPage() {
  const { sessionId: routeSessionId } = useParams()
  const navigate = useNavigate()
  const [sessions, setSessions]           = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [sending, setSending]             = useState(false)
  const [typing, setTyping]               = useState(false)
  const [candidates, setCandidates]       = useState([])
  const [jobs, setJobs]                   = useState([])
  const [selectedCandidate, setSelectedCandidate] = useState('')
  const [selectedJob, setSelectedJob]     = useState('')
  const [showNewChat, setShowNewChat]     = useState(false)
  const [sidebarOpen, setSidebarOpen]     = useState(true)
  const [sessionToDelete, setSessionToDelete] = useState(null)
  const [deleting, setDeleting]           = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [editTitle, setEditTitle]         = useState('')
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)
  const textareaRef    = useRef(null)

  useEffect(() => {
    chatApi.listSessions().then(res => setSessions(Array.isArray(res.data) ? res.data : []))
    candidatesApi.list({ page_size: 50 }).then(res => setCandidates(res.data.candidates || []))
    jobsApi.list({ page_size: 50 }).then(res => setJobs(res.data.jobs || []))
  }, [])

  useEffect(() => { if (routeSessionId) loadSession(routeSessionId) }, [routeSessionId])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typing])

  const loadSession = async (id) => {
    try {
      const res = await chatApi.getSession(id)
      setActiveSession(res.data)
      // Show ALL messages including assistant's greeting
      const allMessages = res.data.messages || []
      setMessages(allMessages)
      navigate(`/chat/${id}`, { replace: true })
    } catch (err) {
      console.error('Failed to load session:', err)
      toast.error('Failed to load session')
    }
  }

  const createSession = async () => {
    try {
      const res = await chatApi.createSession({
        candidate_id: selectedCandidate || undefined,
        job_id:       selectedJob       || undefined,
      })
      const s = res.data
      setSessions(p => [s, ...p])
      setActiveSession(s)
      // Show ALL messages including the initial greeting
      setMessages(s.messages || [])
      navigate(`/chat/${s.id}`, { replace: true })
      setShowNewChat(false)
      setSelectedCandidate('')
      setSelectedJob('')
      toast.success('New chat started')
    } catch (err) {
      console.error('Failed to create session:', err)
      toast.error('Failed to create session')
    }
  }

  const sendMessage = async (text) => {
    const content = (text || input).trim()
    if (!content || sending) return
    
    if (!activeSession) {
      // Auto-create a general session
      try {
        const res = await chatApi.createSession({})
        const s = res.data
        setSessions(p => [s, ...p])
        setActiveSession(s)
        // Show ALL messages including greeting
        setMessages(s.messages || [])
        navigate(`/chat/${s.id}`, { replace: true })
        // Send after session created
        setTimeout(() => sendMessageToSession(s.id, content), 100)
      } catch (err) {
        console.error('Failed to create session:', err)
        toast.error('Failed to create session')
      }
      setInput('')
      return
    }
    setInput('')
    sendMessageToSession(activeSession.id, content)
  }

  const sendMessageToSession = async (sessionId, content) => {
    // Add user message to UI immediately
    const userMsg = { id: `temp-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString() }
    setMessages(p => [...p, userMsg])
    setSending(true)
    setTyping(true)
    
    try {
      const res = await chatApi.sendMessage(sessionId, content)
      setTyping(false)
      // Add AI response
      setMessages(p => [...p, res.data.message])
    } catch (err) {
      setTyping(false)
      console.error('Failed to send message:', err)
      toast.error('Failed to send message')
      // Remove the temporary user message on error
      setMessages(p => p.filter(m => m.id !== userMsg.id))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const deleteSession = async (id, e) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    // Show confirmation modal
    setSessionToDelete(id)
  }

  const confirmDelete = async () => {
    if (!sessionToDelete) return
    setDeleting(true)
    
    try {
      await chatApi.deleteSession(sessionToDelete)
      // Remove from list
      setSessions(p => p.filter(s => s.id !== sessionToDelete))
      // Clear active session if it was deleted
      if (activeSession?.id === sessionToDelete) {
        setActiveSession(null)
        setMessages([])
        navigate('/chat', { replace: true })
      }
      toast.success('Chat deleted successfully')
    } catch (err) {
      console.error('Delete error:', err)
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to delete chat'
      toast.error(errorMsg)
    } finally {
      setDeleting(false)
      setSessionToDelete(null)
    }
  }

  const startRename = (session, e) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setEditingSession(session.id)
    setEditTitle(session.title || 'Chat session')
  }

  const cancelRename = () => {
    setEditingSession(null)
    setEditTitle('')
  }

  const saveRename = async (sessionId) => {
    if (!editTitle.trim()) {
      toast.error('Title cannot be empty')
      return
    }
    
    try {
      await chatApi.updateSession(sessionId, { title: editTitle.trim() })
      setSessions(p => p.map(s => s.id === sessionId ? { ...s, title: editTitle.trim() } : s))
      if (activeSession?.id === sessionId) {
        setActiveSession(prev => ({ ...prev, title: editTitle.trim() }))
      }
      toast.success('Chat renamed')
      setEditingSession(null)
      setEditTitle('')
    } catch (err) {
      console.error('Rename error:', err)
      toast.error('Failed to rename chat')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTextareaInput = (e) => {
    setInput(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  return (
    <div className="flex h-full overflow-hidden page-enter" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Sessions Sidebar ── */}
      <div
        className="flex-shrink-0 border-r flex flex-col overflow-hidden transition-all duration-300"
        style={{
          width: sidebarOpen ? 260 : 0,
          background: 'var(--sidebar-bg)',
          borderColor: 'var(--border)',
          overflow: sidebarOpen ? 'visible' : 'hidden'
        }}
      >
        <div className="p-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setShowNewChat(true)}
            className="btn-primary w-full h-9 text-sm"
          >
            <Plus size={15} /> New Chat
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sessions.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>No conversations yet</p>
          ) : sessions.map(s => (
            <div
              key={s.id}
              className="w-full text-left p-2.5 rounded-xl text-xs transition-all group relative"
              style={activeSession?.id === s.id
                ? { background: 'var(--tag-bg)', border: '1px solid var(--tag-border)', color: 'var(--accent-cyan)' }
                : { color: 'var(--text-secondary)', border: '1px solid transparent' }
              }
              onMouseEnter={e => { if (activeSession?.id !== s.id && editingSession !== s.id) { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
              onMouseLeave={e => { if (activeSession?.id !== s.id && editingSession !== s.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
            >
              {editingSession === s.id ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveRename(s.id)
                      if (e.key === 'Escape') cancelRename()
                    }}
                    className="flex-1 px-2 py-1 rounded text-xs"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    autoFocus
                  />
                  <button
                    onClick={() => saveRename(s.id)}
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                    style={{ color: 'var(--success-text)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--success-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={cancelRename}
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => loadSession(s.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-2 pr-12">
                      <MessageSquare size={12} className="flex-shrink-0" />
                      <span className="truncate font-medium">{s.title || 'Chat session'}</span>
                    </div>
                  </button>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    <button
                      onClick={(e) => startRename(s, e)}
                      className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-cyan)'; e.currentTarget.style.background = 'var(--tag-bg)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                      title="Rename"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--error-text)'; e.currentTarget.style.background = 'var(--error-bg)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Chat Header */}
        <div
          className="flex-shrink-0 px-4 py-3 border-b flex items-center gap-3"
          style={{ background: 'var(--topbar-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}
        >
          <button
            onClick={() => setSidebarOpen(p => !p)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <MessageSquare size={14} />
          </button>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)' }}
          >
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
              {activeSession?.title || 'TalentIQ AI Assistant'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Powered by AI · Access to all your recruitment data
            </p>
          </div>
          {activeSession && (
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px #34d399' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Online</span>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6" style={{ background: 'var(--bg-primary)' }}>
          {!activeSession ? (
            /* Welcome Screen — AI Recruiter Copilot */
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center px-4">
              {/* Hero */}
              <div className="relative mb-6">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)', boxShadow: '0 0 60px rgba(59,130,246,0.35)' }}
                >
                  <Sparkles size={36} className="text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center"
                  style={{ boxShadow: '0 0 10px #34d399', border: '2px solid var(--bg-primary)' }}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>

              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                AI Recruiter Copilot
              </h2>
              <p className="text-sm mb-2 max-w-md" style={{ color: 'var(--text-secondary)' }}>
                Your intelligent hiring assistant with full access to your talent pool, jobs, and match data.
              </p>
              <div className="flex items-center gap-2 mb-8">
                {['Candidate Search', 'Skill Filtering', 'Comparisons', 'Interview Prep'].map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-1 rounded-full font-semibold"
                    style={{ background: 'var(--tag-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--tag-border)' }}>
                    {tag}
                  </span>
                ))}
              </div>

              {/* Command examples */}
              <div className="w-full max-w-xl mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  Try asking...
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTIONS.map(({ icon: Icon, text }, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(text); inputRef.current?.focus(); }}
                      className="flex items-start gap-3 p-3.5 rounded-2xl text-left transition-all"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}
                    >
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'var(--tag-bg)' }}>
                        <Icon size={13} style={{ color: 'var(--accent-cyan)' }} />
                      </div>
                      <span className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>{text}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => sendMessage('Hello! What can you help me with today?')} className="btn-primary px-8 h-11">
                <Sparkles size={15} /> Start Chatting
              </button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
              {typing && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div
          className="flex-shrink-0 px-4 py-4 border-t"
          style={{ background: 'var(--topbar-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}
        >
          <div className="max-w-3xl mx-auto">
            <div
              className="flex items-end gap-3 p-3 rounded-2xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'Manrope, sans-serif',
                  minHeight: 24,
                  maxHeight: 160,
                  height: 24,
                }}
                placeholder="Ask TalentIQ anything about your candidates, jobs, or hiring strategy..."
                disabled={sending}
                rows={1}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent-cyan)', color: '#000' }}
              >
                {sending ? <Spinner size={14} /> : <Send size={15} />}
              </button>
            </div>
            <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
              Press <kbd className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>Shift+Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>

      {/* ── New Session Modal ── */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div
            className="w-full max-w-md rounded-3xl p-6 space-y-5 animate-scaleIn"
            style={{ background: 'var(--modal-bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)' }}>
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>New AI Conversation</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Optionally focus on a candidate or job</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                  Candidate Context (optional)
                </label>
                <select
                  value={selectedCandidate}
                  onChange={e => setSelectedCandidate(e.target.value)}
                  className="input-field"
                  style={{ background: 'var(--input-bg)' }}
                >
                  <option value="" style={{ background: 'var(--bg-secondary)' }}>General assistant — no specific candidate</option>
                  {candidates.map(c => (
                    <option key={c.id} value={c.id} style={{ background: 'var(--bg-secondary)' }}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                  Job Context (optional)
                </label>
                <select
                  value={selectedJob}
                  onChange={e => setSelectedJob(e.target.value)}
                  className="input-field"
                  style={{ background: 'var(--input-bg)' }}
                >
                  <option value="" style={{ background: 'var(--bg-secondary)' }}>No specific job</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id} style={{ background: 'var(--bg-secondary)' }}>{j.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowNewChat(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={createSession} className="btn-primary flex-1">
                <Sparkles size={14} /> Start Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmationModal
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Chat"
        message="Are you sure you want to delete this conversation? All messages will be permanently removed."
        confirmText="Delete Chat"
      />
    </div>
  )
}
