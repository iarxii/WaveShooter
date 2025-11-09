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
}

const EnvironmentContext = createContext<EnvContextValue | null>(null)

export function useEnvironment() {
  const ctx = useContext(EnvironmentContext)
  if (!ctx) throw new Error('useEnvironment must be used within EnvironmentProvider')
  return ctx
}

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [envId, setEnvId] = useState<EnvId>(DEFAULT_ENV_ID)
  const env = useMemo(() => getEnvById(envId), [envId])
  // Track last stable env to avoid full scene flashes during rapid switching
  const lastEnvRef = useRef(env)
  React.useEffect(() => { lastEnvRef.current = env }, [env])
  const cycle = () => {
    const idx = ENVIRONMENTS.findIndex(e => e.id === envId)
    const next = ENVIRONMENTS[(idx + 1) % ENVIRONMENTS.length]
    setEnvId(next.id)
  }
  const value = useMemo(() => ({ env, envId, setEnvId, cycle }), [env, envId])
  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>
}

// Component to mount inside <Canvas> to apply HDRI, fog, and tone-mapping exposure transitions.
export function SceneEnvironment() {
  const { gl, scene } = useThree()
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
          <DreiEnvironment files={env.hdri} background={!!env.background} frames={1} resolution={256} />
        </React.Suspense>
      )}
      <ambientLight color={ambientColor as any} intensity={ambientIntensity} />
    </>
  )
}
