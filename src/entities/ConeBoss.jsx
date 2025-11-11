import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { PathogenFromSpec } from '../characters/factory/PathogenFactory'
import { KNOCKBACK_DECAY, SPEED_SCALE, CONTACT_DAMAGE, DROP_SPEED } from '../game/constants.js'

export default function ConeBoss({ id, pos, playerPosRef, onDamagePlayer, health, isPaused, spawnHeight, speedScale = 1, visualScale = 1, spec = null, useSpec = false }) {
  const ref = useRef()
  const idleTimer = useRef(10) // seconds between jumps
  const airVelY = useRef(0)
  const airFwdVel = useRef(0)
  const airFwdDir = useRef(new THREE.Vector3(0,0,0))
  const isJumping = useRef(false)
  const damageCooldown = useRef(0)
  const knockback = useRef(new THREE.Vector3())
  const stunTimer = useRef(0)
  const isSpawning = useRef(!!spawnHeight && spawnHeight > (pos?.[1] ?? 0.5))
  const GRAVITY = 24
  const UP_VEL = 14 // slightly lower to shorten flight time
  const LAND_DAMAGE_RADIUS = 4.4
  const REST_DAMAGE_RADIUS = 1.6
  const FLIGHT_TIME_SCALE = 0.6 // faster time to target
  const JUMP_COOLDOWN = 3 // seconds between jumps at faster pace
  const CONE_JUMP_MAX = 22
  const meshRef = useRef()

  // Initialize drop-in spawn position
  useEffect(() => {
    if (ref.current && isSpawning.current) {
      ref.current.position.set(pos[0], spawnHeight, pos[2])
    }
  }, [pos, spawnHeight])

  useFrame((_, dt) => {
    if (!ref.current || isPaused) return

    // Handle drop-in spawn
    if (isSpawning.current) {
      const groundY = pos?.[1] ?? 0.5
      ref.current.position.y = Math.max(groundY, ref.current.position.y - DROP_SPEED * dt)
      if (ref.current.position.y <= groundY + 1e-3) {
        ref.current.position.y = groundY
        isSpawning.current = false
      }
      return
    }

    // Stun handling
    if (stunTimer.current > 0) stunTimer.current = Math.max(0, stunTimer.current - dt)
    const stunned = stunTimer.current > 0
    if (damageCooldown.current > 0) damageCooldown.current = Math.max(0, damageCooldown.current - dt)

    // Airborne jump physics
    if (isJumping.current) {
      // vertical
      ref.current.position.y += airVelY.current * dt
      airVelY.current -= GRAVITY * dt
      // forward carry
      if (airFwdVel.current > 0) {
        ref.current.position.x += airFwdDir.current.x * airFwdVel.current * dt
        ref.current.position.z += airFwdDir.current.z * airFwdVel.current * dt
      }
      // landing
      if (ref.current.position.y <= 0.5) {
        ref.current.position.y = 0.5
        airVelY.current = 0
        airFwdVel.current = 0
        isJumping.current = false
        idleTimer.current = JUMP_COOLDOWN
        // impact damage to player if close
        const dx = ref.current.position.x - playerPosRef.current.x
        const dz = ref.current.position.z - playerPosRef.current.z
        if (dx*dx + dz*dz <= LAND_DAMAGE_RADIUS*LAND_DAMAGE_RADIUS) {
          onDamagePlayer && onDamagePlayer(CONTACT_DAMAGE.cone)
        }
      }
    } else if (!stunned) {
      // Idle countdown
      idleTimer.current = Math.max(0, idleTimer.current - dt)
      if (idleTimer.current <= 0) {
        // Begin jump towards player's current position using ballistic arc
        const target = new THREE.Vector3(playerPosRef.current.x, 0.5, playerPosRef.current.z)
        const cur = ref.current.position
        const disp = new THREE.Vector3().subVectors(target, cur)
        const dispLen = Math.max(0.001, Math.hypot(disp.x, disp.z))
        airFwdDir.current.set(disp.x / dispLen, 0, disp.z / dispLen)
        const tFlight = ((2 * UP_VEL) / GRAVITY) * FLIGHT_TIME_SCALE
        airFwdVel.current = Math.min((dispLen / tFlight) * (speedScale || 1), CONE_JUMP_MAX)
        airVelY.current = UP_VEL
        isJumping.current = true
      }
      // At-rest collision damage if player walks into the cone
      const dx = ref.current.position.x - playerPosRef.current.x
      const dz = ref.current.position.z - playerPosRef.current.z
      if (damageCooldown.current <= 0 && (dx*dx + dz*dz <= REST_DAMAGE_RADIUS*REST_DAMAGE_RADIUS)) {
        onDamagePlayer && onDamagePlayer(CONTACT_DAMAGE.cone)
        damageCooldown.current = 0.7
      }
    }

    // Apply knockback impulse with exponential decay (frozen while stunned)
    if (knockback.current.lengthSq() > 1e-6) {
      if (!stunned) {
        ref.current.position.addScaledVector(knockback.current, dt)
      }
      const decay = Math.exp(-(KNOCKBACK_DECAY.boss * SPEED_SCALE) * dt)
      knockback.current.multiplyScalar(decay)
      if (knockback.current.lengthSq() < 1e-6) knockback.current.set(0, 0, 0)
    }

    // Visual shake while stunned
    if (meshRef.current) {
      if (stunned) {
        const t = performance.now() * 0.01 + id
        meshRef.current.rotation.x = Math.sin(t * 0.7) * 0.12 + Math.PI
        meshRef.current.rotation.z = Math.cos(t * 0.9) * 0.12
      } else {
        meshRef.current.rotation.x = Math.PI
        meshRef.current.rotation.z = 0
      }
    }
  })

  // Register for external impulses and stun
  useEffect(() => {
    if (!window.gameEnemies) window.gameEnemies = []
    const enemyData = {
      id,
      ref,
      isBoss: true,
      isCone: true,
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
  }, [id])

  const maxHealth = 10
  const healthRatio = health / maxHealth

  return (
    <group ref={ref} position={pos} scale={[visualScale, visualScale, visualScale]}>
      {/* If a spec is supplied (from AvatarTuner), render the generated model so preview matches entity visuals */}
      {spec && useSpec ? (
        <group ref={meshRef} position={[0, 0.15, 0]}>
          <PathogenFromSpec spec={spec} />
        </group>
      ) : (
        /* Visual mesh: bacteriophage-style assembly
            - pipe body (cylinder)
            - top: octahedron (D8-like die)
            - bottom: thin disk with 6 radial legs extending down/out
        */
        <group ref={meshRef} position={[0, 1.3, 0]}>
          {/* Pipe body */}
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.28, 0.28, 1.6, 24, 1, true]} />
            <meshStandardMaterial color={0xf97316} emissive={0x44220a} metalness={0.2} roughness={0.6} transparent opacity={0.6 + 0.4 * healthRatio} side={THREE.DoubleSide} />
          </mesh>

          {/* Top octahedron (D8-like) */}
          <mesh position={[0, 1.6, 0]} rotation={[0, 0, 0]}>
            <octahedronGeometry args={[0.63, 0]} />
            <meshStandardMaterial color={0xffb86b} emissive={0x5a2b07} metalness={0.1} roughness={0.4} />
          </mesh>

          {/* Bottom disk */}
          <mesh position={[0, -0.1, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.48, 0.48, 0.06, 24]} />
            <meshStandardMaterial color={0xffd9b6} emissive={0x2d1608} metalness={0.05} roughness={0.6} />
          </mesh>

          {/* Six radial legs: simple single-cylinder legs pointing straight out (no bending). */}
          {Array.from({ length: 6 }).map((_, i) => {
            const ang = (i / 6) * Math.PI * 2
            const edgeR = 0
            const x = Math.cos(ang) * edgeR
            const z = Math.sin(ang) * edgeR
            const rotY = ang
            const legLen = 1.9
            const tiltZ = -0.85 // tilt outward leg slightly downwards (radians)
            // anchor the leg at the disk rim
            return (
              <group key={i} position={[x * 0.95, -0.85, z * 0.95]} rotation={[0, rotY, 0]}>
                {/* simple cylindrical leg extending along local X */}
                <mesh position={[legLen / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2 + tiltZ]}>
                  <cylinderGeometry args={[0.06, 0.06, legLen, 10]} />
                  <meshStandardMaterial color={0xffb86b} emissive={0x4a2008} metalness={0.05} roughness={0.7} />
                </mesh>
              </group>
            )
          })}
        </group>
      )}
      {/* HP label above cone */}
      <Text position={[0, 3.6, 0]} fontSize={0.42} color="#ffffff" anchorX="center" anchorY="bottom">
        {`± ${health}/${maxHealth}`}
      </Text>
    </group>
  )
}
