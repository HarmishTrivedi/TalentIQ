import React from 'react'
import { Link } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'

export default function Landing() {
  return (
    <div className="font-body-md text-body-md bg-background min-h-screen">
      <nav className="sticky top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-outline-variant/30">
        <div className="max-w-container_max_width mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <BarChart3 size={16} className="text-white" />
            </div>
            <span className="font-display-lg text-headline-sm font-extrabold text-on-surface">TalentIQ</span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            <a className="text-body-md font-medium text-on-surface hover:text-primary transition-colors" href="#">Platform</a>
            <a className="text-body-md font-medium text-on-surface hover:text-primary transition-colors" href="#">Solutions</a>
            <a className="text-body-md font-medium text-on-surface hover:text-primary transition-colors" href="#">Intelligence</a>
            <a className="text-body-md font-medium text-on-surface hover:text-primary transition-colors" href="#">Resources</a>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-body-md font-semibold text-on-surface hover:text-primary transition-colors">Sign In</Link>
            <button className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:brightness-110 transition-all">Book a Demo</button>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative pt-24 pb-32 overflow-hidden hero-gradient">
          <div className="max-w-container_max_width mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-[12px] uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Enterprise Intelligence
              </div>
              <h1 className="font-display-lg text-display-lg text-on-surface">
                AI-Powered <br />
                <span className="text-primary">Recruitment</span> <br />
                Intelligence.
              </h1>
              <p className="font-body-lg text-on-surface-variant max-w-xl leading-relaxed">
                Identify, engage, and retain world-class talent with the industry's most sophisticated 4D candidate intelligence engine. Built for the modern enterprise.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="px-8 py-4 bg-primary text-white rounded-lg font-bold text-body-lg hover:shadow-lg hover:shadow-primary/20 transition-all">Request Access</button>
                <button className="px-8 py-4 enterprise-border bg-white text-on-surface rounded-lg font-bold text-body-lg hover:bg-surface-container-low transition-all flex items-center gap-2">View Product Tour</button>
              </div>
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-surface-container" />
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-surface-container" />
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-surface-container" />
                </div>
                <div className="text-body-sm text-on-surface-variant"><span className="font-bold text-on-surface">500+</span> Enterprise deployments</div>
              </div>
            </div>

            <div className="relative">
              <div className="relative z-10 enterprise-border bg-white rounded-2xl shadow-2xl overflow-hidden p-6">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-outline-variant/30">
                  <div className="font-headline-sm">Talent Mapping</div>
                  <div className="flex gap-2"><div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" /></div>
                </div>
                <div className="space-y-6">
                  <div className="h-32 bg-surface-container-low rounded-xl border border-dashed border-outline-variant flex items-center justify-center">
                    <svg className="text-primary/30 w-12 h-12" viewBox="0 0 24 24"><path fill="currentColor" d="M3 13h4v8H3v-8zM10 3h4v18h-4V3zM17 8h4v13h-4V8z" /></svg>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-container-low rounded-xl">
                      <div className="text-label-caps text-on-surface-variant mb-1">CANDIDATE FIT</div>
                      <div className="text-headline-sm text-primary">94.2%</div>
                    </div>
                    <div className="p-4 bg-surface-container-low rounded-xl">
                      <div className="text-label-caps text-on-surface-variant mb-1">ENGAGEMENT</div>
                      <div className="text-headline-sm text-secondary">High</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden"><div className="h-full bg-primary w-3/4" /></div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden"><div className="h-full bg-primary w-1/2" /></div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </section>

        <section className="py-16 border-y border-outline-variant/30">
          <div className="max-w-container_max_width mx-auto px-6">
            <p className="text-center text-label-caps text-on-surface-variant mb-10 tracking-[0.2em] uppercase font-bold">Trusted by World-Class Organizations</p>
            <div className="marquee-container overflow-hidden whitespace-nowrap relative">
              <div className="inline-flex gap-20 animate-scroll py-4 items-center">
                <span className="font-display-lg text-headline-md font-black text-on-surface/20 transition-colors">NEXUS</span>
                <span className="font-display-lg text-headline-md font-black text-on-surface/20 transition-colors">VELOCITY</span>
                <span className="font-display-lg text-headline-md font-black text-on-surface/20 transition-colors">INSIGHT</span>
                <span className="font-display-lg text-headline-md font-black text-on-surface/20 transition-colors">NOVUS</span>
                <span className="font-display-lg text-headline-md font-black text-on-surface/20 transition-colors">VERTEX</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
