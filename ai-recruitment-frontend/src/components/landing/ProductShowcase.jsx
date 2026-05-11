import { motion } from 'framer-motion'
import { Sparkles, Send, Bot, User } from 'lucide-react'

function Bar({ pct, color, delay }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color, boxShadow: `0 0 10px ${color}` }}
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}

export function ProductShowcase() {
  return (
    <section id="product" className="relative py-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-1/3 h-[400px] w-[600px] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #0080ff60, transparent 70%)' }} />
        <div className="absolute right-1/4 bottom-1/3 h-[400px] w-[600px] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #8c1aff60, transparent 70%)' }} />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-white/60">
            Product Experience
          </div>
          <h2 className="font-display text-4xl font-bold leading-tight text-white md:text-6xl">
            A console built for the <span className="text-gradient">post-screening era</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-16"
        >
          <div className="absolute -inset-10 rounded-[3rem] opacity-50 blur-3xl"
            style={{ background: 'linear-gradient(135deg, #0080ff, #8c1aff, #65F7FF)' }} />

          <div className="relative overflow-hidden rounded-[2rem] glass-strong p-2">
            <div className="rounded-[1.6rem] p-6 md:p-8" style={{ background: '#06070d' }}>
              <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="font-display ml-3 text-xs text-white/50">
                    app.talentiq.ai / pipeline / staff-ml-engineer
                  </span>
                </div>
                <Sparkles className="h-4 w-4 text-[#65F7FF]" />
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                {/* Left — Top Matches */}
                <div className="rounded-2xl glass p-5 lg:col-span-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-display text-sm font-semibold text-white">Top Matches</h4>
                    <span className="text-[10px] text-white/50">2,481 analyzed</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { n: 'Sarah Chen', r: 'Sr. ML Engineer', s: 94, c: '#65F7FF' },
                      { n: 'Marcus Lee', r: 'Staff Engineer', s: 91, c: '#0080ff' },
                      { n: 'Aisha Patel', r: 'ML Researcher', s: 88, c: '#8c1aff' },
                      { n: 'Diego Rivera', r: 'MLOps Lead', s: 85, c: '#0080ff' },
                    ].map((c, i) => (
                      <motion.div
                        key={c.n}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="rounded-xl p-3"
                        style={{ background: 'rgba(255,255,255,0.02)' }}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full"
                              style={{ background: `linear-gradient(135deg, ${c.c}, #8c1aff)` }} />
                            <div>
                              <div className="text-sm font-medium text-white">{c.n}</div>
                              <div className="text-[10px] text-white/50">{c.r}</div>
                            </div>
                          </div>
                          <div className="font-display text-sm font-bold" style={{ color: c.c }}>{c.s}%</div>
                        </div>
                        <Bar pct={c.s} color={c.c} delay={0.3 + i * 0.1} />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Middle — Match Analysis */}
                <div className="rounded-2xl glass p-5 lg:col-span-4">
                  <div className="mb-4">
                    <h4 className="font-display text-sm font-semibold text-white">Match Analysis</h4>
                    <span className="text-[10px] text-white/50">Sarah Chen · live scoring</span>
                  </div>

                  <svg viewBox="0 0 200 120" className="h-32 w-full">
                    <defs>
                      <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0080ff" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#0080ff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[20, 40, 60, 80, 100].map((y) => (
                      <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="rgba(255,255,255,0.04)" />
                    ))}
                    <motion.path
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.6, ease: 'easeOut' }}
                      d="M0,90 L25,75 L50,80 L75,55 L100,60 L125,35 L150,42 L175,20 L200,25"
                      stroke="#65F7FF" strokeWidth="2" fill="none" strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 6px #65F7FF)' }}
                    />
                    <path d="M0,90 L25,75 L50,80 L75,55 L100,60 L125,35 L150,42 L175,20 L200,25 L200,120 L0,120 Z" fill="url(#area)" />
                  </svg>

                  <div className="mt-3 space-y-2">
                    {[
                      { l: 'Skills fit', p: 96, c: '#65F7FF' },
                      { l: 'Experience', p: 88, c: '#0080ff' },
                      { l: 'Culture', p: 92, c: '#8c1aff' },
                    ].map((m, i) => (
                      <div key={m.l}>
                        <div className="mb-1 flex justify-between text-[10px]">
                          <span className="text-white/50">{m.l}</span>
                          <span style={{ color: m.c }}>{m.p}%</span>
                        </div>
                        <Bar pct={m.p} color={m.c} delay={0.4 + i * 0.15} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — AI Chat */}
                <div className="rounded-2xl glass p-5 lg:col-span-3">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="grid h-7 w-7 place-items-center rounded-lg"
                      style={{ background: 'linear-gradient(135deg, #0080ff, #8c1aff)' }}>
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-display text-sm font-semibold text-white">Ask TalentIQ</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <User className="h-4 w-4 shrink-0 text-white/50" />
                      <div className="rounded-xl rounded-tl-sm px-3 py-2 text-xs leading-relaxed text-white" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        Why is Sarah the top match?
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Bot className="h-4 w-4 shrink-0 text-[#65F7FF]" />
                      <div className="rounded-xl rounded-tl-sm px-3 py-2 text-xs leading-relaxed text-white"
                        style={{ border: '1px solid #65F7FF20', background: '#65F7FF05' }}>
                        Sarah scores 94% on a deep skills match, with 6 years in production ML and shipped LLM systems at scale.
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <input type="text" placeholder="Ask anything…" className="flex-1 bg-transparent text-xs outline-none text-white placeholder:text-white/40" readOnly />
                    <button type="button" className="grid h-7 w-7 place-items-center rounded-lg"
                      style={{ background: 'linear-gradient(135deg, #0080ff, #65F7FF)' }}>
                      <Send className="h-3 w-3 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
