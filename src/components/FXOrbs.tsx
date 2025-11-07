import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { HeroSpec } from '../heroes/factory/HeroSpec'

type Props = {
    spec: HeroSpec,
    quality?: 'low' | 'med' | 'high',
    // Force show even if fxRing false or low quality (viewer convenience)
    forceShow?: boolean,
    // Follow a target's world transform (e.g., hips bone). If provided, orbs track this.
    followTarget?: THREE.Object3D | null,
    // Hitbox controls (mirrors Enemy Avatar Factory style)
    hitboxEnabled?: boolean,
    hitboxVisible?: boolean,
    hitboxScaleMin?: number,
    hitboxScaleMax?: number,
    hitboxSpeed?: number,
    hitboxMode?: 'sin' | 'step' | 'noise',
}

// Lightweight FX ring/orb renderer extracted from HeroFactory for reuse in viewer modes
export default function FXOrbs({ spec, quality = 'high', forceShow=false, followTarget, hitboxEnabled = false, hitboxVisible = false, hitboxScaleMin = 1, hitboxScaleMax = 1, hitboxSpeed = 1, hitboxMode = 'sin' }: Props) {
    const s = spec
    const H = (s.height ?? 1.7)
    const fxCount = Math.max(3, s.fxCount ?? 12)
    const qual = quality
    const fxRingRef = useRef<THREE.Group>(null)
    const orbRefs = useRef<THREE.Mesh[]>([])
    const followRef = useRef<THREE.Group>(null)
    const hitboxRef = useRef<THREE.Mesh>(null)

    // Create one-time base geometries/materials
    const geom = useMemo(() => new THREE.SphereGeometry(0.04 * H, 12, 12), [H])
    const mat = useMemo(() => new THREE.MeshStandardMaterial({
        color: s.accentColor ?? '#FFD54F',
        emissive: s.accentColor ?? '#FFD54F',
        emissiveIntensity: s.fxRingIntensity ?? 0.5,
        roughness: 0.25,
        metalness: 0.0,
    }), [s.accentColor, s.fxRingIntensity])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        // Follow target if provided
        if (followRef.current && followTarget) {
            followTarget.updateMatrixWorld()
            followRef.current.matrix.copy(followTarget.matrixWorld)
            followRef.current.matrix.decompose(followRef.current.position as any, (followRef.current as any).quaternion, followRef.current.scale as any)
        }
        // Animate hitbox pulse
        if (hitboxRef.current && hitboxEnabled) {
            let k = 1
            const minS = Math.max(0.01, hitboxScaleMin)
            const maxS = Math.max(minS, hitboxScaleMax)
            if (hitboxMode === 'sin') {
                const u = (Math.sin(t * hitboxSpeed * Math.PI * 2) + 1) * 0.5
                k = minS + (maxS - minS) * u
            } else if (hitboxMode === 'step') {
                const u = Math.floor(((t * hitboxSpeed) % 1) * 2) // 0 or 1
                k = u ? maxS : minS
            } else { // noise
                const u = (Math.sin(t * hitboxSpeed * 1.37) + Math.sin(t * hitboxSpeed * 2.41 + 1.23)) * 0.5 * 0.5 + 0.5
                k = minS + (maxS - minS) * u
            }
            hitboxRef.current.scale.setScalar(k)
        }
        if (!fxRingRef.current || !(s.fxRing && qual !== 'low')) return
        const count = Math.max(1, Math.min(s.fxCount ?? fxCount, 48))
        const mode = s.fxMode ?? 'wave'
        const speed = s.fxSpeed ?? 1.0
        const amp = (s.fxAmplitude ?? 0.4) * H
        const radius = (s.fxRingRadius ?? 1.2) * H
        const yawDeg = s.fxDirectionDeg ?? 0
        const yaw = (yawDeg * Math.PI) / 180
        const dir = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)).normalize()
        const up = new THREE.Vector3(0, 1, 0)
        const right = new THREE.Vector3().crossVectors(dir, up).normalize()
        if (orbRefs.current.length !== count) orbRefs.current.length = count
        for (let i = 0; i < count; i++) {
            const m = orbRefs.current[i]
            if (!m) continue
            const phase = (i / count) * Math.PI * 2
            if (mode === 'atom') {
                const plane = i % 3
                const a = t * 1.2 * speed + phase
                if (plane === 0) m.position.set(Math.cos(a) * radius, Math.sin(a) * radius * 0.6, 0)
                else if (plane === 1) m.position.set(0, Math.cos(a) * radius * 0.6, Math.sin(a) * radius)
                else m.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius)
            } else if (mode === 'wave') {
                const a = phase
                const y = Math.sin(t * 2.0 * speed + phase) * (amp * 0.35)
                m.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius)
            } else if (mode === 'push') {
                const a = phase
                const baseX = Math.cos(a) * radius
                const baseZ = Math.sin(a) * radius
                const sPush = Math.sin(t * 3.0 * speed + phase)
                const disp = sPush >= 0 ? sPush : sPush * 0.25
                const offX = dir.x * amp * disp
                const offZ = dir.z * amp * disp
                m.position.set(baseX + offX, Math.sin(phase) * 0.05 * H, baseZ + offZ)
            } else { // shield
                const center = dir.clone().multiplyScalar(-(radius + amp * 0.2))
                const shape = s.fxShieldShape ?? 'circle'
                if (shape === 'circle') {
                    const rC = Math.max(0.2 * H, radius * 0.35)
                    const a = (i / count) * Math.PI * 2
                    const p = new THREE.Vector3()
                        .addScaledVector(center, 1)
                        .addScaledVector(right, Math.cos(a) * rC)
                        .addScaledVector(up, Math.sin(a) * rC)
                    p.y += Math.sin(t * 1.8 + phase) * 0.02 * H
                    m.position.copy(p)
                } else if (shape === 'diamond') {
                    const R = Math.max(0.25 * H, radius * 0.4)
                    const u = i / count
                    const seg = Math.floor(u * 4)
                    const local = (u * 4) - seg
                    let x = 0, y = 0
                    if (seg === 0) { x = local * R; y = (1 - local) * R }
                    else if (seg === 1) { x = (1 - local) * R; y = -local * R }
                    else if (seg === 2) { x = -local * R; y = -(1 - local) * R }
                    else { x = -(1 - local) * R; y = local * R }
                    const p = new THREE.Vector3()
                        .addScaledVector(center, 1)
                        .addScaledVector(right, x)
                        .addScaledVector(up, y)
                    p.y += Math.sin(t * 1.8 + phase) * 0.02 * H
                    m.position.copy(p)
                } else { // pyramid
                    const maxRows = 8
                    const rows = Math.max(2, Math.min(maxRows, Math.round(Math.sqrt(count))))
                    const perRow: number[] = []
                    let total = 0, rIdx = 0
                    while (total < count && perRow.length < rows) {
                        const want = 1 + 2 * rIdx
                        const add = Math.min(want, count - total)
                        perRow.push(add)
                        total += add
                        rIdx++
                    }
                    let acc = 0, row = 0
                    for (; row < perRow.length; row++) { if (i < acc + perRow[row]) break; acc += perRow[row] }
                    const idxInRow = i - acc
                    const inRow = perRow[row]
                    const tipForward = center.length() + amp * 0.6
                    const step = Math.max(0.08 * H, radius * 0.15)
                    const dist = tipForward - (perRow.length - 1 - row) * step
                    const rowWidth = (inRow - 1) * (Math.max(0.08 * H, radius * 0.12))
                    const x = (idxInRow - (inRow - 1) * 0.5) * (rowWidth / Math.max(1, inRow - 1))
                    const y = (perRow.length - 1 - row) * (0.06 * H)
                    const p = new THREE.Vector3()
                        .addScaledVector(dir, -dist)
                        .addScaledVector(right, x)
                        .addScaledVector(up, y)
                    m.position.copy(p)
                }
            }
        }
    })

    if (!forceShow && !(s.fxRing && qual !== 'low')) return null
    return (
        <group ref={followRef}>
            <group ref={fxRingRef} position={[0, (H * 0.45), 0]}>
                {Array.from({ length: Math.max(3, fxCount) }).map((_, i) => (
                    <mesh
                        key={i}
                        ref={(el) => { if (el) orbRefs.current[i] = el }}
                        geometry={geom}
                        material={mat}
                    />
                ))}
                {hitboxEnabled && (
                    <mesh ref={hitboxRef} visible={hitboxVisible} position={[0, 0, 0]}>
                        {/* Hitbox radius approximates ring radius */}
                        <sphereGeometry args={[(s.fxRingRadius ?? 1.2) * H, 16, 16]} />
                        <meshBasicMaterial color={s.accentColor ?? '#FFD54F'} wireframe transparent opacity={0.35} />
                    </mesh>
                )}
            </group>
        </group>
    )
}
