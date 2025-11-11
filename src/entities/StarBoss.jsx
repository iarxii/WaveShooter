import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PathogenFromSpec } from '../characters/factory/PathogenFactory'

// Simple StarBoss entity: bobbing + slow rotation; uses PathogenFromSpec for visuals.
export default function StarBoss({ spec, position = [0, 0, 0] }){
  const ref = useRef()
  useFrame((st, dt) => {
    if (!ref.current) return
    ref.current.rotation.y += dt * 0.25
    ref.current.position.y = 0.15 + Math.sin(st.clock.elapsedTime * 1.2) * 0.06
  })
  return (
    <group ref={ref} position={position}>
      <PathogenFromSpec spec={spec} />
    </group>
  )
}
