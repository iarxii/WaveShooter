/*
  Lightweight Gamepad controller hook for standard-mapped pads (Xbox One / PS4).
  - Normalizes sticks to x/z vectors (z forward, -y axis -> +z)
  - Applies deadzones
  - Edge-detects buttons for dash/pause
  - Supports hold-to-fire on RT/R2
*/

import { useEffect, useRef } from 'react'

type VecRef = React.MutableRefObject<{ x: number; z: number }>

export type GamepadControlsOptions = {
  moveRef: VecRef
  aimRef: VecRef
  setAutoFire?: (v: boolean) => void
  getAutoFire?: () => boolean
  onTogglePause?: () => void
  onDash?: () => void
  onToggleFireMode?: () => void
  onHeavyAttack?: () => void
  onJump?: () => void
  onPickupHold?: (pressed: boolean) => void
  onShapeRunCW?: () => void
  onShapeRunCCW?: () => void
  onSpecialAttack?: () => void
  // Tuning
  deadzone?: number // left stick & dpad
  aimDeadzone?: number // right stick
  aimSensitivity?: number // scale for right stick
  // Inversion flags (consumers should compute effective flags if necessary)
  invertMoveX?: boolean
  invertMoveY?: boolean
  invertAimX?: boolean
  invertAimY?: boolean
}

function applyDeadzone(v: number, dz: number) {
  const a = Math.abs(v)
  if (a < dz) return 0
  // rescale to [0,1] after deadzone to preserve range
  const s = (a - dz) / (1 - dz)
  return Math.sign(v) * s
}

export function useGamepadControls(opts: GamepadControlsOptions) {
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
    invertMoveY = false,
    invertAimX = false,
    invertAimY = false,
  } = opts

  const prevButtonsRef = useRef<number[]>([])
  const havePadRef = useRef(false)
  const rafRef = useRef<number>(0)
  const lastLogRef = useRef<number>(0)

  useEffect(() => {
    let mounted = true

    const loop = () => {
      if (!mounted) return
      const pads = (navigator as any).getGamepads?.() as (Gamepad | null)[] | undefined
      let gp: Gamepad | null = null
      if (pads && pads.length) {
        for (const p of pads) {
          if (p && p.connected) { gp = p; break }
        }
      }

      if (gp) {
        havePadRef.current = true
        const ax = gp.axes || []
        const btn = gp.buttons || []

        // Read raw axes
        const lx = ax[0] ?? 0
        const ly = ax[1] ?? 0
        const rx = ax[2] ?? 0
        const ry = ax[3] ?? 0

        // Normalize sticks
        const lxN = applyDeadzone(lx, deadzone)
        const lyN = applyDeadzone(ly, deadzone)
        const rxN = applyDeadzone(rx, aimDeadzone) * aimSensitivity
        const ryN = applyDeadzone(ry, aimDeadzone) * aimSensitivity

        // Map to world: x = lxN, z = -lyN so pushing stick UP (ly < 0) maps to negative Z (forward)
        const rawMx = lxN
        const rawMz = -lyN

        // D-pad fallback
        let dx = 0, dz = 0
        const up = btn[12]?.pressed ? 1 : 0
        const down = btn[13]?.pressed ? 1 : 0
        const leftBtn = btn[14]?.pressed ? 1 : 0
        const rightBtn = btn[15]?.pressed ? 1 : 0
        if (up) dz += 1
        if (down) dz -= 1
        if (leftBtn) dx -= 1
        if (rightBtn) dx += 1

        const useStick = Math.abs(rawMx) > 0 || Math.abs(rawMz) > 0
        moveRef.current.x = useStick ? ((invertMoveX ? -1 : 1) * rawMx) : dx
        moveRef.current.z = useStick ? ((invertMoveY ? -1 : 1) * rawMz) : dz

        // Aim mapping
        const rawAx = rxN
        const rawAz = -ryN
        aimRef.current.x = (invertAimX ? -1 : 1) * rawAx
        aimRef.current.z = (invertAimY ? -1 : 1) * rawAz

        // Throttled instrumentation (200ms)
        try {
          const now = (typeof performance !== 'undefined' && (performance as any).now) ? (performance as any).now() : Date.now()
          if (now - (lastLogRef.current || 0) > 200) {
            lastLogRef.current = now
            // eslint-disable-next-line no-console
            console.debug('GP_SNAPSHOT', {
              rawAxes: [lx, ly, rx, ry],
              normalized: { lxN, lyN, rxN, ryN },
              rawMx, rawMz, move: { x: moveRef.current.x, z: moveRef.current.z },
              rawAx, rawAz, aim: { x: aimRef.current.x, z: aimRef.current.z },
              invertMoveX, invertMoveY, invertAimX, invertAimY,
              dpad: { up, down, left: leftBtn, right: rightBtn },
              rt: !!btn[7]?.pressed
            })
            // Also log at info level so entries are visible when Debug/Verbose is filtered out
            try { console.info && console.info('GP_SNAPSHOT', { rawAxes: [lx, ly, rx, ry], move: { x: moveRef.current.x, z: moveRef.current.z }, aim: { x: aimRef.current.x, z: aimRef.current.z } }) } catch (e) {}
          }
        } catch (e) {}

        // Hold-to-fire on RT/R2 (button index 7 in standard mapping)
        if (setAutoFire) {
          const rtPressed = !!btn[7]?.pressed
          setAutoFire(rtPressed)
        }

        // Edge-detect buttons for dash and pause
        const prev = prevButtonsRef.current
        if (!prev.length) prevButtonsRef.current = btn.map(b => (b?.pressed ? 1 : 0))
        else {
          const now = btn.map(b => (b?.pressed ? 1 : 0))
          const pressedOnce = (i: number) => prev[i] === 0 && now[i] === 1

          // Start/Options -> pause (index 9)
          if (onTogglePause && pressedOnce(9)) onTogglePause()
          // A (Xbox) / Cross (PS) -> jump (index 0)
          if (onJump && pressedOnce(0)) onJump()
          // X (Xbox) / Square (PS) -> jump (index 2)
          if (onJump && pressedOnce(2)) onJump()
          // B (Xbox) / Circle (PS) -> dash (index 1)
          if (onDash && pressedOnce(1)) onDash()
          // Y (Xbox) / Triangle (PS) -> heavy attack (index 3)
          if (onHeavyAttack && pressedOnce(3)) onHeavyAttack()
          // LB (Xbox) / L1 (PS) -> shape run CCW (index 4)
          if (onShapeRunCCW && pressedOnce(4)) onShapeRunCCW()
          // RB (Xbox) / R1 (PS) -> shape run CW (index 5)
          if (onShapeRunCW && pressedOnce(5)) onShapeRunCW()
          // LB + RB -> special attack (indices 4 and 5)
          if (onSpecialAttack && pressedOnce(4) && now[5] === 1) onSpecialAttack()
          if (onSpecialAttack && pressedOnce(5) && now[4] === 1) onSpecialAttack()

          prevButtonsRef.current = now
        }
      } else {
        if (havePadRef.current) {
          // Pad disconnected; clear inputs
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
  }, [moveRef, aimRef, setAutoFire, onTogglePause, onDash, onToggleFireMode, onHeavyAttack, onJump, onPickupHold, onShapeRunCW, onShapeRunCCW, onSpecialAttack, deadzone, aimDeadzone, aimSensitivity, invertMoveX, invertMoveY, invertAimX, invertAimY])
}

export default useGamepadControls
