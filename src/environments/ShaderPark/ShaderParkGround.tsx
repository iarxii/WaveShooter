import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useEnvironment } from '../../contexts/EnvironmentContext'
import { compileSculptCode } from './ShaderParkCompiler'
import PlasmaCode from './sample_shaders/PlasmaSphere.js?raw'
import PlanetoidCode from './sample_shaders/BumpyPlanetoid.js?raw'
import VoidCode from './sample_shaders/VoidMaterial.js?raw'
import TurbulenceCode from './sample_shaders/Turbulence.js?raw'

export const ShaderParkGround: React.FC<{ size?: number }> = ({ size = 200 }) => {
  const { env } = useEnvironment()
  const meshRef = useRef<THREE.Mesh>(null)
  const [material, setMaterial] = useState<THREE.ShaderMaterial | null>(null)

  const code = useMemo(() => {
    const id = env.id
    if (id === 'proc_hazard_hospital') return PlasmaCode
    if (id === 'proc_hazard_lab') return PlanetoidCode
    if (id === 'proc_blue_sky') return VoidCode
    if (id === 'proc_darkmode') return TurbulenceCode
    if (id === 'hospital' || id === 'surgery' || id === 'orchard') return PlanetoidCode
    return PlanetoidCode
  }, [env.id])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const mat = await compileSculptCode(code, {})
      if (!cancelled) setMaterial(mat)
    })()
    return () => { cancelled = true }
  }, [code])

  useFrame(({ clock }) => {
    if (material && (material as any).uniforms) {
      const t = clock.getElapsedTime()
      if ((material as any).uniforms.uTime) (material as any).uniforms.uTime.value = t
      if ((material as any).uniforms.time) (material as any).uniforms.time.value = t
    }
  })

  return material ? (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[size, size, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  ) : null
}
