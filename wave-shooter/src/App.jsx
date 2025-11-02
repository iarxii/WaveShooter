import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stats, Text } from '@react-three/drei'
import * as THREE from 'three'

// GAME CONSTANTS
const PLAYER_SPEED = 26 // faster than minions to keep mobility advantage
const SPEED_DEBUFF_FACTOR = 0.6
const SPEED_DEBUFF_DURATION_MS = 4000
const BOUNDARY_LIMIT = 40
const ENEMY_SPEED = 18
const RUNNER_SPEED_MULTIPLIER = 1.6
const BOSS_SPEED = 6
const TRIANGLE_BOSS_SPEED_MULT = 2.3 // triangle boss moves slightly faster than ordinary boss
const WAVE_INTERVAL = 2000 // ms between waves spawning
const BULLET_SPEED = 38
const BULLET_LIFETIME = 3000 // ms
const FIRE_RATE = 200 // ms between shots
const BULLET_POOL_SIZE = 50
const PICKUP_COLLECT_DISTANCE = 3.8
const AIM_RAY_LENGTH = 8
// Speed tuning helpers (normalize new high speeds against a baseline feel)
const SPEED_TUNING_BASE = 12 // reference player speed used for original tuning
const SPEED_SCALE = Math.max(0.5, PLAYER_SPEED / SPEED_TUNING_BASE)
// Caps and smoothing to avoid jitter/teleport at high speeds
const MINION_MAX_SPEED = 12 // u/s hard cap for minion & ordinary boss chase
const TRIANGLE_CHARGE_MAX = 18 // u/s hard cap for triangle charge
const TRIANGLE_CIRCLE_MAX = 12 // u/s hard cap for triangle circling
const APPROACH_SLOW_RADIUS = 2.5 // start slowing when near target
const POST_LAND_SETTLE = 0.3 // s to ramp in after spawn landing
// Knockback tuning (exposed constants)
const KNOCKBACK = {
  minion: 124.0,
  boss: 8.0,
  triangle: 7.0,
}
const KNOCKBACK_DECAY = {
  minion: 8.0,
  boss: 6.0,
  triangle: 6.0,
}
const KNOCKBACK_DISTANCE_MAX = 8.0 // full strength when very close, fades to 0 by this distance

// Portal / spawning constants
const PORTAL_LIFETIME = 4500 // ms that a portal stays open
const PORTALS_PER_WAVE_MIN = 2
const PORTALS_PER_WAVE_MAX = 4
const PORTAL_RADIUS_MIN = 12
const PORTAL_RADIUS_MAX = 20
const PORTAL_STAGGER_MS = 260 // ms between enemy drops per portal
const DROP_SPAWN_HEIGHT = 7 // y height enemies begin falling from
const DROP_SPEED = 10 // units/sec downward during spawn

// Contact damage by enemy type
const CONTACT_DAMAGE = {
  minion: 1,
  boss: 10,
  triangle: 16,
  cone: 22,
}

// Pickup notification popup component
function PickupPopup({ pickup, onComplete }) {
  const [visible, setVisible] = useState(true)
  const hideTimerRef = useRef(null)
  const removeTimerRef = useRef(null)
  const onCompleteRef = useRef(onComplete)
  // Keep latest onComplete without retriggering the timer
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
  
  useEffect(() => {
    hideTimerRef.current = setTimeout(() => {
      setVisible(false)
      removeTimerRef.current = setTimeout(() => {
        onCompleteRef.current && onCompleteRef.current()
      }, 500) // Allow fade out
    }, 3000)
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current)
    }
  }, [])
  
  const info = pickup.type === 'health'
    ? { name: 'Health Pack', effect: '+25 Health', color: '#22c55e' }
    : pickup.type === 'power'
      ? { name: 'Power Up', effect: `+${pickup.amount ?? 50} Score`, color: '#60a5fa' }
      : { name: 'Debuff', effect: 'Speed Reduced -40% (4s)', color: '#f97316' }
  
  return (
    <div 
      className={`pickup-popup ${visible ? 'visible' : 'hidden'}`}
      style={{ '--popup-color': info.color }}
    >
      <div className="pickup-name">{info.name}</div>
      <div className="pickup-effect">{info.effect}</div>
    </div>
  )
}

// Utility: random position on plane
function randPos(range = 18) {
  const x = (Math.random() - 0.5) * range * 2
  const z = (Math.random() - 0.5) * range * 2
  return [x, 0.5, z]
}

// Bullet object pool for performance
class BulletPool {
  constructor(size) {
    this.bullets = []
    this.activeBullets = new Map()
    this.nextId = 1
    // Pre-create bullet objects
    for (let i = 0; i < size; i++) {
      this.bullets.push({ id: 0, active: false, pos: [0, 0, 0], dir: [0, 0, 0], timeAlive: 0, style: null })
    }
  }

  getBullet(pos, dir, style = null) {
    const bullet = this.bullets.find(b => !b.active)
    if (bullet) {
      bullet.id = this.nextId++
      bullet.active = true
      bullet.pos = [...pos]
      bullet.dir = [...dir]
      bullet.timeAlive = 0
      bullet.style = style
      this.activeBullets.set(bullet.id, bullet)
      return bullet
    }
    return null
  }

  returnBullet(id) {
    const bullet = this.activeBullets.get(id)
    if (bullet) {
      bullet.active = false
      this.activeBullets.delete(id)
    }
  }

  getActiveBullets() {
    return Array.from(this.activeBullets.values())
  }

  clear() {
    this.bullets.forEach(b => b.active = false)
    this.activeBullets.clear()
  }
}

// Bullet component
function Bullet({ bullet, onExpire, isPaused }) {
  const ref = useRef()
  const geom = useMemo(() => new THREE.SphereGeometry(0.3, 12, 12), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x004422 }), [])
  // apply style on mount/update
  useEffect(() => {
    if (!ref.current) return
    const s = bullet?.style?.scale || 1
    ref.current.scale.setScalar(s)
    if (bullet?.style?.color) {
      mat.color.set(bullet.style.color)
      mat.emissive.set(0x001133)
    } else {
      mat.color.set(0x00ff66)
      mat.emissive.set(0x004422)
    }
  }, [bullet?.style, mat])
  
  useFrame((_, dt) => {
    if (!ref.current || !bullet.active || isPaused) return
    
    // Move bullet
    ref.current.position.x += bullet.dir[0] * BULLET_SPEED * dt
    ref.current.position.z += bullet.dir[2] * BULLET_SPEED * dt
    
    // Update bullet data
    bullet.pos[0] = ref.current.position.x
    bullet.pos[2] = ref.current.position.z
    bullet.timeAlive += dt * 1000
    
    // Expire bullet if too old or out of bounds
    if (bullet.timeAlive > BULLET_LIFETIME || 
        Math.abs(ref.current.position.x) > 50 || 
        Math.abs(ref.current.position.z) > 50) {
      onExpire(bullet.id)
    }
  })

  return (
    <mesh ref={ref} position={bullet.pos} geometry={geom} material={mat} />
  )
}

// Pickup is a small box that floats with collision detection
function Pickup({ pos, type, amount=50, lifetimeMaxSec=20, onCollect, onExpire, id, playerPosRef, isPaused }) {
  const ref = useRef()
  const elapsedRef = useRef(0)
  const baseScale = useRef(type === 'power' ? (0.5 + Math.min(Math.max((amount - 50) / 50, 0), 1) * 0.6) : 0.5)
  const pulseSpeed = useRef( type === 'power' && amount >= 90 ? 3.0 : 0 )
  const isDiamond = amount >= 90 && type === 'power'
  
  useFrame((_, dt) => {
    if (!ref.current || isPaused) return
    
    ref.current.rotation.y += dt
    ref.current.position.y = 0.8 + Math.sin(performance.now() / 300 + id) * 0.15
    // lifetime tracking (game time only)
    elapsedRef.current += dt
    if (elapsedRef.current >= lifetimeMaxSec) {
      onExpire && onExpire(id)
      return
    }
    // high-value pulse
    if (pulseSpeed.current > 0) {
      const p = 1 + Math.sin(performance.now() * 0.001 * (pulseSpeed.current * 60)) * 0.12
      const s = baseScale.current * p
      ref.current.scale.set(s, s, s)
    } else if (type === 'power') {
      const s = baseScale.current
      ref.current.scale.set(s, s, s)
    }
    
    // Check collision with player
    const distance = ref.current.position.distanceTo(playerPosRef.current)
    if (distance < PICKUP_COLLECT_DISTANCE) {
      onCollect(id)
    }
  })
  
  return (
    <mesh ref={ref} position={pos}>
      {type === 'health' ? (
        <boxGeometry args={[0.5, 0.5, 0.5]} />
      ) : (
        isDiamond ? <octahedronGeometry args={[0.5, 0]} /> : <boxGeometry args={[0.5, 0.5, 0.5]} />
      )}
      <meshStandardMaterial 
        color={type === 'health' ? 0x22c55e : 0x60a5fa}
        emissive={type === 'power' && isDiamond ? 0x224466 : (type === 'health' ? 0x001100 : 0x000044)}
        emissiveIntensity={type === 'power' && isDiamond ? 1.5 : 0.4}
      />
    </mesh>
  )
}

// Portal visual (ground ring + beam), animates while active
function Portal({ pos, isPaused }) {
  const planeRef = useRef()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x800000, emissive: 0x220000, roughness: 0.8 }), [])

  useFrame(() => {
    if (isPaused || !planeRef.current) return
    // subtle pulse to indicate activity without allocations
    const s = 1 + Math.sin(performance.now() * 0.005) * 0.05
    planeRef.current.scale.set(s, s, s)
  })

  return (
    <mesh ref={planeRef} position={[pos[0], 0.051, pos[2]]} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <planeGeometry args={[4, 4]} />
    </mesh>
  )
}

// Player (simple rectangle box) with WASD movement and mouse aiming
function Player({ position, setPositionRef, onShoot, isPaused, autoFire, controlScheme = 'dpad', moveInputRef, moveSourceRef, onSlam, highContrast=false, portals=[], onDebuff }) {
  const ref = useRef()
  const lastShot = useRef(0)
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const aimPoint = useRef(new THREE.Vector3())
  const tmpDir = useRef(new THREE.Vector3())
  const forward = useRef(new THREE.Vector3(0, 0, -1))
  const lastYaw = useRef(0)
  const rayRef = useRef()
  const baseRayThickness = 0.08
  // Movement refs
  const keysRef = useRef({ w: false, a: false, s: false, d: false, up: false, down: false, left: false, right: false })
  const aimDirRef = useRef(new THREE.Vector3(0, 0, -1)) // planar aim dir (x,z)
  const airVelY = useRef(0)
  const airFwdVel = useRef(0)
  const airFwdDir = useRef(new THREE.Vector3(0, 0, -1))
  const slamArmed = useRef(false)
  const launchCooldown = useRef(0)
  const GRAVITY = 24
  const LAUNCH_UP_VEL = 14
  const LAUNCH_TARGET_FRACTION = 0.5 // of total play length (2*BOUNDARY_LIMIT) from border
  const keyJumpDownAt = useRef(0)
  const isKeyJumpDown = useRef(false)
  const rmbDownAt = useRef(0)
  const isRmbDown = useRef(false)
  const chargeRingRef = useRef()
  const landingRingRef = useRef()
  const chargeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.65, side: THREE.DoubleSide }), [])
  const chargeGeom = useMemo(() => new THREE.RingGeometry(0.9, 1.1, 48), [])
  const landingMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, side: THREE.DoubleSide }), [])
  const landingGeom = useMemo(() => new THREE.RingGeometry(0.7, 0.8, 32), [])
  const debuffTimer = useRef(0) // seconds remaining for speed debuff
  const portalHitCooldown = useRef(0)
  
  useEffect(() => {
    if (isPaused) return
    
    function down(e) {
      // Support WASD and Arrow keys regardless of scheme
      if (e.key === 'ArrowUp') keysRef.current.up = true
      else if (e.key === 'ArrowDown') keysRef.current.down = true
      else if (e.key === 'ArrowLeft') keysRef.current.left = true
      else if (e.key === 'ArrowRight') keysRef.current.right = true
      else {
        const k = e.key.toLowerCase()
        if (k in keysRef.current) keysRef.current[k] = true
      }
    }
    function up(e) {
      if (e.key === 'ArrowUp') keysRef.current.up = false
      else if (e.key === 'ArrowDown') keysRef.current.down = false
      else if (e.key === 'ArrowLeft') keysRef.current.left = false
      else if (e.key === 'ArrowRight') keysRef.current.right = false
      else {
        const k = e.key.toLowerCase()
        if (k in keysRef.current) keysRef.current[k] = false
      }
    }
    
    function handleMouseDown(e) {
      if (e.button === 0) { // Left click
        const now = performance.now()
        if (now - lastShot.current > FIRE_RATE) {
          lastShot.current = now
          // Compute forward dir from current rotation to shoot towards aim
          const dir = forward.current
            .set(0, 0, -1)
            .applyQuaternion(ref.current.quaternion)
          dir.y = 0
          dir.normalize()
          onShoot(ref.current.position, [dir.x, 0, dir.z])
        }
      } else if (e.button === 2) { // Right click: start charge
        e.preventDefault()
        if (!isRmbDown.current && ref.current && ref.current.position.y <= 0.5) {
          isRmbDown.current = true
          rmbDownAt.current = performance.now()
        }
      }
    }
    function handleMouseUp(e) {
      if (e.button === 2 && isRmbDown.current && ref.current) {
        e.preventDefault()
        isRmbDown.current = false
        const heldMs = performance.now() - rmbDownAt.current
        if (ref.current.position.y <= 0.5) {
          if (heldMs > 2000) {
            airVelY.current = LAUNCH_UP_VEL
            const totalLen = 2 * BOUNDARY_LIMIT
            const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen)
            const target = new THREE.Vector3().copy(ref.current.position).addScaledVector(aimDirRef.current, desired)
            const margin = 1.0
            target.x = Math.max(Math.min(target.x, BOUNDARY_LIMIT - margin), -BOUNDARY_LIMIT + margin)
            target.z = Math.max(Math.min(target.z, BOUNDARY_LIMIT - margin), -BOUNDARY_LIMIT + margin)
            const disp = new THREE.Vector3().subVectors(target, ref.current.position)
            const dispLen = Math.max(0.001, Math.hypot(disp.x, disp.z))
            airFwdDir.current.set(disp.x / dispLen, 0, disp.z / dispLen)
            const tFlight = (2 * LAUNCH_UP_VEL) / GRAVITY
            airFwdVel.current = dispLen / tFlight
            slamArmed.current = true
          } else {
            airVelY.current = LAUNCH_UP_VEL
            airFwdVel.current = 0
            slamArmed.current = true
          }
        }
        // hide indicators
        if (chargeRingRef.current) chargeRingRef.current.scale.set(0.001, 0.001, 0.001)
        if (landingRingRef.current) landingRingRef.current.scale.set(0.001, 0.001, 0.001)
      }
    }
    function handleContextMenu(e) { if (e.button === 2) e.preventDefault() }
    
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('mousedown', handleMouseDown)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('contextmenu', handleContextMenu)
    
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('mousedown', handleMouseDown)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [setPositionRef, onShoot, isPaused])
  // Dedicated key jump (Ctrl/Enter): short press -> vertical slam, long press (>2s) -> arc jump towards aim
  useEffect(() => {
    if (isPaused) return
    const onKeyDown = (e) => {
      if ((e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'Enter' || e.code === 'NumpadEnter') && !isKeyJumpDown.current) {
        e.preventDefault()
        isKeyJumpDown.current = true
        keyJumpDownAt.current = performance.now()
      }
    }
    const onKeyUp = (e) => {
      if ((e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'Enter' || e.code === 'NumpadEnter') && isKeyJumpDown.current && ref.current) {
        e.preventDefault()
        isKeyJumpDown.current = false
        const heldMs = performance.now() - keyJumpDownAt.current
        // Only trigger if on ground
        if (ref.current.position.y <= 0.5) {
          if (heldMs > 2000) {
            // Arc jump similar to boundary launch, using aim dir
            airVelY.current = LAUNCH_UP_VEL
            const totalLen = 2 * BOUNDARY_LIMIT
            const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen)
            const target = new THREE.Vector3().copy(ref.current.position).addScaledVector(aimDirRef.current, desired)
            const margin = 1.0
            target.x = Math.max(Math.min(target.x, BOUNDARY_LIMIT - margin), -BOUNDARY_LIMIT + margin)
            target.z = Math.max(Math.min(target.z, BOUNDARY_LIMIT - margin), -BOUNDARY_LIMIT + margin)
            const disp = new THREE.Vector3().subVectors(target, ref.current.position)
            const dispLen = Math.max(0.001, Math.hypot(disp.x, disp.z))
            airFwdDir.current.set(disp.x / dispLen, 0, disp.z / dispLen)
            const tFlight = (2 * LAUNCH_UP_VEL) / GRAVITY
            airFwdVel.current = dispLen / tFlight
            slamArmed.current = true
          } else {
            // Vertical hop and slam
            airVelY.current = LAUNCH_UP_VEL
            airFwdVel.current = 0
            slamArmed.current = true
          }
        }
        // hide indicators
        if (chargeRingRef.current) chargeRingRef.current.scale.set(0.001, 0.001, 0.001)
        if (landingRingRef.current) landingRingRef.current.scale.set(0.001, 0.001, 0.001)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [isPaused])

  // Auto-fire loop: when enabled, fire at FIRE_RATE using current aim
  useEffect(() => {
    if (!autoFire || isPaused) return
    let cancelled = false
    const interval = setInterval(() => {
      if (cancelled || isPaused || !ref.current) return
      const now = performance.now()
      if (now - lastShot.current > FIRE_RATE) {
        lastShot.current = now
        const dir = forward.current
          .set(0, 0, -1)
          .applyQuaternion(ref.current.quaternion)
        dir.y = 0
        dir.normalize()
        onShoot(ref.current.position, [dir.x, 0, dir.z])
      }
    }, 20)
    return () => { cancelled = true; clearInterval(interval) }
  }, [autoFire, isPaused, onShoot])

  // Rotate player smoothly to face mouse (projected onto ground) and draw aim ray
  useFrame((state, dt) => {
    if (!ref.current || isPaused) return
    
    // Update raycaster from pointer and find intersection on ground plane
    state.raycaster.setFromCamera(state.pointer, state.camera)
    const hit = state.raycaster.ray.intersectPlane(plane, aimPoint.current)
    if (hit) {
      // Direction from player to aim point
      tmpDir.current.subVectors(aimPoint.current, ref.current.position)
      tmpDir.current.y = 0
      if (tmpDir.current.lengthSq() > 1e-6) {
        // planar aim dir for boundary launch
        aimDirRef.current.copy(tmpDir.current).normalize()
        // Add PI to face the pointer (fix inverted forward vs. -Z default)
        const targetYaw = Math.atan2(tmpDir.current.x, tmpDir.current.z) + Math.PI
        // Exponential damping for smooth rotation
        const diff = ((targetYaw - lastYaw.current + Math.PI) % (Math.PI * 2)) - Math.PI
        lastYaw.current = lastYaw.current + diff * (1 - Math.exp(-10 * dt))
        ref.current.rotation.y = lastYaw.current

        // Dynamic width based on aim distance (clamped)
        const dist = tmpDir.current.length()
        if (rayRef.current) {
          const width = baseRayThickness + Math.min(dist / 12, 1) * 0.14 // ~0.08 to ~0.22
          rayRef.current.scale.x = width // geometry is 1 unit wide by default
        }
      }
    }

    // Movement (keyboard or external vector)
    // Keyboard vector (WASD + Arrow keys)
    const k = keysRef.current
    const keyMx = (k.d ? 1 : 0) - (k.a ? 1 : 0) + (k.right ? 1 : 0) - (k.left ? 1 : 0)
    const keyMz = (k.s ? 1 : 0) - (k.w ? 1 : 0) + (k.down ? 1 : 0) - (k.up ? 1 : 0)

    // External vector (DPad / Runner)
    const extMx = moveInputRef ? moveInputRef.current.x : 0
    const extMz = moveInputRef ? moveInputRef.current.z : 0

    let mx = 0, mz = 0
    if (controlScheme === 'wasd') {
      mx = keyMx; mz = keyMz
    } else {
      // dpad scheme prefers external vector, falls back to keyboard if zero
      if (Math.abs(extMx) > 0.001 || Math.abs(extMz) > 0.001) { mx = extMx; mz = extMz }
      else { mx = keyMx; mz = keyMz }
    }
  // normalize and compute speed multiplier (runner covers larger area)
  const mlen = Math.hypot(mx, mz) || 1
  mx /= mlen; mz /= mlen
  // debuff countdown and factor
  portalHitCooldown.current = Math.max(0, portalHitCooldown.current - dt)
  debuffTimer.current = Math.max(0, debuffTimer.current - dt)
  const debuffMul = debuffTimer.current > 0 ? SPEED_DEBUFF_FACTOR : 1
  const speedMul = ((moveSourceRef && moveSourceRef.current === 'runner') ? RUNNER_SPEED_MULTIPLIER : 1) * debuffMul
  // base movement
  ref.current.position.x += mx * (PLAYER_SPEED * speedMul) * dt
  ref.current.position.z += mz * (PLAYER_SPEED * speedMul) * dt

    // Boundary detection -> launch
    launchCooldown.current = Math.max(0, launchCooldown.current - dt)
    if (launchCooldown.current <= 0) {
      if (ref.current.position.x > BOUNDARY_LIMIT - 0.1 || ref.current.position.x < -BOUNDARY_LIMIT + 0.1 ||
          ref.current.position.z > BOUNDARY_LIMIT - 0.1 || ref.current.position.z < -BOUNDARY_LIMIT + 0.1) {
        // clamp to bounds
        ref.current.position.x = Math.max(Math.min(ref.current.position.x, BOUNDARY_LIMIT), -BOUNDARY_LIMIT)
        ref.current.position.z = Math.max(Math.min(ref.current.position.z, BOUNDARY_LIMIT), -BOUNDARY_LIMIT)
        // launch upward and forward along an arc, landing inward at ~30% of play length from the border
        airVelY.current = LAUNCH_UP_VEL
        const totalLen = 2 * BOUNDARY_LIMIT
        const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen) // minimum to have a meaningful hop
        const target = new THREE.Vector3().copy(ref.current.position).addScaledVector(aimDirRef.current, desired)
        // clamp target inside boundary with small margin
        const margin = 1.0
        target.x = Math.max(Math.min(target.x, BOUNDARY_LIMIT - margin), -BOUNDARY_LIMIT + margin)
        target.z = Math.max(Math.min(target.z, BOUNDARY_LIMIT - margin), -BOUNDARY_LIMIT + margin)
        const disp = new THREE.Vector3().subVectors(target, ref.current.position)
        const dispLen = Math.max(0.001, Math.hypot(disp.x, disp.z))
        airFwdDir.current.set(disp.x / dispLen, 0, disp.z / dispLen)
        // ballistic time of flight (same start/end height): t = 2*v0/g
        const tFlight = (2 * LAUNCH_UP_VEL) / GRAVITY
        airFwdVel.current = dispLen / tFlight
        slamArmed.current = true
        launchCooldown.current = 1.0 // cooldown to avoid repeated triggers at edge
      }
    }

    // Airborne physics and ground slam
    if (airVelY.current !== 0 || ref.current.position.y > 0.5) {
      // vertical
      ref.current.position.y += airVelY.current * dt
      airVelY.current -= GRAVITY * dt
      // forward carry
      if (airFwdVel.current > 0) {
        ref.current.position.x += airFwdDir.current.x * airFwdVel.current * dt
        ref.current.position.z += airFwdDir.current.z * airFwdVel.current * dt
      }
      // ground contact
      if (ref.current.position.y <= 0.5) {
        ref.current.position.y = 0.5
        airVelY.current = 0
        airFwdVel.current = 0
        if (slamArmed.current) {
          slamArmed.current = false
          // trigger AOE via callback
          onSlam && onSlam({ pos: [ref.current.position.x, 0.5, ref.current.position.z], radius: 9, power: 30 })
        }
      }
    }

    // Check collision with active portals to apply speed debuff
    if (portalHitCooldown.current <= 0 && portals && portals.length) {
      const px = ref.current.position.x
      const pz = ref.current.position.z
      const R = 2.2
      for (let i = 0; i < portals.length; i++) {
        const pr = portals[i]
        const dx = px - pr.pos[0]
        const dz = pz - pr.pos[2]
        if (dx*dx + dz*dz <= R*R) {
          debuffTimer.current = SPEED_DEBUFF_DURATION_MS / 1000
          portalHitCooldown.current = 1.0
          onDebuff && onDebuff()
          break
        }
      }
    }

    // Final bounds clamp to be safe
    ref.current.position.x = Math.max(Math.min(ref.current.position.x, BOUNDARY_LIMIT), -BOUNDARY_LIMIT)
    ref.current.position.z = Math.max(Math.min(ref.current.position.z, BOUNDARY_LIMIT), -BOUNDARY_LIMIT)
    setPositionRef(ref.current.position)

    // Charging visual indicators
    const charging = (isKeyJumpDown.current || isRmbDown.current) && ref.current.position.y <= 0.5
    if (charging) {
      const now = performance.now()
      const heldKey = isKeyJumpDown.current ? (now - keyJumpDownAt.current) : 0
      const heldRmb = isRmbDown.current ? (now - rmbDownAt.current) : 0
      const held = Math.max(heldKey, heldRmb)
      const progress = Math.min(held / 2000, 1)
      if (chargeRingRef.current) {
        const s = 0.3 + progress * 0.9
        chargeRingRef.current.scale.set(s, s, s)
        // pre-threshold: yellow; post-threshold: cyan/white-ish
        chargeMat.color.set(progress >= 1 ? 0x99ffff : 0xffcc00)
        chargeMat.opacity = progress >= 1 ? 0.75 : 0.65
      }
      if (landingRingRef.current) {
        if (progress >= 1) {
          // compute target relative offset for display
          const totalLen = 2 * BOUNDARY_LIMIT
          const desired = Math.max(4, 0.3 * totalLen)
          const target = new THREE.Vector3().copy(ref.current.position).addScaledVector(aimDirRef.current, desired)
          const margin = 1.0
          target.x = Math.max(Math.min(target.x, BOUNDARY_LIMIT - margin), -BOUNDARY_LIMIT + margin)
          target.z = Math.max(Math.min(target.z, BOUNDARY_LIMIT - margin), -BOUNDARY_LIMIT + margin)
          // place ring relative to player group so it stays where shown during charge
          const offX = target.x - ref.current.position.x
          const offZ = target.z - ref.current.position.z
          landingRingRef.current.position.set(offX, 0.06, offZ)
          landingRingRef.current.scale.set(1, 1, 1)
        } else {
          landingRingRef.current.scale.set(0.001, 0.001, 0.001)
        }
      }
    } else {
      if (chargeRingRef.current) chargeRingRef.current.scale.set(0.001, 0.001, 0.001)
      if (landingRingRef.current) landingRingRef.current.scale.set(0.001, 0.001, 0.001)
    }
  })

  return (
    <group ref={ref} position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.8, 0.8, 1.2]} />
        <meshStandardMaterial color={0x22c55e} metalness={0.2} roughness={0.6} />
      </mesh>
      {/* Aim ray: dynamic-width forward beam */}
      <mesh ref={rayRef} position={[0, 0.5, -AIM_RAY_LENGTH / 2]}>
        <boxGeometry args={[1, 0.06, AIM_RAY_LENGTH]} />
        <meshBasicMaterial color={highContrast ? 0xffffff : 0x99ffcc} transparent opacity={highContrast ? 0.9 : 0.6} />
      </mesh>
      {/* Jump charge ring (scales with hold time) */}
      <mesh ref={chargeRingRef} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} material={chargeMat}>
        <primitive object={chargeGeom} attach="geometry" />
      </mesh>
      {/* Landing marker ring when fully charged */}
      <mesh ref={landingRingRef} rotation={[-Math.PI / 2, 0, 0]} material={landingMat}>
        <primitive object={landingGeom} attach="geometry" />
      </mesh>
    </group>
  )
}

// Enemy minion (sphere) with improved AI behavior and health system
function Minion({ id, pos, playerPosRef, onDie, isBoss=false, waveNumber, health, isPaused, spawnHeight }) {
  const ref = useRef()
  const rawSpeed = isBoss ? BOSS_SPEED : ENEMY_SPEED + (waveNumber * 0.1) // base before caps
  const maxSpeed = MINION_MAX_SPEED
  const speed = Math.min(rawSpeed, maxSpeed)
  const lastDirection = useRef(new THREE.Vector3())
  const stuckTimer = useRef(0)
  // formation offset removed (no formation steering)
  const knockback = useRef(new THREE.Vector3())
  const isSpawning = useRef(!!spawnHeight && spawnHeight > (pos?.[1] ?? 0.5))
  const stunTimer = useRef(0) // seconds remaining
  const settleTimer = useRef(POST_LAND_SETTLE) // ramp-in after landing

  // Initialize spawn drop position if provided
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
        settleTimer.current = POST_LAND_SETTLE
      }
      return
    }

    // Stun countdown
    if (stunTimer.current > 0) stunTimer.current = Math.max(0, stunTimer.current - dt)
    const stunned = stunTimer.current > 0

    // Direct chase behavior (formation disabled for more decisive pursuit)
    const targetPos = playerPosRef.current
    
    const dir = new THREE.Vector3()
    dir.subVectors(targetPos, ref.current.position)
    const dist = dir.length()
    
    // Obstacle avoidance - simple separation from other enemies
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
            diff.divideScalar(distance) // Closer enemies have more influence
            separation.add(diff)
            neighborCount++
          }
        }
      })
      
      if (neighborCount > 0) {
        separation.divideScalar(neighborCount)
        separation.multiplyScalar(0.3) // Softer separation to reduce fidgeting
        dir.add(separation)
      }
    }
    
    // Light anti-stuck tracking only (no random jitters)
    const currentDirection = dir.clone().normalize()
    if (lastDirection.current.dot(currentDirection) < 0.2) {
      stuckTimer.current += dt
    } else {
      stuckTimer.current = 0
    }
    lastDirection.current = currentDirection
    
    if (!stunned) {
      if (dist > 0.6) {
        dir.normalize()
        // Approach slowing near target to avoid snapping
        const slow = Math.min(1, Math.max(0.2, dist / APPROACH_SLOW_RADIUS))
        // Post-landing settle ramp
        const ramp = settleTimer.current > 0 ? (1 - Math.max(0, settleTimer.current - dt) / POST_LAND_SETTLE) : 1
        settleTimer.current = Math.max(0, settleTimer.current - dt)
        const stepSpeed = speed * slow * ramp
        ref.current.position.addScaledVector(dir, stepSpeed * dt)
      }
    }

    // Apply knockback impulse with exponential decay
    if (knockback.current.lengthSq() > 1e-6) {
      // If stunned, don't move but still decay impulse so it doesn't accumulate
      if (!stunned) {
        ref.current.position.addScaledVector(knockback.current, dt)
      }
  const decayRate = (isBoss ? KNOCKBACK_DECAY.boss : KNOCKBACK_DECAY.minion) * SPEED_SCALE
      const decay = Math.exp(-decayRate * dt)
      knockback.current.multiplyScalar(decay)
      if (knockback.current.lengthSq() < 1e-6) knockback.current.set(0, 0, 0)
    }

    // Visual shake while stunned (rotation wiggle, no allocations)
    if (stunned) {
      const t = performance.now() * 0.01 + id
      ref.current.rotation.x = Math.sin(t * 0.7) * 0.12
      ref.current.rotation.z = Math.cos(t * 0.9) * 0.12
    } else {
      ref.current.rotation.x = 0
      ref.current.rotation.z = 0
    }
    
    // Enhanced collision check
    const playerDist = ref.current.position.distanceTo(playerPosRef.current)
    if (playerDist < (isBoss ? 1.8 : 1.2)) {
      onDie(id, true)
    }
  })
  
  // Store reference for formation behavior
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
        // extend stun if greater
        stunTimer.current = Math.max(stunTimer.current, sec)
      }
    }
    window.gameEnemies.push(enemyData)
    
    return () => {
      window.gameEnemies = window.gameEnemies.filter(e => e.id !== id)
    }
  }, [id, isBoss])
  
  // Health-based color intensity
  const maxHealth = isBoss ? 3 : 1
  const healthRatio = health / maxHealth
  const baseColor = isBoss ? 0xffb020 : 0xff0055
  
  return (
    <group>
      <mesh ref={ref} position={pos}>
        {isBoss ? (
          // hexagon: cylinder with 6 sides
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
      {/* Health indicator */}
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
      {/* Boss HP label */}
      {isBoss && (
        <Text position={[pos[0], pos[1] + 2.2, pos[2]]} fontSize={0.35} color="#ffffff" anchorX="center" anchorY="bottom">
          {`± ${health}/${maxHealth}`}
        </Text>
      )}
    </group>
  )
}

// Triangle boss (every 3 waves) with enhanced behavior and health system
function TriangleBoss({ id, pos, playerPosRef, onDie, health, isPaused, spawnHeight }) {
  const ref = useRef()
  const chargeTimer = useRef(0)
  const isCharging = useRef(false)
  const chargeDirection = useRef(new THREE.Vector3())
  const knockback = useRef(new THREE.Vector3())
  const isSpawning = useRef(!!spawnHeight && spawnHeight > (pos?.[1] ?? 0.5))
  const stunTimer = useRef(0) // seconds

  useEffect(() => {
    if (ref.current && isSpawning.current) {
      ref.current.position.set(pos[0], spawnHeight, pos[2])
    }
  }, [pos, spawnHeight])
  
  useFrame((_, dt) => {
    if (!ref.current || isPaused) return
    
    // Drop-in spawn phase
    if (isSpawning.current) {
      const groundY = pos?.[1] ?? 0.5
      ref.current.position.y = Math.max(groundY, ref.current.position.y - DROP_SPEED * dt)
      if (ref.current.position.y <= groundY + 1e-3) {
        ref.current.position.y = groundY
        isSpawning.current = false
      }
      return
    }

    // Stun timer
    if (stunTimer.current > 0) stunTimer.current = Math.max(0, stunTimer.current - dt)
    const stunned = stunTimer.current > 0

    const dir = new THREE.Vector3()
    dir.subVectors(playerPosRef.current, ref.current.position)
    const dist = dir.length()
    
    if (!stunned) chargeTimer.current += dt
    
    // Charge attack pattern
    if (!stunned && !isCharging.current && chargeTimer.current > 3) {
      // Start charging
      isCharging.current = true
      chargeDirection.current.copy(dir.normalize())
      chargeTimer.current = 0
    }
    
    if (!stunned && isCharging.current) {
      // Charge towards last known player position
      if (chargeTimer.current < 1.5) {
        const chargeSpeed = Math.min(BOSS_SPEED * 3 * TRIANGLE_BOSS_SPEED_MULT, TRIANGLE_CHARGE_MAX)
        ref.current.position.addScaledVector(chargeDirection.current, chargeSpeed * dt)
      } else {
        // Stop charging
        isCharging.current = false
        chargeTimer.current = 0
      }
    } else if (!stunned) {
      // Normal movement - circle around player
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
        // slow slightly as we approach the circle target to avoid magnetized snapping
        const slow = Math.min(1, Math.max(0.3, circleDir.length() / 4))
        ref.current.position.addScaledVector(circleDir, circleSpeed * slow * dt)
      }
    }
    
    // Enhanced collision
    if (dist < 2.0) onDie(id, true)
    
    // Apply knockback with decay
    if (knockback.current.lengthSq() > 1e-6) {
      if (!stunned) {
        ref.current.position.addScaledVector(knockback.current, dt)
      }
  const decay = Math.exp(-(KNOCKBACK_DECAY.triangle * SPEED_SCALE) * dt)
      knockback.current.multiplyScalar(decay)
      if (knockback.current.lengthSq() < 1e-6) knockback.current.set(0, 0, 0)
    }

    // Rotation for visual effect (shake when stunned)
    if (stunned) {
      const t = performance.now() * 0.01 + id
      ref.current.rotation.x = Math.sin(t * 0.7) * 0.1
      ref.current.rotation.z = Math.cos(t * 0.9) * 0.1
      // pause spin
    } else {
      ref.current.rotation.x = 0
      ref.current.rotation.z = 0
      ref.current.rotation.y += dt * 2
    }
  })

  // Register for external impulses
  useEffect(() => {
    if (!window.gameEnemies) window.gameEnemies = []
    const enemyData = {
      id,
      ref,
      isBoss: true,
      impulse: (ix = 0, iz = 0, strength = 1) => {
        knockback.current.x += ix * strength
        knockback.current.z += iz * strength
      },
      stun: (ms = 5000) => {
        const sec = Math.max(0, (ms|0) / 1000)
        stunTimer.current = Math.max(stunTimer.current, sec)
        isCharging.current = false
      }
    }
    window.gameEnemies.push(enemyData)
    return () => {
      window.gameEnemies = window.gameEnemies.filter(e => e.id !== id)
    }
  }, [id])
  
  // Health-based color intensity
  const maxHealth = 20
  const healthRatio = health / maxHealth
  
  return (
    <group>
      <mesh ref={ref} position={pos} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 0.9, 3]} />
        <meshStandardMaterial 
          color={isCharging.current ? 0xff4444 : 0x8b5cf6} 
          emissive={isCharging.current ? 0x220000 : 0x000000}
          opacity={0.3 + 0.7 * healthRatio}
          transparent={healthRatio < 1}
        />
      </mesh>
      {/* Warning indicator when charging */}
      {isCharging.current && (
        <mesh position={[pos[0], pos[1] + 2, pos[2]]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color={0xff0000} emissive={0xff0000} />
        </mesh>
      )}
      {/* Health indicator */}
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
      {/* Boss HP label */}
      <Text position={[pos[0], pos[1] + 3.6, pos[2]]} fontSize={0.45} color="#ffffff" anchorX="center" anchorY="bottom">
        {`± ${health}/${maxHealth}`}
      </Text>
    </group>
  )
}

// Cone boss: waits for ~10s, then leaps to the player's position and slams down
function ConeBoss({ id, pos, playerPosRef, onDamagePlayer, health, isPaused, spawnHeight }) {
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
        airFwdVel.current = Math.min(dispLen / tFlight, CONE_JUMP_MAX)
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

  // Visuals
  const maxHealth = 10
  const healthRatio = health / maxHealth

  return (
    <group ref={ref} position={pos}>
      {/* Visual mesh: cone rotated to stand on tip; offset up by half height so tip meets ground at group y */}
      <mesh ref={meshRef} position={[0, 1.3, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[0, 1.6, 2.6, 16]} />
        <meshStandardMaterial color={0xff7744} emissive={0x331100} opacity={0.35 + 0.65*healthRatio} transparent />
      </mesh>
      {/* HP label above cone */}
      <Text position={[0, 3.6, 0]} fontSize={0.42} color="#ffffff" anchorX="center" anchorY="bottom">
        {`± ${health}/${maxHealth}`}
      </Text>
    </group>
  )
}

export default function App() {
  // game state
  const playerPosRef = useRef(new THREE.Vector3(0, 0, 0))
  const setPositionRef = (pos) => { playerPosRef.current.copy(pos) }
  const [enemies, setEnemies] = useState([]) // {id, pos, isBoss, formationTarget, health}
  const [pickups, setPickups] = useState([])
  const [bullets, setBullets] = useState([])
  const [wave, setWave] = useState(0)
  const [score, setScore] = useState(0)
  const [health, setHealth] = useState(100)
  const [isPaused, setIsPaused] = useState(false)
  const [autoFire, setAutoFire] = useState(false)
  const [pickupPopups, setPickupPopups] = useState([])
  const [portals, setPortals] = useState([])
  const [aoes, setAoes] = useState([]) // ground slam visuals
  const [controlScheme, setControlScheme] = useState('dpad') // 'wasd' | 'dpad' (default to D-Buttons)
  const [shapeRunner, setShapeRunner] = useState(false)
  const [shapePattern, setShapePattern] = useState('circle') // 'circle' | 'triangle' | 'rectangle'
  const [highContrast, setHighContrast] = useState(false)
  const [hpEvents, setHpEvents] = useState([]) // floating HP change indicators
  const [powerEffect, setPowerEffect] = useState({ active: false, amount: 0 })
  const powerRemainingRef = useRef(0) // ms remaining for effect
  const enemyId = useRef(1)
  const pickupId = useRef(1)
  const portalId = useRef(1)
  // removed waveTimer (switched to pause-aware timeout loop)
  const bulletPool = useRef(new BulletPool(BULLET_POOL_SIZE))
  const isPausedRef = useRef(isPaused)
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])
  const portalTimersRef = useRef([])
  const portalsRef = useRef([])
  useEffect(() => { portalsRef.current = portals.map(p => p.pos) }, [portals])
  // expose a damage function for special enemies (like ConeBoss)
  const damagePlayer = useCallback((dmg) => {
    setHealth(h => Math.max(h - (dmg || 1), 0))
    const idEvt = Date.now() + Math.random()
    setHpEvents(evts => [...evts, { id: idEvt, amount: -(dmg || 1), start: performance.now() }])
  }, [])
  
  // Load persisted settings once
  useEffect(() => {
    try {
      const cs = localStorage.getItem('controlScheme')
      if (cs === 'wasd' || cs === 'dpad') setControlScheme(cs)
      const sr = localStorage.getItem('shapeRunner')
      if (sr != null) setShapeRunner(sr === '1' || sr === 'true')
      const sp = localStorage.getItem('shapePattern')
      if (sp === 'circle' || sp === 'triangle' || sp === 'rectangle') setShapePattern(sp)
      const hc = localStorage.getItem('highContrast')
      if (hc != null) setHighContrast(hc === '1' || hc === 'true')
    } catch { /* ignore */ }
  }, [])
  // Persist on change
  useEffect(() => { try { localStorage.setItem('controlScheme', controlScheme) } catch { /* ignore */ } }, [controlScheme])
  useEffect(() => { try { localStorage.setItem('shapeRunner', shapeRunner ? '1' : '0') } catch { /* ignore */ } }, [shapeRunner])
  useEffect(() => { try { localStorage.setItem('shapePattern', shapePattern) } catch { /* ignore */ } }, [shapePattern])
  useEffect(() => { try { localStorage.setItem('highContrast', highContrast ? '1' : '0') } catch { /* ignore */ } }, [highContrast])
  
  // Pause toggling
  useEffect(() => {
    const handleKeyDown = (e) => {
      const k = e.key
      if (k === 'Escape' || k === ' ') {
        e.preventDefault()
        setIsPaused(prev => !prev)
      } else if (k === 'f' || k === 'F') {
        setAutoFire(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Helpers: portal lifecycle and enemy scheduling
  const clearPortalTimers = useCallback(() => {
    portalTimersRef.current.forEach(t => clearTimeout(t))
    portalTimersRef.current = []
  }, [])

  const openPortalAt = useCallback((pos, duration = PORTAL_LIFETIME) => {
    const id = portalId.current++
    setPortals(prev => [...prev, { id, pos }])
    const timer = setTimeout(() => {
      setPortals(prev => prev.filter(p => p.id !== id))
    }, duration)
    portalTimersRef.current.push(timer)
    return id
  }, [])

  // Clear timers on unmount to avoid stray spawns
  useEffect(() => {
    return () => clearPortalTimers()
  }, [clearPortalTimers])

  const scheduleEnemyBatchAt = useCallback((pos, count, options = {}) => {
    const { isTriangle = false, isCone = false, waveNumber = 1 } = options
    for (let i = 0; i < count; i++) {
      const handle = setTimeout(() => {
        if (isPausedRef.current) return
        const jitter = 1.2
        const spawnPos = [
          pos[0] + (Math.random() - 0.5) * jitter,
          0.5,
          pos[2] + (Math.random() - 0.5) * jitter,
        ]
        const id = enemyId.current++
        if (isTriangle) {
          setEnemies(prev => [...prev, {
            id,
            pos: spawnPos,
            isTriangle: true,
            waveNumber,
            health: 5,
            maxHealth: 5,
            spawnHeight: DROP_SPAWN_HEIGHT + Math.random() * 2,
          }])
        } else if (isCone) {
          // Respect max 6 cones at once
          setEnemies(prev => {
            const cones = prev.filter(e => e.isCone).length
            if (cones >= 6) return prev
            return [...prev, {
              id,
              pos: spawnPos,
              isCone: true,
              waveNumber,
              health: 10,
              maxHealth: 10,
              spawnHeight: DROP_SPAWN_HEIGHT + Math.random() * 2,
            }]
          })
        } else {
          const boss = Math.random() < 0.12
          setEnemies(prev => [...prev, {
            id,
            pos: spawnPos,
            isBoss: boss,
            formationTarget: new THREE.Vector3(pos[0], 0.5, pos[2]),
            waveNumber,
            health: boss ? 3 : 1,
            maxHealth: boss ? 3 : 1,
            spawnHeight: DROP_SPAWN_HEIGHT + Math.random() * 2,
          }])
        }
      }, i * PORTAL_STAGGER_MS)
      portalTimersRef.current.push(handle)
    }
  }, [])

  // spawn a wave using latest state (no stale closures) and compute count by nextWave
  const spawnWave = useCallback(() => {
    if (isPausedRef.current) return
    setWave(w => {
      const nextWave = w + 1
      const center = playerPosRef.current.clone()
      const portalsCount = Math.min(PORTALS_PER_WAVE_MAX, Math.max(PORTALS_PER_WAVE_MIN, 2 + Math.floor(nextWave / 4)))
      const totalEnemies = 6 + Math.floor(w / 2)
      const perPortal = Math.max(2, Math.floor(totalEnemies / portalsCount))

      // Evenly spaced directions with slight jitter
      const baseAngle = Math.random() * Math.PI * 2
      for (let i = 0; i < portalsCount; i++) {
        const angle = baseAngle + (i * (Math.PI * 2) / portalsCount) + (Math.random() - 0.5) * 0.25
        const radius = PORTAL_RADIUS_MIN + Math.random() * (PORTAL_RADIUS_MAX - PORTAL_RADIUS_MIN)
        const px = center.x + Math.cos(angle) * radius
        const pz = center.z + Math.sin(angle) * radius
        const p = [px, 0.5, pz]
        openPortalAt(p)
        scheduleEnemyBatchAt(p, perPortal, { waveNumber: nextWave })
      }

      // Triangle boss every 3 waves from its own portal
      if (nextWave % 3 === 0) {
        const angle = baseAngle + Math.random() * Math.PI * 2
        const radius = PORTAL_RADIUS_MAX + 4
        const px = center.x + Math.cos(angle) * radius
        const pz = center.z + Math.sin(angle) * radius
        const p = [px, 0.5, pz]
        openPortalAt(p, PORTAL_LIFETIME + 1500)
        // slight delay before boss drop for drama
        const bossTimer = setTimeout(() => scheduleEnemyBatchAt(p, 1, { isTriangle: true, waveNumber: nextWave }), 500)
        portalTimersRef.current.push(bossTimer)
      }

      // Frequently spawn Cone bosses from their own portals (capped to 6 globally)
      if (Math.random() < 0.8) {
        const angle = baseAngle + Math.random() * Math.PI * 2
        const radius = PORTAL_RADIUS_MAX + 6
        const px = center.x + Math.cos(angle) * radius
        const pz = center.z + Math.sin(angle) * radius
        const p = [px, 0.5, pz]
        openPortalAt(p, PORTAL_LIFETIME + 800)
        const coneTimer1 = setTimeout(() => scheduleEnemyBatchAt(p, 1, { isCone: true, waveNumber: nextWave }), 300)
        portalTimersRef.current.push(coneTimer1)
        const coneTimer2 = setTimeout(() => scheduleEnemyBatchAt(p, 1, { isCone: true, waveNumber: nextWave }), 700)
        portalTimersRef.current.push(coneTimer2)
      }

      return nextWave
    })
  }, [openPortalAt, scheduleEnemyBatchAt])

  // Handle shooting
  const handleShoot = useCallback((playerPosition, direction) => {
    if (!direction) return
    // Determine bullet style based on power-up effect
    let style = null
    if (powerEffect.active) {
      const amt = powerEffect.amount
      const scale = 1 + Math.max(0, (amt - 50)) / 50 * 0.5 // 1.0 .. 1.5
      style = { color: 0x66aaff, scale }
    }
    const bullet = bulletPool.current.getBullet(
      [playerPosition.x, playerPosition.y + 0.5, playerPosition.z],
      direction,
      style
    )
    if (bullet) setBullets(bulletPool.current.getActiveBullets())
  }, [powerEffect])

  // Handle bullet expiration
  const handleBulletExpire = useCallback((bulletId) => {
    bulletPool.current.returnBullet(bulletId)
    setBullets(bulletPool.current.getActiveBullets())
  }, [])

  // Weighted sampler for power amounts to reduce 90–100 frequency
  function weightedPowerAmount() {
    const r = Math.random()
    if (r < 0.05) {
      // rare high tier ~5%
      return 90 + Math.floor(Math.random() * 11) // 90..100
    } else if (r < 0.30) {
      // mid tier ~25%
      return 81 + Math.floor(Math.random() * 9) // 81..89
    }
    // common low tier ~70%
    return 50 + Math.floor(Math.random() * 31) // 50..80
  }

  const spawnPickup = useCallback((type = 'power', atPos = null) => {
    const id = pickupId.current++
    if (type === 'power') {
      const amount = weightedPowerAmount() // biased 50..100
      const pos = atPos ?? randPos(30)
      setPickups(p => [...p, { id, pos, type: 'power', amount, lifetimeMaxSec: 15 }])
    } else {
      const pos = atPos ?? randPos(30)
      setPickups(p => [...p, { id, pos, type: 'health', lifetimeMaxSec: 30 }])
    }
  }, [])

  // handle enemy death or collision - moved up to avoid initialization order issues
  const onEnemyDie = useCallback((id, hitPlayer=false) => {
    setEnemies(prev => {
      const enemy = prev.find(e => e.id === id)
      // If enemy hit the player, apply contact damage based on type
      if (hitPlayer) {
        const dmg = enemy?.isTriangle ? CONTACT_DAMAGE.triangle : (enemy?.isBoss ? CONTACT_DAMAGE.boss : CONTACT_DAMAGE.minion)
        setHealth(h => Math.max(h - (dmg || 1), 0))
        // show HP change
        const amount = -(dmg || 1)
        const idEvt = Date.now() + Math.random()
        setHpEvents(evts => [...evts, { id: idEvt, amount, start: performance.now() }])
      } else {
        // Award score if killed by player
        const points = enemy?.isTriangle ? 100 : (enemy?.isBoss ? 50 : 10)
        setScore(s => s + points)
  // drop chance tuned for faster game pace
  if (Math.random() < 0.20) spawnPickup(Math.random() < 0.6 ? 'power' : 'health')
      }
      return prev.filter(e => e.id !== id)
    })
  }, [spawnPickup])

  // (moved) spawnPickup and weightedPowerAmount are defined above onEnemyDie

  // Bullet-Enemy collision detection with proper health system
  const handleCollisionDetection = useCallback(() => {
    if (isPaused) return
    
    const activeBullets = bulletPool.current.getActiveBullets()
    if (!activeBullets.length || !window.gameEnemies || !window.gameEnemies.length) return

  const bulletPos = new THREE.Vector3()
  const enemyPos = new THREE.Vector3()
  const knockDir = new THREE.Vector3()

    for (const b of activeBullets) {
      bulletPos.set(b.pos[0], b.pos[1], b.pos[2])

      let hitEnemy = null
      let hitEnemyData = null
      for (const ge of window.gameEnemies) {
        if (!ge.ref || !ge.ref.current) continue
        const eData = enemies.find(e => e.id === ge.id)
        if (!eData) continue
        enemyPos.copy(ge.ref.current.position)
        const hitRadius = eData.isBoss ? 1.8 : (eData.isTriangle ? 2.5 : 0.8)
        const dist = bulletPos.distanceTo(enemyPos)
        if (dist < hitRadius) {
          hitEnemy = ge
          hitEnemyData = { ...eData, dist }
          break
        }
      }

      if (hitEnemy) {
        // Remove bullet
        bulletPool.current.returnBullet(b.id)
        setBullets(bulletPool.current.getActiveBullets())

        // Knockback direction from bullet to enemy
        knockDir.subVectors(hitEnemy.ref.current.position, bulletPos)
        knockDir.y = 0
        if (knockDir.lengthSq() > 0) {
          knockDir.normalize()
          const base = hitEnemyData.isTriangle ? KNOCKBACK.triangle : (hitEnemyData.isBoss ? KNOCKBACK.boss : KNOCKBACK.minion)
          const factor = 1 - Math.min(hitEnemyData.dist / KNOCKBACK_DISTANCE_MAX, 1)
          // Reduce knockback proportionally when global speeds are high to avoid excessive launches
          const strength = (base * factor) / SPEED_SCALE
          hitEnemy.impulse?.(knockDir.x, knockDir.z, strength)
        }

        // Apply damage
        const hitId = hitEnemy.id
        setEnemies(prev => {
          let died = false
          const updated = prev.map(e => {
            if (e.id !== hitId) return e
            const newHealth = (e.health ?? 1) - 1
            if (newHealth <= 0) {
              died = true
              return null
            }
            return { ...e, health: newHealth }
          }).filter(Boolean)
          if (died) setTimeout(() => onEnemyDie(hitId, false), 0)
          return updated
        })
      }
    }
  }, [enemies, onEnemyDie, isPaused])

  useEffect(() => {
    if (!isPaused) {
      handleCollisionDetection()
    }
  }, [bullets, handleCollisionDetection, isPaused])

  // start waves loop (pause-aware, no stale closures)
  useEffect(() => {
    // initial wave
    spawnWave()
    let cancelled = false
    let timer = null
    const tick = () => {
      if (cancelled) return
      if (!isPausedRef.current) {
        spawnWave()
  // slightly higher ambient pickup spawns after waves for faster pace
  if (Math.random() < 0.35) spawnPickup(Math.random() < 0.5 ? 'health' : 'power')
      }
      timer = setTimeout(tick, 12000)
    }
    timer = setTimeout(tick, 12000)
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [spawnWave, spawnPickup])

  const onPickupCollect = useCallback((id) => {
    const pickup = pickups.find(pk => pk.id === id)
    if (!pickup) return
    
    setPickups(prev => prev.filter(pk => pk.id !== id))
    
    // Add pickup popup
    const popupId = Date.now()
    setPickupPopups(prev => [...prev, { id: popupId, pickup }])
    
    // Apply pickup effect
    if (pickup.type === 'health') {
      setHealth(h => Math.min(h + 25, 100))
      const idEvt = Date.now() + Math.random()
      setHpEvents(evts => [...evts, { id: idEvt, amount: +25, start: performance.now() }])
    } else {
      // power-up: add score by amount and enable bullet effect for duration
      const amt = Math.max(50, Math.min(100, pickup.amount || 50))
      setScore(s => s + amt)
      // duration proportional to amount (5..10s)
      powerRemainingRef.current = (amt / 10) * 1000
      setPowerEffect({ active: true, amount: amt })
    }
  }, [pickups])

  // Remove pickup popup
  const removePickupPopup = useCallback((popupId) => {
    setPickupPopups(prev => prev.filter(p => p.id !== popupId))
  }, [])

  // Power-up effect timer (pause-aware)
  useEffect(() => {
    if (!powerEffect.active) return
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      if (!isPausedRef.current) {
        powerRemainingRef.current = Math.max(0, powerRemainingRef.current - 100)
        if (powerRemainingRef.current <= 0) {
          setPowerEffect({ active: false, amount: 0 })
          return
        }
      }
      setTimeout(tick, 100)
    }
    const t = setTimeout(tick, 100)
    return () => { cancelled = true; clearTimeout(t) }
  }, [powerEffect.active])

  // High-value radial barrage (3 waves/sec) while effect active and amount>=90
  useEffect(() => {
    if (!powerEffect.active || powerEffect.amount < 90) return
    let cancelled = false
    const fireWave = () => {
      if (cancelled) return
      if (!isPausedRef.current && powerRemainingRef.current > 0) {
        const N = 24
        for (let i = 0; i < N; i++) {
          const a = (i / N) * Math.PI * 2
          const dir = [Math.cos(a), 0, Math.sin(a)]
          handleShoot(playerPosRef.current, dir)
        }
      }
    }
    const interval = setInterval(fireWave, 333)
    return () => { cancelled = true; clearInterval(interval) }
  }, [powerEffect.active, powerEffect.amount, handleShoot])

  // game over watch
  useEffect(() => {
    if (health <= 0) {
      // reset minimal game state
      setEnemies([])
      setPickups([])
      setBullets([])
      bulletPool.current.clear()
      setWave(0)
    }
  }, [health])

  // Restart game function
  const restartGame = useCallback(() => {
    setEnemies([])
    setPickups([])
    setBullets([])
    bulletPool.current.clear()
    setHealth(100)
    setScore(0)
    setWave(0)
    setPortals([])
    // Clear global enemy references
    window.gameEnemies = []
    clearPortalTimers()
  }, [clearPortalTimers])

  // ground plane grid material
  const grid = useMemo(() => new THREE.GridHelper(200, 40, 0xb8c2cc, 0xe2e8f0), [])
  const crosshairRef = useRef(null)
  const rafRef = useRef(0)
  
  // External movement input vectors (refs to avoid per-frame allocations)
  const dpadVecRef = useRef({ x: 0, z: 0 })
  const runnerVecRef = useRef({ x: 0, z: 0 })
  // Effective movement input for Player when using external controls
  const moveInputRef = useRef({ x: 0, z: 0 })
  // Source of movement for speed scaling/override semantics: 'dpad' | 'runner' | 'keyboard' | 'none'
  const moveSourceRef = useRef('none')

  // Shape Runner controller: emits a direction vector when enabled
  useEffect(() => {
    if (!shapeRunner) {
      runnerVecRef.current.x = 0
      runnerVecRef.current.z = 0
      return
    }
    let cancelled = false
    const start = performance.now()
    const tick = () => {
      if (cancelled || isPausedRef.current) {
        // keep last vector or zero when paused
        requestAnimationFrame(tick)
        return
      }
      const t = (performance.now() - start) / 1000
      let vx = 0, vz = 0
      if (shapePattern === 'circle') {
        // steady circular motion
        vx = Math.cos(t)
        vz = Math.sin(t)
      } else if (shapePattern === 'triangle') {
        // 3 segments, each ~2s direction
        const seg = Math.floor((t % 6) / 2)
        if (seg === 0) { vx = 1; vz = 0 } else if (seg === 1) { vx = -0.5; vz = Math.sin(Math.PI / 3) } else { vx = -0.5; vz = -Math.sin(Math.PI / 3) }
      } else {
        // rectangle: 4 directions, 1.5s each
        const seg = Math.floor((t % 6) / 1.5)
        if (seg === 0) { vx = 1; vz = 0 } else if (seg === 1) { vx = 0; vz = 1 } else if (seg === 2) { vx = -1; vz = 0 } else { vx = 0; vz = -1 }
      }
      // normalize (avoid allocations)
      const len = Math.hypot(vx, vz) || 1
      runnerVecRef.current.x = vx / len
      runnerVecRef.current.z = vz / len
      requestAnimationFrame(tick)
    }
    const r = requestAnimationFrame(tick)
    return () => { cancelled = true; cancelAnimationFrame(r) }
  }, [shapeRunner, shapePattern])

  // Combine manual DPad and Shape Runner: manual overrides when non-zero
  useEffect(() => {
    let raf = 0
    const merge = () => {
      // default
      let sx = 0, sz = 0
      let source = 'none'
      const mx = dpadVecRef.current.x
      const mz = dpadVecRef.current.z
      if (Math.abs(mx) > 0.001 || Math.abs(mz) > 0.001) {
        sx = mx; sz = mz; source = 'dpad'
      } else if (shapeRunner) {
        // runner preferred when enabled and no manual input
        sx = runnerVecRef.current.x
        sz = runnerVecRef.current.z
        source = 'runner'
      }
      moveInputRef.current.x = sx
      moveInputRef.current.z = sz
      moveSourceRef.current = source
      raf = requestAnimationFrame(merge)
    }
    raf = requestAnimationFrame(merge)
    return () => cancelAnimationFrame(raf)
  }, [shapeRunner])

  const handlePointerMove = useCallback((e) => {
    const x = e.clientX
    const y = e.clientY
    if (!crosshairRef.current) return
    // throttle with rAF to avoid layout trashing
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (!crosshairRef.current) return
      crosshairRef.current.style.left = x + 'px'
      crosshairRef.current.style.top = y + 'px'
    })
  }, [])

  return (
    <div className="canvas-wrap">
  <Canvas shadows camera={{ position: [0, 35, 30], fov: 50 }} onPointerMove={handlePointerMove}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 40, 10]} intensity={0.8} castShadow />
        {/* Semi-light ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color={0xeaeef3} roughness={1} />
        </mesh>
        {/* Boundary visual cue */}
        <BoundaryCue limit={BOUNDARY_LIMIT} isPaused={isPaused} />
        <primitive object={grid} position={[0, 0.001, 0]} />

        {/* Active portals */}
        {!isPaused && portals.map(pr => (
          <Portal key={pr.id} pos={pr.pos} isPaused={isPaused} />
        ))}

        <Player 
          position={[0, 0.5, 0]} 
          setPositionRef={setPositionRef} 
          onShoot={handleShoot}
          isPaused={isPaused}
          autoFire={autoFire}
          controlScheme={controlScheme}
          moveInputRef={moveInputRef}
          moveSourceRef={moveSourceRef}
          highContrast={highContrast}
          portals={portals}
          onSlam={(slam) => {
            // Create AOE visual and push back enemies
            const center = slam.pos
            const radius = slam.radius
            const power = slam.power
            // Apply impulses to enemies (no allocations beyond few vectors)
            const epos = new THREE.Vector3()
            const cpos = new THREE.Vector3(center[0], center[1], center[2])
            if (window.gameEnemies) {
              window.gameEnemies.forEach(ge => {
                if (!ge.ref || !ge.ref.current) return
                epos.copy(ge.ref.current.position)
                const dx = epos.x - cpos.x
                const dz = epos.z - cpos.z
                const d2 = dx*dx + dz*dz
                const r2 = radius * radius
                if (d2 <= r2) {
                  const d = Math.sqrt(Math.max(d2, 1e-6))
                  const nx = dx / d
                  const nz = dz / d
                  const strength = power * (1 - (d / radius))
                  ge.impulse?.(nx, nz, strength)
                  // Apply stun for 5 seconds
                  ge.stun?.(5000)
                  // Bosses drop a health pickup immediately upon being stunned
                  if (ge.isBoss) {
                    spawnPickup('health', [epos.x, 0.5, epos.z])
                  }
                }
              })
            }
            // Add AOE visual
            setAoes(prev => [...prev, { id: Date.now(), pos: [center[0], 0.06, center[2]], start: performance.now(), radius }])
          }}
          onDebuff={() => {
            const popupId = Date.now()
            setPickupPopups(prev => [...prev, { id: popupId, pickup: { type: 'debuff' } }])
          }}
        />

        {!isPaused && enemies.map(e => (
          e.isTriangle ? (
            <TriangleBoss 
              key={e.id} 
              id={e.id} 
              pos={e.pos} 
              playerPosRef={playerPosRef} 
              onDie={onEnemyDie}
              health={e.health}
              isPaused={isPaused}
              spawnHeight={e.spawnHeight}
            />
          ) : e.isCone ? (
            <ConeBoss
              key={e.id}
              id={e.id}
              pos={e.pos}
              playerPosRef={playerPosRef}
              onDamagePlayer={damagePlayer}
              health={e.health}
              isPaused={isPaused}
              spawnHeight={e.spawnHeight}
            />
          ) : (
            <Minion 
              key={e.id} 
              id={e.id} 
              pos={e.pos} 
              playerPosRef={playerPosRef} 
              onDie={onEnemyDie} 
              isBoss={e.isBoss}
              formationTarget={e.formationTarget}
              waveNumber={e.waveNumber || wave}
              health={e.health}
              isPaused={isPaused}
              spawnHeight={e.spawnHeight}
            />
          )
        ))}

        {!isPaused && bullets.map(bullet => (
          <Bullet 
            key={bullet.id} 
            bullet={bullet} 
            onExpire={handleBulletExpire}
            isPaused={isPaused}
          />
        ))}

        {!isPaused && pickups.map(p => (
          <Pickup 
            key={p.id} 
            id={p.id} 
            pos={p.pos} 
            type={p.type}
            amount={p.amount}
            lifetimeMaxSec={p.lifetimeMaxSec}
            onCollect={onPickupCollect}
            onExpire={(pid) => setPickups(prev => prev.filter(x => x.id !== pid))}
            playerPosRef={playerPosRef}
            isPaused={isPaused}
          />
        ))}

        <OrbitControls enableRotate={false} enablePan={false} maxPolarAngle={Math.PI / 2.2} minPolarAngle={Math.PI / 3} />
        {/* AOE visuals */}
        {aoes.map(a => (
          <AOEBlast key={a.id} pos={a.pos} start={a.start} radius={a.radius} onDone={() => setAoes(prev => prev.filter(x => x.id !== a.id))} />
        ))}
        {/* HP change floaters */}
        {hpEvents.map(evt => (
          <HpFloater key={evt.id} amount={evt.amount} start={evt.start} playerPosRef={playerPosRef} onDone={() => setHpEvents(e => e.filter(x => x.id !== evt.id))} />
        ))}

        <Stats />
      </Canvas>

  <div ref={crosshairRef} className={`cursor-crosshair ${highContrast ? 'high-contrast' : ''}`} />
      {/* D-Buttons overlay */}
      {controlScheme === 'dpad' && (
        <DPad onVectorChange={(x, z) => { dpadVecRef.current.x = x; dpadVecRef.current.z = z }} />
      )}
      
      {/* Pause overlay */}
      {isPaused && (
        <div className="pause-overlay">
          <div className="pause-content">
            <h2>Game Paused</h2>
            <p>Press ESC or SPACE to resume</p>
          </div>
        </div>
      )}

      {/* Pickup popups */}
      {pickupPopups.map(popup => (
        <PickupPopup 
          key={popup.id} 
          pickup={popup.pickup} 
          onComplete={() => removePickupPopup(popup.id)}
        />
      ))}

      <div className="ui">
        <div className="small">Wave: <strong>{wave}</strong></div>
        <div className="small">Score: <strong>{score}</strong></div>
        <div className="small">Health: <strong>{health}</strong></div>
        <div style={{height:8}} />
        <button className="button" onClick={restartGame}>Restart</button>
        <div style={{height:6}} />
        <button className="button" onClick={() => setAutoFire(a => !a)}>
          Auto-Fire: {autoFire ? 'On' : 'Off'} (F)
        </button>
        <div style={{height:10}} />
        <div className="small"><strong>Controls (Accessibility)</strong></div>
        <div className="small" style={{marginTop:4}}>Control Scheme:</div>
        <select
          value={controlScheme}
          onChange={e => setControlScheme(e.target.value)}
          style={{ width: '100%', padding: '4px', borderRadius: 6, background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)'}}
        >
          <option value="wasd">WASD Control</option>
          <option value="dpad">D-Buttons Control</option>
        </select>
        <div style={{height:6}} />
        <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={shapeRunner} onChange={e => setShapeRunner(e.target.checked)} />
          + Shape runner
        </label>
        {shapeRunner && (
          <>
            <div className="small" style={{marginTop:4}}>Pattern:</div>
            <select
              value={shapePattern}
              onChange={e => setShapePattern(e.target.value)}
              style={{ width: '100%', padding: '4px', borderRadius: 6, background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)'}}
            >
              <option value="circle">Circular</option>
              <option value="triangle">Triangular</option>
              <option value="rectangle">Rectangular</option>
            </select>
          </>
        )}
        <div style={{height:6}} />
        <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={highContrast} onChange={e => setHighContrast(e.target.checked)} />
          High-contrast aim & crosshair
        </label>
        <div style={{height:6}} />
  <div className="small">Controls: D-Buttons (default) or WASD • Mouse aim & click to shoot</div>
        <div className="small">F to toggle Auto-Fire • ESC/SPACE to pause</div>
      </div>

      <div className="hud small">
        <div>Enemies: {enemies.length}</div>
        <div>Pickups: {pickups.length}</div>
        <div>Bullets: {bullets.length}</div>
        <div>Status: {isPaused ? 'PAUSED' : 'PLAYING'}</div>
        <div>Scheme: {controlScheme.toUpperCase()}</div>
        {shapeRunner && <div>Runner: {shapePattern}</div>}
      </div>

      {/* Control guide */}
      <div className="control-guide">
        <div className="title">Controls</div>
        <div className="row">Move: D-Buttons (default) or WASD/Arrow Keys</div>
        <div className="row">Aim: Mouse pointer • Fire: Left click</div>
        <div className="row">Jump: Ctrl/Enter (hold for arc) or Right click (hold for arc)</div>
        <div className="row">Auto-Fire: F • Pause: ESC/SPACE</div>
        <div className="row">Runner: Shapes auto-move; manual inputs override while held</div>
      </div>

    </div>
  )
}

// D-Buttons component (mouse + touch). Emits a normalized (x, z) vector via callback.
function DPad({ onVectorChange }) {
  const active = useRef({ up: false, down: false, left: false, right: false })
  const update = useCallback(() => {
    const x = (active.current.right ? 1 : 0) - (active.current.left ? 1 : 0)
    const z = (active.current.down ? 1 : 0) - (active.current.up ? 1 : 0)
    const len = Math.hypot(x, z) || 1
    onVectorChange(x / len, z / len)
  }, [onVectorChange])

  const set = (key, val) => {
    active.current[key] = val
    update()
  }

  // Pointer handlers generator
  const bind = (key) => ({
    onMouseDown: (e) => { e.preventDefault(); set(key, true) },
    onMouseUp: () => set(key, false),
    onMouseLeave: () => set(key, false),
    onTouchStart: (e) => { e.preventDefault(); set(key, true) },
    onTouchEnd: () => set(key, false),
    onTouchCancel: () => set(key, false),
  })

  return (
    <div className="dpad">
      <button className="dpad-btn up" {...bind('up')} aria-label="Move up" />
      <button className="dpad-btn left" {...bind('left')} aria-label="Move left" />
      <button className="dpad-btn right" {...bind('right')} aria-label="Move right" />
      <button className="dpad-btn down" {...bind('down')} aria-label="Move down" />
    </div>
  )
}

// AOE blast visual: expanding translucent ring for ~2s
function AOEBlast({ pos, start, radius = 9, onDone }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x99ccff, transparent: true, opacity: 0.6 }), [])
  const geom = useMemo(() => new THREE.RingGeometry(0.5, 0.6, 32), [])
  const DURATION = 2000
  useFrame(() => {
    if (!ref.current) return
    const t = performance.now() - start
    const k = Math.min(t / DURATION, 1)
    const scale = 0.5 + k * radius
    ref.current.scale.set(scale, scale, scale)
    // fade out towards end
    mat.opacity = 0.6 * (1 - k)
    if (k >= 1) onDone && onDone()
  })
  return (
    <mesh ref={ref} position={pos} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <primitive object={geom} attach="geometry" />
    </mesh>
  )
}

// Visual rim/fence around the play area to signal the boundary
function BoundaryCue({ limit = 40, isPaused }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x6699ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide }), [])
  const height = 0.4
  const geomX = useMemo(() => new THREE.PlaneGeometry(limit * 2, height), [limit])
  const geomZ = useMemo(() => new THREE.PlaneGeometry(limit * 2, height), [limit])
  useFrame(() => {
    if (isPaused) return
    const t = performance.now() * 0.004
    mat.opacity = 0.10 + 0.08 * (0.5 + 0.5 * Math.sin(t))
  })
  return (
    <group>
      {/* North & South walls (along X at z=±limit) */}
      <mesh position={[0, height/2, -limit]} geometry={geomX} material={mat} />
      <mesh position={[0, height/2, limit]} rotation={[0, Math.PI, 0]} geometry={geomX} material={mat} />
      {/* West & East walls (along Z at x=±limit) */}
      <mesh position={[-limit, height/2, 0]} rotation={[0, Math.PI/2, 0]} geometry={geomZ} material={mat} />
      <mesh position={[limit, height/2, 0]} rotation={[0, -Math.PI/2, 0]} geometry={geomZ} material={mat} />
    </group>
  )
}

// Floating HP change text above the player
function HpFloater({ amount, start, playerPosRef, onDone }) {
  const ref = useRef()
  const color = amount >= 0 ? '#22c55e' : '#ef4444'
  const text = (amount > 0 ? '+' : '') + amount
  const DURATION = 1200
  useFrame(() => {
    if (!ref.current) return
    const t = performance.now() - start
    const k = Math.min(t / DURATION, 1)
    const pos = playerPosRef.current
    // rise from y=2 to y≈3
    ref.current.position.set(pos.x, 2 + k * 1.0, pos.z)
    // fade out towards end
    if (ref.current.material) {
      ref.current.material.opacity = 1 - k
      ref.current.material.transparent = true
    }
    if (k >= 1) onDone && onDone()
  })
  return (
    <Text ref={ref} fontSize={0.6} color={color} anchorX="center" anchorY="middle">
      {text}
    </Text>
  )
}