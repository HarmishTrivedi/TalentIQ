import { motion } from 'framer-motion'
import { Brain, MessageSquare, Shield, FileText, Search, BarChart3 } from 'lucide-react'

const FEATURES = [
  { icon: Brain, title: 'AI Candidate Matching', desc: 'Frontier models score every applicant against your role in milliseconds.', tone: 'primary' },
  { icon: MessageSquare, title: 'Interview Intelligence', desc: 'Real-time signals on tone, depth, and competency across every conversation.', tone: 'violet' },
  { icon: Shield, title: 'Fraud Detection', desc: 'Catch fabricated resumes, deepfakes, and proxy interviews before they cost you.', tone: 'cyan' },
  { icon: FileText, title: 'Resume Intelligence', desc: 'Parse, normalize, and enrich every CV into deeply structured candidate data.', tone: 'primary' },
  { icon: Search, title: 'Vector Search', desc: 'Semantic talent discovery across millions of profiles, ranked by true intent.', tone: 'violet' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Pipeline velocity, source ROI, and hiring health — visualized in real time.', tone: 'cyan' },
]

const toneColor = {
  primary: '#0080ff',
  violet: '#8c1aff',
  cyan: '#65F7FF',
}

function Card({ f, i }) {
  const Icon = f.icon
  const c = toneColor[f.tone]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -8 }}
      className="group relative rounded-3xl"
    >
      <div className="absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `linear-gradient(135deg, ${c}, transparent 40%, ${c})`,
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: 1,
        }} />

      <div className="relative h-full overflow-hidden rounded-3xl glass-strong p-7">
        <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shine" />

        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${c}33, ${c}11)`,
            boxShadow: `inset 0 0 20px ${c}22, 0 0 24px ${c}44`,
          }}>
          <Icon className="h-5 w-5" style={{ color: c }} />
        </div>

        <h3 className="font-display mb-2 text-xl font-semibold text-white">{f.title}</h3>
        <p className="text-sm leading-relaxed text-white/60">{f.desc}</p>

        <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-60"
          style={{ background: c }} />
      </div>
    </motion.div>
  )
}

export function Features() {
  return (
    <section id="features" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-white/60">
            Capabilities
          </div>
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl">
            <span className="text-gradient">Six engines.</span> One hiring brain.
          </h2>
          <p className="mt-5 text-white/60">
            Every step of recruitment, transformed by intelligence purpose-built for talent.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => <Card key={f.title} f={f} i={i} />)}
        </div>
      </div>
    </section>
  )
}
