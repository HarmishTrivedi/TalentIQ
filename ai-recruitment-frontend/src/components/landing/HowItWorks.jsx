import { motion } from 'framer-motion'
import { Upload, Cpu, Target } from 'lucide-react'

const STEPS = [
  { icon: Upload, title: 'Upload CV', desc: 'Drop a resume, a folder, or pipe an entire ATS — TalentIQ ingests at scale.', c: '#0080ff' },
  { icon: Cpu, title: 'AI Understands', desc: 'Multi-model reasoning extracts signal from skills, story, and intent.', c: '#8c1aff' },
  { icon: Target, title: 'Perfect Match', desc: 'Ranked, explained, and ready to interview — with calibrated confidence.', c: '#65F7FF' },
]

function Particles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
          style={{
            background: i % 2 === 0 ? '#0080ff' : '#65F7FF',
            boxShadow: `0 0 12px ${i % 2 === 0 ? '#0080ff' : '#65F7FF'}`,
          }}
          initial={{ left: '10%', opacity: 0 }}
          animate={{ left: ['10%', '90%'], opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 4 + (i % 3),
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(ellipse, #8c1aff, transparent 60%)' }} />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-white/60">
            How it works
          </div>
          <h2 className="font-display text-4xl font-bold leading-tight text-white md:text-6xl">
            From CV to <span className="text-gradient">perfect hire</span>
          </h2>
        </motion.div>

        <div className="relative mt-20">
          <div aria-hidden className="absolute left-0 right-0 top-[88px] hidden h-px md:block">
            <div className="relative mx-auto h-full w-[80%]">
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(90deg, transparent, #0080ff, #8c1aff, #65F7FF, transparent)', filter: 'blur(0.5px)' }} />
              <Particles />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="relative text-center"
                >
                  <div className="relative mx-auto mb-6 grid h-44 w-44 place-items-center">
                    <div className="absolute inset-0 rounded-full opacity-50 blur-2xl" style={{ background: s.c }} />
                    <div className="relative grid h-44 w-44 place-items-center rounded-full glass-strong"
                      style={{ boxShadow: `0 0 50px ${s.c}66, inset 0 0 30px ${s.c}22` }}>
                      <div className="absolute inset-3 rounded-full border border-white/10" />
                      <div className="absolute inset-7 rounded-full border border-white/5" />
                      <Icon className="relative h-12 w-12" style={{ color: s.c }} />
                    </div>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full glass px-2.5 py-0.5 text-xs font-bold"
                      style={{ color: s.c }}>
                      0{i + 1}
                    </div>
                  </div>
                  <h3 className="font-display mb-2 text-2xl font-semibold text-white">{s.title}</h3>
                  <p className="mx-auto max-w-xs text-sm leading-relaxed text-white/60">{s.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
