import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { PathogenFromSpec } from '../characters/factory/PathogenFactory'
import { KNOCKBACK_DECAY, SPEED_SCALE } from '../game/constants.js'

export default function PipeBoss({ id, pos, playerPosRef, onDie, health, isPaused, onLaunchDrones, visualScale=1, spec = null, useSpec = false }) {
  const ref = useRef()
  const riseTimer = useRef(0)
  const launchCooldown = useRef(0)
  const stunTimer = useRef(0)
  const knockback = useRef(new THREE.Vector3())
  const RISE_DURATION = 3

  useFrame((_, dt) => {
    if (!ref.current || isPaused) return
    if (stunTimer.current > 0) stunTimer.current = Math.max(0, stunTimer.current - dt)
    const stunned = stunTimer.current > 0
    if (riseTimer.current < RISE_DURATION) {
      riseTimer.current = Math.min(RISE_DURATION, riseTimer.current + dt)
      const k = riseTimer.current / RISE_DURATION
      ref.current.position.y = 0.2 + k * 1.0
      return
    }
    launchCooldown.current = Math.max(0, launchCooldown.current - dt)
    if (!stunned && launchCooldown.current <= 0) {
      const count = 2 + Math.floor(Math.random() * 5)
      onLaunchDrones && onLaunchDrones(count, [ref.current.position.x, 0.5, ref.current.position.z])
      launchCooldown.current = 4 + Math.random() * 2
    }
    if (knockback.current.lengthSq() > 1e-6) {
      ref.current.position.addScaledVector(knockback.current, dt)
      const decay = Math.exp(-KNOCKBACK_DECAY.boss * SPEED_SCALE * dt)
      knockback.current.multiplyScalar(decay)
      if (knockback.current.lengthSq() < 1e-6) knockback.current.set(0, 0, 0)
    }
    const d = ref.current.position.distanceTo(playerPosRef.current)
    if (d < 1.8) onDie(id, true)
  })

  useEffect(() => {
    if (!window.gameEnemies) window.gameEnemies = []
    const enemyData = {
      id,
      ref,
      isBoss: true,
      isPipe: true,
      impulse: (ix = 0, iz = 0, strength = 1) => { knockback.current.x += ix * strength; knockback.current.z += iz * strength },
      stun: (ms = 2000) => { const sec = Math.max(0, (ms | 0) / 1000); stunTimer.current = Math.max(stunTimer.current, sec) },
    }
    window.gameEnemies.push(enemyData)
    return () => { window.gameEnemies = window.gameEnemies.filter(e => e.id !== id) }
  }, [id])

  return (
    <group scale={[visualScale, visualScale, visualScale]}>
      {spec && useSpec ? (
        <group ref={ref} position={pos}>
          <PathogenFromSpec spec={spec} />
        </group>
      ) : (
        <mesh ref={ref} position={pos}>
          <cylinderGeometry args={[1.2, 1.2, 1.6, 16]} />
          <meshStandardMaterial color={0x6699cc} emissive={0x111111} metalness={0.3} roughness={0.5} />
        </mesh>
      )}
      <Text position={[pos[0], pos[1] + 2.2, pos[2]]} fontSize={0.35} color="#ffffff" anchorX="center" anchorY="bottom">
        {`± ${health}/2`}
      </Text>
    </group>
  )
}
