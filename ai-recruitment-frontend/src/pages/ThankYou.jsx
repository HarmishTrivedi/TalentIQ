import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Heart } from 'lucide-react'

export default function ThankYou() {
  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-[#070812] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.15),transparent_60%)]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center p-8 max-w-lg"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center mb-8 shadow-2xl shadow-violet-500/20">
          <CheckCircle size={40} className="text-white" />
        </div>
        
        <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          Interview Completed
        </h1>
        
        <p className="text-lg text-slate-400 mb-8 leading-relaxed">
          Thanks for joining the interview! We appreciate your time and effort. 
          Our team will review the session and get back to you soon.
        </p>
        
        <div className="flex items-center gap-2 text-violet-400 font-semibold text-lg">
          Have a good day! <Heart size={20} className="fill-current" />
        </div>

        <div className="mt-12 pt-12 border-t border-white/5 w-full">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm font-bold">T</div>
            <span className="text-sm font-bold text-slate-500 tracking-wider uppercase">TalentIQ AI</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
