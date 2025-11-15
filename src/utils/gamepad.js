/*
  Lightweight Gamepad controller hook for standard-mapped pads (Xbox One / PS4).
  - Normalizes sticks to x/z vectors (z forward, -y axis -> +z)
  - Applies deadzones with range re-scaling
  - Edge-detects buttons for dash (A/Cross) & pause (Start/Options)
  - RT/R2 hold sets auto-fire (button index 7)
  - Falls back to D-Pad if left stick is idle
*/

import { useEffect, useRef } from 'react'

function applyDeadzone(v, dz) {
  const a = Math.abs(v)
  if (a < dz) return 0
  const s = (a - dz) / (1 - dz)
  return Math.sign(v) * s
}

export default function useGamepadControls(opts) {
  const {
    moveRef,
    aimRef,
    setAutoFire,
    getAutoFire,
    onTogglePause,
    onDash,
    onToggleFireMode,
    onHeavyAttack,
    onJump,
    onPickupHold,
    onShapeRunCW,
    onShapeRunCCW,
    onSpecialAttack,
    deadzone = 0.18,
    aimDeadzone = 0.18,
    aimSensitivity = 1.0,
    invertMoveX = false,
    invertMoveY = true,
    invertAimX = false,
    invertAimY = false,
  } = opts

  const prevButtonsRef = useRef([])
  const havePadRef = useRef(false)
  const rafRef = useRef(0)

  useEffect(() => {
    let mounted = true
    const loop = () => {
      if (!mounted) return
      const pads = navigator.getGamepads ? navigator.getGamepads() : []
      let gp = null
      for (const p of pads) { if (p && p.connected) { gp = p; break } }
      if (gp) {
        havePadRef.current = true
        const ax = gp.axes || []
        const btn = gp.buttons || []

        // Standard mapping: axes are [lx, ly, rx, ry]
        // On most pads: ly is negative when stick pushed up. We want pushing UP -> move towards -Z (forward)
        const lx = ax[0] || 0
        const ly = ax[1] || 0
        // apply deadzone -> normalized in [-1,1]
        const lxN = applyDeadzone(lx, deadzone)
        const lyN = applyDeadzone(ly, deadzone)
        // world mapping: x follows lx (left negative, right positive)
        // z = ly so that stick-up (ly<0) => z<0 (forward)
        const rawMx = lxN
        const rawMz = lyN
        moveRef.current.x = (invertMoveX ? -1 : 1) * rawMx
        moveRef.current.z = (invertMoveY ? -1 : 1) * rawMz

        const rx = ax[2] || 0
        const ry = ax[3] || 0
        const rxN = applyDeadzone(rx, aimDeadzone) * aimSensitivity
        const ryN = applyDeadzone(ry, aimDeadzone) * aimSensitivity
        // Map right stick: x -> left/right, z -> ry so stick-up (ry<0) => aim z <0
        const rawAx = rxN
        const rawAz = ryN
        aimRef.current.x = (invertAimX ? -1 : 1) * rawAx
        aimRef.current.z = (invertAimY ? -1 : 1) * rawAz

        // Fire control: if auto-fire mode is OFF, holding RT/R2 will enable firing; release stops.
        if (setAutoFire && getAutoFire) {
          const rt = !!btn[7]?.pressed
          if (!getAutoFire()) setAutoFire(rt)
        }

        const prev = prevButtonsRef.current
        if (prev.length === 0) prevButtonsRef.current = btn.map(b => (b?.pressed ? 1 : 0))
        else {
          const now = btn.map(b => (b?.pressed ? 1 : 0))
            const pressedOnce = (i) => prev[i] === 0 && now[i] === 1
            // Start/Options -> Pause
            if (onTogglePause && pressedOnce(9)) onTogglePause()
            // Face buttons
            if (onDash && (pressedOnce(0) || pressedOnce(1))) onDash() // A/Cross and B/Circle => Dash
            if (onHeavyAttack && pressedOnce(3)) onHeavyAttack() // Y/Triangle => Heavy Attack
            if (onJump && pressedOnce(2)) onJump() // X/Square => Jump
            // D-Pad Up => Toggle Fire Mode (no D-Pad movement)
            if (onToggleFireMode && pressedOnce(12)) onToggleFireMode()
            // Bumpers => Shape Runner directions (held or edge). Here edge triggers command once.
            if (onShapeRunCCW && pressedOnce(5)) onShapeRunCCW() // RB/R1 = anti-clockwise per request
            if (onShapeRunCW && pressedOnce(4)) onShapeRunCW() // LB/L1 = clockwise
            // Triggers
            if (onPickupHold) onPickupHold(!!now[6]) // LT/L2 hold => pickup
            // Special: LB + RB pressed together
            if (onSpecialAttack && now[4] === 1 && now[5] === 1 && (prev[4] === 0 || prev[5] === 0)) onSpecialAttack()
            prevButtonsRef.current = now
        }
      } else {
        if (havePadRef.current) {
          havePadRef.current = false
          moveRef.current.x = 0; moveRef.current.z = 0
          aimRef.current.x = 0; aimRef.current.z = 0
          if (setAutoFire) setAutoFire(false)
          prevButtonsRef.current = []
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { mounted = false; cancelAnimationFrame(rafRef.current) }
  }, [
    moveRef,
    aimRef,
    setAutoFire,
    getAutoFire,
    onTogglePause,
    onDash,
    onToggleFireMode,
    onHeavyAttack,
    onJump,
    onPickupHold,
    onShapeRunCW,
    onShapeRunCCW,
    onSpecialAttack,
    deadzone,
    aimDeadzone,
    aimSensitivity,
    invertMoveX,
    invertMoveY,
    invertAimX,
    invertAimY,
  ])
}
