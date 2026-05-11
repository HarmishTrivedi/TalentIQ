import React, { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration, DepthOfField, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

const nebulaVertex = `
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const nebulaFragment = `
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying vec3 vPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p = r * p * 2.05 + 0.17;
      a *= 0.48;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv - 0.5;
    uv.x *= 1.55;
    vec2 drift = vec2(sin(uTime * 0.035), cos(uTime * 0.028)) * 0.12 + uMouse * 0.04;
    float n1 = fbm(uv * 2.0 + drift);
    float n2 = fbm(uv * 4.2 - drift * 1.7 + n1 * 0.18);
    float radial = 1.0 - smoothstep(0.05, 0.88, length(uv));
    float fog = smoothstep(0.28, 0.86, n1 * 0.75 + n2 * 0.45) * radial;
    fog *= 0.35 + 0.12 * sin(uTime * 0.32 + n1 * 6.283);
    vec3 indigo = vec3(0.149, 0.078, 0.310);
    vec3 violet = vec3(0.333, 0.137, 0.659);
    vec3 cyan = vec3(0.290, 0.851, 1.0);
    vec3 teal = vec3(0.059, 0.651, 0.710);
    vec3 magenta = vec3(0.851, 0.298, 1.0);
    vec3 color = mix(indigo, violet, n1);
    color = mix(color, cyan, smoothstep(0.56, 0.92, n2) * 0.42);
    color = mix(color, teal, smoothstep(0.5, 0.8, n1) * 0.24);
    color = mix(color, magenta, smoothstep(0.66, 0.98, n1 + n2 * 0.4) * 0.28);
    gl_FragColor = vec4(color, fog * 0.22);
  }
`

const coreVertex = `
  uniform float uTime;
  uniform vec2 uMouse;
  attribute float aSize;
  attribute float aSeed;
  varying float vSeed;
  varying float vRadius;
  void main() {
    vSeed = aSeed;
    vec3 p = position;
    float radius = length(p.xz);
    vRadius = radius;
    float pull = 1.0 - smoothstep(0.0, 4.9, radius);
    float twist = radius * 1.22 + uTime * (0.18 + pull * 0.1) + aSeed * 0.8;
    float c = cos(twist);
    float s = sin(twist);
    p.xz = mat2(c, -s, s, c) * p.xz;
    p.x += uMouse.x * pull * 0.18;
    p.y += sin(uTime * 0.55 + radius * 2.6 + aSeed * 12.0) * 0.08;
    p.z += uMouse.y * pull * 0.18;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * (190.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const coreFragment = `
  uniform float uTime;
  varying float vSeed;
  varying float vRadius;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.0, d);
    float pulse = 0.72 + 0.28 * sin(uTime * 0.7 + vSeed * 9.0);
    vec3 ice = vec3(0.482, 0.910, 1.0);
    vec3 blue = vec3(0.357, 0.753, 1.0);
    vec3 violet = vec3(0.659, 0.424, 1.0);
    vec3 pearl = vec3(0.918, 0.984, 1.0);
    vec3 color = mix(blue, violet, smoothstep(0.8, 4.8, vRadius));
    color = mix(color, ice, sin(vSeed * 8.0 + uTime * 0.25) * 0.5 + 0.5);
    color = mix(color, pearl, smoothstep(0.0, 0.65, 1.0 - vRadius) * 0.55);
    gl_FragColor = vec4(color * pulse, alpha * 0.72);
  }
`

function Starfield({ mouse }) {
  const near = useRef()
  const far = useRef()
  const stars = useMemo(() => {
    const make = (count, spread, depth) => {
      const positions = new Float32Array(count * 3)
      const sizes = new Float32Array(count)
      for (let i = 0; i < count; i += 1) {
        positions[i * 3] = (Math.random() - 0.5) * spread
        positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.62
        positions[i * 3 + 2] = -Math.random() * depth
        sizes[i] = THREE.MathUtils.randFloat(0.18, 1.2)
      }
      return { positions, sizes, count }
    }
    return { near: make(850, 18, 12), far: make(1600, 34, 28) }
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (near.current) {
      near.current.rotation.y = mouse.current.x * 0.035 + t * 0.002
      near.current.rotation.x = mouse.current.y * 0.03
    }
    if (far.current) {
      far.current.rotation.y = mouse.current.x * 0.018 - t * 0.0015
      far.current.rotation.x = mouse.current.y * 0.014
    }
  })

  const renderPoints = (data, ref, opacity) => (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={data.count} array={data.positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={data.count} array={data.sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial color="#eafbff" size={0.026} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )

  return (
    <>
      {renderPoints(stars.far, far, 0.42)}
      {renderPoints(stars.near, near, 0.72)}
    </>
  )
}

function Nebula({ mouse }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    ref.current.material.uniforms.uTime.value = state.clock.elapsedTime
    ref.current.material.uniforms.uMouse.value.set(mouse.current.x, mouse.current.y)
  })
  return (
    <mesh ref={ref} position={[0, 0, -5.7]} scale={[14, 8.5, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        vertexShader={nebulaVertex}
        fragmentShader={nebulaFragment}
        uniforms={{ uTime: { value: 0 }, uMouse: { value: new THREE.Vector2() } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

function IntelligenceCore({ mouse }) {
  const group = useRef()
  const material = useRef()
  const ribbonA = useRef()
  const ribbonB = useRef()
  const particles = useMemo(() => {
    const count = 7200
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      const arm = i % 6
      const r = Math.pow(Math.random(), 0.42) * 4.25
      const angle = arm * (Math.PI * 2 / 6) + r * 1.05 + (Math.random() - 0.5) * (0.18 + r * 0.08)
      const flatten = THREE.MathUtils.randFloat(0.02, 0.32)
      positions[i * 3] = Math.cos(angle) * r
      positions[i * 3 + 1] = (Math.random() - 0.5) * flatten
      positions[i * 3 + 2] = Math.sin(angle) * r
      sizes[i] = THREE.MathUtils.randFloat(0.45, r < 0.7 ? 2.35 : 1.18)
      seeds[i] = Math.random()
    }
    return { positions, sizes, seeds, count }
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (group.current) {
      group.current.rotation.y = t * 0.028 + mouse.current.x * 0.05
      group.current.rotation.x = -0.18 + mouse.current.y * 0.03 + Math.sin(t * 0.12) * 0.015
      group.current.rotation.z = Math.sin(t * 0.09) * 0.03
    }
    if (material.current) {
      material.current.uniforms.uTime.value = t
      material.current.uniforms.uMouse.value.set(mouse.current.x, mouse.current.y)
    }
    if (ribbonA.current) ribbonA.current.rotation.z = t * 0.075
    if (ribbonB.current) ribbonB.current.rotation.z = -t * 0.052
  })

  return (
    <group ref={group} position={[2.2, -0.08, -1.2]} scale={0.78}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particles.count} array={particles.positions} itemSize={3} />
          <bufferAttribute attach="attributes-aSize" count={particles.count} array={particles.sizes} itemSize={1} />
          <bufferAttribute attach="attributes-aSeed" count={particles.count} array={particles.seeds} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial
          ref={material}
          vertexShader={coreVertex}
          fragmentShader={coreFragment}
          uniforms={{ uTime: { value: 0 }, uMouse: { value: new THREE.Vector2() } }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <group ref={ribbonA} rotation={[1.38, 0.24, 0]}>
        <mesh>
          <torusGeometry args={[2.35, 0.006, 8, 260]} />
          <meshBasicMaterial color="#7BE8FF" transparent opacity={0.42} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[0.12, 0.48, 0]}>
          <torusGeometry args={[3.16, 0.004, 8, 260]} />
          <meshBasicMaterial color="#A86CFF" transparent opacity={0.28} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <group ref={ribbonB} rotation={[1.18, -0.48, 0.2]}>
        <mesh>
          <torusGeometry args={[1.38, 0.008, 8, 220]} />
          <meshBasicMaterial color="#E58CFF" transparent opacity={0.36} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh rotation={[0.35, 0.18, 0]}>
          <torusGeometry args={[3.74, 0.0035, 8, 300]} />
          <meshBasicMaterial color="#63FFD2" transparent opacity={0.18} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <mesh>
        <planeGeometry args={[1.2, 1.2]} />
        <meshBasicMaterial transparent opacity={0.16} color="#EAFBFF" blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function HologramNodes({ mouse }) {
  const group = useRef()
  const labels = [
    { name: 'Talent DNA', angle: 0.2, radius: 4.6, color: '#7BE8FF' },
    { name: 'Interview Intelligence', angle: 1.55, radius: 4.95, color: '#A86CFF' },
    { name: 'Trust Engine', angle: 2.85, radius: 4.35, color: '#63FFD2' },
    { name: 'Recruiter Copilot', angle: 4.12, radius: 4.72, color: '#E58CFF' },
    { name: 'Fraud Lens', angle: 5.18, radius: 4.18, color: '#5BC0FF' },
  ]

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    group.current.rotation.y = t * 0.018 + mouse.current.x * 0.055
    group.current.rotation.x = mouse.current.y * 0.035
  })

  return (
    <group ref={group} rotation={[0.1, 0, 0]}>
      {labels.map((item, i) => {
        const x = Math.cos(item.angle) * item.radius
        const z = Math.sin(item.angle) * item.radius
        const y = Math.sin(item.angle * 1.6) * 0.8
        return (
          <group key={item.name} position={[x, y, z]}>
            <mesh>
              <sphereGeometry args={[0.045, 16, 16]} />
              <meshBasicMaterial color={item.color} transparent opacity={0.95} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh rotation={[0, -item.angle, 0]} position={[0, 0, 0]}>
              <planeGeometry args={[0.74, 0.18]} />
              <meshBasicMaterial color={item.color} transparent opacity={0.045} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([0, 0, 0, -x * 0.88, -y * 0.88, -z * 0.88])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color={item.color} transparent opacity={0.09} />
            </line>
          </group>
        )
      })}
    </group>
  )
}

function CameraRig({ mouse }) {
  const { camera } = useThree()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.current.x * 0.42 + Math.sin(t * 0.09) * 0.12, 0.035)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, mouse.current.y * 0.26 + Math.cos(t * 0.11) * 0.08, 0.035)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 7.6 + Math.sin(t * 0.07) * 0.18, 0.02)
    camera.lookAt(0, 0, 0)
  })
  return null
}

function Scene({ mouse, showNodes }) {
  return (
    <>
      <fog attach="fog" args={['#02040A', 6.0, 16.0]} />
      <CameraRig mouse={mouse} />
      <Starfield mouse={mouse} />
      <Nebula mouse={mouse} />
      <IntelligenceCore mouse={mouse} />
      {showNodes && <HologramNodes mouse={mouse} />}
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.38} luminanceThreshold={0.22} luminanceSmoothing={0.9} mipmapBlur />
        <ChromaticAberration offset={[0.00018, 0.00012]} />
        <Vignette eskil={false} offset={0.12} darkness={0.88} />
      </EffectComposer>
    </>
  )
}

export default function CosmicUniverse({ className = '', showNodes = true, children }) {
  const mouse = useRef({ x: 0, y: 0 })

  const onPointerMove = (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1
    const y = -(e.clientY / window.innerHeight) * 2 + 1
    mouse.current.x = THREE.MathUtils.lerp(mouse.current.x, x, 0.22)
    mouse.current.y = THREE.MathUtils.lerp(mouse.current.y, y, 0.22)
  }

  return (
    <div onPointerMove={onPointerMove} className={`relative h-screen overflow-hidden bg-[#02040A] ${className}`}>
      <Canvas className="!absolute inset-0" camera={{ position: [0, 0, 7.6], fov: 48 }} dpr={[1, 1.7]} gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}>
        <color attach="background" args={['#02040A']} />
        <Suspense fallback={null}>
          <Scene mouse={mouse} showNodes={showNodes} />
        </Suspense>
      </Canvas>
      {/* dark scrim so text is always readable */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(105deg, rgba(2,4,10,0.82) 0%, rgba(2,4,10,0.55) 48%, rgba(2,4,10,0.18) 100%)' }} />
      {/* subtle grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(234,251,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(234,251,255,0.14)_1px,transparent_1px)] [background-size:120px_120px]" />
      <div className="relative z-10 h-full overflow-y-auto">{children}</div>
    </div>
  )
}
