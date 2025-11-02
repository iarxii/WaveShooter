import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stats, Text } from '@react-three/drei'
import * as THREE from 'three'

// GAME CONSTANTS
const PLAYER_SPEED = 24 // faster than minions to keep mobility advantage
const PLAYER_SPEED_CAP = 50 // cap player base speed for control stability
const SPEED_DEBUFF_FACTOR = 0.6
const SPEED_DEBUFF_DURATION_MS = 4000
const BOUNDARY_LIMIT = 50
// Decoupled shape path radius for invulnerability runner (independent of arena boundary)
const SHAPE_PATH_RADIUS = 24
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
const MAX_PICKUPS = 25 // cap concurrent pickups to optimize memory and FPS
// Bomb ability constants
const BOMB_DAMAGE = 4
const BOMB_STUN_MS = 1400
const BOMB_CONTACT_RADIUS = 1.4
const BOMB_AOE_RADIUS = 6.2
const BOMB_UP_VEL = 12
const BOMB_GRAVITY = 24
const BOMB_SPAWN_INTERVAL_MS = 250 // 4 per second
const BOMB_ABILITY_DURATION_MS = 6000 // extended: total 6s
// Speed boost planes (green triangles) constants
const SPEED_BUFF_DURATION_MS = 4000
const SPEED_BOOST_LIFETIME = 4500
const SPEED_BOOST_RADIUS_MIN = 10
const SPEED_BOOST_RADIUS_MAX = 18
// Speed tuning helpers (normalize new high speeds against a baseline feel)
const SPEED_TUNING_BASE = 14 // reference player speed used for original tuning
const SPEED_SCALE = Math.max(0.5, PLAYER_SPEED / SPEED_TUNING_BASE)
// Caps and smoothing to avoid jitter/teleport at high speeds
const MINION_MAX_SPEED = 12 // u/s hard cap for minion & ordinary boss chase
const TRIANGLE_CHARGE_MAX = 18 // u/s hard cap for triangle charge
const TRIANGLE_CIRCLE_MAX = 12 // u/s hard cap for triangle circling
// Enemy damage scaling
const DAMAGE_SCALE_PER_WAVE = 0.04 // +4% per wave
const DAMAGE_SCALE_MAX = 4.0 // cap at 4x (balanced)
// Enemy speed scaling and player compensation
const ENEMY_SPEED_SCALE_PER_WAVE = 0.03 // +3% enemy speed per wave
const ENEMY_SPEED_SCALE_MAX = 1.5 // cap at 1.5x (balanced)
const APPROACH_SLOW_RADIUS = 2.5 // start slowing when near target
const POST_LAND_SETTLE = 0.3 // s to ramp in after spawn landing
// Knockback tuning (exposed constants)
const KNOCKBACK = {
  minion: 12.0,
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
const DROP_SPAWN_HEIGHT = 8 // y height enemies begin falling from
const DROP_SPEED = 10 // units/sec downward during spawn

// Contact damage by enemy type
const CONTACT_DAMAGE = {
  minion: 2,
  boss: 20,
  triangle: 31,
  cone: 42,
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
      : pickup.type === 'invuln'
        ? { name: 'Invulnerability', effect: 'Immune (5s)', color: '#facc15' }
        : pickup.type === 'bombs'
          ? { name: 'Bomb Kit', effect: '4/s bombs for 6s', color: '#111827' }
        : pickup.type === 'speedboost'
          ? { name: 'Speed Boost', effect: 'Speed 26–28 (4s)', color: '#22c55e' }
        : pickup.type === 'dmgscale'
          ? { name: 'Enemy Fury', effect: `Damage x${(pickup.scale ?? 1).toFixed(2)}`, color: '#f97316' }
        : pickup.type === 'speedramp'
          ? { name: 'Speed Surge', effect: `Enemies x${(pickup.scale ?? 1).toFixed(2)} • Player +1`, color: '#22c55e' }
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
function Pickup({ pos, type, amount=50, lifetimeMaxSec=20, onCollect, onExpire, id, playerPosRef, isPaused, scaleMul = 1 }) {
  const ref = useRef()
  const elapsedRef = useRef(0)
  const baseScale = useRef(type === 'power' ? (0.5 + Math.min(Math.max((amount - 50) / 50, 0), 1) * 0.6) : 0.5)
  const pulseSpeed = useRef( type === 'power' && amount >= 90 ? 3.0 : 0 )
  const isDiamond = amount >= 90 && type === 'power'
  const lifeLabelRef = useRef()
  const collectedRef = useRef(false)
  // Heart geometry for life pickups (extruded 2D heart)
  const heartGeom = useMemo(() => {
    if (type !== 'life') return null
    const shape = new THREE.Shape()
    // A simple heart path
    shape.moveTo(0, 0.35)
    shape.bezierCurveTo(0, 0.15, -0.35, 0.15, -0.5, 0.35)
    shape.bezierCurveTo(-0.7, 0.6, -0.45, 0.95, 0, 1.2)
    shape.bezierCurveTo(0.45, 0.95, 0.7, 0.6, 0.5, 0.35)
    shape.bezierCurveTo(0.35, 0.15, 0, 0.15, 0, 0.35)
    const extrude = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false, steps: 1 })
    // Rotate to face up and center pivot slightly
    extrude.rotateX(-Math.PI / 2)
    extrude.translate(0, 0, 0)
    return extrude
  }, [type])
  const heartMat = useMemo(() => type === 'life' ? new THREE.MeshStandardMaterial({ color: 0xff3366, emissive: 0x220011, roughness: 0.5 }) : null, [type])
  
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
    // Scaling per type with pulses
    if (type === 'life') {
      const t = performance.now() * 0.004
      const s0 = 1.0 + 0.15 * (0.5 + 0.5 * Math.sin(t)) // gently pulse large heart
      const s = s0 * 1.4 // base upsize
      ref.current.scale.set(s * scaleMul, s * scaleMul, s * scaleMul)
      if (lifeLabelRef.current) {
        const tt = performance.now() * 0.003 + id
        lifeLabelRef.current.position.y = 0.9 + 0.12 * Math.sin(tt)
      }
    } else if (pulseSpeed.current > 0) {
      const p = 1 + Math.sin(performance.now() * 0.001 * (pulseSpeed.current * 60)) * 0.12
      const s = baseScale.current * p * scaleMul
      ref.current.scale.set(s, s, s)
    } else if (type === 'power') {
      const s = baseScale.current * scaleMul
      ref.current.scale.set(s, s, s)
    } else {
      const s = 0.5 * scaleMul
      ref.current.scale.set(s, s, s)
    }
    
    // Check collision with player (single-fire guard)
    if (!collectedRef.current) {
      const distance = ref.current.position.distanceTo(playerPosRef.current)
      if (distance < PICKUP_COLLECT_DISTANCE) {
        collectedRef.current = true
        onCollect(id)
      }
    }
  })
  
  return (
    <mesh ref={ref} position={pos}>
      {type === 'life' ? (
        <primitive object={heartGeom} attach="geometry" />
      ) : type === 'health' ? (
        <boxGeometry args={[0.5, 0.5, 0.5]} />
      ) : type === 'invuln' ? (
        <capsuleGeometry args={[0.25, 0.6, 4, 8]} />
      ) : type === 'bombs' ? (
        <sphereGeometry args={[0.32, 12, 12]} />
      ) : (
        isDiamond ? <octahedronGeometry args={[0.5, 0]} /> : <boxGeometry args={[0.5, 0.5, 0.5]} />
      )}
      {type === 'life' && (
        <Text ref={lifeLabelRef} position={[0, 0.9, 0]} fontSize={0.45} color="#22c55e" anchorX="center" anchorY="bottom" outlineWidth={0.02} outlineColor="#000000">
          1UP
        </Text>
      )}
      {type === 'life' ? (
        <primitive object={heartMat} attach="material" />
      ) : (
        <meshStandardMaterial 
          color={type === 'health' ? 0x22c55e : (type === 'invuln' ? 0xfacc15 : (type === 'bombs' ? 0x000000 : 0x60a5fa))}
          emissive={type === 'power' && isDiamond ? 0x224466 : (type === 'health' ? 0x001100 : (type === 'invuln' ? 0x443300 : (type === 'bombs' ? 0x000000 : 0x000044)))}
          emissiveIntensity={type === 'power' && isDiamond ? 1.5 : (type === 'invuln' ? 0.9 : 0.4)}
        />
      )}
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

// Speed boost visual: green triangular plane that pulses
function SpeedBoostPlane({ pos, isPaused }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x002200, roughness: 0.7 }), [])
  const geom = useMemo(() => new THREE.CircleGeometry(2.2, 3), []) // triangle
  useFrame(() => {
    if (!ref.current || isPaused) return
    const t = performance.now() * 0.005
    const s = 1 + Math.sin(t) * 0.08
    ref.current.scale.set(s, s, s)
    // subtle emissive pulse
    mat.emissiveIntensity = 0.4 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.3))
  })
  return (
    <mesh ref={ref} position={[pos[0], 0.052, pos[2]]} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <primitive object={geom} attach="geometry" />
    </mesh>
  )
}

// Translucent shield bubble around the player; color/size can be customized per use
function ShieldBubble({ playerPosRef, isPaused, color = 0x66ccff, radius = 1.4, baseOpacity = 0.25 }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: baseOpacity }), [color, baseOpacity])
  const geom = useMemo(() => new THREE.SphereGeometry(radius, 20, 20), [radius])
  useFrame((_, dt) => {
    if (!ref.current) return
    const p = playerPosRef.current
    ref.current.position.set(p.x, 0.5, p.z)
    if (!isPaused) {
      const t = performance.now() * 0.004
      // gentle pulse in scale and opacity
      const s = 1 + 0.06 * (0.5 + 0.5 * Math.sin(t))
      ref.current.scale.set(s, s, s)
      mat.opacity = baseOpacity * 0.7 + (baseOpacity * 0.5) * (0.5 + 0.5 * Math.sin(t * 1.3))
    }
  })
  return (
    <mesh ref={ref} geometry={geom} material={mat} />
  )
}

// Player (simple rectangle box) with WASD movement and mouse aiming
function Player({ position, setPositionRef, onShoot, isPaused, autoFire, controlScheme = 'dpad', moveInputRef, moveSourceRef, onSlam, highContrast=false, portals=[], onDebuff, speedBoosts=[], onBoost, autoFollow, arcTriggerToken, resetToken=0, basePlayerSpeed=PLAYER_SPEED, autoAimEnabled=false, onBoundaryJumpChange, onLanding, dashTriggerToken=0, onDashStart, onDashEnd }) {
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
  // Dash state
  const dashing = useRef(false)
  const dashTime = useRef(0)
  const dashDuration = 0.25 // seconds
  const dashVel = useRef(new THREE.Vector3())
  const portalHitCooldown = useRef(0)
  const boundaryGraceRef = useRef(0) // seconds of grace after respawn to ignore boundary launch
  const boostTimer = useRef(0) // seconds remaining for speed boost
  const boostHitCooldown = useRef(0)
  const boostSpeedRef = useRef(PLAYER_SPEED)
  const lastArcToken = useRef(0)
  const boundaryJumpActive = useRef(false)
  // Reset position and motion after respawn/restart
  useEffect(() => {
    if (!ref.current) return
    // Center player and clear motion
    ref.current.position.set(0, 0.5, 0)
    airVelY.current = 0
    airFwdVel.current = 0
    airFwdDir.current.set(0, 0, -1)
    slamArmed.current = false
    launchCooldown.current = 0
    portalHitCooldown.current = 0
    // Clear inputs
    keysRef.current = { w: false, a: false, s: false, d: false, up: false, down: false, left: false, right: false }
    isKeyJumpDown.current = false
    isRmbDown.current = false
    // Short grace: do not trigger boundary launch immediately after respawn
    boundaryGraceRef.current = 2.0
  }, [resetToken])

  
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
        if (ref.current.position.y <= 0.5) {
          // Always perform a forward arc jump on release
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
        // Only trigger if on ground
        if (ref.current.position.y <= 0.5) {
          // Always perform a forward arc jump on release
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

  // Trigger an external arc jump when arcTriggerToken increments
  useEffect(() => {
    if (!ref.current) return
    if (arcTriggerToken && arcTriggerToken !== lastArcToken.current) {
      lastArcToken.current = arcTriggerToken
      // Same arc jump used in boundary launch: hop forward along aim
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
    }
  }, [arcTriggerToken])

  // Auto-fire using the render loop for reliability instead of setInterval
  const autoFireTimerRef = useRef(0)

  // Rotate player smoothly to face mouse (projected onto ground) or face shape origin when auto-following
  useFrame((state, dt) => {
    if (!ref.current || isPaused) return

    // Dash movement override: while dashing, move along dashVel and skip normal handling
    if (dashing.current) {
      dashTime.current += dt
      ref.current.position.addScaledVector(dashVel.current, dt)
      // Clamp to arena bounds
      ref.current.position.x = Math.max(Math.min(ref.current.position.x, BOUNDARY_LIMIT - 0.5), -BOUNDARY_LIMIT + 0.5)
      ref.current.position.z = Math.max(Math.min(ref.current.position.z, BOUNDARY_LIMIT - 0.5), -BOUNDARY_LIMIT + 0.5)
      if (dashTime.current >= dashDuration) {
        dashing.current = false
        onDashEnd && onDashEnd({ x: ref.current.position.x, z: ref.current.position.z })
      }
      return
    }

    // Auto-fire cadence (FIRE_RATE) using accumulated dt
    if (autoFire) {
      autoFireTimerRef.current += dt * 1000
      if (autoFireTimerRef.current >= FIRE_RATE) {
        autoFireTimerRef.current = 0
        const dir = forward.current
          .set(0, 0, -1)
          .applyQuaternion(ref.current.quaternion)
        dir.y = 0
        dir.normalize()
        lastShot.current = performance.now()
        onShoot(ref.current.position, [dir.x, 0, dir.z])
      }
    } else {
      // reset timer when disabled to avoid burst on re-enable
      autoFireTimerRef.current = 0
    }
    
    if (autoFollow && autoFollow.active) {
      // Face toward the shape origin (center)
      const cx = (autoFollow.center?.[0] ?? 0)
      const cz = (autoFollow.center?.[2] ?? 0)
      tmpDir.current.set(cx - ref.current.position.x, 0, cz - ref.current.position.z)
      if (tmpDir.current.lengthSq() > 1e-6) {
        aimDirRef.current.copy(tmpDir.current).normalize() // also align arc launch direction
        const targetYaw = Math.atan2(tmpDir.current.x, tmpDir.current.z) + Math.PI
        const diff = ((targetYaw - lastYaw.current + Math.PI) % (Math.PI * 2)) - Math.PI
        lastYaw.current = lastYaw.current + diff * (1 - Math.exp(-10 * dt))
        ref.current.rotation.y = lastYaw.current
      }
    } else if (autoAimEnabled) {
      // Auto-aim: prefer cluster center at short/mid range, else highest-priority enemy at long range
      const p = ref.current.position
      let target = null
      let targetIsCluster = false
      const SHORT_RANGE = 10
      const MID_RANGE = 18
      const LONG_RANGE = 36
      let cx = 0, cz = 0, ccount = 0
      if (window.gameEnemies && window.gameEnemies.length) {
        for (const ge of window.gameEnemies) {
          if (!ge?.ref?.current) continue
          const ex = ge.ref.current.position.x
          const ez = ge.ref.current.position.z
          const dx = ex - p.x
          const dz = ez - p.z
          const d2 = dx*dx + dz*dz
          if (d2 <= MID_RANGE*MID_RANGE) {
            cx += ex; cz += ez; ccount++
          }
        }
        // Large pull near us -> aim at centroid
        if (ccount >= 5) {
          cx /= ccount; cz /= ccount
          target = { x: cx, z: cz }
          targetIsCluster = true
        } else {
          // Highest level at long range
          let best = null
          for (const ge of window.gameEnemies) {
            if (!ge?.ref?.current) continue
            const ex = ge.ref.current.position.x
            const ez = ge.ref.current.position.z
            const dx = ex - p.x
            const dz = ez - p.z
            const d2 = dx*dx + dz*dz
            if (d2 > LONG_RANGE*LONG_RANGE) continue
            // Priority: cone > boss (includes triangle boss) > minion
            let pri = 1
            if (ge.isCone) pri = 3
            else if (ge.isBoss) pri = 2
            // Score prioritizes level first, distance second
            const score = pri * 10000 - d2
            if (!best || score > best.score) best = { score, x: ex, z: ez }
          }
          if (best) target = { x: best.x, z: best.z }
        }
      }

      if (target) {
        tmpDir.current.set(target.x - p.x, 0, target.z - p.z)
        if (tmpDir.current.lengthSq() > 1e-6) {
          aimDirRef.current.copy(tmpDir.current).normalize()
          const targetYaw = Math.atan2(tmpDir.current.x, tmpDir.current.z) + Math.PI
          const diff = ((targetYaw - lastYaw.current + Math.PI) % (Math.PI * 2)) - Math.PI
          lastYaw.current = lastYaw.current + diff * (1 - Math.exp(-10 * dt))
          ref.current.rotation.y = lastYaw.current
          // widen beam based on target distance
          if (rayRef.current) {
            const dist = Math.min(tmpDir.current.length(), MID_RANGE)
            const width = baseRayThickness + Math.min(dist / 12, 1) * 0.14
            rayRef.current.scale.x = width
          }
        }
      } else {
        // fallback to pointer if no auto-aim target
        state.raycaster.setFromCamera(state.pointer, state.camera)
        const hit = state.raycaster.ray.intersectPlane(plane, aimPoint.current)
        if (hit) {
          tmpDir.current.subVectors(aimPoint.current, ref.current.position)
          tmpDir.current.y = 0
          if (tmpDir.current.lengthSq() > 1e-6) {
            aimDirRef.current.copy(tmpDir.current).normalize()
            const targetYaw = Math.atan2(tmpDir.current.x, tmpDir.current.z) + Math.PI
            const diff = ((targetYaw - lastYaw.current + Math.PI) % (Math.PI * 2)) - Math.PI
            lastYaw.current = lastYaw.current + diff * (1 - Math.exp(-10 * dt))
            ref.current.rotation.y = lastYaw.current
            const dist = tmpDir.current.length()
            if (rayRef.current) {
              const width = baseRayThickness + Math.min(dist / 12, 1) * 0.14
              rayRef.current.scale.x = width
            }
          }
        }
      }
    } else {
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
    // Auto-follow path override: follow edges of selected shape (circle/triangle/rectangle)
    if (autoFollow && autoFollow.active) {
      const cx = (autoFollow.center?.[0] ?? 0)
      const cz = (autoFollow.center?.[2] ?? 0)
      const px = ref.current.position.x
      const pz = ref.current.position.z
      const shape = autoFollow.shape || 'circle'
      const r = Math.max(0.001, autoFollow.radius || 1)
      const dirSign = autoFollow.dirSign || 1

      const clampStep = (v, maxStep) => Math.max(-maxStep, Math.min(maxStep, v))

      if (shape === 'circle') {
        let dx = px - cx
        let dz = pz - cz
        const len = Math.hypot(dx, dz)
        if (len < 0.001) { dx = 1; dz = 0 }
        // tangent (CCW default); dirSign=-1 flips to clockwise
        let tx = -dz * dirSign
        let tz = dx * dirSign
        const tlen = Math.hypot(tx, tz) || 1
        mx = tx / tlen; mz = tz / tlen
        // smooth radial correction: add as velocity bias for smoothness
        const radialErr = r - len
        if (Math.abs(radialErr) > 0.001) {
          const rx = dx / (len || 1)
          const rz = dz / (len || 1)
          const corrGain = 2.5 // lower gain for smoother glue to path
          mx += rx * radialErr * corrGain * dt
          mz += rz * radialErr * corrGain * dt
        }
      } else {
        // Polygon path (hexagon/rectangle): compute nearest point on perimeter and edge tangent
        const segs = []
        if (shape === 'hexagon') {
          const verts = []
          for (let i = 0; i < 6; i++) {
            const a = (-Math.PI / 2) + i * (2 * Math.PI / 6) // start at top, CCW order; dirSign flips for CW
            verts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r])
          }
          for (let i = 0; i < 6; i++) {
            const a0 = verts[i], a1 = verts[(i + 1) % 6]
            segs.push([a0[0], a0[1], a1[0], a1[1]])
          }
        } else {
          const hx = r
          const hz = r * 0.7
          const v = [
            [cx + hx, cz + hz],
            [cx - hx, cz + hz],
            [cx - hx, cz - hz],
            [cx + hx, cz - hz],
          ]
          for (let i = 0; i < 4; i++) {
            const a0 = v[i], a1 = v[(i + 1) % 4]
            segs.push([a0[0], a0[1], a1[0], a1[1]])
          }
        }
        let best = null
        for (const s of segs) {
          const [x1, z1, x2, z2] = s
          const vx = x2 - x1, vz = z2 - z1
          const denom = vx * vx + vz * vz || 1
          let t = ((px - x1) * vx + (pz - z1) * vz) / denom
          t = Math.max(0, Math.min(1, t))
          const nx = x1 + t * vx
          const nz = z1 + t * vz
          const dx = px - nx
          const dz = pz - nz
          const d2 = dx * dx + dz * dz
          if (!best || d2 < best.d2) best = { nx, nz, vx, vz, d2 }
        }
        if (best) {
          const elen = Math.hypot(best.vx, best.vz) || 1
          // tangent along segment; dirSign flips direction
          mx = (best.vx / elen) * dirSign
          mz = (best.vz / elen) * dirSign
          // smooth correction towards nearest point to stick to edge: add to velocity, not position
          const corrGain = 8.0
          mx += (best.nx - px) * corrGain * dt
          mz += (best.nz - pz) * corrGain * dt
        }
      }
    }
  // normalize and compute speed multiplier (runner covers larger area)
  const mlen = Math.hypot(mx, mz) || 1
  mx /= mlen; mz /= mlen
  // debuff countdown and factor
  portalHitCooldown.current = Math.max(0, portalHitCooldown.current - dt)
  debuffTimer.current = Math.max(0, debuffTimer.current - dt)
  boostHitCooldown.current = Math.max(0, boostHitCooldown.current - dt)
  boostTimer.current = Math.max(0, boostTimer.current - dt)
  const debuffMul = debuffTimer.current > 0 ? SPEED_DEBUFF_FACTOR : 1
  const baseSpeed = (boostTimer.current > 0 ? boostSpeedRef.current : basePlayerSpeed)
  const speedMul = ((moveSourceRef && moveSourceRef.current === 'runner') ? RUNNER_SPEED_MULTIPLIER : 1) * debuffMul
  // base movement
  ref.current.position.x += mx * (baseSpeed * speedMul) * dt
  ref.current.position.z += mz * (baseSpeed * speedMul) * dt

  // Boundary detection -> launch
    launchCooldown.current = Math.max(0, launchCooldown.current - dt)
    // Skip boundary launch while grace is active
    boundaryGraceRef.current = Math.max(0, boundaryGraceRef.current - dt)
    if (launchCooldown.current <= 0 && boundaryGraceRef.current <= 0) {
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
        // Boundary-launched jump: grant temporary invulnerability and enable flying-enemy smash
        boundaryJumpActive.current = true
        onBoundaryJumpChange && onBoundaryJumpChange(true)
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
        onLanding && onLanding({ x: ref.current.position.x, z: ref.current.position.z })
        // End of airborne: disable boundary jump mode if it was from edge
        if (boundaryJumpActive.current) {
          boundaryJumpActive.current = false
          onBoundaryJumpChange && onBoundaryJumpChange(false)
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

    // Check collision with speed boost planes to apply temporary speed boost
    if (boostHitCooldown.current <= 0 && speedBoosts && speedBoosts.length) {
      const px = ref.current.position.x
      const pz = ref.current.position.z
      const R = 2.4
      for (let i = 0; i < speedBoosts.length; i++) {
        const sb = speedBoosts[i]
        const dx = px - sb.pos[0]
        const dz = pz - sb.pos[2]
        if (dx*dx + dz*dz <= R*R) {
          boostTimer.current = SPEED_BUFF_DURATION_MS / 1000
          // randomize target base speed between 26 and 28
          boostSpeedRef.current = 26 + Math.random() * 2
          boostHitCooldown.current = 1.0
          onBoost && onBoost()
          break
        }
      }
    }

    // Final bounds clamp to be safe
    ref.current.position.x = Math.max(Math.min(ref.current.position.x, BOUNDARY_LIMIT), -BOUNDARY_LIMIT)
    ref.current.position.z = Math.max(Math.min(ref.current.position.z, BOUNDARY_LIMIT), -BOUNDARY_LIMIT)
    setPositionRef(ref.current.position)

    // Charging visual indicators (no threshold; show landing marker immediately)
    const charging = (isKeyJumpDown.current || isRmbDown.current) && ref.current.position.y <= 0.5
    if (charging) {
      if (chargeRingRef.current) {
        const t = performance.now() * 0.003
        const s = 0.8 + 0.15 * Math.sin(t)
        chargeRingRef.current.scale.set(s, s, s)
        chargeMat.color.set(0x99ffff)
        chargeMat.opacity = 0.75
      }
      if (landingRingRef.current) {
        // compute target relative offset for display
        const totalLen = 2 * BOUNDARY_LIMIT
        const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen)
        const target = new THREE.Vector3().copy(ref.current.position).addScaledVector(aimDirRef.current, desired)
        const margin = 1.0
        target.x = Math.max(Math.min(target.x, BOUNDARY_LIMIT - margin), -BOUNDARY_LIMIT + margin)
        target.z = Math.max(Math.min(target.z, BOUNDARY_LIMIT - margin), -BOUNDARY_LIMIT + margin)
        // place ring relative to player group so it stays where shown during charge
        const offX = target.x - ref.current.position.x
        const offZ = target.z - ref.current.position.z
        landingRingRef.current.position.set(offX, 0.06, offZ)
        landingRingRef.current.scale.set(1, 1, 1)
      }
    } else {
      if (chargeRingRef.current) chargeRingRef.current.scale.set(0.001, 0.001, 0.001)
      if (landingRingRef.current) landingRingRef.current.scale.set(0.001, 0.001, 0.001)
    }
  })

  // Trigger dash when token increments
  useEffect(() => {
    if (!ref.current) return
    // Compute direction from current aim; fallback to forward if near zero
    const dir = aimDirRef.current.clone()
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1)
    dir.normalize()
    const distance = 0.4 * BOUNDARY_LIMIT // ~20% of play area diameter
    const speed = distance / dashDuration
    dashVel.current.set(dir.x * speed, 0, dir.z * speed)
    dashing.current = true
    dashTime.current = 0
    onDashStart && onDashStart({ dir: [dir.x, dir.z], distance, durationMs: dashDuration * 1000 })
  }, [dashTriggerToken])

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
function Minion({ id, pos, playerPosRef, onDie, isBoss=false, waveNumber, health, isPaused, spawnHeight, speedScale=1 }) {
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
  const stepSpeed = speed * slow * ramp * (speedScale || 1)
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

  // (dash handling is in Player component)
  
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
function TriangleBoss({ id, pos, playerPosRef, onDie, health, isPaused, spawnHeight, speedScale = 1 }) {
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
  ref.current.position.addScaledVector(chargeDirection.current, chargeSpeed * dt * (speedScale || 1))
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
  ref.current.position.addScaledVector(circleDir, circleSpeed * slow * dt * (speedScale || 1))
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
      isTriangle: true,
      isCharging: () => isCharging.current,
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

// Pipe boss: rises from ground and periodically launches flying drones
function PipeBoss({ id, pos, playerPosRef, onDie, health, isPaused, onLaunchDrones }) {
  const ref = useRef()
  const riseTimer = useRef(0)
  const launchedOnce = useRef(false)
  const launchCooldown = useRef(0)
  const stunTimer = useRef(0)
  const knockback = useRef(new THREE.Vector3())
  const RISE_DURATION = 3 // seconds

  useFrame((_, dt) => {
    if (!ref.current || isPaused) return
    // Apply stun decay
    if (stunTimer.current > 0) stunTimer.current = Math.max(0, stunTimer.current - dt)
    const stunned = stunTimer.current > 0

    // Rising animation for first 3 seconds
    if (riseTimer.current < RISE_DURATION) {
      riseTimer.current = Math.min(RISE_DURATION, riseTimer.current + dt)
      const k = riseTimer.current / RISE_DURATION
      ref.current.position.y = 0.2 + k * 1.0 // rise from slightly below ground to 1.2 height
      return
    }

    // Launch drones after rise, periodically
    launchCooldown.current = Math.max(0, launchCooldown.current - dt)
    if (!stunned && launchCooldown.current <= 0) {
      const count = 2 + Math.floor(Math.random() * 5) // 2..6
      onLaunchDrones && onLaunchDrones(count, [ref.current.position.x, 0.5, ref.current.position.z])
      launchCooldown.current = 4 + Math.random() * 2 // 4-6s between launches
      launchedOnce.current = true
    }

    // Apply knockback impulse with decay (stationary otherwise)
    if (knockback.current.lengthSq() > 1e-6) {
      ref.current.position.addScaledVector(knockback.current, dt)
      const decay = Math.exp(-KNOCKBACK_DECAY.boss * SPEED_SCALE * dt)
      knockback.current.multiplyScalar(decay)
      if (knockback.current.lengthSq() < 1e-6) knockback.current.set(0, 0, 0)
    }

    // Basic collision: if player gets too close, deal contact damage via onDie
    const d = ref.current.position.distanceTo(playerPosRef.current)
    if (d < 1.8) onDie(id, true)
  })

  // Register into global enemy list
  useEffect(() => {
    if (!window.gameEnemies) window.gameEnemies = []
    const enemyData = {
      id,
      ref,
      isBoss: true,
      isPipe: true,
      impulse: (ix = 0, iz = 0, strength = 1) => {
        knockback.current.x += ix * strength
        knockback.current.z += iz * strength
      },
      stun: (ms = 2000) => {
        const sec = Math.max(0, (ms | 0) / 1000)
        stunTimer.current = Math.max(stunTimer.current, sec)
      },
    }
    window.gameEnemies.push(enemyData)
    return () => {
      window.gameEnemies = window.gameEnemies.filter(e => e.id !== id)
    }
  }, [id])

  return (
    <group>
      <mesh ref={ref} position={pos}>
        <cylinderGeometry args={[1.2, 1.2, 1.6, 16]} />
        <meshStandardMaterial color={0x6699cc} emissive={0x111111} metalness={0.3} roughness={0.5} />
      </mesh>
      <Text position={[pos[0], pos[1] + 2.2, pos[2]]} fontSize={0.35} color="#ffffff" anchorX="center" anchorY="bottom">
        {`± ${health}/2`}
      </Text>
    </group>
  )
}

// Cluster boss: clump of red orbs that splits into smaller orbs on death
function ClusterBoss({ id, pos, playerPosRef, onDie, health, isPaused, onSplit }) {
  const ref = useRef()
  const stunTimer = useRef(0)
  const knockback = useRef(new THREE.Vector3())
  const speed = 8
  useFrame((_, dt) => {
    if (!ref.current || isPaused) return
    if (stunTimer.current > 0) stunTimer.current = Math.max(0, stunTimer.current - dt)
    const stunned = stunTimer.current > 0
    const dir = new THREE.Vector3().subVectors(playerPosRef.current, ref.current.position)
    dir.y = 0
    const d = dir.length()
    if (!stunned && d > 0.5) {
      dir.normalize()
      ref.current.position.addScaledVector(dir, speed * dt)
    }
    if (knockback.current.lengthSq() > 1e-6) {
      ref.current.position.addScaledVector(knockback.current, dt)
      const decay = Math.exp(-KNOCKBACK_DECAY.boss * SPEED_SCALE * dt)
      knockback.current.multiplyScalar(decay)
      if (knockback.current.lengthSq() < 1e-6) knockback.current.set(0, 0, 0)
    }
    if (ref.current.position.distanceTo(playerPosRef.current) < 1.5) onDie(id, true)
  })
  useEffect(() => {
    if (!window.gameEnemies) window.gameEnemies = []
    const enemyData = { id, ref, isBoss: true, isCluster: true, impulse: (ix=0,iz=0,s=1)=>{knockback.current.x+=ix*s;knockback.current.z+=iz*s}, stun:(ms=1000)=>{stunTimer.current=Math.max(stunTimer.current,(ms|0)/1000)} }
    window.gameEnemies.push(enemyData)
    return () => { window.gameEnemies = window.gameEnemies.filter(e => e.id !== id) }
  }, [id])
  // Visual: clump of 7 small spheres
  const offsets = useMemo(() => {
    const arr = []
    const r = 0.7
    for (let i=0;i<7;i++) {
      const a = Math.random()*Math.PI*2
      const rr = 0.2 + Math.random()*r
      arr.push([Math.cos(a)*rr, 0, Math.sin(a)*rr])
    }
    return arr
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x220000, roughness: 0.5 }), [])
  const geom = useMemo(() => new THREE.SphereGeometry(0.5, 12, 12), [])
  return (
    <group>
      <group ref={ref} position={pos}>
        {offsets.map((o,i)=>(
          <mesh key={i} position={o} geometry={geom} material={mat} />
        ))}
        <Text position={[0, 1.6, 0]} fontSize={0.35} color="#fff" anchorX="center" anchorY="bottom">{`± ${health}/3`}</Text>
      </group>
    </group>
  )
}

// Flying drone: red capsule that orbits then dives toward player's last known position
function FlyingDrone({ id, pos, playerPosRef, onDie, isPaused, boundaryJumpActiveRef, assets, trailBaseMat }) {
  const ref = useRef()
  const stateRef = useRef({ mode: 'orbit', t: 0, dir: new THREE.Vector3(1, 0, 0), diveTarget: new THREE.Vector3(), diveSpeed: 16 })
  const speed = 10
  const orbitAltitude = 4
  const tmp = useRef(new THREE.Vector3())
  const TRAIL_COUNT = 10
  const lastPositions = useRef(Array.from({ length: TRAIL_COUNT }, () => new THREE.Vector3()))
  const trailRefs = useRef([])
  const trailTick = useRef(0)

  useFrame((_, dt) => {
    if (!ref.current || isPaused) return
    const s = stateRef.current
    s.t += dt

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
      ref.current.position.addScaledVector(s.dir, speed * dt)
      // Bounds clamp
      ref.current.position.x = Math.max(Math.min(ref.current.position.x, BOUNDARY_LIMIT - 1), -BOUNDARY_LIMIT + 1)
      ref.current.position.z = Math.max(Math.min(ref.current.position.z, BOUNDARY_LIMIT - 1), -BOUNDARY_LIMIT + 1)
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
      const diveSpeed = s.diveSpeed
      ref.current.position.addScaledVector(s.dir, diveSpeed * dt)
      // Collision with player
      const dx = ref.current.position.x - playerPosRef.current.x
      const dy = ref.current.position.y - 0.5
      const dz = ref.current.position.z - playerPosRef.current.z
      const d2 = dx*dx + dy*dy + dz*dz
      if (d2 < 1.1*1.1) {
        if (boundaryJumpActiveRef?.current) {
          onDie(id, false) // killed by boundary jump collision
        } else {
          onDie(id, true) // damage player
        }
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

  // Register for global interactions (bullets ignore flying due to check)
  useEffect(() => {
    if (!window.gameEnemies) window.gameEnemies = []
    const enemyData = {
      id,
      ref,
      isFlying: true,
      impulse: () => {},
      stun: () => {},
    }
    window.gameEnemies.push(enemyData)
    return () => {
      window.gameEnemies = window.gameEnemies.filter(e => e.id !== id)
    }
  }, [id])

  return (
    <group>
      <group ref={ref} position={pos} rotation={[0, 0, 0]}>
        {/* body */}
        <mesh position={[0, 0, 0]} geometry={assets?.bodyGeom} material={assets?.bodyMat} />
        {/* tips */}
        <mesh position={[0, 0.5, 0]} geometry={assets?.tipGeom} material={assets?.tipMat} />
        <mesh position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]} geometry={assets?.tipGeom} material={assets?.tipMat} />
        {/* trail nodes */}
        {Array.from({ length: TRAIL_COUNT }).map((_, i) => (
          <mesh key={i}
            geometry={assets?.trailGeom}
            material={useMemo(() => (trailBaseMat ? trailBaseMat.clone() : new THREE.MeshBasicMaterial({ color: 0xff6666, transparent: true, opacity: 0.4 })), [trailBaseMat])}
            ref={el => { if (el) trailRefs.current[i] = el }}
          />
        ))}
      </group>
    </group>
  )
}

// Cone boss: waits for ~10s, then leaps to the player's position and slams down
function ConeBoss({ id, pos, playerPosRef, onDamagePlayer, health, isPaused, spawnHeight, speedScale = 1 }) {
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
  const [bestScore, setBestScore] = useState(0)
  const [bestWave, setBestWave] = useState(0)
  const [health, setHealth] = useState(100)
  const [lives, setLives] = useState(3)
  const [isGameOver, setIsGameOver] = useState(false)
  const [respawnCountdown, setRespawnCountdown] = useState(0)
  const [isPaused, setIsPaused] = useState(true)
  const [isStarted, setIsStarted] = useState(false)
  const isStartedRef = useRef(false)
  const [boundaryJumpActive, setBoundaryJumpActive] = useState(false)
  // Feeds: pickups (top-right) and boss spawns (left-bottom)
  const [pickupFeed, setPickupFeed] = useState([]) // {id, text, color}
  const [bossFeed, setBossFeed] = useState([]) // {id, text, color}
  const pushBossFeedRef = useRef(null)
  const [autoFire, setAutoFire] = useState(true)
  const [pickupPopups, setPickupPopups] = useState([])
  const [portals, setPortals] = useState([])
  const [speedBoosts, setSpeedBoosts] = useState([])
  const [aoes, setAoes] = useState([]) // ground slam visuals
  const [bombs, setBombs] = useState([]) // active bombs
  const [confetti, setConfetti] = useState([])
  const [controlScheme, setControlScheme] = useState('dpad') // 'wasd' | 'dpad' (default to D-Buttons)
  const [playerResetToken, setPlayerResetToken] = useState(0)
  const [playerBaseSpeed, setPlayerBaseSpeed] = useState(PLAYER_SPEED)
  const [enemySpeedScale, setEnemySpeedScale] = useState(1)
  // Shape Runner feature is now a pickup-only visual; auto-move removed
  const [highContrast, setHighContrast] = useState(false)
  const [hpEvents, setHpEvents] = useState([]) // floating HP change indicators
  const [powerEffect, setPowerEffect] = useState({ active: false, amount: 0 })
  const powerRemainingRef = useRef(0) // ms remaining for effect
  const [invulnEffect, setInvulnEffect] = useState({ active: false })
  const invulnRemainingRef = useRef(0)
  const invulnActiveRef = useRef(false)
  useEffect(() => { invulnActiveRef.current = invulnEffect.active }, [invulnEffect.active])
  // Boundary jump invulnerability (only during edge-launched jumps)
  const boundaryJumpActiveRef = useRef(false)
  // Dash invulnerability window
  const dashInvulnUntilRef = useRef(0)
  // 2s protection after landing from auto-arc at the end of invuln
  const expectingPostInvulnLandingRef = useRef(false)
  const postInvulnShieldUntilRef = useRef(0)
  const nowMs = () => performance.now()

  const isPlayerInvulnerable = useCallback(() => {
    const now = nowMs()
    return invulnActiveRef.current || boundaryJumpActiveRef.current || (now < postInvulnShieldUntilRef.current) || (now < dashInvulnUntilRef.current)
  }, [])
  // Bomb kit effect
  const [bombEffect, setBombEffect] = useState({ active: false })
  const bombEffectTimeRef = useRef(0)
  const bombSpawnTimerRef = useRef(0)
  // App-visible buff/debuff effects for UI visualization
  const [boostEffect, setBoostEffect] = useState({ active: false })
  const boostRemainingRef = useRef(0)
  const [debuffEffect, setDebuffEffect] = useState({ active: false })
  const debuffRemainingRef = useRef(0)
  const [arcTriggerToken, setArcTriggerToken] = useState(0)
  const [autoFollowHeld, setAutoFollowHeld] = useState(false)
  const [autoFollowHeld2, setAutoFollowHeld2] = useState(false)
  const autoFollowHeldRef = useRef(false)
  const autoFollowHeld2Ref = useRef(false)
  useEffect(() => { autoFollowHeldRef.current = autoFollowHeld }, [autoFollowHeld])
  useEffect(() => { autoFollowHeld2Ref.current = autoFollowHeld2 }, [autoFollowHeld2])
  const [cameraMode, setCameraMode] = useState('follow') // 'follow' | 'static' | 'topdown'
  // Pickup scale modifier derived from camera mode
  const pickupScaleMul = useMemo(() => {
    if (cameraMode === 'topdown') return 2.0
    if (cameraMode === 'static') return 1.5
    return 1.3 // follow
  }, [cameraMode])
  // Dash/camera smoothing state
  const [isDashing, setIsDashing] = useState(false)
  const [cameraBoostUntilMs, setCameraBoostUntilMs] = useState(0)
  // Dash ability state
  const [dashCooldownMs, setDashCooldownMs] = useState(0)
  const dashCooldownRef = useRef(0)
  useEffect(() => { dashCooldownRef.current = dashCooldownMs }, [dashCooldownMs])
  const [dashTriggerToken, setDashTriggerToken] = useState(0)
  const enemyId = useRef(1)
  const pickupId = useRef(1)
  const portalId = useRef(1)
  const speedBoostId = useRef(1)
  // removed waveTimer (switched to pause-aware timeout loop)
  const bulletPool = useRef(new BulletPool(BULLET_POOL_SIZE))
// Simple instanced confetti burst
function ConfettiBurst({ start=0, count=48, onDone }) {
  const ref = useRef()
  const rng = useMemo(() => ({
    vx: Float32Array.from({ length: count }, () => (Math.random()*2-1) * 8),
    vy: Float32Array.from({ length: count }, () => 8 + Math.random()*6),
    vz: Float32Array.from({ length: count }, () => (Math.random()*2-1) * 8),
    rx: Float32Array.from({ length: count }, () => Math.random()*Math.PI*2),
    ry: Float32Array.from({ length: count }, () => Math.random()*Math.PI*2),
    rz: Float32Array.from({ length: count }, () => Math.random()*Math.PI*2),
    col: Array.from({ length: count }, () => new THREE.Color().setHSL(Math.random(), 0.8, 0.6)),
  }), [count])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 }), [])
  const geom = useMemo(() => new THREE.PlaneGeometry(0.4, 0.4), [])
  const life = 2500
  useFrame((_, dt) => {
    if (!ref.current) return
    const t = performance.now() - start
    const n = ref.current.count
    for (let i=0;i<n;i++) {
      const m = new THREE.Matrix4()
      // basic physics
      const age = t / life
      const px = rng.vx[i] * (t/1000)
      const py = rng.vy[i] * (t/1000) - 9.8 * (t/1000)*(t/1000) * 2
      const pz = rng.vz[i] * (t/1000)
      const rx = rng.rx[i] + t*0.004
      const ry = rng.ry[i] + t*0.006
      const rz = rng.rz[i] + t*0.005
      m.makeRotationFromEuler(new THREE.Euler(rx, ry, rz))
      m.setPosition(px, Math.max(0.3, py+2), pz)
      ref.current.setMatrixAt(i, m)
      const color = rng.col[i]
      ref.current.setColorAt(i, color)
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (t > life) onDone && onDone()
  })
  return (
    <instancedMesh ref={ref} args={[geom, mat, count]} />
  )
}
  // Shared drone geometries/materials (to reduce allocations)
  const droneBodyGeom = useMemo(() => new THREE.CylinderGeometry(0.25, 0.25, 1.0, 12), [])
  const droneTipGeom = useMemo(() => new THREE.ConeGeometry(0.25, 0.35, 12), [])
  const droneTrailGeom = useMemo(() => new THREE.SphereGeometry(0.12, 8, 8), [])
  const droneBodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x220000, roughness: 0.5 }), [])
  const droneTipMat = droneBodyMat
  const droneTrailBaseMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xff6666, transparent: true, opacity: 0.5 }), [])
  const isPausedRef = useRef(isPaused)
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])
  const damageScaleRef = useRef(1)
  const enemySpeedScaleRef = useRef(1)
  const isGameOverRef = useRef(false)
  useEffect(() => { isGameOverRef.current = isGameOver }, [isGameOver])
  const respawnRef = useRef(0)
  useEffect(() => { respawnRef.current = respawnCountdown }, [respawnCountdown])
  const livesRef = useRef(lives)
  useEffect(() => { livesRef.current = lives }, [lives])
  const deathHandledRef = useRef(false)
  const portalTimersRef = useRef([])
  const speedBoostTimersRef = useRef([])
  const portalsRef = useRef([])
  useEffect(() => { portalsRef.current = portals.map(p => p.pos) }, [portals])
  // expose a damage function for special enemies (like ConeBoss)
  const damagePlayer = useCallback((dmg) => {
    if (isPlayerInvulnerable()) return
    const scale = damageScaleRef.current || 1
    const final = Math.max(1, Math.ceil((dmg || 1) * scale))
    setHealth(h => Math.max(h - final, 0))
    const idEvt = Date.now() + Math.random()
    setHpEvents(evts => [...evts, { id: idEvt, amount: -final, start: performance.now() }])
  }, [isPlayerInvulnerable])
  
  // Load persisted settings once
  useEffect(() => {
    try {
      const cs = localStorage.getItem('controlScheme')
      if (cs === 'wasd' || cs === 'dpad') setControlScheme(cs)
  // shapeRunner persisted flags no longer used
      const hc = localStorage.getItem('highContrast')
      if (hc != null) setHighContrast(hc === '1' || hc === 'true')
      const bs = parseInt(localStorage.getItem('bestScore') || '0', 10)
      const bw = parseInt(localStorage.getItem('bestWave') || '0', 10)
      if (!Number.isNaN(bs)) setBestScore(bs)
      if (!Number.isNaN(bw)) setBestWave(bw)
    } catch { /* ignore */ }
  }, [])
  // Persist on change
  useEffect(() => { try { localStorage.setItem('controlScheme', controlScheme) } catch { /* ignore */ } }, [controlScheme])
  // removed shapeRunner persistence
  useEffect(() => { try { localStorage.setItem('highContrast', highContrast ? '1' : '0') } catch { /* ignore */ } }, [highContrast])
  // Persist bests when they change
  useEffect(() => { try { localStorage.setItem('bestScore', String(bestScore)) } catch {} }, [bestScore])
  useEffect(() => { try { localStorage.setItem('bestWave', String(bestWave)) } catch {} }, [bestWave])

  // Update bests live during a run and trigger confetti once per run when breaking prior best
  const bestScoreBaselineRef = useRef(0)
  const highScoreCelebratedRef = useRef(false)
  useEffect(() => {
    // establish baseline when run starts
    if (isStarted && !isPaused) {
      if (bestScoreBaselineRef.current === 0) bestScoreBaselineRef.current = bestScore
    }
  }, [isStarted, isPaused, bestScore])
  useEffect(() => {
    if (score > bestScore) setBestScore(score)
    if (score > bestScoreBaselineRef.current && !highScoreCelebratedRef.current) {
      highScoreCelebratedRef.current = true
      // spawn confetti burst
      const id = Date.now() + Math.random()
      setConfetti(prev => [...prev, { id, start: performance.now() }])
    }
  }, [score, bestScore])
  useEffect(() => { if (wave > bestWave) setBestWave(wave) }, [wave, bestWave])
  useEffect(() => { isStartedRef.current = isStarted }, [isStarted])

  // Playtime tracking (persist across runs)
  const totalPlayMsRef = useRef(0)
  const lastPlayTickRef = useRef(0)
  const [totalPlayMsView, setTotalPlayMsView] = useState(0)
  useEffect(() => {
    try { totalPlayMsRef.current = parseInt(localStorage.getItem('totalPlayTimeMs') || '0', 10) || 0 } catch {}
    // Initialize view state
    setTotalPlayMsView(totalPlayMsRef.current|0)
  }, [])
  useEffect(() => {
    const int = setInterval(() => {
      if (isStartedRef.current && !isPausedRef.current && !isGameOverRef.current) {
        const now = performance.now()
        const last = lastPlayTickRef.current || now
        const delta = Math.min(2000, Math.max(0, now - last))
        totalPlayMsRef.current += delta
        lastPlayTickRef.current = now
        // Persist every second
        try { localStorage.setItem('totalPlayTimeMs', String(totalPlayMsRef.current|0)) } catch {}
        // Reflect in UI
        setTotalPlayMsView(totalPlayMsRef.current|0)
      } else {
        lastPlayTickRef.current = performance.now()
        // Still tick UI to reflect any external changes
        setTotalPlayMsView(totalPlayMsRef.current|0)
      }
    }, 1000)
    return () => clearInterval(int)
  }, [])
  
  // Pause toggling
  useEffect(() => {
    const handleKeyDown = (e) => {
      const k = e.key
      if (k === 'Escape' || k === ' ') {
        e.preventDefault()
        if (!isStartedRef.current) return
        // Disable manual pause toggle during respawn countdown or game over
        if (isGameOverRef.current || (respawnRef.current && respawnRef.current > 0)) return
        setIsPaused(prev => !prev)
      } else if (k === 'f' || k === 'F') {
        setAutoFire(prev => !prev)
      } else if (k === '1' || e.code === 'Digit1') {
        // handled in a dedicated key listener to support keyup as well
      } else if (k === '0' || e.code === 'Digit0') {
        setCameraMode('static')
      } else if (k === '9' || e.code === 'Digit9') {
        setCameraMode('follow')
      } else if (k === '8' || e.code === 'Digit8') {
        setCameraMode('topdown')
      } else if (k === '3' || e.code === 'Digit3') {
        // Dash ability
        if (!isStartedRef.current || isPausedRef.current || isGameOverRef.current) return
        if (dashCooldownRef.current > 0) return
        // Trigger dash: 250ms duration i-frames
        setDashTriggerToken(t => t + 1)
        setDashCooldownMs(10000)
        dashInvulnUntilRef.current = performance.now() + 250
        // Schedule brief enemy push bursts during the dash
        const burst = () => {
          const p = playerPosRef.current
          if (!p || !window.gameEnemies) return
          window.gameEnemies.forEach(ge => {
            if (!ge?.ref?.current) return
            const ex = ge.ref.current.position.x
            const ez = ge.ref.current.position.z
            const dx = ex - p.x
            const dz = ez - p.z
            const d2 = dx*dx + dz*dz
            const R = 3.0
            if (d2 <= R*R) {
              const dist = Math.max(Math.sqrt(d2), 0.0001)
              const nx = dx / dist
              const nz = dz / dist
              const base = 10 // moderate push strength
              ge.impulse?.(nx, nz, base * (1 - dist / R))
            }
          })
        }
        burst()
        setTimeout(burst, 80)
        setTimeout(burst, 160)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Format ms to H:MM:SS
  const formatHMS = useCallback((ms) => {
    const totalSec = Math.max(0, Math.floor((ms || 0) / 1000))
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    const mm = m.toString().padStart(2, '0')
    const ss = s.toString().padStart(2, '0')
    return `${h}:${mm}:${ss}`
  }, [])

  // Dash cooldown ticker (pause-aware)
  useEffect(() => {
    const int = setInterval(() => {
      if (isPausedRef.current) return
      setDashCooldownMs(ms => Math.max(0, ms - 100))
    }, 100)
    return () => clearInterval(int)
  }, [])

  // Auto-follow ring key handling (hold 1 to ride the ring while invulnerable)
  useEffect(() => {
    const onDown = (e) => {
      if (e.key === '1' || e.code === 'Digit1') setAutoFollowHeld(true)
      if (e.key === '2' || e.code === 'Digit2') setAutoFollowHeld2(true)
    }
    const onUp = (e) => {
      if (e.key === '1' || e.code === 'Digit1') setAutoFollowHeld(false)
      if (e.key === '2' || e.code === 'Digit2') setAutoFollowHeld2(false)
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
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

  const openSpeedBoostAt = useCallback((pos, duration = SPEED_BOOST_LIFETIME) => {
    const id = speedBoostId.current++
    setSpeedBoosts(prev => [...prev, { id, pos }])
    const timer = setTimeout(() => {
      setSpeedBoosts(prev => prev.filter(s => s.id !== id))
    }, duration)
    speedBoostTimersRef.current.push(timer)
    return id
  }, [])

  // Clear timers on unmount to avoid stray spawns
  useEffect(() => {
    return () => clearPortalTimers()
  }, [clearPortalTimers])

  const clearSpeedBoostTimers = useCallback(() => {
    speedBoostTimersRef.current.forEach(t => clearTimeout(t))
    speedBoostTimersRef.current = []
  }, [])

  useEffect(() => {
    return () => clearSpeedBoostTimers()
  }, [clearSpeedBoostTimers])

  const scheduleEnemyBatchAt = useCallback((pos, count, options = {}) => {
    const { isTriangle = false, isCone = false, waveNumber = 1, extraDelayMs = 0 } = options
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
          pushBossFeedRef.current && pushBossFeedRef.current('Triangle boss spawned', '#8b5cf6')
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
          pushBossFeedRef.current && pushBossFeedRef.current('Cone boss spawned', '#f59e0b')
        } else {
          // 40% chance to spawn a cluster boss instead of a normal minion
          const makeCluster = Math.random() < 0.4
          if (makeCluster) {
            setEnemies(prev => [...prev, {
              id,
              pos: spawnPos,
              isCluster: true,
              isBoss: true,
              waveNumber,
              health: 3,
              maxHealth: 3,
              spawnHeight: DROP_SPAWN_HEIGHT + Math.random() * 2,
            }])
            pushBossFeedRef.current && pushBossFeedRef.current('Cluster boss spawned', '#ff3333')
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
        }
      }, extraDelayMs + i * PORTAL_STAGGER_MS)
      portalTimersRef.current.push(handle)
    }
  }, [])

  // spawn a wave using latest state (no stale closures) and compute count by nextWave
  const spawnWave = useCallback(() => {
    if (isPausedRef.current) return
    setWave(w => {
      const nextWave = w + 1
      // Update damage scale by wave and notify player
      const newScale = Math.min(DAMAGE_SCALE_MAX, 1 + (Math.max(1, nextWave) - 1) * DAMAGE_SCALE_PER_WAVE)
      if (Math.abs(newScale - (damageScaleRef.current || 1)) > 1e-6) {
        damageScaleRef.current = newScale
        const popupId = Date.now() + Math.random()
        setPickupPopups(prev => [...prev, { id: popupId, pickup: { type: 'dmgscale', scale: newScale } }])
      }
      const center = playerPosRef.current.clone()
      // Wave-based speed ramp: enemies faster, player gets +1 base speed each wave
      const newEnemyScale = Math.min(ENEMY_SPEED_SCALE_MAX, 1 + (Math.max(1, nextWave) - 1) * ENEMY_SPEED_SCALE_PER_WAVE)
      if (Math.abs(newEnemyScale - (enemySpeedScaleRef.current || 1)) > 1e-6) {
        enemySpeedScaleRef.current = newEnemyScale
        setEnemySpeedScale(newEnemyScale)
        setPlayerBaseSpeed(s => Math.min(PLAYER_SPEED_CAP, s + 1))
        const popupId = Date.now() + Math.random()
        setPickupPopups(prev => [...prev, { id: popupId, pickup: { type: 'speedramp', scale: newEnemyScale, player: true } }])
      }
      // Milestone life pickup: every 5 waves, spawn one rare life pickup near center
      if (nextWave % 5 === 0) {
        if (Math.random() < 0.7) { // rare-ish gate on top of milestone
          const pos = [center.x + (Math.random() - 0.5) * 6, 0.5, center.z + (Math.random() - 0.5) * 6]
          spawnPickup('life', pos)
        }
      }
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
        const extraDelay = 2000 + Math.random() * 2000 // 2-4s warmup
        openPortalAt(p, PORTAL_LIFETIME + extraDelay)
        scheduleEnemyBatchAt(p, perPortal, { waveNumber: nextWave, extraDelayMs: extraDelay })
      }

      // Spawn 1-2 green speed boost planes per wave nearby, lifetime similar to portals
      const boostCount = Math.min(2, 1 + Math.floor(Math.random() * 2))
      for (let i = 0; i < boostCount; i++) {
        const angle = baseAngle + Math.random() * Math.PI * 2
        const radius = SPEED_BOOST_RADIUS_MIN + Math.random() * (SPEED_BOOST_RADIUS_MAX - SPEED_BOOST_RADIUS_MIN)
        const px = center.x + Math.cos(angle) * radius
        const pz = center.z + Math.sin(angle) * radius
        const pos = [px, 0.5, pz]
        openSpeedBoostAt(pos)
      }

      // Triangle boss every 3 waves from its own portal
      if (nextWave % 3 === 0) {
        const angle = baseAngle + Math.random() * Math.PI * 2
        const radius = PORTAL_RADIUS_MAX + 4
        const px = center.x + Math.cos(angle) * radius
        const pz = center.z + Math.sin(angle) * radius
        const p = [px, 0.5, pz]
        const extraDelay = 2000 + Math.random() * 2000
        openPortalAt(p, PORTAL_LIFETIME + 1500 + extraDelay)
        // base 500ms theatrical delay + warmup
        scheduleEnemyBatchAt(p, 1, { isTriangle: true, waveNumber: nextWave, extraDelayMs: 500 + extraDelay })
      }

      // Frequently spawn Cone bosses from their own portals (capped to 6 globally)
      if (Math.random() < 0.8) {
        const angle = baseAngle + Math.random() * Math.PI * 2
        const radius = PORTAL_RADIUS_MAX + 6
        const px = center.x + Math.cos(angle) * radius
        const pz = center.z + Math.sin(angle) * radius
        const p = [px, 0.5, pz]
        const extraDelay = 2000 + Math.random() * 2000
        openPortalAt(p, PORTAL_LIFETIME + 800 + extraDelay)
        scheduleEnemyBatchAt(p, 1, { isCone: true, waveNumber: nextWave, extraDelayMs: 300 + extraDelay })
        scheduleEnemyBatchAt(p, 1, { isCone: true, waveNumber: nextWave, extraDelayMs: 700 + extraDelay })
      }

      // Occasionally spawn a Pipe boss at arena edges/corners; weaker health
      if (Math.random() < 0.6) {
        const cornerBias = Math.random() < 0.6
        const lim = BOUNDARY_LIMIT - 2
        let px = 0, pz = 0
        if (cornerBias) {
          px = (Math.random() < 0.5 ? -1 : 1) * lim
          pz = (Math.random() < 0.5 ? -1 : 1) * lim
        } else {
          if (Math.random() < 0.5) {
            px = (Math.random() < 0.5 ? -1 : 1) * lim
            pz = (Math.random() * 2 - 1) * lim
          } else {
            px = (Math.random() * 2 - 1) * lim
            pz = (Math.random() < 0.5 ? -1 : 1) * lim
          }
        }
        const id = enemyId.current++
        setEnemies(prev => [...prev, { id, pos: [px, 0.2, pz], isPipe: true, isBoss: true, health: 2, maxHealth: 2 }])
        pushBossFeedRef.current && pushBossFeedRef.current('Pipe boss spawned', '#ff3333')
      }

      return nextWave
    })
  }, [openPortalAt, scheduleEnemyBatchAt])

  // Handle shooting
  const handleShoot = useCallback((playerPosition, direction) => {
    if (!direction) return
    // Determine bullet style based on power-up effect
    let style = null
    const stunMode = (invulnEffect.active && (autoFollowHeld || autoFollowHeld2))
    if (stunMode) {
      // Yellow stun bullets during invulnerability while following the shape
      style = { color: 0xfacc15, scale: 1.3, stun: true }
    } else if (powerEffect.active) {
      const amt = powerEffect.amount
      const scale = 1 + Math.max(0, (amt - 50)) / 50 * 0.5 // 1.0 .. 1.5
      style = { color: 0x66aaff, scale }
    }

    const px = playerPosition.x
    const py = playerPosition.y + 0.5
    const pz = playerPosition.z

    // While shape runner is active (stun mode), emit 4 forward streams instead of 1
    if (stunMode) {
      const fx = direction[0]
      const fz = direction[2]
      // Right vector on XZ plane (perpendicular)
      let rx = fz
      let rz = -fx
      const rlen = Math.hypot(rx, rz) || 1
      rx /= rlen; rz /= rlen

      const ahead = 0.9
      const side = 0.6
      const offsetsDeg = [-12, -4, 4, 12]
      for (let i = 0; i < offsetsDeg.length; i++) {
        const deg = offsetsDeg[i]
        const rad = deg * Math.PI / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        // rotated forward
        const dx = fx * cos - fz * sin
        const dz = fx * sin + fz * cos
        // lateral emitter offsets
        const s = (i === 0 ? -side : (i === 1 ? -side * 0.33 : (i === 2 ? side * 0.33 : side)))
        const ex = px + fx * ahead + rx * s
        const ez = pz + fz * ahead + rz * s
        bulletPool.current.getBullet([ex, py, ez], [dx, 0, dz], style)
      }
      setBullets(bulletPool.current.getActiveBullets())
      return
    }

    // If medium-tier power (70..89), emit a triple stream with a slight arc in front
  if (!stunMode && powerEffect.active && powerEffect.amount >= 70 && powerEffect.amount <= 89) {
      // Base forward dir
      const fx = direction[0]
      const fz = direction[2]
      // Right vector on XZ plane (perpendicular)
      let rx = fz
      let rz = -fx
      const rlen = Math.hypot(rx, rz) || 1
      rx /= rlen; rz /= rlen

      // Slight arc emitter positions, ahead of player
      const ahead = 0.8
      const side = 0.4
      const offsetsDeg = [-8, 0, 8]
      for (let i = 0; i < offsetsDeg.length; i++) {
        const deg = offsetsDeg[i]
        const rad = deg * Math.PI / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        // rotate forward by small yaw
        const dx = fx * cos - fz * sin
        const dz = fx * sin + fz * cos
        // emitter position forms a shallow arc in front
        const sx = (i === 0 ? -side : (i === 2 ? side : 0))
        const ex = px + fx * ahead + rx * sx
        const ez = pz + fz * ahead + rz * sx
        bulletPool.current.getBullet([ex, py, ez], [dx, 0, dz], style)
      }
      setBullets(bulletPool.current.getActiveBullets())
      return
    }

    // Default: single bullet
    const bullet = bulletPool.current.getBullet([px, py, pz], direction, style)
    if (bullet) setBullets(bulletPool.current.getActiveBullets())
  }, [powerEffect, invulnEffect.active, autoFollowHeld, autoFollowHeld2])

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
      setPickups(p => {
        if (p.length >= MAX_PICKUPS) return p
        return [...p, { id, pos, type: 'power', amount, lifetimeMaxSec: 15 }]
      })
    } else {
      const pos = atPos ?? randPos(30)
      if (type === 'health') {
        setPickups(p => {
          if (p.length >= MAX_PICKUPS) return p
          return [...p, { id, pos, type: 'health', lifetimeMaxSec: 30 }]
        })
      } else if (type === 'invuln') {
        setPickups(p => {
          if (p.length >= MAX_PICKUPS) return p
          return [...p, { id, pos, type: 'invuln', lifetimeMaxSec: 20 }]
        })
      } else if (type === 'bombs') {
        setPickups(p => {
          if (p.length >= MAX_PICKUPS) return p
          return [...p, { id, pos, type: 'bombs', lifetimeMaxSec: 20 }]
        })
      } else if (type === 'life') {
        setPickups(p => {
          if (p.length >= MAX_PICKUPS) return p
          return [...p, { id, pos, type: 'life', lifetimeMaxSec: 18 }]
        })
      }
    }
  }, [])

  // handle enemy death or collision - moved up to avoid initialization order issues
  const onEnemyDie = useCallback((id, hitPlayer=false) => {
    setEnemies(prev => {
      const enemy = prev.find(e => e.id === id)
      // If enemy hit the player, apply contact damage based on type
      if (hitPlayer) {
        if (!isPlayerInvulnerable()) {
          const base = enemy?.isTriangle ? CONTACT_DAMAGE.triangle : (enemy?.isBoss ? CONTACT_DAMAGE.boss : CONTACT_DAMAGE.minion)
          const scale = damageScaleRef.current || 1
          const dmg = Math.max(1, Math.ceil((base || 1) * scale))
          setHealth(h => Math.max(h - dmg, 0))
          // show HP change
          const idEvt = Date.now() + Math.random()
          setHpEvents(evts => [...evts, { id: idEvt, amount: -dmg, start: performance.now() }])
        }
      } else {
        // Award score if killed by player
        const points = enemy?.isTriangle ? 100 : (enemy?.isBoss ? 50 : 10)
        setScore(s => s + points)
  // drop chance tuned for faster game pace
  if (Math.random() < 0.20) {
    const r2 = Math.random()
    if (r2 < 0.10) spawnPickup('invuln')
    else if (r2 < 0.18) spawnPickup('bombs') // rare bomb kit
  else spawnPickup(Math.random() < 0.85 ? 'power' : 'health') // health ~15% of split on generic drops
  }
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
        if (ge.isFlying) continue // drones are immune to bullets
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

        // Stun-only bullets (from invuln shape runner) do not deal damage
        if (b?.style?.stun) {
          hitEnemy.stun?.(3000)
          continue
        }

        // Cone boss is immune to player bullets (bombs still affect them)
        if (hitEnemy.isCone) {
          continue
        }

        // Triangle boss should not lose HP during its forward dash (charging)
        if (hitEnemy.isCharging?.()) {
          continue
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

  // start waves loop (pause-aware, gated by isStarted, no stale closures)
  useEffect(() => {
    if (!isStarted) return
    // initial wave
    spawnWave()
    let cancelled = false
    let timer = null
    const tick = () => {
      if (cancelled) return
      if (!isPausedRef.current) {
        spawnWave()
  // slightly higher ambient pickup spawns after waves for faster pace
  if (Math.random() < 0.35) spawnPickup(Math.random() < 0.15 ? 'health' : 'power') // health ~15% of ambient split
  if (Math.random() < 0.06) spawnPickup('bombs') // very rare ambient bomb kit
  // rare invulnerability pickup, similar rarity to high-tier power-ups
  if (Math.random() < 0.05) spawnPickup('invuln')
      }
      timer = setTimeout(tick, 12000)
    }
    timer = setTimeout(tick, 12000)
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [spawnWave, spawnPickup, isStarted])

  const pushPickupFeed = useCallback((pickup) => {
    const info = pickup.type === 'health'
      ? { text: '+25 Health', color: '#22c55e' }
      : pickup.type === 'power'
        ? { text: `Power +${pickup.amount ?? 50}`, color: '#60a5fa' }
        : pickup.type === 'invuln'
          ? { text: 'Invulnerability (5s)', color: '#facc15' }
          : pickup.type === 'bombs'
            ? { text: 'Bomb Kit (4/s for 6s)', color: '#111827' }
            : pickup.type === 'life'
              ? { text: '1UP (+1 Life)', color: '#ff3366' }
              : pickup.type === 'speedboost'
                ? { text: 'Speed Boost (4s)', color: '#22c55e' }
                : { text: 'Pickup', color: '#ffffff' }
    setPickupFeed(prev => {
      const next = [...prev, { id: Date.now() + Math.random(), text: info.text, color: info.color }]
      return next.slice(-5)
    })
  }, [])

  const pushBossFeed = useCallback((text, color = '#ffb020') => {
    setBossFeed(prev => {
      const next = [...prev, { id: Date.now() + Math.random(), text, color }]
      return next.slice(-5)
    })
  }, [])

  // Keep a live ref pointer so earlier-declared callbacks can safely invoke it
  useEffect(() => {
    pushBossFeedRef.current = pushBossFeed
  }, [pushBossFeed])

  const onPickupCollect = useCallback((id) => {
    const pickup = pickups.find(pk => pk.id === id)
    if (!pickup) return
    
    setPickups(prev => prev.filter(pk => pk.id !== id))
    // Stream the pickup feed (replaces popup)
    pushPickupFeed(pickup)
    
    // Apply pickup effect
    if (pickup.type === 'health') {
      setHealth(h => Math.min(h + 25, 100))
      const idEvt = Date.now() + Math.random()
      setHpEvents(evts => [...evts, { id: idEvt, amount: +25, start: performance.now() }])
    } else {
      if (pickup.type === 'power') {
        // power-up: add score by amount and enable bullet effect for duration
        const amt = Math.max(50, Math.min(100, pickup.amount || 50))
        setScore(s => s + amt)
        // duration proportional to amount (5..10s)
        powerRemainingRef.current = (amt / 10) * 1000
        setPowerEffect({ active: true, amount: amt })
      } else if (pickup.type === 'invuln') {
        invulnRemainingRef.current = 5000
        const shapes = ['circle','hexagon','rectangle']
        const shape = shapes[Math.floor(Math.random() * shapes.length)]
        // Activate ref immediately to avoid any frame where damage can sneak in
        invulnActiveRef.current = true
        setInvulnEffect({ active: true, shape })
      } else if (pickup.type === 'bombs') {
        // Activate bomb kit effect: 4 bombs/sec for 4s (16 bombs total)
        bombEffectTimeRef.current = BOMB_ABILITY_DURATION_MS
        bombSpawnTimerRef.current = 0
        setBombEffect({ active: true })
      } else if (pickup.type === 'life') {
        setLives(l => Math.min(l + 1, 5))
      }
    }
  }, [pickups, pushPickupFeed])

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

  // Bomb kit effect: spawn 4 bombs/sec for 4s (pause-aware)
  useEffect(() => {
    if (!bombEffect.active) return
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      if (!isPausedRef.current) {
        const dt = 100 // ms tick granularity
        bombEffectTimeRef.current = Math.max(0, bombEffectTimeRef.current - dt)
        bombSpawnTimerRef.current += dt
        // spawn bombs every 250ms while effect time remains
        while (bombSpawnTimerRef.current >= BOMB_SPAWN_INTERVAL_MS && bombEffectTimeRef.current > 0) {
          bombSpawnTimerRef.current -= BOMB_SPAWN_INTERVAL_MS
          // launch a bomb from player position with upward velocity and slight horizontal spread
          const p = playerPosRef.current
          const angle = Math.random() * Math.PI * 2
          const speed = 5 + Math.random() * 4 // travel a bit farther
          const vx = Math.cos(angle) * speed
          const vz = Math.sin(angle) * speed
          const id = Date.now() + Math.random()
          setBombs(prev => [...prev, { id, pos: [p.x, p.y + 0.8, p.z], vel: [vx, BOMB_UP_VEL, vz], state: 'air', landedAt: 0, explodeAt: 0, hits: {} }])
        }
        if (bombEffectTimeRef.current <= 0) {
          setBombEffect({ active: false })
          return
        }
      }
      setTimeout(tick, 100)
    }
    const t = setTimeout(tick, 100)
    return () => { cancelled = true; clearTimeout(t) }
  }, [bombEffect.active])

  // Boost effect timer (pause-aware)
  useEffect(() => {
    if (!boostEffect.active) return
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      if (!isPausedRef.current) {
        boostRemainingRef.current = Math.max(0, (boostRemainingRef.current|0) - 100)
        if (boostRemainingRef.current <= 0) {
          setBoostEffect({ active: false })
          return
        }
      }
      setTimeout(tick, 100)
    }
    const t = setTimeout(tick, 100)
    return () => { cancelled = true; clearTimeout(t) }
  }, [boostEffect.active])

  // Debuff effect timer (pause-aware)
  useEffect(() => {
    if (!debuffEffect.active) return
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      if (!isPausedRef.current) {
        debuffRemainingRef.current = Math.max(0, (debuffRemainingRef.current|0) - 100)
        if (debuffRemainingRef.current <= 0) {
          setDebuffEffect({ active: false })
          return
        }
      }
      setTimeout(tick, 100)
    }
    const t = setTimeout(tick, 100)
    return () => { cancelled = true; clearTimeout(t) }
  }, [debuffEffect.active])

  // Invulnerability effect timer (pause-aware, 5s)
  useEffect(() => {
    if (!invulnEffect.active) return
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      if (!isPausedRef.current) {
        invulnRemainingRef.current = Math.max(0, invulnRemainingRef.current - 100)
        if (invulnRemainingRef.current <= 0) {
          // Clear invulnerability synchronously
          invulnActiveRef.current = false
          setInvulnEffect({ active: false })
          // trigger an arc jump at end of invulnerability only if holding 1 or 2
          if (autoFollowHeldRef.current || autoFollowHeld2Ref.current) {
            setArcTriggerToken(t => t + 1)
            // mark to protect player 2s after landing from this auto-launch
            expectingPostInvulnLandingRef.current = true
          }
          return
        }
      }
      setTimeout(tick, 100)
    }
    const t = setTimeout(tick, 100)
    return () => { cancelled = true; clearTimeout(t) }
  }, [invulnEffect.active])

  // Damage enemies inside the shape area once per second during invulnerability
  useEffect(() => {
    if (!invulnEffect.active) return
    let cancelled = false
    const center = { x: 0, z: 0 }
    const radius = SHAPE_PATH_RADIUS
    const shape = invulnEffect.shape || 'circle'
    function pointInPolygon(px, pz, verts) {
      // Ray-casting algorithm for 2D point-in-polygon
      let inside = false
      for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
        const xi = verts[i][0], zi = verts[i][1]
        const xj = verts[j][0], zj = verts[j][1]
        const intersect = ((zi > pz) !== (zj > pz)) &&
          (px < (xj - xi) * (pz - zi) / ((zj - zi) || 1e-9) + xi)
        if (intersect) inside = !inside
      }
      return inside
    }

    const tick = () => {
      if (cancelled) return
      if (!isPausedRef.current) {
        const idsToDamage = []
        if (window.gameEnemies) {
          for (const ge of window.gameEnemies) {
            if (!ge?.ref?.current) continue
            if (ge.isFlying) continue // flying drones immune to invulnerability DoT
            const ex = ge.ref.current.position.x
            const ez = ge.ref.current.position.z
            let inside = false
            if (shape === 'circle') {
              const dx = ex - center.x
              const dz = ez - center.z
              inside = (dx * dx + dz * dz) <= (radius * radius)
            } else if (shape === 'rectangle') {
              const hx = radius
              const hz = radius * 0.7
              inside = (ex >= center.x - hx && ex <= center.x + hx && ez >= center.z - hz && ez <= center.z + hz)
            } else if (shape === 'hexagon') {
              const verts = []
              for (let i = 0; i < 6; i++) {
                const a = (-Math.PI / 2) + i * (2 * Math.PI / 6)
                verts.push([center.x + Math.cos(a) * radius, center.z + Math.sin(a) * radius])
              }
              inside = pointInPolygon(ex, ez, verts)
            } else {
              // fallback to circle behavior if unknown shape
              const dx = ex - center.x
              const dz = ez - center.z
              inside = (dx * dx + dz * dz) <= (radius * radius)
            }
            // Do not damage triangle boss while it's charging; prevents despawn mid-dash
            if (inside && !(ge.isCharging?.())) idsToDamage.push(ge.id)
          }
        }
        if (idsToDamage.length) {
          setEnemies(prev => {
            const toDie = []
            const updated = prev.map(e => {
              if (!idsToDamage.includes(e.id)) return e
              const nh = (e.health ?? 1) - 1
              if (nh <= 0) { toDie.push(e.id); return null }
              return { ...e, health: nh }
            }).filter(Boolean)
            // fire deaths after state update
            if (toDie.length) setTimeout(() => toDie.forEach(id => onEnemyDie(id, false)), 0)
            return updated
          })
        }
      }
      setTimeout(tick, 1000)
    }
    const t = setTimeout(tick, 1000)
    return () => { cancelled = true; clearTimeout(t) }
  }, [invulnEffect.active, invulnEffect.shape, onEnemyDie])

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

  // Death / lives / game over handling with single-fire guard
  useEffect(() => {
    if (health <= 0) {
      if (deathHandledRef.current) return
      deathHandledRef.current = true
      // Clear world state
      setEnemies([])
      setPickups([])
      setBullets([])
      setPortals([])
      setSpeedBoosts([])
      clearPortalTimers()
      clearSpeedBoostTimers()
      bulletPool.current.clear()

      if (livesRef.current > 1) {
        // Lose a life and respawn after a short countdown
        setLives(l => Math.max(l - 1, 0))
        setIsPaused(true)
        setRespawnCountdown(3)
        let count = 3
        const interval = setInterval(() => {
          count -= 1
          setRespawnCountdown(count)
          if (count <= 0) {
            clearInterval(interval)
            setRespawnCountdown(0)
            setHealth(100)
            setPlayerResetToken(t => t + 1)
            setIsPaused(false)
            // Kick off next wave immediately
            spawnWave()
          }
        }, 1000)
        return () => clearInterval(interval)
      } else {
        // Game Over
        setLives(0)
        setIsGameOver(true)
        setIsPaused(true)
      }
    } else {
      deathHandledRef.current = false
    }
  }, [health, clearPortalTimers, spawnWave])

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
    setSpeedBoosts([])
    // Reset speed ramps and caps
    enemySpeedScaleRef.current = 1
    setEnemySpeedScale(1)
    setPlayerBaseSpeed(PLAYER_SPEED)
    // Clear global enemy references
    window.gameEnemies = []
    clearPortalTimers()
    clearSpeedBoostTimers()
    setPlayerResetToken(t => t + 1)
  }, [clearPortalTimers])

  // ground plane grid material
  const grid = useMemo(() => new THREE.GridHelper(200, 40, 0xb8c2cc, 0xe2e8f0), [])
  const crosshairRef = useRef(null)
  const rafRef = useRef(0)
  
  // External movement input vectors (refs to avoid per-frame allocations)
  const dpadVecRef = useRef({ x: 0, z: 0 })
  // runnerVecRef removed
  // Effective movement input for Player when using external controls
  const moveInputRef = useRef({ x: 0, z: 0 })
  // Source of movement for speed scaling/override semantics: 'dpad' | 'runner' | 'keyboard' | 'none'
  const moveSourceRef = useRef('none')

  // shape runner auto-move removed

  // External movement: only DPad input; keyboard handled directly in Player
  useEffect(() => {
    let raf = 0
    const merge = () => {
      const mx = dpadVecRef.current.x
      const mz = dpadVecRef.current.z
      if (Math.abs(mx) > 0.001 || Math.abs(mz) > 0.001) {
        moveInputRef.current.x = mx
        moveInputRef.current.z = mz
        moveSourceRef.current = 'dpad'
      } else {
        moveInputRef.current.x = 0
        moveInputRef.current.z = 0
        moveSourceRef.current = 'none'
      }
      raf = requestAnimationFrame(merge)
    }
    raf = requestAnimationFrame(merge)
    return () => cancelAnimationFrame(raf)
  }, [])

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

        {/* Active speed boost planes */}
        {!isPaused && speedBoosts.map(sb => (
          <SpeedBoostPlane key={sb.id} pos={sb.pos} isPaused={isPaused} />
        ))}

        <Player 
          position={[0, 0.5, 0]} 
          setPositionRef={setPositionRef} 
          onShoot={handleShoot}
          isPaused={isPaused}
          autoFire={autoFire}
          resetToken={playerResetToken}
          basePlayerSpeed={playerBaseSpeed}
          autoAimEnabled={cameraMode === 'follow' || cameraMode === 'topdown'}
          controlScheme={controlScheme}
          moveInputRef={moveInputRef}
          moveSourceRef={moveSourceRef}
          highContrast={highContrast}
          portals={portals}
          speedBoosts={speedBoosts}
          autoFollow={{ 
            active: (invulnEffect.active && (autoFollowHeld || autoFollowHeld2)), 
            radius: SHAPE_PATH_RADIUS, 
            center: [0, 0, 0], 
            shape: invulnEffect.shape || 'circle',
            dirSign: (autoFollowHeld2 ? -1 : 1) // 1=CCW (key 1), -1=CW (key 2)
          }}
          arcTriggerToken={arcTriggerToken}
          dashTriggerToken={dashTriggerToken}
          onDashStart={() => {
            setIsDashing(true)
          }}
          onDashEnd={(endPos) => {
            setIsDashing(false)
            setCameraBoostUntilMs(performance.now() + 400)
            // End-of-dash impact: strong pushback + stun in radius
            const center = [endPos.x, 0.06, endPos.z]
            const radius = 6.5
            const power = 90
            const stunMs = 3000
            if (window.gameEnemies) {
              const cpos = new THREE.Vector3(center[0], 0.5, center[2])
              const epos = new THREE.Vector3()
              window.gameEnemies.forEach(ge => {
                if (!ge?.ref?.current) return
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
                  ge.stun?.(stunMs)
                }
              })
            }
            // Visualize the impact
            setAoes(prev => [...prev, { id: Date.now() + Math.random(), pos: center, start: performance.now(), radius }])
          }}
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
                  // Bosses drop a health pickup with ~15% chance upon being stunned (further reduced)
                  if (ge.isBoss) {
                    if (Math.random() < 0.15) {
                      spawnPickup('health', [epos.x, 0.5, epos.z])
                    }
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
            // Start debuff visualization timer
            debuffRemainingRef.current = SPEED_DEBUFF_DURATION_MS
            setDebuffEffect({ active: true })
          }}
          onBoost={() => {
            const popupId = Date.now()
            setPickupPopups(prev => [...prev, { id: popupId, pickup: { type: 'speedboost' } }])
            // Start boost visualization timer
            boostRemainingRef.current = SPEED_BUFF_DURATION_MS
            setBoostEffect({ active: true })
          }}
          onBoundaryJumpChange={(active) => {
            const v = !!active
            boundaryJumpActiveRef.current = v
            setBoundaryJumpActive(v)
          }}
          onLanding={() => {
            if (expectingPostInvulnLandingRef.current) {
              expectingPostInvulnLandingRef.current = false
              postInvulnShieldUntilRef.current = performance.now() + 2000
            }
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
              speedScale={enemySpeedScale}
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
              speedScale={enemySpeedScale}
            />
          ) : e.isPipe ? (
            <PipeBoss
              key={e.id}
              id={e.id}
              pos={e.pos}
              playerPosRef={playerPosRef}
              onDie={onEnemyDie}
              health={e.health}
              isPaused={isPaused}
              onLaunchDrones={(count, fromPos) => {
                // Cap total active drones to avoid overload
                setEnemies(prev => {
                  const activeDrones = prev.filter(x => x.isFlying).length
                  const allowed = Math.max(0, 16 - activeDrones)
                  const toSpawn = Math.min(count, allowed)
                  if (toSpawn <= 0) return prev
                  const arr = [...prev]
                  for (let i = 0; i < toSpawn; i++) {
                    const id = enemyId.current++
                    // small offset ring around the pipe
                    const a = Math.random() * Math.PI * 2
                    const r = 1.2 + Math.random() * 0.8
                    const px = fromPos[0] + Math.cos(a) * r
                    const pz = fromPos[2] + Math.sin(a) * r
                    arr.push({ id, pos: [px, 4, pz], isFlying: true, health: 1, maxHealth: 1 })
                  }
                  return arr
                })
              }}
            />
          ) : e.isCluster ? (
            <ClusterBoss
              key={e.id}
              id={e.id}
              pos={e.pos}
              playerPosRef={playerPosRef}
              onDie={onEnemyDie}
              health={e.health}
              isPaused={isPaused}
            />
          ) : e.isFlying ? (
            <FlyingDrone
              key={e.id}
              id={e.id}
              pos={e.pos}
              playerPosRef={playerPosRef}
              onDie={onEnemyDie}
              isPaused={isPaused}
              boundaryJumpActiveRef={boundaryJumpActiveRef}
              assets={{ bodyGeom: droneBodyGeom, tipGeom: droneTipGeom, trailGeom: droneTrailGeom, bodyMat: droneBodyMat, tipMat: droneTipMat }}
              trailBaseMat={droneTrailBaseMat}
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
              speedScale={enemySpeedScale}
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

        {/* Bombs */}
        {bombs.map(b => (
          <Bomb
            key={b.id}
            data={b}
            isPaused={isPaused}
            onUpdate={(id, patch) => setBombs(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x))}
            onExplode={(id, pos) => {
              // AOE stun+damage at detonation
              const cx = pos[0], cz = pos[2]
              const r2 = BOMB_AOE_RADIUS * BOMB_AOE_RADIUS
              const idsToHit = []
              if (window.gameEnemies) {
                window.gameEnemies.forEach(ge => {
                  if (!ge?.ref?.current) return
                  if (ge.isFlying) return // flying drones are immune to bombs
                  const ex = ge.ref.current.position.x
                  const ez = ge.ref.current.position.z
                  const dx = ex - cx
                  const dz = ez - cz
                  if (dx*dx + dz*dz <= r2) {
                    ge.stun?.(BOMB_STUN_MS)
                    idsToHit.push(ge.id)
                  }
                })
              }
              if (idsToHit.length) {
                setEnemies(prev => {
                  const died = []
                  const updated = prev.map(e => {
                    if (!idsToHit.includes(e.id)) return e
                    const dmg = e.isCone ? 5 : BOMB_DAMAGE
                    const nh = (e.health ?? 1) - dmg
                    if (nh <= 0) { died.push(e.id); return null }
                    return { ...e, health: nh }
                  }).filter(Boolean)
                  if (died.length) setTimeout(() => died.forEach(id => onEnemyDie(id, false)), 0)
                  return updated
                })
              }
              // Visual explosion cue
              setAoes(prev => [...prev, { id: Date.now() + Math.random(), pos: [cx, 0.06, cz], start: performance.now(), radius: BOMB_AOE_RADIUS }])
              // remove bomb
              setBombs(prev => prev.filter(x => x.id !== id))
            }}
            onHitEnemy={(enemyId) => {
              setEnemies(prev => {
                let died = false
                const updated = prev.map(e => {
                  if (e.id !== enemyId) return e
                  if (e.isFlying) return e // flying drones ignore bomb contact
                  const dmg = e.isCone ? 5 : BOMB_DAMAGE
                  const nh = (e.health ?? 1) - dmg
                  if (nh <= 0) { died = true; return null }
                  return { ...e, health: nh }
                }).filter(Boolean)
                if (died) setTimeout(() => onEnemyDie(enemyId, false), 0)
                return updated
              })
            }}
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
            scaleMul={pickupScaleMul}
          />
        ))}

    <OrbitControls 
      enableRotate={false} 
      enablePan={false} 
      enableZoom={cameraMode === 'static'}
      maxPolarAngle={Math.PI / 2.2} 
      minPolarAngle={Math.PI / 3} 
    />
    {cameraMode === 'follow' && (
      <CameraRig playerPosRef={playerPosRef} isPaused={isPaused} isDashing={isDashing} boostUntilMs={cameraBoostUntilMs} />
    )}
    {cameraMode === 'static' && (
      <StaticCameraRig />
    )}
    {cameraMode === 'topdown' && (
      <TopDownRig playerPosRef={playerPosRef} />
    )}
        {/* AOE visuals */}
        {aoes.map(a => (
          <AOEBlast key={a.id} pos={a.pos} start={a.start} radius={a.radius} onDone={() => setAoes(prev => prev.filter(x => x.id !== a.id))} />
        ))}
        {/* HP change floaters */}
        {hpEvents.map(evt => (
          <HpFloater key={evt.id} amount={evt.amount} start={evt.start} playerPosRef={playerPosRef} onDone={() => setHpEvents(e => e.filter(x => x.id !== evt.id))} />
        ))}

        {/* Buff/debuff indicators above player */}
        {(() => {
          const items = []
          if (invulnEffect.active) items.push({ key: 'inv', label: 'INVULN', color: '#facc15' })
          if (powerEffect.active) items.push({ key: 'pow', label: `POWER ${powerEffect.amount}`, color: '#60a5fa' })
          if (bombEffect.active) items.push({ key: 'bomb', label: 'BOMBS', color: '#ffffff' })
          if (boostEffect.active) items.push({ key: 'boost', label: 'BOOST', color: '#22c55e' })
          if (debuffEffect.active) items.push({ key: 'slow', label: 'SLOW', color: '#f97316' })
          return items.length ? <BuffIndicators playerPosRef={playerPosRef} items={items} /> : null
        })()}

        {/* Invulnerability visuals */}
        {invulnEffect.active && (
          <>
            <InvulnRing radius={SHAPE_PATH_RADIUS} isPaused={isPaused} shape={invulnEffect.shape || 'circle'} />
            {/* Yellow translucent orb while invulnerability is active */}
            <ShieldBubble playerPosRef={playerPosRef} isPaused={isPaused} color={0xfacc15} radius={1.5} baseOpacity={0.28} />
          </>
        )}
        {boundaryJumpActive && (
          <ShieldBubble playerPosRef={playerPosRef} isPaused={isPaused} color={0x66ccff} radius={1.4} baseOpacity={0.25} />
        )}
        {confetti.map(c => (
          <ConfettiBurst key={c.id} start={c.start} onDone={() => setConfetti(prev => prev.filter(x => x.id !== c.id))} />
        ))}

        <Stats />
      </Canvas>

  <div ref={crosshairRef} className={`cursor-crosshair ${highContrast ? 'high-contrast' : ''}`} />
      {/* D-Buttons overlay */}
      {controlScheme === 'dpad' && (
        <DPad onVectorChange={(x, z) => { dpadVecRef.current.x = x; dpadVecRef.current.z = z }} />
      )}
      
      {/* Overlay: start screen */}
      {!isStarted && (
        <div className="pause-overlay">
          <div className="pause-content">
            <h2>Wave Shooter</h2>
            <p>Best — Score: <strong>{bestScore}</strong> • Wave: <strong>{bestWave}</strong></p>
            <div style={{height:10}} />
            <button
              className="button"
              onClick={() => {
                setIsStarted(true)
                setIsPaused(false)
              }}
            >
              Start Game
            </button>
          </div>
        </div>
      )}

      {/* Overlay: pause / life lost countdown / game over */}
      {isPaused && isStarted && (
        <div className="pause-overlay">
          <div className="pause-content">
            {isGameOver ? (
              <>
                <h2>Game Over</h2>
                <p>Score: <strong>{score}</strong> • Wave: <strong>{wave}</strong></p>
                <p className="small">Best — Score: <strong>{bestScore}</strong> • Wave: <strong>{bestWave}</strong></p>
                <div style={{height:10}} />
                <button
                  className="button"
                  onClick={() => {
                    setIsGameOver(false)
                    setLives(3)
                    setRespawnCountdown(0)
                    restartGame()
                    setIsPaused(false)
                    spawnWave()
                  }}
                >
                  Restart
                </button>
              </>
            ) : respawnCountdown > 0 ? (
              <>
                <h2>Life Lost</h2>
                <p>Next wave in <strong>{respawnCountdown}</strong>…</p>
              </>
            ) : (
              <>
                <h2>Game Paused</h2>
                <p>Press ESC or SPACE to resume</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Feeds & overlays */}
      {/* Top-right stack: HUD + pickup feed */}
      <div className="hud-stack">
        <div className="hud small">
          <div>Enemies: {enemies.length}</div>
          <div>Flying: {enemies.filter(e => e.isFlying).length}</div>
          <div>Pickups: {pickups.length}</div>
          <div>Bullets: {bullets.length}</div>
          <div>Status: {isPaused ? 'PAUSED' : 'PLAYING'}</div>
          <div>Scheme: {controlScheme.toUpperCase()}</div>
          <div>Speed: Enemies x{enemySpeedScale.toFixed(2)} • Player {playerBaseSpeed}</div>
          <div>Play time: {formatHMS(totalPlayMsView)}</div>
        </div>
        <div className="feed feed-pickups small">
          {pickupFeed.map(msg => (
            <div key={msg.id} className="feed-item" style={{ '--dot': msg.color }}>
              <div className="feed-dot" />
              <div style={{ color: msg.color }}>{msg.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="ui">
        <div className="small">Wave: <strong>{wave}</strong></div>
        <div className="small">Score: <strong>{score}</strong></div>
        <div className="small">Best: <strong>{bestScore}</strong> / <strong>{bestWave}</strong></div>
        <div className="small">Lives: <strong>{lives}</strong></div>
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
        {/* Shape runner repurposed into a pickup-driven invulnerability effect (no manual toggle) */}
        <div style={{height:6}} />
        <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={highContrast} onChange={e => setHighContrast(e.target.checked)} />
          High-contrast aim & crosshair
        </label>
        <div style={{height:6}} />
  <div className="small">Controls: D-Buttons (default) or WASD • Mouse aim & click to shoot</div>
        <div className="small">F to toggle Auto-Fire • ESC/SPACE to pause</div>
        <div style={{height:10}} />
        <div className="abilities-panel small">
          <div className="ability">
            <div className="label">Dash <span className="hint">[3]</span></div>
            <div className="cooldown">
              {(() => { const pct = Math.max(0, Math.min(1, 1 - (dashCooldownMs / 10000))); return (
                <>
                  <div className="fill" style={{ width: `${Math.round(pct*100)}%` }} />
                  <div className="cd-text">{dashCooldownMs > 0 ? `${(dashCooldownMs/1000).toFixed(1)}s` : 'Ready'}</div>
                </>
              )})()}
            </div>
          </div>
        </div>
      </div>

      

      {/* Left-bottom stack: Boss feed above control guide */}
      <div className="left-bottom-stack">
        <div className="feed feed-bosses small">
          {bossFeed.map(msg => (
            <div key={msg.id} className="feed-item" style={{ '--dot': msg.color }}>
              <div className="feed-dot" />
              <div style={{ color: msg.color }}>{msg.text}</div>
            </div>
          ))}
        </div>
        {/* Control guide */}
        <div className="control-guide">
          <div className="title">Controls</div>
          <div className="row">Move: D-Buttons (default) or WASD/Arrow Keys</div>
          <div className="row">Aim: Mouse pointer • Fire: Left click</div>
          <div className="row">Jump: Ctrl/Enter (hold for arc) or Right click (hold for arc)</div>
          <div className="row">Auto-Fire: F • Pause: ESC/SPACE</div>
          <div className="row">Invulnerability: collect yellow capsule (5s) • Auto-follow ring: hold 1 (CCW) or 2 (CW)</div>
          <div className="row">Camera: 9 Follow • 0 Static (zoom) • 8 Top-Down</div>
        </div>
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

// Bomb entity: arcs up then down; on ground, stuns and damages enemies that collide; detonates 2s after landing
function Bomb({ data, isPaused, onUpdate, onExplode, onHitEnemy }) {
  const ref = useRef()
  const hitSet = useRef(new Set())
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x111111, roughness: 0.8 }), [])
  const geom = useMemo(() => new THREE.SphereGeometry(0.36, 12, 12), [])
  useFrame((_, dt) => {
    if (!ref.current || isPaused) return
    const { id, state } = data
    if (state === 'air') {
      // integrate physics
      const vx = data.vel[0]
      const vy = data.vel[1] - BOMB_GRAVITY * dt
      const vz = data.vel[2]
      const x = data.pos[0] + vx * dt
      let y = data.pos[1] + vy * dt
      const z = data.pos[2] + vz * dt
      if (y <= 0.5) {
        y = 0.5
        onUpdate(id, { pos: [x, y, z], vel: [vx, 0, vz], state: 'ground', landedAt: performance.now(), explodeAt: performance.now() + 2000 })
      } else {
        onUpdate(id, { pos: [x, y, z], vel: [vx, vy, vz] })
      }
      if (ref.current) ref.current.position.set(x, y, z)
    } else if (state === 'ground') {
      const now = performance.now()
      if (now >= (data.explodeAt || 0)) {
        onExplode(data.id, data.pos)
        return
      }
      // contact stun+damage
      if (window.gameEnemies) {
        const cx = data.pos[0], cz = data.pos[2]
        const r2 = BOMB_CONTACT_RADIUS * BOMB_CONTACT_RADIUS
        window.gameEnemies.forEach(ge => {
          if (!ge?.ref?.current) return
          const ex = ge.ref.current.position.x
          const ez = ge.ref.current.position.z
          const dx = ex - cx
          const dz = ez - cz
          if (dx*dx + dz*dz <= r2 && !hitSet.current.has(ge.id)) {
            hitSet.current.add(ge.id)
            ge.stun?.(BOMB_STUN_MS)
            onHitEnemy && onHitEnemy(ge.id)
          }
        })
      }
      if (ref.current) ref.current.position.set(data.pos[0], data.pos[1], data.pos[2])
    }
  })
  return (
    <mesh ref={ref} position={data.pos} geometry={geom} material={mat} />
  )
}

// Visual rim/fence around the play area to signal the boundary
function BoundaryCue({ limit = 40, isPaused }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x3366ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide }), [])
  const height = 1.2
  const geomX = useMemo(() => new THREE.PlaneGeometry(limit * 2, height), [limit])
  const geomZ = useMemo(() => new THREE.PlaneGeometry(limit * 2, height), [limit])
  useFrame(() => {
    if (isPaused) return
    const t = performance.now() * 0.004
    mat.opacity = 0.22 + 0.10 * (0.5 + 0.5 * Math.sin(t))
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

// Buff/debuff indicators stacked above the player
function BuffIndicators({ playerPosRef, items = [] }) {
  const baseY = 2.2
  const gap = 0.36
  const bgMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 }), [])
  const bgGeom = useMemo(() => new THREE.PlaneGeometry(1.2, 0.28), [])
  return (
    <group position={[0, 0, 0]}
      onUpdate={self => {
        const p = playerPosRef.current
        if (p && self) self.position.set(p.x, baseY, p.z)
      }}
    >
      {items.map((it, i) => (
        <group key={it.key} position={[0, i * gap, 0]}>
          <mesh position={[0, 0, 0]} geometry={bgGeom} material={bgMat} />
          <Text position={[0, 0, 0.01]} fontSize={0.22} color={it.color || '#ffffff'} anchorX="center" anchorY="middle">
            {it.label}
          </Text>
        </group>
      ))}
    </group>
  )
}

// Visual ring indicating invulnerability around the player
function InvulnRing({ radius = 12, isPaused, shape = 'circle' }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.5, side: THREE.DoubleSide }), [])
  const circleGeom = useMemo(() => new THREE.RingGeometry(radius * 0.92, radius, 96), [radius])
  const polyGeom = useMemo(() => {
    const mkShape = (verts) => {
      const s = new THREE.Shape()
      s.moveTo(verts[0].x, verts[0].y)
      for (let i = 1; i < verts.length; i++) s.lineTo(verts[i].x, verts[i].y)
      s.lineTo(verts[0].x, verts[0].y)
      // hole slightly inset to form a band
      const hole = new THREE.Path()
      const inset = 0.92
      hole.moveTo(verts[0].x * inset, verts[0].y * inset)
      for (let i = 1; i < verts.length; i++) hole.lineTo(verts[i].x * inset, verts[i].y * inset)
      hole.lineTo(verts[0].x * inset, verts[0].y * inset)
      s.holes.push(hole)
      return new THREE.ShapeGeometry(s)
    }
    if (shape === 'hexagon') {
      const v = []
      for (let i = 0; i < 6; i++) {
        const a = (-Math.PI / 2) + i * (2 * Math.PI / 6)
        v.push(new THREE.Vector2(Math.cos(a) * radius, Math.sin(a) * radius))
      }
      return mkShape(v)
    } else if (shape === 'rectangle') {
      const hx = radius
      const hz = radius * 0.7
      const v = [
        new THREE.Vector2(+hx, +hz),
        new THREE.Vector2(-hx, +hz),
        new THREE.Vector2(-hx, -hz),
        new THREE.Vector2(+hx, -hz),
      ]
      return mkShape(v)
    }
    return null
  }, [shape, radius])
  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.position.set(0, 0.07, 0)
    if (!isPaused) {
      ref.current.rotation.z += dt * 0.5
      const t = performance.now() * 0.003
      mat.opacity = 0.35 + 0.15 * (0.5 + 0.5 * Math.sin(t))
    }
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      {shape === 'circle' ? (
        <primitive object={circleGeom} attach="geometry" />
      ) : polyGeom ? (
        <primitive object={polyGeom} attach="geometry" />
      ) : (
        <primitive object={circleGeom} attach="geometry" />
      )}
    </mesh>
  )
}

// Camera rig that follows the player with smoothing and always looks at them
function CameraRig({ playerPosRef, isPaused, offset = new THREE.Vector3(0, 35, 30), isDashing = false, boostUntilMs = 0 }) {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3())
  const lastPos = useRef(new THREE.Vector3().copy(camera.position))
  useFrame((_, dt) => {
    const p = playerPosRef.current
    if (!p) return
    // desired camera position relative to player
    targetPos.current.set(p.x + offset.x, p.y + offset.y, p.z + offset.z)
    // dynamic catch-up: speed up when far
    const dist = lastPos.current.distanceTo(targetPos.current)
    const boostActive = isDashing || (performance.now() < (boostUntilMs || 0))
    const baseK = Math.max(0.08, Math.min(0.30, dist * 0.02))
    const dashK = Math.max(0.25, Math.min(0.70, dist * 0.05))
    const lerpK = boostActive ? dashK : baseK
    lastPos.current.lerp(targetPos.current, 1 - Math.exp(-lerpK * (dt * 60)))
    camera.position.copy(lastPos.current)
    camera.lookAt(p.x, p.y, p.z)
  })
  return null
}

// Static camera positioned back and above, looking at the arena center. Zoom is enabled via controls.
function StaticCameraRig({ position = [0, 60, 80], target = [0, 0, 0] }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(position[0], position[1], position[2])
    camera.lookAt(target[0], target[1], target[2])
  }, [camera, position, target])
  return null
}

// Top-down camera that stays above the player and looks straight down for a 2D-style view
function TopDownRig({ playerPosRef }) {
  const { camera, size } = useThree()
  const heightRef = useRef(120)
  const computeHeight = useCallback(() => {
    // Ensure the entire arena fits within the viewport.
    // For a perspective camera looking straight down, the ground coverage radius is h * tan(fov/2).
    // To fit a square of side 2*BOUNDARY_LIMIT, we need radius >= sqrt(2)*BOUNDARY_LIMIT.
    const fovRad = THREE.MathUtils.degToRad(camera.fov || 75)
    const required = (Math.SQRT2 * BOUNDARY_LIMIT) / Math.tan(fovRad / 2)
    // Add a small margin so edges aren't clipped
    return required * 1.05
  }, [camera])
  useEffect(() => {
    heightRef.current = computeHeight()
  }, [computeHeight, size.width, size.height])
  useFrame(() => {
    const p = playerPosRef.current
    if (!p) return
    const h = heightRef.current
    camera.position.set(p.x, h, p.z + 0.0001)
    camera.lookAt(p.x, 0.5, p.z)
  })
  return null
}