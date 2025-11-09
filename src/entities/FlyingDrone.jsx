import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { KNOCKBACK_DECAY, SPEED_SCALE, BOUNDARY_LIMIT } from '../game/constants.js'
export default function FlyingDrone({ id, pos, playerPosRef, onDie, isPaused, boundaryJumpActiveRef, assets, trailBaseMat, boundaryLimit = BOUNDARY_LIMIT, speedScale = 1, visualScale=1 }) {
  const ref = useRef()
  const stateRef = useRef({ mode: 'orbit', t: 0, dir: new THREE.Vector3(1, 0, 0), diveTarget: new THREE.Vector3(), diveSpeed: 16 })
  const speed = 10
  const orbitAltitude = 4
  const tmp = useRef(new THREE.Vector3())
  const TRAIL_COUNT = 10
  const lastPositions = useRef(Array.from({ length: TRAIL_COUNT }, () => new THREE.Vector3()))
  const trailRefs = useRef([])
  const trailTick = useRef(0)
  const stunTimer = useRef(0)

  useFrame((_, dt) => {
    if (!ref.current || isPaused) return
    const s = stateRef.current
    s.t += dt

    // Stun: freeze movement briefly with a wobble
    if (stunTimer.current > 0) {
      stunTimer.current = Math.max(0, stunTimer.current - dt)
      // simple wobble visual while stunned
      if (ref.current) {
        const t = performance.now() * 0.01 + id
        ref.current.rotation.x = Math.sin(t * 0.7) * 0.12
        ref.current.rotation.z = Math.cos(t * 0.9) * 0.12
      }
      return
    }

    if (s.mode === 'orbit') {
      // Maintain altitude and drift with slight attraction to player
      ref.current.position.y = orbitAltitude
      tmp.current.subVectors(playerPosRef.current, ref.current.position)
      tmp.current.y = 0
      const toPlayer = tmp.current.lengthSq() > 1e-6 ? tmp.current.normalize() : tmp.current.set(1, 0, 0)
      // Blend current dir toward player with small random sway
      s.dir.lerp(toPlayer, 0.6 * dt)
      const sway = (Math.random() - 0.5) * 0.2
      const cos = Math.cos(sway)
      const sin = Math.sin(sway)
      const dx = s.dir.x * cos - s.dir.z * sin
      const dz = s.dir.x * sin + s.dir.z * cos
      s.dir.set(dx, 0, dz).normalize()
      // Move
  ref.current.position.addScaledVector(s.dir, speed * (speedScale || 1) * dt)
      // Bounds clamp
  const BL = boundaryLimit ?? BOUNDARY_LIMIT
  ref.current.position.x = Math.max(Math.min(ref.current.position.x, BL - 1), -BL + 1)
  ref.current.position.z = Math.max(Math.min(ref.current.position.z, BL - 1), -BL + 1)
      // Threat increase: dive if close to player OR after 5s timeout
      const closeDx = ref.current.position.x - playerPosRef.current.x
      const closeDz = ref.current.position.z - playerPosRef.current.z
      const closeD2 = closeDx*closeDx + closeDz*closeDz
      if (closeD2 < 7*7 || s.t >= 5) {
        s.mode = 'dive'
        s.diveTarget.set(playerPosRef.current.x, 0.5, playerPosRef.current.z)
        // set direction toward dive target including downward component
        tmp.current.subVectors(s.diveTarget, ref.current.position).normalize()
        s.dir.copy(tmp.current)
        // faster dive speed
        s.diveSpeed = 18
      }
    } else if (s.mode === 'dive') {
      // Accelerate slightly during dive
  const diveSpeed = s.diveSpeed * (speedScale || 1)
  ref.current.position.addScaledVector(s.dir, diveSpeed * dt)
      // Collision with player
      const dx = ref.current.position.x - playerPosRef.current.x
      const dy = ref.current.position.y - 0.5
      const dz = ref.current.position.z - playerPosRef.current.z
      const d2 = dx*dx + dy*dy + dz*dz
      if (d2 < 1.1*1.1) {
        // Treat boundary-jump collision as a player hit so App logic can handle invuln stun
        onDie(id, true)
        return
      }
      // Hit ground => despawn
      if (ref.current.position.y <= 0.6) {
        onDie(id, false)
        return
      }
    }

    // Trail update when diving
    if (stateRef.current.mode === 'dive') {
      trailTick.current += dt
      if (trailTick.current >= 0.04) {
        trailTick.current = 0
        // shift buffer
        for (let i = TRAIL_COUNT - 1; i >= 1; i--) {
          lastPositions.current[i].copy(lastPositions.current[i - 1])
        }
        lastPositions.current[0].copy(ref.current.position)
        // update renderers
        for (let i = 0; i < TRAIL_COUNT; i++) {
          const m = trailRefs.current[i]
          if (!m) continue
          const p = lastPositions.current[i]
          m.position.set(p.x, p.y, p.z)
          const k = 1 - i / TRAIL_COUNT
          m.scale.setScalar(0.6 * k + 0.2)
          if (m.material && m.material.transparent) {
            m.material.opacity = 0.5 * k
          }
        }
      }
    }
  })

  useEffect(() => {
    if (!window.gameEnemies) window.gameEnemies = []
    const enemyData = {
      id,
      ref,
      isFlying: true,
      impulse: () => {},
      stun: (ms = 1500) => {
        const sec = Math.max(0, (ms|0) / 1000)
        stunTimer.current = Math.max(stunTimer.current, sec)
        // Reset to orbit mode on stun so it recovers
        stateRef.current.mode = 'orbit'
        stateRef.current.t = 0
      },
    }
    window.gameEnemies.push(enemyData)
    return () => { window.gameEnemies = window.gameEnemies.filter(e => e.id !== id) }
  }, [id])

  const defaultBodyGeom = useMemo(() => new THREE.CylinderGeometry(0.25, 0.25, 1.0, 12), [])
  const defaultTipGeom = useMemo(() => new THREE.ConeGeometry(0.25, 0.35, 12), [])
  const defaultTrailGeom = useMemo(() => new THREE.SphereGeometry(0.12, 8, 8), [])
  const defaultBodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x220000, roughness: 0.5 }), [])
  const defaultTipMat = defaultBodyMat

  return (
    <group>
      <group ref={ref} position={pos} rotation={[0, 0, 0]} scale={[visualScale, visualScale, visualScale]}>
        {/* body */}
        <mesh position={[0, 0, 0]} geometry={assets?.bodyGeom || defaultBodyGeom} material={assets?.bodyMat || defaultBodyMat} />
        {/* tips */}
        <mesh position={[0, 0.5, 0]} geometry={assets?.tipGeom || defaultTipGeom} material={assets?.tipMat || defaultTipMat} />
        <mesh position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]} geometry={assets?.tipGeom || defaultTipGeom} material={assets?.tipMat || defaultTipMat} />
        {/* trail nodes */}
        {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
          <mesh key={i}
            geometry={assets?.trailGeom || defaultTrailGeom}
            material={useMemo(() => (trailBaseMat ? trailBaseMat.clone() : new THREE.MeshBasicMaterial({ color: 0xff6666, transparent: true, opacity: 0.4 })), [trailBaseMat])}
            ref={el => { if (el) trailRefs.current[i] = el }}
          />
        ))}
      </group>
    </group>
  )
}
