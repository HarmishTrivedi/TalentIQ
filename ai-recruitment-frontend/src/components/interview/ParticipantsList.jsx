import React from 'react'
import { motion } from 'framer-motion'
import { Crown, Mic, MicOff, Signal, Video, VideoOff, X } from 'lucide-react'

export default function ParticipantsList({ participants = [], onClose }) {
  return (
    <motion.aside
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-2xl"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Participants</h2>
          <p className="text-xs text-slate-400">{participants.length} in meeting</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close participants">
          <X size={18} />
        </button>
      </div>
      <div className="space-y-3 p-4">
        {participants.map((participant) => (
          <div key={participant.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 font-semibold text-violet-200">
              {participant.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <span className="truncate">{participant.name}</span>
                {participant.isHost && <Crown size={13} className="text-amber-300" />}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-300">
                <Signal size={12} /> Connected
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              {participant.isAudioOn ? <Mic size={15} /> : <MicOff size={15} className="text-red-300" />}
              {participant.isVideoOn ? <Video size={15} /> : <VideoOff size={15} className="text-red-300" />}
            </div>
          </div>
        ))}
      </div>
    </motion.aside>
  )
}
