import React, { useEffect, useRef } from 'react';
import { MessageSquare, User, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TranscriptPanel({ transcript }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <motion.div 
      className="bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden h-64"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="p-3 border-b border-purple-500/20 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-purple-400" />
        <span className="text-white font-semibold">Live Transcript</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-red-400">Recording</span>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="p-4 h-[calc(100%-52px)] overflow-y-auto space-y-3 custom-scrollbar"
      >
        <AnimatePresence>
          {transcript.length === 0 ? (
            <div className="flex items-center justify-center h-full text-purple-300/50">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">Waiting for speech...</p>
              </div>
            </div>
          ) : (
            transcript.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${
                  item.speaker === 'recruiter' ? 'flex-row-reverse' : ''
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  item.speaker === 'candidate' 
                    ? 'bg-purple-500/20 text-purple-400' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {item.speaker === 'candidate' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <UserCircle className="w-4 h-4" />
                  )}
                </div>

                <div className={`flex-1 ${
                  item.speaker === 'recruiter' ? 'text-right' : ''
                }`}>
                  <div className={`inline-block px-4 py-2 rounded-2xl ${
                    item.speaker === 'candidate'
                      ? 'bg-purple-500/20 text-purple-100'
                      : 'bg-blue-500/20 text-blue-100'
                  }`}>
                    <p className="text-sm">{item.text}</p>
                  </div>
                  <p className="text-xs text-purple-300/50 mt-1">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
