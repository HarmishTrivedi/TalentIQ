import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Starfield } from './Starfield'

export function CTA() {
  return (
    <section id="cta" className="relative isolate overflow-hidden py-40">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[1200px] w-[1200px] -translate-x-1/2 -translate-y-1/2 animate-vortex"
          style={{
            background: 'conic-gradient(from 0deg, transparent, #8c1aff50, transparent 40%, #0080ff50, transparent 75%, #65F7FF40, transparent)',
            filter: 'blur(80px)',
          }} />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, #000 30%, transparent 70%)',
            boxShadow: '0 0 200px 80px #0080ff40',
          }} />
        <Starfield count={100} />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[0.95] tracking-tight text-white"
        >
          Ready to <span className="text-gradient">Transform</span>
          <br />Your Hiring?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto mt-7 max-w-xl text-lg text-white/60"
        >
          Join 500+ companies hiring 80% faster with TalentIQ.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10"
        >
          <Link
            to="/register"
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl px-10 py-5 font-semibold text-white transition-transform hover:scale-105"
            style={{
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #0080ff, #65F7FF)',
              boxShadow: '0 0 60px #0080ffcc, 0 0 120px #8c1aff80',
            }}
          >
            <span className="relative z-10">Get Started Free</span>
            <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          </Link>
          <div className="mt-4 text-xs text-white/40">No credit card required · 14-day trial</div>
        </motion.div>
      </div>

      <div className="relative mt-32 border-t border-white/5 pt-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-xs text-white/40 md:flex-row">
          <div>© 2026 TalentIQ — Intelligence for talent.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
          </div>
        </div>
      </div>
    </section>
  )
}
