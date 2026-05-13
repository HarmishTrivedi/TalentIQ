import React from 'react';
import { motion } from 'framer-motion';
import { X, Mic, MicOff, Video, VideoOff, Crown, User } from 'lucide-react';

export default function ParticipantsList({ interviewId, onClose }) {
  const participants = [
    {
      id: 1,
      name: 'John Doe',
      role: 'Candidate',
      isAudioOn: true,
      isVideoOn: true,
      isHost: false
    },
    {
      id: 2,
      name: 'Jane Smith',
      role: 'Recruiter',
      isAudioOn: true,
      isVideoOn: true,
      isHost: true
    }
  ];

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed right-0 top-0 bottom-0 w-80 bg-black/60 backdrop-blur-xl border-l border-purple-500/20 flex flex-col z-50"
    >
      {/* Header */}
      <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold">Participants</h3>
          <p className="text-purple-300 text-xs">{participants.length} in meeting</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-purple-400" />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
              {participant.name.charAt(0)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold text-sm truncate">
                  {participant.name}
                </p>
                {participant.isHost && (
                  <Crown className="w-3 h-3 text-yellow-400" />
                )}
              </div>
              <p className="text-purple-300 text-xs">{participant.role}</p>
            </div>

            <div className="flex gap-1">
              {participant.isAudioOn ? (
                <Mic className="w-4 h-4 text-green-400" />
              ) : (
                <MicOff className="w-4 h-4 text-red-400" />
              )}
              {participant.isVideoOn ? (
                <Video className="w-4 h-4 text-green-400" />
              ) : (
                <VideoOff className="w-4 h-4 text-red-400" />
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
