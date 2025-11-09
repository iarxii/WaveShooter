import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { DROP_SPEED, TRIANGLE_CHARGE_MAX, TRIANGLE_CIRCLE_MAX, KNOCKBACK_DECAY, SPEED_SCALE } from '../game/constants.js'

export default function TriangleBoss({ id, pos, playerPosRef, onDie, health, isPaused, spawnHeight, speedScale = 1, visualScale = 1 }) {
  const ref = useRef()
  const chargeTimer = useRef(0)
  const isCharging = useRef(false)
  const chargeDirection = useRef(new THREE.Vector3())
  const knockback = useRef(new THREE.Vector3())
  const isSpawning = useRef(!!spawnHeight && spawnHeight > (pos?.[1] ?? 0.5))
  const stunTimer = useRef(0)

  useEffect(() => {
    if (ref.current && isSpawning.current) {
      ref.current.position.set(pos[0], spawnHeight, pos[2])
    }
  }, [pos, spawnHeight])

  useFrame((_, dt) => {
    if (!ref.current || isPaused) return
    if (isSpawning.current) {
      const groundY = pos?.[1] ?? 0.5
      ref.current.position.y = Math.max(groundY, ref.current.position.y - DROP_SPEED * dt)
      if (ref.current.position.y <= groundY + 1e-3) {
        ref.current.position.y = groundY
        isSpawning.current = false
      }
      return
    }

    if (stunTimer.current > 0) stunTimer.current = Math.max(0, stunTimer.current - dt)
    const stunned = stunTimer.current > 0

    const dir = new THREE.Vector3()
    dir.subVectors(playerPosRef.current, ref.current.position)
    const dist = dir.length()

    if (!stunned) chargeTimer.current += dt
    if (!stunned && !isCharging.current && chargeTimer.current > 3) {
      isCharging.current = true
      chargeDirection.current.copy(dir.normalize())
      chargeTimer.current = 0
    }

    if (!stunned && isCharging.current) {
      const step = TRIANGLE_CHARGE_MAX * (speedScale || 1) * dt
      ref.current.position.addScaledVector(chargeDirection.current, step)
      if (dist < 1.2) {
        isCharging.current = false
      }
    } else if (!stunned) {
      // circle around player
      if (dist > 0.1) dir.normalize()
      const tangent = new THREE.Vector3(-dir.z, 0, dir.x)
      const step = TRIANGLE_CIRCLE_MAX * (speedScale || 1) * dt
      ref.current.position.addScaledVector(tangent, step)
    }

    if (knockback.current.lengthSq() > 1e-6) {
      if (!stunned) ref.current.position.addScaledVector(knockback.current, dt)
      const decay = Math.exp(-(KNOCKBACK_DECAY.triangle) * SPEED_SCALE * dt)
      knockback.current.multiplyScalar(decay)
      if (knockback.current.lengthSq() < 1e-6) knockback.current.set(0, 0, 0)
    }

    const playerDist = ref.current.position.distanceTo(playerPosRef.current)
    if (playerDist < 1.4) onDie(id, true)
  })

  useEffect(() => {
    if (!window.gameEnemies) window.gameEnemies = []
    const enemyData = { id, ref, isBoss: true, impulse: (ix = 0, iz = 0, s = 1) => { knockback.current.x += ix * s; knockback.current.z += iz * s }, stun: (ms=5000) => { const sec = Math.max(0,(ms|0)/1000); stunTimer.current = Math.max(stunTimer.current, sec) } }
    window.gameEnemies.push(enemyData)
    return () => { window.gameEnemies = window.gameEnemies.filter(e => e.id !== id) }
  }, [id])

  const maxHealth = 3
  const healthRatio = health / maxHealth
  return (
    <group scale={[visualScale, visualScale, visualScale]}>
      <mesh ref={ref} position={pos} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[1.2, 1.8, 3]} />
        <meshStandardMaterial color={0xff4444} emissive={0x331111} opacity={0.35 + 0.65*healthRatio} transparent />
      </mesh>
    </group>
  )
}
