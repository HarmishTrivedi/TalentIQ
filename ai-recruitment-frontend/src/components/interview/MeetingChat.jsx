import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Paperclip, Send, X } from 'lucide-react'

export default function MeetingChat({ messages = [], onSend, onClose }) {
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (event) => {
    event.preventDefault()
    const text = newMessage.trim()
    if (!text) return
    onSend(text)
    setNewMessage('')
  }

  return (
    <motion.aside
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-2xl"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Meeting chat</h2>
          <p className="text-xs text-slate-400">Messages in this interview</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close chat">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">No messages yet</div>
        ) : messages.map((message) => (
          <div key={message.id} className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.isOwn ? 'bg-violet-600 text-white' : 'border border-white/10 bg-white/[0.05] text-slate-100'}`}>
              {!message.isOwn && <p className="mb-1 text-xs font-medium text-violet-300">{message.sender}</p>}
              <p className="text-sm">{message.text}</p>
              <p className="mt-1 text-[11px] opacity-60">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="border-t border-white/10 p-4">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
          <button type="button" disabled title="File sharing ready for integration" className="rounded-xl p-2 text-slate-500">
            <Paperclip size={18} />
          </button>
          <input value={newMessage} onChange={(event) => setNewMessage(event.target.value)} placeholder="Send a message" className="flex-1 bg-transparent px-1 text-sm text-white outline-none placeholder:text-slate-500" />
          <button type="submit" disabled={!newMessage.trim()} className="rounded-xl bg-violet-600 p-2.5 text-white transition hover:bg-violet-500 disabled:opacity-40">
            <Send size={17} />
          </button>
        </div>
      </form>
    </motion.aside>
  )
}
