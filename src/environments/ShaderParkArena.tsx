import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useEnvironment } from '../contexts/EnvironmentContext'
import { compileShaderPark } from './ShaderParkCompiler'
import PlasmaCode from './sample_shaders/PlasmaSphere.js?raw'
import PlanetoidCode from './sample_shaders/BumpyPlanetoid.js?raw'
import VoidCode from './sample_shaders/VoidMaterial.js?raw'
import TurbulenceCode from './sample_shaders/Turbulence.js?raw'

/*
  ShaderParkArena (Prototype)
  ---------------------------------------------
  This component is a placeholder for integrating ShaderPark.
  Since shaderpark-core is not yet installed, we approximate by:
    - Loading script text for the selected environment mapping
    - Displaying a central sculpt sphere using the existing ArenaSurface pulse concept later
  Once shaderpark-core is added, replace the material with compiled shader strings.
*/

// Map env ids to sample shader script file names (in sample_shaders folder)
const ENV_SHADER_MAP: Record<string, string> = {
  proc_hazard_hospital: 'PlasmaSphere.js',
  proc_hazard_lab: 'BumpyPlanetoid.js',
  proc_blue_sky: 'VoidMaterial.js',
  proc_darkmode: 'Turbulence.js',
  hospital: 'BumpyPlanetoid.js',
  surgery: 'BumpyPlanetoid.js',
  orchard: 'BumpyPlanetoid.js'
}

export const ShaderParkArena: React.FC = () => {
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
      const { material } = await compileShaderPark(code, {})
      if (!cancelled) setMaterial(material)
    })()
    return () => { cancelled = true }
  }, [code])

  useFrame(({ clock }) => {
    if (material && (material as any).uniforms && (material as any).uniforms.uTime) {
      ;(material as any).uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <group>
      {/* Central sculpture placeholder */}
      {material && (
        <mesh ref={meshRef} position={[0, 6, 0]}>
          <icosahedronGeometry args={[5, 4]} />
          <primitive object={material} attach="material" />
        </mesh>
      )}
    </group>
  )
}
