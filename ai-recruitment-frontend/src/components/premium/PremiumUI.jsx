import React, { useMemo, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import {
  Sparkles, LayoutDashboard, Users, Upload, Briefcase, Zap, MessageSquare,
  CreditCard, LogOut, Search, Command, Bell, ShieldCheck, Radio, Orbit
} from 'lucide-react'
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion'
import { cn, getInitials } from '../../utils/helpers'
import { useAuthStore } from '../../store'

const vertexShader = `
  uniform float uTime;
  attribute float aScale;
  attribute float aArm;
  varying float vArm;
  void main() {
    vArm = aArm;
    vec3 p = position;
    float radius = length(p.xz);
    float twist = radius * 0.55 + uTime * 0.12;
    float s = sin(twist);
    float c = cos(twist);
    p.xz = mat2(c, -s, s, c) * p.xz;
    p.y += sin(uTime * 0.45 + radius * 1.7 + aArm) * 0.06;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aScale * (180.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  uniform float uTime;
  varying float vArm;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    float glow = smoothstep(0.5, 0.0, d);
    vec3 core = vec3(0.44, 0.95, 1.0);
    vec3 nebula = vec3(0.88, 0.24, 1.0);
    vec3 gold = vec3(1.0, 0.66, 0.24);
    vec3 color = mix(core, nebula, sin(vArm * 1.7 + uTime * 0.25) * 0.5 + 0.5);
    color = mix(color, gold, smoothstep(0.0, 0.18, glow) * 0.22);
    gl_FragColor = vec4(color, glow * 0.88);
  }
`

export function BrandMark({ compact = false }) {
  return (
    <Link to="/" className="group flex items-center gap-3">
      <div className="relative h-11 w-11 rounded-full border border-cyan-200/20 bg-black/40 shadow-[0_0_42px_rgba(34,211,238,0.28)] backdrop-blur-xl">
        <div className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffffff_0%,#67e8f9_16%,#7c3aed_44%,#020617_72%)]" />
        <div className="absolute -inset-1 rounded-full border border-fuchsia-300/20 animate-[spin_12s_linear_infinite]" />
        <Sparkles size={16} className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-white" />
      </div>
      {!compact && (
        <div>
          <div className="font-title text-lg font-black tracking-[0.28em] text-white">TALENTIQ</div>
          <div className="font-sans text-[10px] font-bold uppercase tracking-[0.34em] text-cyan-100/70">Cosmic Intelligence</div>
        </div>
      )}
    </Link>
  )
}

function GalaxyCore({ dense = false }) {
  const ref = useRef()
  const materialRef = useRef()
  const count = dense ? 5200 : 3000
  const { positions, scales, arms } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const scl = new Float32Array(count)
    const arm = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      const branch = i % 5
      const radius = Math.pow(Math.random(), 0.58) * 4.8
      const spin = radius * 0.92 + branch * ((Math.PI * 2) / 5)
      const scatter = (Math.random() - 0.5) * (0.16 + radius * 0.09)
      pos[i * 3] = Math.cos(spin + scatter) * radius
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.22 * (1 - radius / 7)
      pos[i * 3 + 2] = Math.sin(spin + scatter) * radius
      scl[i] = THREE.MathUtils.randFloat(0.6, radius < 0.9 ? 2.2 : 1.35)
      arm[i] = branch
    }
    return { positions: pos, scales: scl, arms: arm }
  }, [count])

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.045
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.16) * 0.035
    }
    if (materialRef.current) materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <group ref={ref} rotation={[0.9, 0.2, -0.12]}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-aScale" count={count} array={scales} itemSize={1} />
          <bufferAttribute attach="attributes-aArm" count={count} array={arms} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={{ uTime: { value: 0 } }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {[1.45, 2.25, 3.15].map((r, i) => (
        <mesh key={r} rotation={[Math.PI / 2 + i * 0.08, 0, i * 0.35]}>
          <torusGeometry args={[r, 0.006, 12, 220]} />
          <meshBasicMaterial color={i === 1 ? '#d946ef' : '#67e8f9'} transparent opacity={0.22 - i * 0.045} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.34, 48, 48]} />
        <meshBasicMaterial color="#fef9c3" transparent opacity={0.55} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function StarField() {
  const ref = useRef()
  const positions = useMemo(() => {
    const pts = new Float32Array(1800)
    for (let i = 0; i < 600; i += 1) {
      pts[i * 3] = (Math.random() - 0.5) * 18
      pts[i * 3 + 1] = (Math.random() - 0.5) * 11
      pts[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return pts
  }, [])
  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y = state.clock.elapsedTime * 0.015
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.13) * 0.05
  })
  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled>
      <PointMaterial transparent color="#c4b5fd" size={0.018} sizeAttenuation depthWrite={false} opacity={0.72} />
    </Points>
  )
}

export function AmbientScene({ intensity = 'normal', core = false }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(192,132,252,0.22),transparent_24%),radial-gradient(circle_at_22%_16%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_84%_22%,rgba(236,72,153,0.13),transparent_34%),linear-gradient(135deg,#01020a_0%,#050011_42%,#020617_100%)]" />
      <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.7)_0_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.38)_58%,rgba(0,0,0,0.92)_100%)]" />
      <div className="absolute left-1/2 top-1/2 h-[62vmin] w-[62vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <Canvas camera={{ position: [0, 0.35, core ? 7.2 : 8.6], fov: 58 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.45} />
        <Float speed={0.65} rotationIntensity={0.18} floatIntensity={0.45}>
          <StarField />
          {core && <GalaxyCore dense />}
        </Float>
      </Canvas>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,transparent_34%,rgba(125,211,252,0.05)_35%,transparent_37%,transparent_100%)]" />
      <div className={cn('absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black via-slate-950/70 to-transparent', intensity === 'soft' && 'opacity-80')} />
    </div>
  )
}

export function GalaxyStage({ children, className = '' }) {
  return (
    <section className={cn('relative min-h-screen overflow-hidden', className)}>
      <AmbientScene core />
      <div className="pointer-events-none absolute inset-0 backdrop-blur-[0.2px]" />
      <div className="relative z-10">{children}</div>
    </section>
  )
}

export function GlassPanel({ children, className = '', as: Tag = 'div', style, ...props }) {
  const mx = useMotionValue(50)
  const my = useMotionValue(50)
  const rx = useSpring(useMotionValue(0), { stiffness: 180, damping: 24 })
  const ry = useSpring(useMotionValue(0), { stiffness: 180, damping: 24 })
  const glow = useMotionTemplate`radial-gradient(circle at ${mx}% ${my}%, rgba(103,232,249,0.22), transparent 34%)`

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    mx.set(x); my.set(y)
    ry.set((x - 50) * 0.045)
    rx.set((50 - y) * 0.045)
  }

  return (
    <motion.div
      as={Tag}
      onMouseMove={onMove}
      onMouseLeave={() => { rx.set(0); ry.set(0) }}
      style={{ rotateX: rx, rotateY: ry, backgroundImage: glow, ...style }}
      className={cn('cosmic-panel rounded-[32px] border border-cyan-100/10 bg-black/30 shadow-[0_0_70px_rgba(34,211,238,0.08),inset_0_0_44px_rgba(255,255,255,0.035)] backdrop-blur-2xl transform-gpu', className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function PremiumButton({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'border-cyan-200/50 bg-cyan-200 text-black shadow-[0_0_44px_rgba(34,211,238,0.34)] hover:bg-white',
    ghost: 'border-cyan-100/15 bg-white/[0.045] text-white hover:border-cyan-200/35 hover:bg-cyan-200/10',
    dark: 'border-fuchsia-200/15 bg-black/60 text-white hover:bg-fuchsia-300/10',
  }
  return (
    <button
      className={cn('group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border px-5 py-3 font-sans text-sm font-black transition duration-300 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60', styles[variant], className)}
      {...props}
    >
      <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/50 to-transparent transition duration-700 group-hover:translate-x-[120%]" />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  )
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Deck' },
  { to: '/candidates', icon: Users, label: 'Talent' },
  { to: '/upload', icon: Upload, label: 'Ingest' },
  { to: '/jobs', icon: Briefcase, label: 'Roles' },
  { to: '/matching', icon: Zap, label: 'Gravity' },
  { to: '/chat', icon: MessageSquare, label: 'Signal' },
  { to: '/interview-room', icon: Radio, label: 'Room' },
  { to: '/plans', icon: CreditCard, label: 'Fuel' },
]

export function FloatingDock() {
  return (
    <nav className="fixed bottom-5 left-1/2 z-40 hidden -translate-x-1/2 rounded-full border border-cyan-100/15 bg-black/45 px-3 py-2 shadow-[0_0_80px_rgba(34,211,238,0.16)] backdrop-blur-2xl md:flex">
      {navItems.map(({ to, icon: Icon, label }, i) => (
        <NavLink key={to} to={to} title={label} className={({ isActive }) => cn(
          'group relative mx-1 flex h-12 w-12 items-center justify-center rounded-full text-slate-300 transition-all duration-500 hover:-translate-y-2 hover:scale-110 hover:text-white',
          isActive && 'bg-cyan-200 text-black shadow-[0_0_34px_rgba(34,211,238,0.55)]'
        )}>
          <span className="absolute inset-[-10px] rounded-full border border-cyan-200/0 transition group-hover:border-cyan-200/25" style={{ animationDelay: `${i * 120}ms` }} />
          <Icon size={18} />
          <span className="pointer-events-none absolute -top-9 scale-90 rounded-full border border-cyan-100/15 bg-black/70 px-3 py-1 font-sans text-[11px] font-black text-cyan-100 opacity-0 backdrop-blur-xl transition group-hover:scale-100 group-hover:opacity-100">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function PremiumTopbar({ title, isAdminPath }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <header className="sticky top-0 z-30 border-b border-cyan-100/10 bg-black/35 px-4 py-3 backdrop-blur-2xl sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <BrandMark compact />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-title text-base font-black text-white">{title}</h1>
              {isAdminPath && <span className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-widest text-cyan-100">Admin</span>}
            </div>
            <p className="font-sans text-xs text-cyan-100/55">Cosmic intelligence deck for gravitational hiring signals</p>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center lg:flex">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-full border border-cyan-100/15 bg-black/35 px-4 py-2 text-cyan-100/60 shadow-[inset_0_0_24px_rgba(103,232,249,0.04)]">
            <Search size={15} />
            <input className="w-full bg-transparent font-sans text-sm text-white outline-none placeholder:text-cyan-100/35" placeholder="Transmit a query across the TalentIQ universe..." />
            <Command size={14} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/account?setting=notifications')} title="Notification settings" className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-100/15 bg-white/[0.04] text-cyan-100/70 transition hover:text-white">
            <Bell size={16} />
          </button>
          {user?.role === 'admin' && (
            <Link to="/admin/dashboard" className="hidden h-10 items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 font-sans text-xs font-bold text-cyan-100 sm:flex">
              <ShieldCheck size={14} /> Admin
            </Link>
          )}
          <div className="hidden items-center gap-3 rounded-full border border-cyan-100/15 bg-white/[0.04] py-1.5 pl-2 pr-3 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[radial-gradient(circle,#fff_0%,#67e8f9_35%,#7c3aed_100%)] font-title text-xs font-black text-black">
              {getInitials(user?.full_name || 'U')}
            </div>
            <div className="max-w-28 truncate font-sans text-xs font-bold text-white">{user?.full_name || 'User'}</div>
          </div>
          <button onClick={handleLogout} title="Sign out" className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-100/15 bg-white/[0.04] text-cyan-100/70 transition hover:border-red-300/30 hover:text-red-200">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}

export function OrbitingModules({ items = [] }) {
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block">
      {items.map((item, i) => {
        const angle = (i / items.length) * Math.PI * 2
        const x = 50 + Math.cos(angle) * 37
        const y = 50 + Math.sin(angle) * 31
        return (
          <motion.div
            key={item.title}
            className="absolute w-56 rounded-[26px] border border-cyan-100/15 bg-black/38 p-4 shadow-[0_0_50px_rgba(34,211,238,0.12)] backdrop-blur-2xl"
            style={{ left: `${x}%`, top: `${y}%`, translateX: '-50%', translateY: '-50%' }}
            animate={{ y: [0, -12, 0], rotate: [0, i % 2 ? 1.5 : -1.5, 0] }}
            transition={{ duration: 7 + i, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="mb-2 flex items-center gap-2 font-sans text-xs font-black uppercase tracking-widest text-cyan-100"><Orbit size={14} />{item.title}</div>
            <p className="font-sans text-xs leading-5 text-slate-300">{item.copy}</p>
          </motion.div>
        )
      })}
    </div>
  )
}

export function PageTransition({ children }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.985, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  )
}
