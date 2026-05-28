import React from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Radar, Brain, TrendingUp } from 'lucide-react'

export default function Landing() {
  return (
    <div className="font-sans text-on-surface bg-background min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 size={16} className="text-white" />
            </div>
            <span className="font-display text-xl font-extrabold text-on-surface">TalentIQ</span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            {['Platform', 'Solutions', 'Intelligence', 'Resources'].map(item => (
              <a key={item} href="#" className="text-sm font-medium text-on-surface hover:text-primary transition-colors">{item}</a>
            ))}
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-sm font-semibold text-on-surface hover:text-primary transition-colors">Sign In</Link>
            <Link to="/register" className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-container transition-all text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="relative pt-24 pb-32 overflow-hidden"
          style={{ background: 'radial-gradient(circle at 70% 30%, rgba(37,99,235,0.05) 0%, transparent 60%)' }}>
          <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-[12px] uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Enterprise Intelligence
              </div>
              <h1 className="font-display text-[56px] leading-[1.1] tracking-tight font-extrabold text-on-surface">
                AI-Powered <br />
                <span className="text-primary">Recruitment</span> <br />
                Intelligence.
              </h1>
              <p className="text-lg text-on-surface-variant max-w-xl leading-relaxed">
                Identify, engage, and retain world-class talent with the industry's most sophisticated 4D candidate intelligence engine. Built for the modern enterprise.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register" className="px-8 py-4 bg-primary text-white rounded-lg font-bold text-base hover:shadow-lg hover:shadow-primary/20 transition-all">
                  Request Access
                </Link>
                <button className="px-8 py-4 border border-outline-variant bg-white text-on-surface rounded-lg font-bold text-base hover:bg-surface-container-low transition-all flex items-center gap-2">
                  View Product Tour
                </button>
              </div>
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-surface-container" />
                  ))}
                </div>
                <div className="text-sm text-on-surface-variant">
                  <span className="font-bold text-on-surface">500+</span> Enterprise deployments
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative z-10 border border-outline-variant bg-white rounded-2xl shadow-2xl overflow-hidden p-6">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-outline-variant/30">
                  <div className="font-semibold text-on-surface">Talent Mapping</div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="h-32 bg-surface-container-low rounded-xl border border-dashed border-outline-variant flex items-center justify-center">
                    <BarChart3 size={48} className="text-primary/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-container-low rounded-xl">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Candidate Fit</div>
                      <div className="text-xl font-black text-primary">94.2%</div>
                    </div>
                    <div className="p-4 bg-surface-container-low rounded-xl">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Engagement</div>
                      <div className="text-xl font-black text-secondary">High</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-3/4 rounded-full" />
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-1/2 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </section>

        {/* Social Proof Marquee */}
        <section className="py-16 border-y border-outline-variant/30">
          <div className="max-w-[1280px] mx-auto px-6">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-10">
              Trusted by World-Class Organizations
            </p>
            <div className="overflow-hidden whitespace-nowrap relative"
              style={{ maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}>
              <div className="inline-flex gap-20 py-4 items-center animate-scroll">
                {['NEXUS', 'VELOCITY', 'ORBITAL', 'QUANTUM', 'SYNAPSE', 'NEXUS', 'VELOCITY', 'ORBITAL', 'QUANTUM', 'SYNAPSE'].map((name, i) => (
                  <span key={i} className="font-display text-2xl font-black text-on-surface/20 hover:text-on-surface/40 transition-colors">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-32 bg-white">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="max-w-3xl mb-20">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-4">Platform Capabilities</p>
              <h3 className="font-display text-4xl font-bold text-on-surface mb-6 leading-tight">
                Next-generation features for high-volume hiring teams.
              </h3>
              <p className="text-lg text-on-surface-variant">
                Our platform consolidates fragmented tools into a single, unified recruitment operating system.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Radar,
                  title: 'AI Talent Sourcing',
                  desc: 'Automate the discovery of passive talent across hundreds of platforms. Our AI predicts candidate readiness and cultural fit before you reach out.',
                },
                {
                  icon: Brain,
                  title: 'Interview Intelligence',
                  desc: 'Analyze soft skills and technical proficiency in real-time. Get automated debriefs that eliminate bias and accelerate decision-making cycles.',
                },
                {
                  icon: TrendingUp,
                  title: 'Retention Analytics',
                  desc: 'Go beyond the hire. Our predictive models analyze long-term performance and flight risks, helping you build stable, high-performance teams.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title}
                  className="p-10 border border-outline-variant rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg hover:shadow-primary/10 group">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-8 group-hover:bg-primary group-hover:text-white transition-all">
                    <Icon size={28} />
                  </div>
                  <h4 className="text-lg font-bold text-on-surface mb-4">{title}</h4>
                  <p className="text-on-surface-variant leading-relaxed text-sm">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats / Impact */}
        <section className="py-24 bg-surface-container-low">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="border border-outline-variant bg-white rounded-3xl overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-2">
              <div className="p-12 lg:p-20 flex flex-col justify-center">
                <h2 className="font-display text-3xl font-bold text-on-surface mb-8">Measurable impact for your bottom line.</h2>
                <div className="space-y-10">
                  {[
                    { stat: '40%', title: 'Reduction in Time-to-Hire', desc: 'Automated screening protocols slash administrative tasks by nearly half.' },
                    { stat: '98%', title: 'Candidate Satisfaction', desc: 'Frictionless application flows designed for the modern professional.' },
                    { stat: '3.5x', title: 'Higher Quality Matches', desc: 'Neural mapping identifies skills that traditional keyword searches miss.' },
                  ].map(({ stat, title, desc }) => (
                    <div key={title} className="flex gap-6">
                      <div className="text-primary font-display text-[40px] leading-none font-bold shrink-0">{stat}</div>
                      <div>
                        <h5 className="font-bold text-on-surface mb-1">{title}</h5>
                        <p className="text-sm text-on-surface-variant">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-primary/5 p-12 lg:p-20 relative overflow-hidden border-l border-outline-variant/30 hidden lg:flex items-center justify-center">
                <div className="absolute inset-0 opacity-10"
                  style={{ backgroundImage: 'radial-gradient(#2563eb 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="relative z-10 w-full max-w-sm border border-outline-variant bg-white p-8 rounded-2xl shadow-xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">Q</div>
                    <div>
                      <div className="font-bold text-on-surface">Quarterly Report</div>
                      <div className="text-xs text-on-surface-variant">Recruitment ROI</div>
                    </div>
                  </div>
                  <div className="h-40 flex items-end gap-2 px-2">
                    {[40, 60, 50, 90].map((h, i) => (
                      <div key={i} className="w-full rounded-t-lg transition-all"
                        style={{ height: `${h}%`, background: `rgba(37,99,235,${0.1 + i * 0.1})` }} />
                    ))}
                  </div>
                  <div className="mt-8 pt-6 border-t border-outline-variant/30 flex justify-between items-center">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Net Efficiency</div>
                    <div className="text-primary font-bold">+24%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 bg-white">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-10">
            <h2 className="font-display text-5xl font-bold text-on-surface">Ready to evolve your recruitment?</h2>
            <p className="text-lg text-on-surface-variant max-w-2xl mx-auto">
              Join the world's most innovative recruitment teams. Experience TalentIQ's 4D intelligence with a personalized walkthrough.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
              <Link to="/register"
                className="px-10 py-5 bg-primary text-white rounded-lg font-bold text-base hover:shadow-xl hover:-translate-y-1 transition-all">
                Schedule Your Demo
              </Link>
              <button className="px-10 py-5 border border-outline-variant text-on-surface rounded-lg font-bold text-base hover:bg-surface-container-low transition-all">
                Talk to an Expert
              </button>
            </div>
            <p className="text-sm text-on-surface-variant">No credit card required. Free 14-day enterprise trial available.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-outline-variant/30 pt-20 pb-12">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <BarChart3 size={12} className="text-white" />
                </div>
                <span className="font-display text-lg font-extrabold text-on-surface">TalentIQ</span>
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs">
                The intelligence layer for enterprise recruitment. Precision sourcing and engagement powered by proprietary AI.
              </p>
            </div>
            {[
              { title: 'Product', links: ['AI Sourcing', 'Interview Intelligence', 'Engagement Tools', 'Pricing'] },
              { title: 'Company', links: ['About Us', 'Customers', 'Careers', 'Contact'] },
              { title: 'Support', links: ['Help Center', 'Documentation', 'Security', 'Privacy Policy'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h6 className="font-bold uppercase text-[11px] tracking-widest mb-6 text-on-surface">{title}</h6>
                <ul className="space-y-4">
                  {links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs text-on-surface-variant">© 2024 TalentIQ Systems Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/terms" className="text-xs text-on-surface-variant hover:text-primary transition-colors">Terms</Link>
              <Link to="/privacy" className="text-xs text-on-surface-variant hover:text-primary transition-colors">Privacy</Link>
              <Link to="/security" className="text-xs text-on-surface-variant hover:text-primary transition-colors">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
