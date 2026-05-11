import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Nav() {
  const links = ['Features', 'How it works', 'Product', 'Pricing']
  
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav className="glass-strong flex w-full max-w-6xl items-center justify-between rounded-2xl px-5 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span 
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ 
              background: 'linear-gradient(135deg, #0080ff, #8c1aff)',
              boxShadow: '0 0 20px #0080ff66'
            }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            TalentIQ
          </span>
        </Link>
        
        <ul className="hidden items-center gap-7 text-sm text-white/60 md:flex">
          {links.map((l) => (
            <li key={l}>
              <a 
                href={`#${l.toLowerCase().replace(/\s/g, '-')}`} 
                className="hover:text-white transition-colors"
              >
                {l}
              </a>
            </li>
          ))}
        </ul>
        
        <div className="flex items-center gap-2">
          <Link 
            to="/login" 
            className="hidden text-sm text-white/60 hover:text-white sm:inline transition-colors"
          >
            Sign in
          </Link>
          <Link 
            to="/register" 
            className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-all hover:scale-[1.03]"
            style={{ 
              background: 'linear-gradient(135deg, #0080ff, #65F7FF)',
              boxShadow: '0 0 40px #0080ff66'
            }}
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  )
}
