import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { ENEMY_SPEED, BOSS_SPEED, MINION_MAX_SPEED, APPROACH_SLOW_RADIUS, POST_LAND_SETTLE, DROP_SPEED, KNOCKBACK_DECAY, SPEED_SCALE } from '../game/constants.js'

export default function Minion({ id, pos, playerPosRef, onDie, isBoss=false, waveNumber, health, isPaused, spawnHeight, speedScale=1, visualScale=1 }) {
  const ref = useRef()
  const rawSpeed = isBoss ? BOSS_SPEED : ENEMY_SPEED + (waveNumber * 0.1)
  const maxSpeed = MINION_MAX_SPEED
  const speed = Math.min(rawSpeed, maxSpeed)
  const lastDirection = useRef(new THREE.Vector3())
  const stuckTimer = useRef(0)
  const knockback = useRef(new THREE.Vector3())
  const isSpawning = useRef(!!spawnHeight && spawnHeight > (pos?.[1] ?? 0.5))
  const stunTimer = useRef(0)
  const settleTimer = useRef(POST_LAND_SETTLE)

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
        settleTimer.current = POST_LAND_SETTLE
      }
      return
    }

    if (stunTimer.current > 0) stunTimer.current = Math.max(0, stunTimer.current - dt)
    const stunned = stunTimer.current > 0
    const targetPos = playerPosRef.current
    const dir = new THREE.Vector3()
    dir.subVectors(targetPos, ref.current.position)
    const dist = dir.length()

    if (window.gameEnemies) {
      const separation = new THREE.Vector3()
      let neighborCount = 0
      window.gameEnemies.forEach(enemy => {
        if (enemy.id !== id && enemy.ref && enemy.ref.current) {
          const diff = new THREE.Vector3()
          diff.subVectors(ref.current.position, enemy.ref.current.position)
          const distance = diff.length()
          if (distance < 2.5 && distance > 0) {
            diff.normalize()
            diff.divideScalar(distance)
            separation.add(diff)
            neighborCount++
          }
        }
      })
      if (neighborCount > 0) {
        separation.divideScalar(neighborCount)
        separation.multiplyScalar(0.3)
        dir.add(separation)
      }
    }

    const currentDirection = dir.clone().normalize()
    if (lastDirection.current.dot(currentDirection) < 0.2) stuckTimer.current += dt
    else stuckTimer.current = 0
    lastDirection.current = currentDirection

    if (!stunned) {
      if (dist > 0.6) {
        dir.normalize()
        const slow = Math.min(1, Math.max(0.2, dist / APPROACH_SLOW_RADIUS))
        const ramp = settleTimer.current > 0 ? (1 - Math.max(0, settleTimer.current - dt) / POST_LAND_SETTLE) : 1
        settleTimer.current = Math.max(0, settleTimer.current - dt)
        const stepSpeed = speed * slow * ramp * (speedScale || 1)
        ref.current.position.addScaledVector(dir, stepSpeed * dt)
      }
    }

    if (knockback.current.lengthSq() > 1e-6) {
      if (!stunned) {
        ref.current.position.addScaledVector(knockback.current, dt)
      }
      const decayRate = (isBoss ? KNOCKBACK_DECAY.boss : KNOCKBACK_DECAY.minion) * SPEED_SCALE
      const decay = Math.exp(-decayRate * dt)
      knockback.current.multiplyScalar(decay)
      if (knockback.current.lengthSq() < 1e-6) knockback.current.set(0, 0, 0)
    }

    if (stunned) {
      const t = performance.now() * 0.01 + id
      ref.current.rotation.x = Math.sin(t * 0.7) * 0.12
      ref.current.rotation.z = Math.cos(t * 0.9) * 0.12
    } else {
      ref.current.rotation.x = 0
      ref.current.rotation.z = 0
    }

    const playerDist = ref.current.position.distanceTo(playerPosRef.current)
    if (playerDist < (isBoss ? 1.8 : 1.2)) {
      onDie(id, true)
    }
  })

  useEffect(() => {
    if (!window.gameEnemies) window.gameEnemies = []
    const enemyData = { 
      id, 
      ref, 
      isBoss,
      impulse: (ix = 0, iz = 0, strength = 1) => {
        knockback.current.x += ix * strength
        knockback.current.z += iz * strength
      },
      stun: (ms = 5000) => {
        const sec = Math.max(0, (ms|0) / 1000)
        stunTimer.current = Math.max(stunTimer.current, sec)
      }
    }
    window.gameEnemies.push(enemyData)
    return () => {
      window.gameEnemies = window.gameEnemies.filter(e => e.id !== id)
    }
  }, [id, isBoss])

  const maxHealth = isBoss ? 3 : 1
  const healthRatio = health / maxHealth
  const baseColor = isBoss ? 0xffb020 : 0xff0055

  return (
    <group scale={[visualScale, visualScale, visualScale]}>
      <mesh ref={ref} position={pos}>
        {isBoss ? (
          <cylinderGeometry args={[1.6, 1.6, 0.8, 6]} />
        ) : (
          <sphereGeometry args={[0.6, 16, 16]} />
        )}
        <meshStandardMaterial 
          color={baseColor} 
          opacity={0.3 + 0.7 * healthRatio}
          transparent={healthRatio < 1}
          emissive={healthRatio < 0.5 ? 0x440000 : 0x000000}
        />
      </mesh>
      {health < maxHealth && (
        <mesh position={[pos[0], pos[1] + 1.5, pos[2]]}>
          <planeGeometry args={[1, 0.1]} />
          <meshBasicMaterial color={0xff0000} />
          <mesh position={[0, 0, 0.01]} scale={[healthRatio, 1, 1]}>
            <planeGeometry args={[1, 0.1]} />
            <meshBasicMaterial color={0x00ff00} />
          </mesh>
        </mesh>
      )}
      {isBoss && (
        <Text position={[pos[0], pos[1] + 2.2, pos[2]]} fontSize={0.35} color="#ffffff" anchorX="center" anchorY="bottom">
          {`± ${health}/${maxHealth}`}
        </Text>
      )}
    </group>
  )
}
