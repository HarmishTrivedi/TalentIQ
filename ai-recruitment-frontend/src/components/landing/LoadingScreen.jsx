import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

export function LoadingScreen() {
  const [done, setDone] = useState(false)
  
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 1600)
    return () => clearTimeout(t)
  }, [])

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[200] grid place-items-center bg-[#000000]"
        >
          <div className="absolute inset-0 overflow-hidden">
            <div 
              className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 animate-vortex opacity-50"
              style={{
                background: 'conic-gradient(from 0deg, transparent, #0080ff40, transparent, #8c1aff40, transparent)',
                filter: 'blur(60px)',
              }}
            />
          </div>

          <div className="relative flex flex-col items-center gap-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="grid h-16 w-16 place-items-center rounded-2xl"
              style={{ 
                background: 'linear-gradient(135deg, #0080ff, #8c1aff)',
                boxShadow: '0 0 40px #0080ff66'
              }}
            >
              <Sparkles className="h-7 w-7 text-white" />
            </motion.div>
            <div className="font-display text-2xl font-bold tracking-tight text-white">TalentIQ</div>
            <div className="h-px w-48 overflow-hidden bg-white/5">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
                className="h-full w-1/2"
                style={{ background: 'linear-gradient(90deg, transparent, #0080ff, transparent)' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
