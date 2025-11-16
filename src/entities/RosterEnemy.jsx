import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useEffects } from '../effects/EffectsContext.jsx'
import { useFrame } from '@react-three/fiber'
import { Text, Html } from '@react-three/drei'
import { PathogenFromSpec } from '../characters/factory/PathogenFactory'
import { Pathogen } from '../characters/Pathogen';
import { Mutagen } from '../characters/Mutagen';
import { InfectionVector } from '../characters/InfectionVector';
import { getEnemyImageUrl } from '../data/enemyImages.js';

// Generic roster enemy: minion-like chaser with health, stun/knockback support
function RosterEnemy({ id, pos, playerPosRef, onDie, isPaused, health, maxHealth=3, color=0xff0055, speedScale=1, spawnHeight, label=null, stunImmune=false, shape='Circle', moveSpeed=10, onHazard, factorySpec=null, visualScale=1, enemyData=null, showEnemyNames=false, showThumbnails=false }) {
  const ref = useRef()
  const { triggerEffect } = useEffects()
  const baseSpeed = moveSpeed
  const knockback = useRef(new THREE.Vector3())
  const isSpawning = useRef(!!spawnHeight && spawnHeight > (pos?.[1] ?? 0.5))
  const stunTimer = useRef(0)
  const specialTimer = useRef(0)
  const specialTimer2 = useRef(0)
  const enzymeActiveRef = useRef(false)
  const enemyMetaRef = useRef(null)
  // Movement pattern state
  const velRef = useRef(new THREE.Vector3((Math.random()-0.5)*2, 0, (Math.random()-0.5)*2).normalize().multiplyScalar(baseSpeed))
  const chargeCooldownRef = useRef(0)
  const chargeBoostRef = useRef(0)
  const bombsRef = useRef([]) // enemy-thrown bombs

  // Initialize spawn drop position if provided
  useEffect(() => {
    if (ref.current && isSpawning.current) {
      ref.current.position.set(pos[0], spawnHeight, pos[2])
    }
  }, [pos, spawnHeight])

  useFrame((_, dt) => {
    if (!ref.current || isPaused) return

    // Drop-in spawn
    if (isSpawning.current) {
      const groundY = pos?.[1] ?? 0.5
      ref.current.position.y = Math.max(groundY, ref.current.position.y - 10 * dt)
      if (ref.current.position.y <= groundY + 1e-3) {
        ref.current.position.y = groundY
        isSpawning.current = false
      }
      return
    }

    // Stun countdown
    if (stunTimer.current > 0) stunTimer.current = Math.max(0, stunTimer.current - dt)
    const stunned = stunTimer.current > 0

  // Compute dynamic speed buffs (local aura and global mutagen)
    let speedBuff = 1
    if (window.gameEnemies && ref.current) {
      const selfPos = ref.current.position
      // Cluster Defense: any nearby Enterobacter CRE within 6u -> +20% speed
      for (const ge of window.gameEnemies) {
        if (!ge?.ref?.current || ge.id === id) continue
        if (!ge.label) continue
        const l = ge.label
        const d = ge.ref.current.position.distanceTo(selfPos)
        if (l.includes('Enterobacter CRE') && d <= 6) { speedBuff *= 1.2; break }
      }
      // UV Radiation present anywhere -> +30% speed
      for (const ge of window.gameEnemies) {
        if (ge?.label && ge.label.includes('UV Radiation')) { speedBuff *= 1.3; break }
      }
      // Mutation Surge: per-enemy short boost after being damaged
      const now = performance.now()
      if (enemyMetaRef.current && enemyMetaRef.current.mutSpeedUntil && now < enemyMetaRef.current.mutSpeedUntil) {
        speedBuff *= 1.3
      }
    }

    // Movement patterns
    const pattern = (label || '')
    if (!stunned) {
      const player = playerPosRef.current
      const self = ref.current.position
      const toPlayer = new THREE.Vector3().subVectors(player, self); toPlayer.y = 0
      const dist = toPlayer.length()
      const dir = dist > 1e-3 ? toPlayer.clone().normalize() : new THREE.Vector3(1,0,0)
      const perp = new THREE.Vector3(-dir.z, 0, dir.x) // 90° left

      // charge logic
      chargeCooldownRef.current = Math.max(0, chargeCooldownRef.current - dt)
      chargeBoostRef.current = Math.max(0, chargeBoostRef.current - dt)

      const spd = baseSpeed * (speedScale || 1) * speedBuff

      if (pattern.includes('Enterobacter CRE')) {
        // Ping-pong along arena with slight homing
        const v = velRef.current
        // steer a bit towards player
        v.addScaledVector(dir, dt * spd * 0.7)
        // normalize to maintain consistent speed
        v.setLength(spd)
        // move and bounce off boundary (approx ±48)
        const nx = self.x + v.x * dt
        const nz = self.z + v.z * dt
        const LIM = 48
        if (Math.abs(nx) > LIM) { v.x *= -1 }
        if (Math.abs(nz) > LIM) { v.z *= -1 }
        ref.current.position.addScaledVector(v, dt)
      } else if (pattern.includes('MDR') && pattern.includes('P. aeruginosa')) {
        // Charger and diagonal flanker blend
        if (dist < 9 && chargeCooldownRef.current <= 0) {
          chargeBoostRef.current = 0.35 // seconds of boost
          chargeCooldownRef.current = 3.0
        }
        const boost = chargeBoostRef.current > 0 ? 2.3 : 1.0
        const mix = 0.6 // diagonal bias
        const moveDir = dir.clone().multiplyScalar(1-mix).addScaledVector(perp, mix).normalize()
        ref.current.position.addScaledVector(moveDir, spd * boost * dt)
      } else if (pattern.includes('K. pneumoniae CRE')) {
        // Straight charger when close
        if (dist < 10 && chargeCooldownRef.current <= 0) {
          chargeBoostRef.current = 0.30
          chargeCooldownRef.current = 4.0
        }
        const boost = chargeBoostRef.current > 0 ? 2.0 : 1.0
        ref.current.position.addScaledVector(dir, spd * boost * dt)
      } else if (pattern.includes('MRSA') || pattern.includes('VRE') || pattern.includes('E. coli CRE')) {
        // Diagonal catch (strafe while approaching)
        const mix = 0.55
        const moveDir = dir.clone().multiplyScalar(1-mix).addScaledVector(perp, mix * (Math.random()<0.5?-1:1)).normalize()
        ref.current.position.addScaledVector(moveDir, spd * dt)
      } else {
        // Default chase
        if (dist > 0.6) {
          ref.current.position.addScaledVector(dir, spd * dt)
        }
      }
    }

    // Special abilities (subset implemented)
    // Timers
    specialTimer.current += dt
    specialTimer2.current += dt
    // C. difficile: Toxin Cloud every ~10s
    if (!stunned && label && label.includes('C. difficile')) {
      const PERIOD = 10
      if (specialTimer.current >= PERIOD) {
        specialTimer.current = 0
        onHazard && onHazard({ type: 'toxin', pos: [ref.current.position.x, 0.5, ref.current.position.z], radius: 4.5, dps: 2, slow: 0.4, tickMs: 500, durationMs: 6000, color: '#eab308' })
      }
    }
    // P. aeruginosa XDR: Corrosive Burst — emits corrosive zone every ~8s
    if (!stunned && label && label.includes('P. aeruginosa XDR')) {
      const PERIOD = 8
      if (specialTimer.current >= PERIOD) {
        specialTimer.current = 0
        onHazard && onHazard({ type: 'corrosive', pos: [ref.current.position.x, 0.5, ref.current.position.z], radius: 3.6, slow: 0.2, tickMs: 500, durationMs: 5000, color: '#065f46' })
      }
    }
    // P. aeruginosa MDR: Toxin Spray — slow zone without damage every ~7s
    if (!stunned && label && label.includes('P. aeruginosa MDR')) {
      const PERIOD = 7
      if (specialTimer.current >= PERIOD) {
        specialTimer.current = 0
        onHazard && onHazard({ type: 'toxin', pos: [ref.current.position.x, 0.5, ref.current.position.z], radius: 3.8, dps: 0, slow: 0.45, tickMs: 500, durationMs: 5000, color: '#22c55e' })
      }
    }
    // Candida auris: Spore Cloud — visibility fog (visual hazard) every ~9s
    if (!stunned && label && label.includes('Candida auris')) {
      const PERIOD = 9
      if (specialTimer.current >= PERIOD) {
        specialTimer.current = 0
        onHazard && onHazard({ type: 'fog', pos: [ref.current.position.x, 0.5, ref.current.position.z], radius: 4.6, tickMs: 1000, durationMs: 6000, color: '#a855f7' })
      }
    }
    // Benzene: Carcinogenic Field — reduces player healing while inside every ~10s
    if (!stunned && label && label.includes('Benzene')) {
      const PERIOD = 10
      if (specialTimer.current >= PERIOD) {
        specialTimer.current = 0
        onHazard && onHazard({ type: 'carcinogen', pos: [ref.current.position.x, 0.5, ref.current.position.z], radius: 4.0, tickMs: 500, durationMs: 6000, color: '#22c55e' })
      }
    }
    // X-rays: Radiation Pulse — short, damaging pulse field every ~8s
    if (!stunned && label && label.includes('X-rays')) {
      const PERIOD = 8
      if (specialTimer.current >= PERIOD) {
        specialTimer.current = 0
        onHazard && onHazard({ type: 'toxin', pos: [ref.current.position.x, 0.5, ref.current.position.z], radius: 4.2, dps: 2, slow: 0.15, tickMs: 400, durationMs: 2000, color: '#ffffff' })
      }
    }
    // Nitrosamines: Toxic Mist — long, low DPS field every ~12s
    // Enemy bombers: launch small projectiles that create hazards on impact
    // Choose bombers by label
    if (!stunned && label && (label.includes('P. aeruginosa') || label.includes('Nitrosamines') || label.includes('X-rays'))) {
      // fire rate: every 4-6s
      if (!ref.current._bombTimer) ref.current._bombTimer = 0
      ref.current._bombTimer += dt
      const threshold = ref.current._bombCooldown || (4 + Math.random()*2)
      if (ref.current._bombTimer >= threshold) {
        ref.current._bombTimer = 0
        ref.current._bombCooldown = 4 + Math.random()*2
        // create a bomb aimed at player's current position
        const from = ref.current.position.clone()
        const to = playerPosRef.current.clone()
        const dir = new THREE.Vector3().subVectors(to, from); dir.y = 0; const d = Math.max(1e-3, dir.length()); dir.normalize()
        const speed = 16
        const idb = Math.random()
        const type = label.includes('P. aeruginosa XDR') ? 'corrosive' : (label.includes('Nitrosamines') ? 'toxin' : 'toxin')
        bombsRef.current.push({ id: idb, pos: from.clone(), vel: dir.multiplyScalar(speed), ttl: 2.5, type })
      }
    }

    // Update bombs
    if (bombsRef.current.length) {
      for (let i=bombsRef.current.length-1;i>=0;i--) {
        const b = bombsRef.current[i]
        b.ttl -= dt
        b.pos.addScaledVector(b.vel, dt)
        // reached near player or ttl expired: detonate
        const nearPlayer = b.pos.distanceTo(playerPosRef.current) < 1.2
        if (b.ttl <= 0 || nearPlayer) {
          onHazard && onHazard({ type: b.type, pos: [b.pos.x, 0.5, b.pos.z], radius: b.type==='corrosive'? 3.2 : 2.6, slow: b.type==='corrosive'? 0.2 : 0.3, tickMs: 500, durationMs: 4000, color: b.type==='corrosive'? '#065f46' : '#22c55e', dps: b.type==='corrosive'? 0 : 1 })
          try { triggerEffect && triggerEffect('bombExplosion', { position: [b.pos.x, 0.2, b.pos.z], power: (b.type==='corrosive'? 1.2 : 1.0) }) } catch {}
          bombsRef.current.splice(i,1)
        }
      }
    }
    if (!stunned && label && label.includes('Nitrosamines')) {
      const PERIOD = 12
      if (specialTimer.current >= PERIOD) {
        specialTimer.current = 0
        onHazard && onHazard({ type: 'toxin', pos: [ref.current.position.x, 0.5, ref.current.position.z], radius: 4.8, dps: 1, slow: 0.1, tickMs: 800, durationMs: 7000, color: '#92400e' })
      }
    }
    // K. pneumoniae ESBL: Enzyme Shield — nullify bullets for a 3s window every 10s
    if (label && label.includes('K. pneumoniae ESBL')) {
      const PERIOD = 10
      const ACTIVE = 3
      const t = specialTimer2.current % PERIOD
      const on = t < ACTIVE
      enzymeActiveRef.current = on
      // publish to global enemy meta so App collision can query
      if (enemyMetaRef.current) enemyMetaRef.current.enzymeShieldActive = on
      // subtle visual cue: pulse emissive and opacity when active
      if (ref.current) {
        const m = ref.current.material
        if (m) {
          if (on) {
            m.emissive.setHex(0xfacc15)
            m.opacity = 0.95
          } else {
            m.emissive.setHex(0x220011)
            m.opacity = 1.0
          }
        }
      }
    } else {
      enzymeActiveRef.current = false
      if (enemyMetaRef.current) enemyMetaRef.current.enzymeShieldActive = false
    }

    // Apply knockback with decay
    if (knockback.current.lengthSq() > 1e-6) {
      if (!stunned) ref.current.position.addScaledVector(knockback.current, dt)
      const decay = Math.exp(-8 * dt) // similar to minion decay
      knockback.current.multiplyScalar(decay)
      if (knockback.current.lengthSq() < 1e-6) knockback.current.set(0, 0, 0)
    }

    // Player collision
    const playerDist = ref.current.position.distanceTo(playerPosRef.current)
    if (playerDist < 1.2) onDie(id, true)
  })

  // Register for global impulses/stun
  useEffect(() => {
    if (!window.gameEnemies) window.gameEnemies = []
    const enemyData = {
      id,
      ref,
      isRoster: true,
      label,
      impulse: (ix=0, iz=0, strength=1) => {
        knockback.current.x += ix * strength
        knockback.current.z += iz * strength
      },
      stun: (ms=3000) => {
        if (stunImmune) return
        const sec = Math.max(0, (ms|0) / 1000)
        stunTimer.current = Math.max(stunTimer.current, sec)
      },
      enzymeShieldActive: false,
      mutSpeedUntil: 0,
      resilienceInvulnUntil: 0,
    }
    enemyMetaRef.current = enemyData
    window.gameEnemies.push(enemyData)
    return () => {
      window.gameEnemies = window.gameEnemies.filter(e => e.id !== id)
      enemyMetaRef.current = null
    }
  }, [id, stunImmune])

  const healthRatio = (maxHealth > 0) ? (health / maxHealth) : 1
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: 0x220011, roughness: 0.6, transparent: true }), [color])
  // Dedicated geometries per shape (approximate)
  const geom = useMemo(() => {
    const s = (name) => (name||'').toLowerCase()
    const nm = s(shape)
    if (nm.includes('hexagon')) return new THREE.CylinderGeometry(0.9, 0.9, 0.6, 6)
    if (nm.includes('octagon')) return new THREE.CylinderGeometry(0.9, 0.9, 0.6, 8)
    if (nm.includes('pentagon')) return new THREE.CylinderGeometry(0.9, 0.9, 0.6, 5)
    if (nm.includes('triangle')) return new THREE.CylinderGeometry(0.9, 0.9, 0.6, 3)
    if (nm.includes('square')) return new THREE.BoxGeometry(1.1, 0.6, 1.1)
    if (nm.includes('diamond')) { const g = new THREE.OctahedronGeometry(0.8, 0); g.rotateX(Math.PI/2); return g }
    if (nm.includes('rectangle')) return new THREE.BoxGeometry(1.6, 0.6, 1.0)
    if (nm.includes('oval')) { const g = new THREE.SphereGeometry(0.6, 16, 16); g.scale(1.4, 0.8, 1.0); return g }
    if (nm.includes('star')) {
      // 5-point star extruded
      const shape2 = new THREE.Shape()
      const outer = 1.0, inner = 0.4
      for (let i=0;i<5;i++){
        const a = (-Math.PI/2) + i*(2*Math.PI/5)
        const ao = a
        const ai = a + Math.PI/5
        const ox = Math.cos(ao)*outer, oz = Math.sin(ao)*outer
        const ix = Math.cos(ai)*inner, iz = Math.sin(ai)*inner
        if (i===0) shape2.moveTo(ox, oz); else shape2.lineTo(ox, oz)
        shape2.lineTo(ix, iz)
      }
      shape2.closePath()
      const extrude = new THREE.ExtrudeGeometry(shape2, { depth: 0.3, bevelEnabled: false, steps: 1 })
      extrude.rotateX(-Math.PI/2)
      return extrude
    }
    if (nm.includes('crescent')) {
      const r = 1.0
      const shape2 = new THREE.Shape()
      shape2.absarc(0,0,r,0,Math.PI*2,false)
      const hole = new THREE.Path()
      hole.absarc(0.4,0,r*0.8,0,Math.PI*2,true)
      shape2.holes.push(hole)
      const extrude = new THREE.ExtrudeGeometry(shape2, { depth: 0.3, bevelEnabled: false, steps: 1 })
      extrude.rotateX(-Math.PI/2)
      return extrude
    }
    // circle default
    return new THREE.SphereGeometry(0.6, 16, 16)
  }, [shape])

  return (
  <group scale={[visualScale, visualScale, visualScale]}>
      <group ref={ref} position={pos}>
        {(() => {
          if (enemyData && enemyData.type) {
            if (enemyData.type === 'Pathogen') {
              return <Pathogen enemyData={enemyData} />;
            } else if (enemyData.type === 'Mutagen') {
              return <Mutagen enemyData={enemyData} playerPosRef={playerPosRef} onProjectile={onHazard} />;
            } else if (enemyData.type === 'Vector (Boss)') {
              return <InfectionVector enemyData={enemyData} />;
            }
          }
          return factorySpec ? (
            <PathogenFromSpec spec={factorySpec} />
          ) : (
            <mesh material={mat}>
              <primitive object={geom} attach="geometry" />
            </mesh>
          );
        })()}
      </group>
      {/* Enemy name label */}
      {showEnemyNames && (enemyData?.name || label) && (
        <Html position={[pos[0] + ((id % 5) - 2) * 0.3, pos[1] + 5 + (Math.floor(id / 5) % 3) * 0.3, pos[2]]} center>
          <div style={{ background: 'rgba(0,0,0,0.6)', padding: '2px 4px', borderRadius: '4px', fontSize: '14px', color: `rgb(${((color >> 16) & 255)}, ${((color >> 8) & 255)}, ${(color & 255)})`, fontFamily: 'Arial, sans-serif', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            {showThumbnails && (
              <img
                src={getEnemyImageUrl(enemyData?.name || label)}
                style={{ width: 20, height: 20, marginRight: 4, borderRadius: '2px' }}
                alt=""
              />
            )}
            {enemyData?.name || label || 'Enemy'}
          </div>
        </Html>
      )}
      {/* Enemy bombs visuals */}
      {bombsRef.current.map(b => (
        <mesh key={b.id} position={[b.pos.x, 0.6, b.pos.z]}>
          <sphereGeometry args={[0.22, 8, 8]} />
          <meshStandardMaterial color={b.type==='corrosive'? 0x065f46 : 0x22c55e} emissive={0x111111} />
        </mesh>
      ))}
      {/* HP bar */}
      {health < maxHealth && (
        <mesh position={[pos[0], pos[1] + 1.5, pos[2]]}>
          <planeGeometry args={[1, 0.1]} />
          <meshBasicMaterial color={0xff0000} />
          <mesh position={[0, 0, 0.01]} scale={[Math.max(0.05, healthRatio), 1, 1]}>
            <planeGeometry args={[1, 0.1]} />
            <meshBasicMaterial color={0x00ff00} />
          </mesh>
        </mesh>
      )}
      {label && (
        <Text position={[pos[0], pos[1] + 2.2, pos[2]]} fontSize={0.28} color="#ffffff" anchorX="center" anchorY="bottom">
          {label}
        </Text>
      )}
    </group>
  )
}

export default React.memo(RosterEnemy)
