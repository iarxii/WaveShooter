import React, { useRef, useEffect } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

// Render the HUD onto an invisible plane that follows the player's x/z.
// The plane itself is invisible (no color) but provides a stable world transform
// so the HUD appears projected under the player's feet similar to invulnerability indicator.
export default function PlayerRadialHUD({ playerPosRef, health = 100, armor = 500, maxHealth = 100, maxArmor = 500, size = 56, footYOffset = 0.02 }) {
  const meshRef = useRef()

  // Initialize plane position to player's current position so HUD is visible when stationary
  useEffect(() => {
    const m = meshRef.current
    const p = playerPosRef?.current
    if (m && p) {
      m.position.x = p.x
      m.position.z = p.z
      // compute plane y from player's y so the HUD stays under the feet; fallback to footYOffset
      const py = typeof p.y === 'number' ? p.y - Math.abs(footYOffset) : footYOffset
      m.position.y = py
      m.rotation.x = -Math.PI / 2
    }
  }, [playerPosRef])

  // Smoothly follow player's x/z; keep y locked to just above ground (0.12).
  useFrame(() => {
    const m = meshRef.current
    const p = playerPosRef?.current
    if (!m || !p) return
    const t = 0.38 // faster follow to reduce perceptible lag
  m.position.x += (p.x - m.position.x) * t
  m.position.z += (p.z - m.position.z) * t
  // compute plane y from player's y so the HUD stays under the feet; fallback to footYOffset
  m.position.y = (typeof p.y === 'number') ? (p.y - Math.abs(footYOffset)) : footYOffset
    // Ensure plane faces up
    m.rotation.x = -Math.PI / 2
  })

  const healthRatio = Math.max(0, Math.min(1, health / (maxHealth || 100)))
  const armorRatio = Math.max(0, Math.min(1, armor / (maxArmor || 500)))

  // Make the visible disk approximately 2x larger for better visibility
  const outer = size * 2
  const inner = Math.round(outer * 0.58)
  const armorDeg = Math.round(armorRatio * 360)
  const healthDeg = Math.round(healthRatio * 360)

  const containerStyle = {
    width: outer + 'px',
    height: outer + 'px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
  }

  const armorStyle = {
    width: outer + 'px',
    height: outer + 'px',
    borderRadius: '50%',
    background: `conic-gradient(rgba(96,165,250,0.98) ${armorDeg}deg, rgba(255,255,255,0.06) ${armorDeg}deg)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 10px rgba(96,165,250,0.12) inset',
  }

  const healthStyle = {
    width: inner + 'px',
    height: inner + 'px',
    borderRadius: '50%',
    background: `conic-gradient(rgba(34,197,94,0.98) ${healthDeg}deg, rgba(255,255,255,0.04) ${healthDeg}deg)`,
    boxShadow: '0 0 6px rgba(0,0,0,0.28) inset',
  }

  const holeSize = Math.max(6, Math.round(inner * 0.5))
  const holeStyle = {
    width: holeSize + 'px',
    height: holeSize + 'px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.36)'
  }

  // Plane size in world units (doubled to match visual size)
  const worldSize = Math.max(0.8, size * 0.02)

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[worldSize, worldSize]} />
      {/* Invisible material: no visible color, but still provides transform for Html */}
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />

  {/* Attach an HTML element that uses the plane's transform so it looks projected on the surface */}
  {/* remove `occlude` so the HUD remains visible even when the player is stationary or occluded */}
  <Html transform center>
        <div style={containerStyle} aria-hidden>
          <div style={armorStyle}>
            <div style={healthStyle}>
              <div style={holeStyle} />
            </div>
          </div>
        </div>
      </Html>
    </mesh>
  )
}
