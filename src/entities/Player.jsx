import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { AIM_RAY_LENGTH, BOUNDARY_LIMIT, FIRE_RATE, PLAYER_SPEED, SPEED_BUFF_DURATION_MS, SPEED_DEBUFF_DURATION_MS, SPEED_DEBUFF_FACTOR, RUNNER_SPEED_MULTIPLIER } from '../game/constants.js'

export default function Player({ position, setPositionRef, onShoot, isPaused, autoFire, controlScheme = 'dpad', moveInputRef, moveSourceRef, onSlam, highContrast=false, portals=[], onDebuff, speedBoosts=[], onBoost, autoFollow, arcTriggerToken, resetToken=0, basePlayerSpeed=PLAYER_SPEED, autoAimEnabled=false, onBoundaryJumpChange, onLanding, dashTriggerToken=0, onDashStart, onDashEnd, primaryColor=0x22c55e, invulnActive=false, bouncers=[], boundaryLimit=BOUNDARY_LIMIT }) {
  const ref = useRef()
  const lastShot = useRef(0)
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const aimPoint = useRef(new THREE.Vector3())
  const tmpDir = useRef(new THREE.Vector3())
  const forward = useRef(new THREE.Vector3(0, 0, -1))
  const lastYaw = useRef(0)
  const rayRef = useRef()
  const baseRayThickness = 0.08
  // Inputs and movement
  const keysRef = useRef({ w: false, a: false, s: false, d: false, up: false, down: false, left: false, right: false })
  const aimDirRef = useRef(new THREE.Vector3(0, 0, -1))
  // Jump/arc state
  const airVelY = useRef(0)
  const airFwdVel = useRef(0)
  const airFwdDir = useRef(new THREE.Vector3(0, 0, -1))
  const slamArmed = useRef(false)
  const launchCooldown = useRef(0)
  const GRAVITY = 24
  const LAUNCH_UP_VEL = 14
  const LAUNCH_TARGET_FRACTION = 0.5
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
  // Buff/debuff and dash
  const debuffTimer = useRef(0)
  const dashing = useRef(false)
  const dashTime = useRef(0)
  const dashDuration = 0.25
  const dashVel = useRef(new THREE.Vector3())
  const portalHitCooldown = useRef(0)
  const bouncerHitCooldown = useRef(0)
  const boundaryGraceRef = useRef(0)
  const boostTimer = useRef(0)
  const boostHitCooldown = useRef(0)
  const boostSpeedRef = useRef(PLAYER_SPEED)
  const lastArcToken = useRef(0)
  const boundaryJumpActive = useRef(false)

  // Reset on respawn/restart
  useEffect(() => {
    if (!ref.current) return
    ref.current.position.set(0, 0.5, 0)
    airVelY.current = 0
    airFwdVel.current = 0
    airFwdDir.current.set(0, 0, -1)
    slamArmed.current = false
    launchCooldown.current = 0
    portalHitCooldown.current = 0
    bouncerHitCooldown.current = 0
    keysRef.current = { w: false, a: false, s: false, d: false, up: false, down: false, left: false, right: false }
    isKeyJumpDown.current = false
    isRmbDown.current = false
    boundaryGraceRef.current = 2.0
  }, [resetToken])

  // Input listeners
  useEffect(() => {
    if (isPaused) return
    function down(e) {
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
      if (e.button === 0) {
        const now = performance.now()
        if (now - lastShot.current > FIRE_RATE) {
          lastShot.current = now
          const dir = forward.current.set(0, 0, -1).applyQuaternion(ref.current.quaternion)
          dir.y = 0
          dir.normalize()
          onShoot(ref.current.position, [dir.x, 0, dir.z])
        }
      } else if (e.button === 2) {
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
          airVelY.current = LAUNCH_UP_VEL
          const BL = boundaryLimit ?? BOUNDARY_LIMIT
          const totalLen = 2 * BL
          const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen)
          const target = new THREE.Vector3().copy(ref.current.position).addScaledVector(aimDirRef.current, desired)
          const margin = 1.0
          target.x = Math.max(Math.min(target.x, BL - margin), -BL + margin)
          target.z = Math.max(Math.min(target.z, BL - margin), -BL + margin)
          const disp = new THREE.Vector3().subVectors(target, ref.current.position)
          const dispLen = Math.max(0.001, Math.hypot(disp.x, disp.z))
          airFwdDir.current.set(disp.x / dispLen, 0, disp.z / dispLen)
          const tFlight = (2 * LAUNCH_UP_VEL) / GRAVITY
          airFwdVel.current = dispLen / tFlight
          slamArmed.current = true
        }
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

  // Key jump (Ctrl/Enter)
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
        if (ref.current.position.y <= 0.5) {
          airVelY.current = LAUNCH_UP_VEL
          const BL = boundaryLimit ?? BOUNDARY_LIMIT
          const totalLen = 2 * BL
          const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen)
          const target = new THREE.Vector3().copy(ref.current.position).addScaledVector(aimDirRef.current, desired)
          const margin = 1.0
          target.x = Math.max(Math.min(target.x, BL - margin), -BL + margin)
          target.z = Math.max(Math.min(target.z, BL - margin), -BL + margin)
          const disp = new THREE.Vector3().subVectors(target, ref.current.position)
          const dispLen = Math.max(0.001, Math.hypot(disp.x, disp.z))
          airFwdDir.current.set(disp.x / dispLen, 0, disp.z / dispLen)
          const tFlight = (2 * LAUNCH_UP_VEL) / GRAVITY
          airFwdVel.current = dispLen / tFlight
          slamArmed.current = true
        }
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

  // External arc trigger
  useEffect(() => {
    if (!ref.current) return
    if (arcTriggerToken && arcTriggerToken !== lastArcToken.current) {
      lastArcToken.current = arcTriggerToken
      airVelY.current = LAUNCH_UP_VEL
      const BL = boundaryLimit ?? BOUNDARY_LIMIT
      const totalLen = 2 * BL
      const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen)
      const target = new THREE.Vector3().copy(ref.current.position).addScaledVector(aimDirRef.current, desired)
      const margin = 1.0
      target.x = Math.max(Math.min(target.x, BL - margin), -BL + margin)
      target.z = Math.max(Math.min(target.z, BL - margin), -BL + margin)
      const disp = new THREE.Vector3().subVectors(target, ref.current.position)
      const dispLen = Math.max(0.001, Math.hypot(disp.x, disp.z))
      airFwdDir.current.set(disp.x / dispLen, 0, disp.z / dispLen)
      const tFlight = (2 * LAUNCH_UP_VEL) / GRAVITY
      airFwdVel.current = dispLen / tFlight
      slamArmed.current = true
    }
  }, [arcTriggerToken])

  // Auto-fire timer
  const autoFireTimerRef = useRef(0)

  useFrame((state, dt) => {
    if (!ref.current || isPaused) return
    const BL = boundaryLimit ?? BOUNDARY_LIMIT

    // Dash handling
    if (dashing.current) {
      dashTime.current += dt
      ref.current.position.addScaledVector(dashVel.current, dt)
  ref.current.position.x = Math.max(Math.min(ref.current.position.x, BL - 0.5), -BL + 0.5)
  ref.current.position.z = Math.max(Math.min(ref.current.position.z, BL - 0.5), -BL + 0.5)
      if (dashTime.current >= dashDuration) {
        dashing.current = false
        onDashEnd && onDashEnd({ x: ref.current.position.x, z: ref.current.position.z })
      }
      setPositionRef && setPositionRef(ref.current.position)
      return
    }

    // Auto-fire cadence
    if (autoFire) {
      autoFireTimerRef.current += dt * 1000
      if (autoFireTimerRef.current >= FIRE_RATE) {
        autoFireTimerRef.current = 0
        const dir = forward.current.set(0, 0, -1).applyQuaternion(ref.current.quaternion)
        dir.y = 0
        dir.normalize()
        lastShot.current = performance.now()
        onShoot(ref.current.position, [dir.x, 0, dir.z])
      }
    } else {
      autoFireTimerRef.current = 0
    }

    // Aim handling
    if (autoFollow && autoFollow.active) {
      const cx = (autoFollow.center?.[0] ?? 0)
      const cz = (autoFollow.center?.[2] ?? 0)
      tmpDir.current.set(cx - ref.current.position.x, 0, cz - ref.current.position.z)
      if (tmpDir.current.lengthSq() > 1e-6) {
        aimDirRef.current.copy(tmpDir.current).normalize()
        const targetYaw = Math.atan2(tmpDir.current.x, tmpDir.current.z) + Math.PI
        const diff = ((targetYaw - lastYaw.current + Math.PI) % (Math.PI * 2)) - Math.PI
        lastYaw.current = lastYaw.current + diff * (1 - Math.exp(-10 * dt))
        ref.current.rotation.y = lastYaw.current
      }
    } else if (autoAimEnabled) {
      const p = ref.current.position
      let target = null
      let cx = 0, cz = 0, ccount = 0
      const SHORT_RANGE = 10
      const MID_RANGE = 18
      const LONG_RANGE = 36
      if (window.gameEnemies && window.gameEnemies.length) {
        for (const ge of window.gameEnemies) {
          if (!ge?.ref?.current) continue
          const ex = ge.ref.current.position.x
          const ez = ge.ref.current.position.z
          const dx = ex - p.x
          const dz = ez - p.z
          const d2 = dx*dx + dz*dz
          if (d2 <= MID_RANGE*MID_RANGE) { cx += ex; cz += ez; ccount++ }
        }
        if (ccount >= 5) { target = { x: cx/ccount, z: cz/ccount } }
        else {
          let best = null
          for (const ge of window.gameEnemies) {
            if (!ge?.ref?.current) continue
            const ex = ge.ref.current.position.x
            const ez = ge.ref.current.position.z
            const dx = ex - p.x
            const dz = ez - p.z
            const d2 = dx*dx + dz*dz
            if (d2 > LONG_RANGE*LONG_RANGE) continue
            let pri = 1
            if (ge.isCone) pri = 3
            else if (ge.isBoss) pri = 2
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
          if (rayRef.current) {
            const dist = Math.min(tmpDir.current.length(), MID_RANGE)
            const width = baseRayThickness + Math.min(dist / 12, 1) * 0.14
            rayRef.current.scale.x = width
          }
        }
      } else {
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

    // Movement vectors
    const k = keysRef.current
    const keyMx = (k.d ? 1 : 0) - (k.a ? 1 : 0) + (k.right ? 1 : 0) - (k.left ? 1 : 0)
    const keyMz = (k.s ? 1 : 0) - (k.w ? 1 : 0) + (k.down ? 1 : 0) - (k.up ? 1 : 0)
    const extMx = moveInputRef ? moveInputRef.current.x : 0
    const extMz = moveInputRef ? moveInputRef.current.z : 0
    let mx = 0, mz = 0
    if (controlScheme === 'wasd') { mx = keyMx; mz = keyMz }
    else { if (Math.abs(extMx) > 0.001 || Math.abs(extMz) > 0.001) { mx = extMx; mz = extMz } else { mx = keyMx; mz = keyMz } }

    // Auto-follow override on shape perimeter
    if (autoFollow && autoFollow.active) {
      const cx = (autoFollow.center?.[0] ?? 0)
      const cz = (autoFollow.center?.[2] ?? 0)
      const px = ref.current.position.x
      const pz = ref.current.position.z
      const shape = autoFollow.shape || 'circle'
      const r = Math.max(0.001, autoFollow.radius || 1)
      const dirSign = autoFollow.dirSign || 1
      if (shape === 'circle') {
        let dx = px - cx
        let dz = pz - cz
        const len = Math.hypot(dx, dz)
        if (len < 0.001) { dx = 1; dz = 0 }
        let tx = -dz * dirSign
        let tz = dx * dirSign
        const tlen = Math.hypot(tx, tz) || 1
        mx = tx / tlen; mz = tz / tlen
        const radialErr = r - len
        if (Math.abs(radialErr) > 0.001) {
          const rx = dx / (len || 1)
          const rz = dz / (len || 1)
          const corrGain = 2.5
          mx += rx * radialErr * corrGain * dt
          mz += rz * radialErr * corrGain * dt
        }
      } else {
        const segs = []
        if (shape === 'hexagon') {
          const verts = []
          for (let i = 0; i < 6; i++) {
            const a = (-Math.PI / 2) + i * (2 * Math.PI / 6)
            verts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r])
          }
          for (let i = 0; i < 6; i++) { const a0 = verts[i], a1 = verts[(i + 1) % 6]; segs.push([a0[0], a0[1], a1[0], a1[1]]) }
        } else {
          const hx = r
          const hz = r * 0.7
          const v = [ [cx + hx, cz + hz], [cx - hx, cz + hz], [cx - hx, cz - hz], [cx + hx, cz - hz] ]
          for (let i = 0; i < 4; i++) { const a0 = v[i], a1 = v[(i + 1) % 4]; segs.push([a0[0], a0[1], a1[0], a1[1]]) }
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
          mx = (best.vx / elen) * dirSign
          mz = (best.vz / elen) * dirSign
          const corrGain = 8.0
          mx += (best.nx - px) * corrGain * dt
          mz += (best.nz - pz) * corrGain * dt
        }
      }
    }

    // Normalize and apply speed
    const mlen = Math.hypot(mx, mz) || 1
    mx /= mlen; mz /= mlen
  portalHitCooldown.current = Math.max(0, portalHitCooldown.current - dt)
  bouncerHitCooldown.current = Math.max(0, bouncerHitCooldown.current - dt)
    debuffTimer.current = Math.max(0, debuffTimer.current - dt)
    boostHitCooldown.current = Math.max(0, boostHitCooldown.current - dt)
    boostTimer.current = Math.max(0, boostTimer.current - dt)
    const debuffMul = debuffTimer.current > 0 ? SPEED_DEBUFF_FACTOR : 1
    const baseSpeed = (boostTimer.current > 0 ? boostSpeedRef.current : basePlayerSpeed)
    const speedMul = ((moveSourceRef && moveSourceRef.current === 'runner') ? RUNNER_SPEED_MULTIPLIER : 1) * debuffMul
    ref.current.position.x += mx * (baseSpeed * speedMul) * dt
    ref.current.position.z += mz * (baseSpeed * speedMul) * dt

    // Boundary launch detection
    launchCooldown.current = Math.max(0, launchCooldown.current - dt)
    boundaryGraceRef.current = Math.max(0, boundaryGraceRef.current - dt)
    if (launchCooldown.current <= 0 && boundaryGraceRef.current <= 0) {
      if (ref.current.position.x > BL - 0.1 || ref.current.position.x < -BL + 0.1 ||
          ref.current.position.z > BL - 0.1 || ref.current.position.z < -BL + 0.1) {
        ref.current.position.x = Math.max(Math.min(ref.current.position.x, BL), -BL)
        ref.current.position.z = Math.max(Math.min(ref.current.position.z, BL), -BL)
        airVelY.current = LAUNCH_UP_VEL
        const totalLen = 2 * BL
        const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen)
        const target = new THREE.Vector3().copy(ref.current.position).addScaledVector(aimDirRef.current, desired)
        const margin = 1.0
        target.x = Math.max(Math.min(target.x, BL - margin), -BL + margin)
        target.z = Math.max(Math.min(target.z, BL - margin), -BL + margin)
        const disp = new THREE.Vector3().subVectors(target, ref.current.position)
        const dispLen = Math.max(0.001, Math.hypot(disp.x, disp.z))
        airFwdDir.current.set(disp.x / dispLen, 0, disp.z / dispLen)
        const tFlight = (2 * LAUNCH_UP_VEL) / GRAVITY
        airFwdVel.current = dispLen / tFlight
        slamArmed.current = true
        launchCooldown.current = 1.0
        boundaryJumpActive.current = true
        onBoundaryJumpChange && onBoundaryJumpChange(true)
      }
    }

    // Airborne physics
    if (airVelY.current !== 0 || ref.current.position.y > 0.5) {
      ref.current.position.y += airVelY.current * dt
      airVelY.current -= GRAVITY * dt
      if (airFwdVel.current > 0) {
        ref.current.position.x += airFwdDir.current.x * airFwdVel.current * dt
        ref.current.position.z += airFwdDir.current.z * airFwdVel.current * dt
      }
      if (ref.current.position.y <= 0.5) {
        ref.current.position.y = 0.5
        airVelY.current = 0
        airFwdVel.current = 0
        if (slamArmed.current) {
          slamArmed.current = false
          onSlam && onSlam({ pos: [ref.current.position.x, 0.5, ref.current.position.z], radius: 9, power: 30 })
        }
        onLanding && onLanding({ x: ref.current.position.x, z: ref.current.position.z })
        if (boundaryJumpActive.current) {
          boundaryJumpActive.current = false
          onBoundaryJumpChange && onBoundaryJumpChange(false)
        }
      }
    }

    // Remove portal-applied slow debuff: portals no longer slow the player

    // Collide with launched bouncers to apply slow (blocked while invulnerable)
    if (!invulnActive && bouncerHitCooldown.current <= 0 && bouncers && bouncers.length) {
      const px = ref.current.position.x
      const pz = ref.current.position.z
      const R = 1.25
      for (let i = 0; i < bouncers.length; i++) {
        const b = bouncers[i]
        const dx = px - b.pos[0]
        const dz = pz - b.pos[2]
        if (dx*dx + dz*dz <= R*R) {
          debuffTimer.current = SPEED_DEBUFF_DURATION_MS / 1000
          bouncerHitCooldown.current = 0.9
          onDebuff && onDebuff()
          break
        }
      }
    }

    // Collide with speed boosts
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
          boostSpeedRef.current = 26 + Math.random() * 2
          boostHitCooldown.current = 1.0
          onBoost && onBoost()
          break
        }
      }
    }

    // Clamp & sync position
  ref.current.position.x = Math.max(Math.min(ref.current.position.x, BL), -BL)
  ref.current.position.z = Math.max(Math.min(ref.current.position.z, BL), -BL)
    setPositionRef && setPositionRef(ref.current.position)

    // Indicators
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
        const totalLen = 2 * BL
        const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen)
        const target = new THREE.Vector3().copy(ref.current.position).addScaledVector(aimDirRef.current, desired)
        const margin = 1.0
        target.x = Math.max(Math.min(target.x, BL - margin), -BL + margin)
        target.z = Math.max(Math.min(target.z, BL - margin), -BL + margin)
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

  // Dash trigger
  useEffect(() => {
    if (!ref.current) return
    const dir = aimDirRef.current.clone()
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1)
    // Dash should move backward relative to aim direction
    const dashDir = dir.normalize().multiplyScalar(-1)
  const distance = 0.4 * (boundaryLimit ?? BOUNDARY_LIMIT)
    const speed = distance / dashDuration
    dashVel.current.set(dashDir.x * speed, 0, dashDir.z * speed)
    dashing.current = true
    dashTime.current = 0
    onDashStart && onDashStart({ dir: [dashDir.x, dashDir.z], distance, durationMs: dashDuration * 1000 })
  }, [dashTriggerToken])

  return (
    <group ref={ref} position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.8, 0.8, 1.2]} />
        <meshStandardMaterial color={primaryColor} metalness={0.2} roughness={0.6} />
      </mesh>
      {/* Aim ray */}
      <mesh ref={rayRef} position={[0, 0.5, -AIM_RAY_LENGTH / 2]}>
        <boxGeometry args={[1, 0.06, AIM_RAY_LENGTH]} />
        <meshBasicMaterial color={highContrast ? 0xffffff : 0x99ffcc} transparent opacity={highContrast ? 0.9 : 0.6} />
      </mesh>
      {/* Jump charge ring */}
      <mesh ref={chargeRingRef} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} material={chargeMat}>
        <primitive object={chargeGeom} attach="geometry" />
      </mesh>
      {/* Landing marker ring */}
      <mesh ref={landingRingRef} rotation={[-Math.PI / 2, 0, 0]} material={landingMat}>
        <primitive object={landingGeom} attach="geometry" />
      </mesh>
    </group>
  )
}
