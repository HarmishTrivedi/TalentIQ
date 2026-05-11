import { LoadingScreen } from '../components/landing/LoadingScreen'
import { CursorGlow } from '../components/landing/CursorGlow'
import { Nav } from '../components/landing/Nav'
import { Hero } from '../components/landing/Hero'
import { Features } from '../components/landing/Features'
import { HowItWorks } from '../components/landing/HowItWorks'
import { ProductShowcase } from '../components/landing/ProductShowcase'
import { Stats } from '../components/landing/Stats'
import { Pricing } from '../components/landing/Pricing'
import { CTA } from '../components/landing/CTA'

export default function Landing() {
  return (
    <>
      <LoadingScreen />
      <CursorGlow />
      <main className="landing-prime relative flex flex-col min-h-screen bg-[#000000] text-white overflow-x-hidden">
        <Nav />
        <Hero />
        <Features />
        <HowItWorks />
        <ProductShowcase />
        <Stats />
        <Pricing />
        <CTA />
      </main>
    </>
  )
}
