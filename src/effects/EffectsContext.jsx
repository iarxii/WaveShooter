/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

// Lightweight, pooled VFX manager for react-three-fiber scenes.
// Usage:
//  - Wrap app with <EffectsProvider>
//  - Place <EffectsRenderer /> inside the <Canvas>
//  - Call const { triggerEffect } = useEffects(); triggerEffect('bulletHit', { position: [x,y,z] })

const EffectsContext = createContext(null)

export function EffectsProvider({ children }) {
  // Active one-shot effects (small list, capped)
  const [effects, setEffects] = useState([])
  const idRef = useRef(1)

  const triggerEffect = useCallback((type, params = {}) => {
    // params: { position: [x,y,z], color, power, radius, ttl }
    const id = idRef.current++
    const now = performance.now()
    const ttl = Math.min(Math.max(params.ttl ?? defaultTTL(type), 180), 4000)
    setEffects(prev => {
      const next = [...prev, { id, type, params: { ...params, createdAt: now, ttl } }]
      // Soft cap total active effects to avoid overload
      return next.length > 120 ? next.slice(next.length - 120) : next
    })
    return id
  }, [])

  const removeEffect = useCallback((id) => {
    setEffects(prev => prev.filter(e => e.id !== id))
  }, [])

  const value = useMemo(() => ({ effects, triggerEffect, removeEffect }), [effects, triggerEffect, removeEffect])
  return (
    <EffectsContext.Provider value={value}>{children}</EffectsContext.Provider>
  )
}

export function useEffects() {
  const ctx = useContext(EffectsContext)
  if (!ctx) throw new Error('useEffects must be used within EffectsProvider')
  return ctx
}

function defaultTTL(type){
  switch(type){
    case 'bulletHit': return 420
    case 'bombExplosion': return 900
    case 'boundaryGlow': return 800
    default: return 600
  }
}

// Renderer to mount inside the r3f Canvas
export function EffectsRenderer(){
  const { effects, removeEffect } = useEffects()
  return (
    <>
      {effects.map(e => (
        <EffectSwitch key={e.id} id={e.id} type={e.type} params={e.params} onDone={removeEffect} />
      ))}
    </>
  )
}

// Lazy imports to keep bundle lean when effects not used
function EffectSwitch({ id, type, params, onDone }){
  switch(type){
    case 'bulletHit':
      return <BulletHit id={id} {...params} onDone={onDone} />
    case 'bombExplosion':
      return <BombExplosion id={id} {...params} onDone={onDone} />
    case 'boundaryGlow':
      return <BoundaryGlow id={id} {...params} onDone={onDone} />
    default:
      // Unknown effect, auto-complete
      queueMicrotask(() => onDone(id))
      return null
  }
}

// Local inline components to avoid extra files for now
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function BulletHit({ id, position = [0,0,0], color = '#ffffff', count = 48, onDone, ttl = 480, createdAt }){
  const ref = useRef()
  const geomRef = useRef()
  const start = createdAt ?? performance.now()
  const pts = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const n = Math.min(count, 120)
    const positions = new Float32Array(n * 3)
    const velocities = new Float32Array(n * 3)
    for (let i=0;i<n;i++){
      // start at origin; velocities in random cone upward
      const a = Math.random() * Math.PI * 2
      const r = Math.random() * 0.9 + 0.5
      const up = Math.random() * 1.2 + 0.6
      velocities[i*3+0] = Math.cos(a) * r
      velocities[i*3+1] = up
      velocities[i*3+2] = Math.sin(a) * r
      positions[i*3+0] = 0
      positions[i*3+1] = 0
      positions[i*3+2] = 0
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    return g
  }, [count])
  const mat = useMemo(() => new THREE.PointsMaterial({ size: 0.16, color, sizeAttenuation: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }), [color])

  useFrame((_, dt) => {
    if (!geomRef.current) return
    const now = performance.now()
    const life = (now - start)
    if (life >= ttl){ onDone(id); return }
    const t = life / ttl
    mat.opacity = 1 - t
    const pos = geomRef.current.getAttribute('position')
    const vel = geomRef.current.getAttribute('velocity')
    for (let i=0;i<pos.count;i++){
      const ix = i*3
      // simple Euler with gravity fade
      pos.array[ix+0] += vel.array[ix+0] * dt * 6
      pos.array[ix+1] += vel.array[ix+1] * dt * 6 - dt * 1.5
      pos.array[ix+2] += vel.array[ix+2] * dt * 6
    }
    pos.needsUpdate = true
  })

  return (
    <group position={position}>
      <points ref={ref}>
        <primitive object={pts} ref={geomRef} />
        <primitive object={mat} attach="material" />
      </points>
      {/* Neon ring flash */}
      <mesh rotation={[-Math.PI/2,0,0]}>
        <ringGeometry args={[0.05, 0.55, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function BombExplosion({ id, position=[0,0,0], power=1, color='#ffaa33', onDone, ttl=900, createdAt }){
  const meshRef = useRef()
  const start = createdAt ?? performance.now()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.4), transparent: true, opacity: 0.9 }), [color])
  const geom = useMemo(() => new THREE.SphereGeometry(0.4, 16, 12), [])

  useFrame(() => {
    if (!meshRef.current) return
    const life = performance.now() - start
    if (life >= ttl){ onDone(id); return }
    const t = life / ttl
    const s = 0.6 + (power * 1.8) * easeOutCubic(t)
    meshRef.current.scale.setScalar(s)
    mat.opacity = 0.9 * (1 - t)
    mat.emissiveIntensity = 0.8 + 0.6 * Math.sin(t * 10)
  })

  return (
    <mesh ref={meshRef} position={position} geometry={geom} material={mat} />
  )
}

function BoundaryGlow({ id, position=[0,0,0], radius=2.2, color='#66ccff', onDone, ttl=800, createdAt }){
  const ref = useRef()
  const start = createdAt ?? performance.now()
  const geom = useMemo(() => new THREE.TorusGeometry(radius, 0.06, 8, 64), [radius])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 1.2, transparent: true, opacity: 0.85 }), [color])
  useFrame(() => {
    if (!ref.current) return
    const life = performance.now() - start
    if (life >= ttl){ onDone(id); return }
    const t = life / ttl
    ref.current.rotation.y += 0.06
    mat.opacity = 0.85 * (1 - t)
    mat.emissiveIntensity = 1.2 + 0.8 * (1 - t)
  })
  return <mesh ref={ref} position={position} rotation={[-Math.PI/2, 0, 0]} geometry={geom} material={mat} />
}

function easeOutCubic(x){ return 1 - Math.pow(1 - x, 3) }
