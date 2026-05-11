import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'

function Counter({ to, suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v) => Math.floor(v).toLocaleString())

  useEffect(() => {
    if (inView) {
      const controls = animate(mv, to, { duration: 2.2, ease: [0.16, 1, 0.3, 1] })
      return controls.stop
    }
  }, [inView, mv, to])

  return (
    <span ref={ref} className="font-display text-5xl font-bold tracking-tight text-white md:text-7xl">
      <motion.span>{rounded}</motion.span>
      <span className="text-gradient">{suffix}</span>
    </span>
  )
}

const STATS = [
  { v: 500, s: '+', l: 'Companies' },
  { v: 50000, s: '+', l: 'Candidates analyzed' },
  { v: 95, s: '%', l: 'Matching accuracy' },
  { v: 80, s: '%', l: 'Hiring faster' },
]

export function Stats() {
  return (
    <section className="relative py-32">
      <div className="absolute inset-x-0 top-1/2 -z-10 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #0080ff40, transparent)' }} />

      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="text-center"
            >
              <Counter to={s.v} suffix={s.s} />
              <div className="mt-3 text-sm uppercase tracking-[0.18em] text-white/50">{s.l}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
