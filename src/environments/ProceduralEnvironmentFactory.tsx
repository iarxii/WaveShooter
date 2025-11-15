import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EnvironmentSpec } from './environments'
import { useThree, useFrame } from '@react-three/fiber'
import { ShaderParkGround } from './ShaderPark/ShaderParkGround'
import { useEnvironment } from '../contexts/EnvironmentContext'
import { createArenaMaterial, updateArenaMaterialWithEnv } from './arenaMaterial'

// Lightweight pooled geometries
const planeGeom = new THREE.PlaneGeometry(200, 200)
const boxGeom = new THREE.BoxGeometry(2, 4, 2)

interface Props { spec: EnvironmentSpec; perfMode?: boolean }

// Returns a group of optimized lights + optional simple silhouettes
export function ProceduralEnvironmentFactory({ spec, perfMode }: Props) {
  const { scene } = useThree()
  // Map env id to arena shader variant
  const mode = useMemo(() => {
    switch (spec.id) {
      case 'proc_hazard_hospital': return 'plasma'
      case 'proc_hazard_lab': return 'planetoid'
      case 'proc_blue_sky': return 'void'
      case 'proc_darkmode': return 'turbulence'
      default: return 'planetoid'
    }
  }, [spec.id])
  // Background & fog adjustments (already applied in SceneEnvironment effect for fog; here only background)
  const backgroundColor = useMemo(() => {
    switch (spec.id) {
      case 'proc_hazard_hospital': return '#06141d'
      case 'proc_hazard_lab': return '#081523'
      case 'proc_blue_sky': return '#87c5ff'
      default: return '#101418'
    }
  }, [spec.id])
  // Set background once per spec change
  React.useEffect(() => {
    scene.background = new THREE.Color(backgroundColor)
  }, [scene, backgroundColor])

  // Light palette per procedural spec
  const lights = useMemo(() => {
    if (perfMode) {
      return (
        <group>
          <ambientLight intensity={0.4} color={'#ffffff'} />
          <directionalLight position={[10, 18, 6]} intensity={0.6} />
        </group>
      )
    }
    if (spec.id === 'proc_blue_sky') {
      return (
        <group>
          <hemisphereLight intensity={0.85} color={'#ffffff'} groundColor={'#87c5ff'} />
          <directionalLight position={[12, 30, 10]} intensity={0.9} color={'#fff8e5'} />
          <directionalLight position={[-18, 12, -6]} intensity={0.25} color={'#b0d8ff'} />
        </group>
      )
    }
    if (spec.id === 'proc_hazard_lab') {
      return (
        <group>
          <ambientLight intensity={0.25} color={'#bfe3ff'} />
          <pointLight position={[4, 6, 0]} intensity={1.4} color={'#66ccff'} distance={14} decay={2} />
          <pointLight position={[-5, 5, -4]} intensity={0.9} color={'#ff66aa'} distance={12} decay={2} />
          <directionalLight position={[10, 16, 5]} intensity={0.6} color={'#eef7ff'} />
        </group>
      )
    }
    // proc_hazard_hospital default
    return (
      <group>
        <ambientLight intensity={0.25} color={'#9adbe7'} />
        <pointLight position={[6, 7, 2]} intensity={1.2} color={'#88eaff'} distance={16} decay={2} />
        <pointLight position={[-6, 6, -4]} intensity={0.6} color={'#ffbb66'} distance={14} decay={2} />
        <directionalLight position={[12, 22, 8]} intensity={0.65} color={'#ffffff'} />
      </group>
    )
  }, [spec.id, perfMode])

  // Optional silhouette city blocks for hazard hospital / lab (parallax suggestion)
  const silhouettes = useMemo(() => {
    if (perfMode) return null
    if (spec.id === 'proc_hazard_hospital' || spec.id === 'proc_hazard_lab') {
      const blocks = []
      for (let i = -50; i <= 50; i += 8) {
        const h = 6 + Math.sin(i * 0.3) * 2 + (spec.id === 'proc_hazard_lab' ? Math.cos(i * 0.2) * 1.5 : 0)
        blocks.push(<mesh key={i} position={[i, h / 2, -40]} geometry={boxGeom} scale={[2.2, h, 2.2]}>
          <meshBasicMaterial color={spec.id === 'proc_hazard_lab' ? '#142b3a' : '#0d2530'} />
        </mesh>)
      }
      return <group>{blocks}</group>
    }
    return null
  }, [spec.id, perfMode])

  // Consume global pulses from environment context
  const { pulses } = useEnvironment()
  const { env } = useEnvironment()

  // Engine selection: read persisted choice and listen for updates
  const [engine, setEngine] = useState(() => {
    try { return localStorage.getItem('env_engine') || 'three' } catch { return 'three' }
  })
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => { if (ev.key === 'env_engine') setEngine(ev.newValue || 'three') }
    const onCustom = (ev: any) => { setEngine(ev?.detail || 'three') }
    window.addEventListener('storage', onStorage)
    window.addEventListener('env_engine_changed', onCustom)
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('env_engine_changed', onCustom) }
  }, [])

  return (
    <group>
      {lights}
  {/* Arena ground: choose pipeline based on engine preference */}
  {engine === 'shaderpark' ? (
    <ShaderParkGround />
  ) : (
    <ThreeGround env={env} pulses={pulses} />
  )}
      {silhouettes}
    </group>
  )
}

function ThreeGround({ env, pulses }: { env: any; pulses: any[] }) {
  const matRef = useRef<THREE.ShaderMaterial | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)
  // Track selected shader variant (sync with global navbar selection)
  const [variant, setVariant] = React.useState(() => {
    try { return localStorage.getItem('env_shader') || 'planetoid' } catch { return 'planetoid' }
  })
  // Listen for global shader change events & storage updates
  useEffect(() => {
    const onShader = (e: any) => { const v = e?.detail; if (typeof v === 'string') setVariant(v) }
    const onStorage = (e: StorageEvent) => { if (e.key === 'env_shader') setVariant(e.newValue || 'planetoid') }
    window.addEventListener('env_shader_changed', onShader)
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener('env_shader_changed', onShader); window.removeEventListener('storage', onStorage) }
  }, [])
  // (Re)create material when variant changes
  useEffect(() => {
    const old = matRef.current
    if (old) { try { old.dispose() } catch {} }
    const mat = createArenaMaterial(variant)
    matRef.current = mat
    if (meshRef.current) meshRef.current.material = mat
    return () => { /* disposal handled on next change or unmount */ }
  }, [variant])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (matRef.current) {
      if ((matRef.current as any).uniforms) {
        const u = (matRef.current as any).uniforms
        if (u.uTime) u.uTime.value = t
        if (u.time) u.time.value = t
      }
      updateArenaMaterialWithEnv(matRef.current, env, pulses)
    }
  })
  return (
    <mesh ref={meshRef} rotation={[-Math.PI/2,0,0]} geometry={planeGeom}>
      <primitive object={matRef.current || new THREE.MeshStandardMaterial({ color:'#444' })} attach="material" />
    </mesh>
  )
}
