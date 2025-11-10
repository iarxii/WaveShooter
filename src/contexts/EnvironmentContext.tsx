import React, { createContext, useContext, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment as DreiEnvironment } from '@react-three/drei'
import * as THREE from 'three'
import { DEFAULT_ENV_ID, ENVIRONMENTS, type EnvId, type EnvironmentSpec, getEnvById } from '../environments/environments'
import { ProceduralEnvironmentFactory } from '../environments/ProceduralEnvironmentFactory'

interface EnvContextValue {
  env: EnvironmentSpec
  envId: EnvId
  setEnvId: (id: EnvId) => void
  cycle: () => void
  // Dynamic arena pulse prototype API
  pulses: Array<{ x: number; z: number; startTime: number }>
  triggerPulse: (x?: number, z?: number) => void
  // Prototype overrides for environment factory (merged atop base spec)
  overrides: Partial<EnvironmentSpec>
  setOverrides: (o: Partial<EnvironmentSpec>) => void
  clearOverrides: () => void
}

const EnvironmentContext = createContext<EnvContextValue | null>(null)

export function useEnvironment() {
  const ctx = useContext(EnvironmentContext)
  if (!ctx) throw new Error('useEnvironment must be used within EnvironmentProvider')
  return ctx
}

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [envId, setEnvId] = useState<EnvId>(DEFAULT_ENV_ID)
  // Prototype overrides state (adjusted by Environment Factory tooling)
  const [overrides, setOverrides] = useState<Partial<EnvironmentSpec>>({})
  const clearOverrides = React.useCallback(() => setOverrides({}), [])
  const envBase = useMemo(() => getEnvById(envId), [envId])
  // Merge base + overrides (shallow). Deep nested objects (fog, ambient) individually overridden when provided.
  const env: EnvironmentSpec = useMemo(() => {
    return {
      ...envBase,
      ...(overrides || {}),
      // Merge fog/ambient if partial overrides given
      fog: overrides.fog ? { ...(envBase.fog || {}), ...overrides.fog } : envBase.fog,
      ambient: overrides.ambient ? { ...(envBase.ambient || {}), ...overrides.ambient } : envBase.ambient,
    }
  }, [envBase, overrides])
  // Track last stable env to avoid full scene flashes during rapid switching
  const lastEnvRef = useRef(env)
  React.useEffect(() => { lastEnvRef.current = env }, [env])
  const cycle = () => {
    const idx = ENVIRONMENTS.findIndex(e => e.id === envId)
    const next = ENVIRONMENTS[(idx + 1) % ENVIRONMENTS.length]
    setEnvId(next.id)
  }
  // Pulses state (prototype), global so ArenaSurface can consume regardless of environment component boundaries
  const [pulses, setPulses] = useState<Array<{ x: number; z: number; startTime: number }>>([])
  const triggerPulse = (x: number = 0, z: number = 0) => {
    setPulses(p => [{ x, z, startTime: performance.now() }, ...p].slice(0, 8))
  }
  // Debug key: press 'P' to emit a pulse at origin
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key?.toLowerCase() === 'p') triggerPulse(0, 0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const value = useMemo(() => ({ env, envId, setEnvId, cycle, pulses, triggerPulse, overrides, setOverrides, clearOverrides }), [env, envId, pulses, overrides, clearOverrides])
  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>
}

// Component to mount inside <Canvas> to apply HDRI, fog, and tone-mapping exposure transitions.
export function SceneEnvironment() {
  const { gl, scene, camera } = useThree()
  const { env } = useEnvironment()
  const perfModeRef = useRef<boolean>(false)
  React.useEffect(() => {
    const onPerf = (e: any) => { perfModeRef.current = !!(e?.detail?.perfMode) }
    window.addEventListener('perfModeChange', onPerf)
    return () => window.removeEventListener('perfModeChange', onPerf)
  }, [])

  // Smoothly tween renderer exposure to the env's target
  const exposureRef = useRef(gl.toneMappingExposure ?? 1)
  const targetExposureRef = useRef(env.exposure)
  targetExposureRef.current = env.exposure

  // Set tone mapping once (cheap), then only update exposure when it changes
  React.useEffect(() => {
    if (gl.toneMapping !== THREE.ACESFilmicToneMapping) gl.toneMapping = THREE.ACESFilmicToneMapping
  }, [gl])

  useFrame((_, dt) => {
    const cur = exposureRef.current
    const target = targetExposureRef.current
    // Ease towards target; avoid redundant writes when very close
    const next = THREE.MathUtils.lerp(cur, target, Math.min(1, dt * 3.0))
    if (Math.abs(next - cur) > 1e-4) {
      gl.toneMappingExposure = next
      exposureRef.current = next
    }
  })

  // Apply fog settings when env changes
  React.useEffect(() => {
    if (!env.fog || !env.fog.enabled) {
      scene.fog = null
      return
    }
    if (env.fog.type === 'exp2' && env.fog.density) {
      scene.fog = new THREE.FogExp2(env.fog.color, env.fog.density)
    } else {
      // linear fog
      scene.fog = new THREE.Fog(env.fog.color, env.fog.near ?? 60, env.fog.far ?? 160)
    }
    return () => {
      // Keep current fog until next env applies
    }
  }, [env, scene])

  // Adapt fog to camera height to avoid obscuring topdown/static rigs
  useFrame(() => {
    if (!scene.fog || !env.fog || !env.fog.enabled) return
    const y = Math.abs(camera?.position?.y ?? 0)
    const factor = Math.max(1, Math.min(3.5, (y / 35))) // baseline ~35, scale up when higher
    if ((scene.fog as any).isFogExp2) {
      const base = env.fog.density ?? 0.006
      // Reduce density as camera goes higher so scene remains visible
      ;(scene.fog as THREE.FogExp2).density = Math.max(0, base / (0.8 + (factor - 1) * 2.2))
      ;(scene.fog as any).color?.set(env.fog.color)
    } else if ((scene.fog as any).isFog) {
      const baseNear = env.fog.near ?? 60
      const baseFar = env.fog.far ?? 160
      // Push far plane out and nudge near out slightly with height
      ;(scene.fog as THREE.Fog).near = Math.min(baseNear * (0.9 + (factor - 1) * 0.4), (scene.fog as THREE.Fog).far - 1)
      ;(scene.fog as THREE.Fog).far = Math.max(baseFar * (1.0 + (factor - 1) * 1.2), (scene.fog as THREE.Fog).near + 1)
      ;(scene.fog as any).color?.set(env.fog.color)
    }
  })

  // Optional ambient light to subtly complement HDRI
  const ambientColor = env.ambient?.color ?? '#ffffff'
  const ambientIntensity = env.ambient?.intensity ?? 0.2

  // Render based on environment type
  if (env.type === 'procedural') {
    return (
      <>
        <ProceduralEnvironmentFactory spec={env} perfMode={perfModeRef.current} />
      </>
    )
  }
  if (env.type === 'whitebox') {
    return (
      <>
        <ambientLight color={ambientColor as any} intensity={Math.max(0.35, ambientIntensity)} />
        <directionalLight position={[10, 18, 8]} intensity={0.7} />
        <hemisphereLight intensity={0.35} groundColor={'#eaeef3'} />
      </>
    )
  }
  // HDRI mode
  if (perfModeRef.current) {
    // In perf mode, skip environment map to reduce fragment cost
    return (
      <>
        <ambientLight color={ambientColor as any} intensity={Math.max(0.3, ambientIntensity)} />
        <hemisphereLight intensity={0.35} groundColor={'#20232a'} />
      </>
    )
  }
  return (
    <>
      {/* Wrap in Suspense so the scene doesn't blank while HDRI loads/PMREM bakes */}
      {env.hdri && (
        <React.Suspense fallback={null}>
          {/* Some HDRI themes also use the arena surface mode mapping: reuse planetoid style */}
          <DreiEnvironment files={env.hdri} background={!!env.background} frames={1} resolution={256} />
        </React.Suspense>
      )}
      <ambientLight color={ambientColor as any} intensity={ambientIntensity} />
    </>
  )
}
