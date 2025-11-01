import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import * as THREE from 'three'

// GAME CONSTANTS
const PLAYER_SPEED = 6
const ENEMY_SPEED = 1.6
const BOSS_SPEED = 0.9
const WAVE_INTERVAL = 2000 // ms between waves spawning
const BULLET_SPEED = 25
const BULLET_LIFETIME = 3000 // ms
const FIRE_RATE = 200 // ms between shots
const BULLET_POOL_SIZE = 50
const PICKUP_COLLECT_DISTANCE = 1.5
const AIM_RAY_LENGTH = 8
// Knockback tuning (exposed constants)
const KNOCKBACK = {
  minion: 5.0,
  boss: 3.5,
  triangle: 3.0,
}
const KNOCKBACK_DECAY = {
  minion: 10.0,
  boss: 8.0,
  triangle: 8.0,
}
const KNOCKBACK_DISTANCE_MAX = 6.0 // full strength when very close, fades to 0 by this distance

// Pickup notification popup component
function PickupPopup({ pickup, onComplete }) {
  const [visible, setVisible] = useState(true)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onComplete, 300) // Allow fade out
    }, 2000)
    return () => clearTimeout(timer)
  }, [onComplete])
  
  const pickupInfo = {
    health: { name: 'Health Pack', effect: '+25 Health', color: '#22c55e' },
    power: { name: 'Power Up', effect: '+50 Score', color: '#60a5fa' }
  }
  
  const info = pickupInfo[pickup.type]
  
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
      this.bullets.push({ id: 0, active: false, pos: [0, 0, 0], dir: [0, 0, 0], timeAlive: 0 })
    }
  }

  getBullet(pos, dir) {
    const bullet = this.bullets.find(b => !b.active)
    if (bullet) {
      bullet.id = this.nextId++
      bullet.active = true
      bullet.pos = [...pos]
      bullet.dir = [...dir]
      bullet.timeAlive = 0
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
    <mesh ref={ref} position={bullet.pos}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshStandardMaterial color={0xffff00} emissive={0x444400} />
    </mesh>
  )
}

// Pickup is a small box that floats with collision detection
function Pickup({ pos, type, onCollect, id, playerPosRef, isPaused }) {
  const ref = useRef()
  
  useFrame((_, dt) => {
    if (!ref.current || isPaused) return
    
    ref.current.rotation.y += dt
    ref.current.position.y = 0.8 + Math.sin(performance.now() / 300 + id) * 0.15
    
    // Check collision with player
    const distance = ref.current.position.distanceTo(playerPosRef.current)
    if (distance < PICKUP_COLLECT_DISTANCE) {
      onCollect(id)
    }
  })
  
  return (
    <mesh ref={ref} position={pos}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial 
        color={type === 'health' ? 0x22c55e : 0x60a5fa}
        emissive={type === 'health' ? 0x001100 : 0x000044}
      />
    </mesh>
  )
}

// Player (simple rectangle box) with WASD movement and mouse aiming
function Player({ position, setPositionRef, onShoot, isPaused, autoFire }) {
  const ref = useRef()
  const lastShot = useRef(0)
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const aimPoint = useRef(new THREE.Vector3())
  const tmpDir = useRef(new THREE.Vector3())
  const forward = useRef(new THREE.Vector3(0, 0, -1))
  const lastYaw = useRef(0)
  const rayPositions = useMemo(() => new Float32Array([0, 0, 0, 0, 0, -AIM_RAY_LENGTH]), [])
  
  useEffect(() => {
    if (isPaused) return
    
    const keys = { w: false, a: false, s: false, d: false }
    function down(e) {
      const k = e.key.toLowerCase()
      if (k in keys) keys[k] = true
    }
    function up(e) {
      const k = e.key.toLowerCase()
      if (k in keys) keys[k] = false
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
      }
    }
    
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('mousedown', handleMouseDown)
    
    const id = setInterval(() => {
      if (isPaused) return
      
      const dir = [0, 0, 0]
      if (keys.w) dir[2] -= 1
      if (keys.s) dir[2] += 1
      if (keys.a) dir[0] -= 1
      if (keys.d) dir[0] += 1
      const len = Math.hypot(dir[0], dir[2]) || 1
      ref.current.position.x += (dir[0] / len) * (PLAYER_SPEED * 0.1)
      ref.current.position.z += (dir[2] / len) * (PLAYER_SPEED * 0.1)
      // clamp
      ref.current.position.x = Math.max(Math.min(ref.current.position.x, 40), -40)
      ref.current.position.z = Math.max(Math.min(ref.current.position.z, 40), -40)
      setPositionRef(ref.current.position)
    }, 16)
    
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('mousedown', handleMouseDown)
      clearInterval(id)
    }
  }, [setPositionRef, onShoot, isPaused])

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
        // Add PI to face the pointer (fix inverted forward vs. -Z default)
        const targetYaw = Math.atan2(tmpDir.current.x, tmpDir.current.z) + Math.PI
        // Exponential damping for smooth rotation
        const diff = ((targetYaw - lastYaw.current + Math.PI) % (Math.PI * 2)) - Math.PI
        lastYaw.current = lastYaw.current + diff * (1 - Math.exp(-10 * dt))
        ref.current.rotation.y = lastYaw.current
      }
    }
  })

  return (
    <group ref={ref} position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.8, 0.8, 1.2]} />
        <meshStandardMaterial color={0x22c55e} metalness={0.2} roughness={0.6} />
      </mesh>
      {/* Aim ray: fixed length forward from player */}
      <line position={[0, 0.5, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={rayPositions}
            itemSize={3}
            count={2}
          />
        </bufferGeometry>
        <lineBasicMaterial color={0xffff88} linewidth={2} />
      </line>
    </group>
  )
}

// Enemy minion (sphere) with improved AI behavior and health system
function Minion({ id, pos, playerPosRef, onDie, isBoss=false, formationTarget, waveNumber, health, isPaused }) {
  const ref = useRef()
  const speed = isBoss ? BOSS_SPEED : ENEMY_SPEED + (waveNumber * 0.1) // Speed increases with waves
  const lastDirection = useRef(new THREE.Vector3())
  const stuckTimer = useRef(0)
  const formationOffset = useRef(new THREE.Vector3(
    (Math.random() - 0.5) * 4,
    0,
    (Math.random() - 0.5) * 4
  ))
  const knockback = useRef(new THREE.Vector3())
  
  useFrame((_, dt) => {
    if (!ref.current || isPaused) return
    
    let targetPos
    if (formationTarget && Math.random() < 0.7) {
      // Formation behavior - move towards formation position
      targetPos = new THREE.Vector3()
      targetPos.copy(formationTarget)
      targetPos.add(formationOffset.current)
    } else {
      // Direct chase behavior
      targetPos = playerPosRef.current
    }
    
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
        separation.multiplyScalar(0.8) // Separation strength
        dir.add(separation)
      }
    }
    
    // Anti-stuck mechanism
    const currentDirection = dir.clone().normalize()
    if (lastDirection.current.dot(currentDirection) < 0.5) {
      stuckTimer.current += dt
      if (stuckTimer.current > 2) {
        // Add random movement when stuck
        dir.add(new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          0,
          (Math.random() - 0.5) * 2
        ))
        stuckTimer.current = 0
      }
    } else {
      stuckTimer.current = 0
    }
    lastDirection.current = currentDirection
    
    if (dist > 0.6) {
      dir.normalize()
      ref.current.position.addScaledVector(dir, speed * dt)
    }

    // Apply knockback impulse with exponential decay
    if (knockback.current.lengthSq() > 1e-6) {
      ref.current.position.addScaledVector(knockback.current, dt)
      const decayRate = isBoss ? KNOCKBACK_DECAY.boss : KNOCKBACK_DECAY.minion
      const decay = Math.exp(-decayRate * dt)
      knockback.current.multiplyScalar(decay)
      if (knockback.current.lengthSq() < 1e-6) knockback.current.set(0, 0, 0)
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
    </group>
  )
}

// Triangle boss (every 3 waves) with enhanced behavior and health system
function TriangleBoss({ id, pos, playerPosRef, onDie, health, isPaused }) {
  const ref = useRef()
  const chargeTimer = useRef(0)
  const isCharging = useRef(false)
  const chargeDirection = useRef(new THREE.Vector3())
  const knockback = useRef(new THREE.Vector3())
  
  useFrame((_, dt) => {
    if (!ref.current || isPaused) return
    
    const dir = new THREE.Vector3()
    dir.subVectors(playerPosRef.current, ref.current.position)
    const dist = dir.length()
    
    chargeTimer.current += dt
    
    // Charge attack pattern
    if (!isCharging.current && chargeTimer.current > 3) {
      // Start charging
      isCharging.current = true
      chargeDirection.current.copy(dir.normalize())
      chargeTimer.current = 0
    }
    
    if (isCharging.current) {
      // Charge towards last known player position
      if (chargeTimer.current < 1.5) {
        ref.current.position.addScaledVector(chargeDirection.current, BOSS_SPEED * 3 * dt)
      } else {
        // Stop charging
        isCharging.current = false
        chargeTimer.current = 0
      }
    } else {
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
        ref.current.position.addScaledVector(circleDir, BOSS_SPEED * 1.2 * dt)
      }
    }
    
    // Enhanced collision
    if (dist < 2.0) onDie(id, true)
    
    // Apply knockback with decay
    if (knockback.current.lengthSq() > 1e-6) {
      ref.current.position.addScaledVector(knockback.current, dt)
      const decay = Math.exp(-KNOCKBACK_DECAY.triangle * dt)
      knockback.current.multiplyScalar(decay)
      if (knockback.current.lengthSq() < 1e-6) knockback.current.set(0, 0, 0)
    }

    // Rotation for visual effect
    ref.current.rotation.y += dt * 2
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
      }
    }
    window.gameEnemies.push(enemyData)
    return () => {
      window.gameEnemies = window.gameEnemies.filter(e => e.id !== id)
    }
  }, [id])
  
  // Health-based color intensity
  const maxHealth = 5
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
  const enemyId = useRef(1)
  const pickupId = useRef(1)
  // removed waveTimer (switched to pause-aware timeout loop)
  const bulletPool = useRef(new BulletPool(BULLET_POOL_SIZE))
  const isPausedRef = useRef(isPaused)
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])
  
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

  // spawn a wave using latest state (no stale closures) and compute count by nextWave
  function spawnWave() {
    if (isPausedRef.current) return
    setWave(w => {
      const nextWave = w + 1
      const isTriangle = (nextWave % 3 === 0)
      const count = 4 + Math.floor(w / 2) // based on current wave before increment
      const newEnemies = []
      const formationCenter = randPos(25)

      for (let i = 0; i < count; i++) {
        const id = enemyId.current++
        let pos
        let formationTarget = null
        const isBoss = Math.random() < 0.12

        if (Math.random() < 0.6 && i < count - 2) {
          const angle = (i / count) * Math.PI * 2
          const radius = 6 + Math.random() * 4
          pos = [
            formationCenter[0] + Math.cos(angle) * radius,
            0.5,
            formationCenter[2] + Math.sin(angle) * radius
          ]
          formationTarget = new THREE.Vector3(...formationCenter)
        } else {
          pos = randPos(30)
        }

        newEnemies.push({
          id,
          pos,
          isBoss,
          formationTarget,
          waveNumber: nextWave,
          health: isBoss ? 3 : 1,
          maxHealth: isBoss ? 3 : 1
        })
      }

      if (isTriangle) {
        const id = enemyId.current++
        newEnemies.push({
          id,
          pos: randPos(30),
          isTriangle: true,
          waveNumber: nextWave,
          health: 5,
          maxHealth: 5
        })
      }

      setEnemies(prev => [...prev, ...newEnemies])
      return nextWave
    })
  }

  // Handle shooting
  const handleShoot = useCallback((playerPosition, direction) => {
    if (!direction) return
    const bullet = bulletPool.current.getBullet(
      [playerPosition.x, playerPosition.y + 0.5, playerPosition.z],
      direction
    )
    if (bullet) setBullets(bulletPool.current.getActiveBullets())
  }, [])

  // Handle bullet expiration
  const handleBulletExpire = useCallback((bulletId) => {
    bulletPool.current.returnBullet(bulletId)
    setBullets(bulletPool.current.getActiveBullets())
  }, [])

  // handle enemy death or collision - moved up to avoid initialization order issues
  const onEnemyDie = useCallback((id, hitPlayer=false) => {
    setEnemies(prev => prev.filter(e => e.id !== id))
    if (hitPlayer) {
      setHealth(h => Math.max(h - 12, 0))
    } else {
      setEnemies(prev => {
        const enemy = prev.find(e => e.id === id)
        const points = enemy?.isTriangle ? 100 : (enemy?.isBoss ? 50 : 10)
        setScore(s => s + points)
        return prev.filter(e => e.id !== id)
      })
      // small chance to drop pickup
      if (Math.random() < 0.25) spawnPickup(Math.random() < 0.6 ? 'power' : 'health')
    }
  }, [])

  // spawn random pickup
  function spawnPickup(type = 'power') {
    const id = pickupId.current++
    setPickups(p => [...p, { id, pos: randPos(30), type }])
  }

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
          const strength = base * factor
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
        if (Math.random() < 0.5) spawnPickup(Math.random() < 0.5 ? 'health' : 'power')
      }
      timer = setTimeout(tick, 12000)
    }
    timer = setTimeout(tick, 12000)
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [])

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
    } else {
      // power-ups: simple temporary effect - e.g., increase speed or double score
      setScore(s => s + 50)
    }
  }, [pickups])

  // Remove pickup popup
  const removePickupPopup = useCallback((popupId) => {
    setPickupPopups(prev => prev.filter(p => p.id !== popupId))
  }, [])

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
    // Clear global enemy references
    window.gameEnemies = []
  }, [])

  // ground plane grid material
  const grid = useMemo(() => new THREE.GridHelper(200, 40, 0xb8c2cc, 0xe2e8f0), [])

  return (
    <div className="canvas-wrap">
      <Canvas shadows camera={{ position: [0, 35, 30], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 40, 10]} intensity={0.8} castShadow />
        {/* Semi-light ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color={0xeaeef3} roughness={1} />
        </mesh>
        <primitive object={grid} position={[0, 0.001, 0]} />

        <Player 
          position={[0, 0.5, 0]} 
          setPositionRef={setPositionRef} 
          onShoot={handleShoot}
          isPaused={isPaused}
          autoFire={autoFire}
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
            onCollect={onPickupCollect}
            playerPosRef={playerPosRef}
            isPaused={isPaused}
          />
        ))}

        <OrbitControls enableRotate={false} enablePan={false} maxPolarAngle={Math.PI / 2.2} minPolarAngle={Math.PI / 3} />
        <Stats />
      </Canvas>

      <div className="crosshair" />
      
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
        <div style={{height:6}} />
        <div className="small">Controls: WASD to move, Mouse to aim & click to shoot</div>
        <div className="small">F to toggle Auto-Fire • ESC/SPACE to pause</div>
      </div>

      <div className="hud small">
        <div>Enemies: {enemies.length}</div>
        <div>Pickups: {pickups.length}</div>
        <div>Bullets: {bullets.length}</div>
        <div>Status: {isPaused ? 'PAUSED' : 'PLAYING'}</div>
      </div>

    </div>
  )
}