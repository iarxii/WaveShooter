import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { PathogenFromSpec } from '../characters/factory/PathogenFactory'
import * as perf from '../perf'
import {
  BOSS_SPEED,
  TRIANGLE_BOSS_SPEED_MULT,
  TRIANGLE_CHARGE_MAX,
  TRIANGLE_CIRCLE_MAX,
  DROP_SPEED,
  KNOCKBACK_DECAY,
  SPEED_SCALE,
} from '../game/constants.js'

function TriangleBoss({
  id,
  pos,
  playerPosRef,
  onDie,
  health,
  isPaused,
  spawnHeight,
  speedScale = 1,
  spec = null,
  useSpec = false,
}) {
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
      if (chargeTimer.current < 1.5) {
        const chargeSpeed = Math.min(BOSS_SPEED * 3 * TRIANGLE_BOSS_SPEED_MULT, TRIANGLE_CHARGE_MAX)
        ref.current.position.addScaledVector(chargeDirection.current, chargeSpeed * dt * (speedScale || 1))
      } else {
        isCharging.current = false
        chargeTimer.current = 0
      }
    } else if (!stunned) {
      const circleRadius = 8
      const angle = performance.now() * 0.001
      const targetX = playerPosRef.current.x + Math.cos(angle) * circleRadius
      const targetZ = playerPosRef.current.z + Math.sin(angle) * circleRadius
      const circleTarget = new THREE.Vector3(targetX, pos[1], targetZ)
      const circleDir = new THREE.Vector3()
      circleDir.subVectors(circleTarget, ref.current.position)
      if (circleDir.length() > 1) {
        circleDir.normalize()
        const circleSpeed = Math.min(BOSS_SPEED * 1.2 * TRIANGLE_BOSS_SPEED_MULT, TRIANGLE_CIRCLE_MAX)
        const slow = Math.min(1, Math.max(0.3, circleDir.length() / 4))
        ref.current.position.addScaledVector(circleDir, circleSpeed * slow * dt * (speedScale || 1))
      }
    }

    perf.start('collision_triangle_player')
    if (dist < 2.0) onDie(id, true)
    perf.end('collision_triangle_player')

    if (knockback.current.lengthSq() > 1e-6) {
      if (!stunned) ref.current.position.addScaledVector(knockback.current, dt)
      const decay = Math.exp(-(KNOCKBACK_DECAY.triangle * SPEED_SCALE) * dt)
      knockback.current.multiplyScalar(decay)
      if (knockback.current.lengthSq() < 1e-6) knockback.current.set(0, 0, 0)
    }

    if (stunned) {
      const t = performance.now() * 0.01 + id
      ref.current.rotation.x = Math.sin(t * 0.7) * 0.1
      ref.current.rotation.z = Math.cos(t * 0.9) * 0.1
    } else {
      ref.current.rotation.x = 0
      ref.current.rotation.z = 0
      ref.current.rotation.y += dt * 2
    }
  })

  useEffect(() => {
    if (!window.gameEnemies) window.gameEnemies = []
    const enemyData = {
      id,
      ref,
      isBoss: true,
      isTriangle: true,
      isCharging: () => isCharging.current,
      impulse: (ix = 0, iz = 0, strength = 1) => { knockback.current.x += ix * strength; knockback.current.z += iz * strength },
      stun: (ms = 5000) => { const sec = Math.max(0, (ms | 0) / 1000); stunTimer.current = Math.max(stunTimer.current, sec); isCharging.current = false },
    }
    window.gameEnemies.push(enemyData)
    return () => { window.gameEnemies = window.gameEnemies.filter((e) => e.id !== id) }
  }, [id])

  const maxHealth = 20
  const healthRatio = health / maxHealth

  return (
    <group>
      {spec && useSpec ? (
        <group ref={ref} position={pos} rotation={[0, 0, 0]}>
          <PathogenFromSpec spec={spec} />
        </group>
      ) : (
        <mesh ref={ref} position={pos} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.2, 2.2, 0.9, 3]} />
          <meshStandardMaterial color={isCharging.current ? 0xff4444 : 0x8b5cf6} emissive={isCharging.current ? 0x220000 : 0x000000} opacity={0.3 + 0.7 * healthRatio} transparent={healthRatio < 1} />
        </mesh>
      )}
      {isCharging.current && (
        <mesh position={[pos[0], pos[1] + 2, pos[2]]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color={0xff0000} emissive={0xff0000} />
        </mesh>
      )}
      {health < maxHealth && (
        <mesh position={[pos[0], pos[1] + 3, pos[2]]}>
          <planeGeometry args={[2, 0.2]} />
          <meshBasicMaterial color={0xff0000} />
          <mesh position={[0, 0, 0.01]} scale={[healthRatio, 1, 1]}>
            <planeGeometry args={[2, 0.2]} />
            <meshBasicMaterial color={0x00ff00} />
          </mesh>
        </mesh>
      )}
      <Text position={[pos[0], pos[1] + 3.6, pos[2]]} fontSize={0.45} color="#ffffff" anchorX="center" anchorY="bottom">
        {`± ${health}/${maxHealth}`}
      </Text>
    </group>
  )
}

export default React.memo(TriangleBoss)
