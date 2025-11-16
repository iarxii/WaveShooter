import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Player from '../entities/Player.jsx'
import { SceneEnvironment } from '../contexts/EnvironmentContext'
import { BOUNDARY_LIMIT } from '../game/constants.js'
import { useEnvironment } from '../contexts/EnvironmentContext'
import { createArenaMaterial, updateArenaMaterialWithEnv } from '../environments/arenaMaterial'
import { logMaterial, logPerformance, logWebGL } from '../utils/WebGLDebugger'
import { DebugPanel } from '../components/DebugPanel'
import { EnvironmentBuilder } from '../components/environmentBuilder/EnvironmentBuilder'
import { EnvironmentRenderer } from '../components/environmentBuilder/EnvironmentRenderer'
import { useEnvironmentBuilder } from '../contexts/EnvironmentBuilderContext'

// Mode helpers --------------------------------------------------------------
// Mapping from environment id to default shader sample
const ENV_SHADER_MAP = {
  proc_hazard_hospital: 'veins',
  proc_hazard_lab: 'infection',
  proc_blue_sky: 'grid',
  proc_darkmode: 'bioelectric',
  hospital: 'veins',
  surgery: 'veins',
  orchard: 'veins'
}

// Simple Three.js ShaderMaterial for fallback / ThreeJS pipeline
async function createSimpleThreeMaterial(variant) {
  // wrapper: create the richer arena material for a named variant
  return await createArenaMaterial(variant)
}

// Option A: Background full-screen quad (shader) + separate collision ground
function GroundModeA() {
  const { state } = useEnvironmentBuilder()
  const { size } = { size: 200 }
  const { env, pulses } = useEnvironment()
  const matRef = useRef(null)
  const bgMeshRef = useRef(null)

  // Use EnvironmentBuilder state or fallback values
  const shaderKey = state?.currentConfig?.layers?.surface?.shader || 'veins'
  const surfaceConfig = state?.currentConfig?.layers?.surface || {
    material: { metalness: 0.1, roughness: 0.8, color: '#ffffff' },
    displacement: { scale: 0.1 },
    animation: { speed: 1.0 }
  }

  // Create material when shader changes
  useEffect(()=>{ let cancelled=false; (async()=>{
    const startTime = performance.now()
    logMaterial('create_start', 'GroundModeA', shaderKey)

    const mat = await createArenaMaterial(shaderKey)
    if(!cancelled){
      // Apply initial surface configuration
      if (mat instanceof THREE.ShaderMaterial) {
        const uniforms = mat.uniforms
        if (uniforms) {
          if (uniforms.uMetalness) uniforms.uMetalness.value = surfaceConfig.material.metalness
          if (uniforms.uRoughness) uniforms.uRoughness.value = surfaceConfig.material.roughness
          if (uniforms.uColor) uniforms.uColor.value = new THREE.Color(surfaceConfig.material.color)
          if (uniforms.uDisplacementScale) uniforms.uDisplacementScale.value = surfaceConfig.displacement.scale
          if (uniforms.uAnimationSpeed) uniforms.uAnimationSpeed.value = surfaceConfig.animation.speed
        }
      } else if (mat instanceof THREE.MeshStandardMaterial) {
        mat.metalness = surfaceConfig.material.metalness
        mat.roughness = surfaceConfig.material.roughness
        mat.color = new THREE.Color(surfaceConfig.material.color)
        if (surfaceConfig.displacement.enabled) {
          mat.displacementScale = surfaceConfig.displacement.scale
        }
      }
      matRef.current = mat;
      if(bgMeshRef.current) bgMeshRef.current.material = mat

      logMaterial('create_complete', 'GroundModeA', shaderKey, {
        duration: performance.now() - startTime,
        materialType: mat instanceof THREE.ShaderMaterial ? 'ShaderMaterial' : 'MeshStandardMaterial'
      })
    }
  })(); return ()=>{cancelled=true} }, [shaderKey])

  // Update material properties when surface config changes
  useEffect(() => {
    if (matRef.current) {
      logMaterial('property_update', 'GroundModeA', shaderKey, {
        metalness: surfaceConfig.material.metalness,
        roughness: surfaceConfig.material.roughness,
        color: surfaceConfig.material.color
      })

      if (matRef.current instanceof THREE.ShaderMaterial) {
        const uniforms = matRef.current.uniforms
        if (uniforms) {
          if (uniforms.uMetalness) uniforms.uMetalness.value = surfaceConfig.material.metalness
          if (uniforms.uRoughness) uniforms.uRoughness.value = surfaceConfig.material.roughness
          if (uniforms.uColor) uniforms.uColor.value = new THREE.Color(surfaceConfig.material.color)
          if (uniforms.uDisplacementScale) uniforms.uDisplacementScale.value = surfaceConfig.displacement.scale
          if (uniforms.uAnimationSpeed) uniforms.uAnimationSpeed.value = surfaceConfig.animation.speed
        }
      } else if (matRef.current instanceof THREE.MeshStandardMaterial) {
        matRef.current.metalness = surfaceConfig.material.metalness
        matRef.current.roughness = surfaceConfig.material.roughness
        matRef.current.color = new THREE.Color(surfaceConfig.material.color)
        if (surfaceConfig.displacement.enabled) {
          matRef.current.displacementScale = surfaceConfig.displacement.scale
        }
      }
    }
  }, [surfaceConfig.material.metalness, surfaceConfig.material.roughness, surfaceConfig.material.color, surfaceConfig.displacement.scale, surfaceConfig.displacement.enabled, surfaceConfig.animation.speed])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const u = matRef.current?.uniforms
    if (u) { if (u.uTime) u.uTime.value = t; if (u.time) u.time.value = t }
    if (matRef.current) {
      updateArenaMaterialWithEnv(matRef.current, env, pulses)
    }
  })
  return (
    <group>
      <mesh ref={bgMeshRef} rotation={[-Math.PI/2,0,0]} position={[0,-0.5,0]}>
        <planeGeometry args={[size*2, size*2, 1, 1]} />
        <meshBasicMaterial color={'#222'} />
      </mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]} visible={false}> {/* collision ground */}
        <planeGeometry args={[size, size, 1, 1]} />
        <meshStandardMaterial color={'#444'} />
      </mesh>
    </group>
  )
}

// Option C: Offscreen render target -> texture on visible plane
function GroundModeC() {
  const { state } = useEnvironmentBuilder()
  const [material, setMaterial] = useState(null)
  const { gl, size } = useThree()
  const rtRef = useRef(null)
  const [, setRtReady] = useState(0)
  const offScene = useMemo(()=> new THREE.Scene(), [])
  const offCamera = useMemo(()=> new THREE.OrthographicCamera(-1,1,1,-1,0.1,10), [])
  const offMeshRef = useRef(null)
  const { env, pulses } = useEnvironment()

  const shaderKey = state?.currentConfig?.layers?.surface?.shader || 'veins'
  // keep render target sized to canvas (create/dispose safely and cap size for performance)
  useEffect(()=>{
    const dpr = (gl && gl.getPixelRatio) ? gl.getPixelRatio() : (window.devicePixelRatio || 1)
    // Cap more aggressively for performance: max 1024 for better mobile support
    const maxCap = Math.min((gl && gl.capabilities && gl.capabilities.maxTextureSize) || 4096, 1024)
    const w = Math.min(maxCap, Math.max(256, Math.floor(size.width * dpr * 0.5))) // Scale down by 0.5 for efficiency
    const h = Math.min(maxCap, Math.max(256, Math.floor(size.height * dpr * 0.5)))
    // Dispose previous target if size changed
    try {
      if (rtRef.current) {
        const old = rtRef.current
        if (old.width !== w || old.height !== h) { old.dispose(); rtRef.current = null }
      }
    } catch (e) {}
    if (!rtRef.current) {
      const params = { depthBuffer:false, stencilBuffer:false, generateMipmaps:false, minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, format:THREE.RGBAFormat, type:THREE.UnsignedByteType }
      rtRef.current = new THREE.WebGLRenderTarget(w, h, params)
      // ensure texture doesn't try to use mipmaps / expensive encodings
      try { rtRef.current.texture.generateMipmaps = false } catch(e) {}
      setRtReady(n=>n+1)
    }
    return () => { /* keep until unmount or next effect run where we dispose conditional above */ }
  }, [size.width, size.height, gl])

  useEffect(()=>{ offCamera.position.set(0,0,2); offCamera.lookAt(0,0,0); offScene.background = null
    return () => {
      // cleanup any offScene mesh/materials
      try {
        if (offMeshRef.current) {
          offScene.remove(offMeshRef.current)
          offMeshRef.current.geometry?.dispose()
          if (offMeshRef.current.material?.dispose) offMeshRef.current.material.dispose()
          offMeshRef.current = null
        }
      } catch (e) {}
    }
  }, [offCamera, offScene])

  // Create material and setup offscreen rendering when shader changes
  useEffect(()=>{
    let cancelled=false
    ;(async()=>{
      const mat = await createSimpleThreeMaterial(shaderKey)
      if(cancelled) return
      // defensive: ensure uTime/time uniforms exist
      if(mat && mat.uniforms){ mat.uniforms.uTime = mat.uniforms.uTime || { value: 0 }; mat.uniforms.time = mat.uniforms.time || { value: 0 } }
      // replace previous offscreen mesh if any and dispose its material
      if(offMeshRef.current){ try { offScene.remove(offMeshRef.current); offMeshRef.current.geometry?.dispose(); if(offMeshRef.current.material?.dispose) offMeshRef.current.material.dispose(); } catch(e){} }
      if(mat){ const m = new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat); offScene.add(m); offMeshRef.current = m }
      setMaterial(mat)
    })()
    return ()=>{ cancelled=true }
  }, [shaderKey, offScene])

  // Update material properties when surface config changes
  useEffect(() => {
    if (material) {
      if (material instanceof THREE.ShaderMaterial) {
        const uniforms = material.uniforms
        if (uniforms) {
          if (uniforms.uMetalness) uniforms.uMetalness.value = state.currentConfig.layers.surface.material.metalness
          if (uniforms.uRoughness) uniforms.uRoughness.value = state.currentConfig.layers.surface.material.roughness
          if (uniforms.uColor) uniforms.uColor.value = new THREE.Color(state.currentConfig.layers.surface.material.color)
          if (uniforms.uDisplacementScale) uniforms.uDisplacementScale.value = state.currentConfig.layers.surface.displacement.scale
          if (uniforms.uAnimationSpeed) uniforms.uAnimationSpeed.value = state.currentConfig.layers.surface.animation.speed
        }
      } else if (material instanceof THREE.MeshStandardMaterial) {
        material.metalness = state.currentConfig.layers.surface.material.metalness
        material.roughness = state.currentConfig.layers.surface.material.roughness
        material.color = new THREE.Color(state.currentConfig.layers.surface.material.color)
        if (state.currentConfig.layers.surface.displacement.enabled) {
          material.displacementScale = state.currentConfig.layers.surface.displacement.scale
        }
      }
    }
  }, [material, state.currentConfig.layers.surface.material.metalness, state.currentConfig.layers.surface.material.roughness, state.currentConfig.layers.surface.material.color, state.currentConfig.layers.surface.displacement.scale, state.currentConfig.layers.surface.displacement.enabled, state.currentConfig.layers.surface.animation.speed])

  useFrame(({ gl, clock }) => {
    const t = clock.getElapsedTime()
    if(material?.uniforms){ if(material.uniforms.uTime) material.uniforms.uTime.value = t; if(material.uniforms.time) material.uniforms.time.value = t }
    if (material) updateArenaMaterialWithEnv(material, env, pulses)
    // defensive: only render to target if it exists and material is ready
    if (rtRef.current && material) {
      try {
        gl.setRenderTarget(rtRef.current)
        gl.clear()
        gl.render(offScene, offCamera)
      } catch (e) {
        // if rendering fails, avoid further attempts; log for debug
        // eslint-disable-next-line no-console
        console.warn('Offscreen render failed', e)
      } finally {
        gl.setRenderTarget(null)
      }
    }
  })
  return (
    <>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]}> {/* visible textured arena */}
        <planeGeometry args={[200,200,1,1]} />
        <meshStandardMaterial map={rtRef.current ? rtRef.current.texture : null} color={'#ffffff'} metalness={0.1} roughness={0.8} />
      </mesh>
      {/* Debug: directly show a mesh using the compiled material so shader problems are obvious */}
      {material && (
        <mesh position={[0,0.3,0]} rotation={[0,0,0]}> 
          <boxGeometry args={[8,0.6,8]} />
          <primitive object={material} attach="material" />
        </mesh>
      )}
    </>
  )
}

// Option B (placeholder): Adapt shader to stripe slice look (no full raymarch adaptation yet)
function GroundModeB() {
  const { state } = useEnvironmentBuilder()
  const [mat, setMat] = useState(null)
  const { env, pulses } = useEnvironment()

  const shaderKey = state?.currentConfig?.layers?.surface?.shader || 'veins'
  const surfaceConfig = state?.currentConfig?.layers?.surface || {
    material: { metalness: 0.1, roughness: 0.8, color: '#ffffff' },
    displacement: { scale: 0.1 },
    animation: { speed: 1.0 }
  }
  // Create and modify material when shader changes
  useEffect(()=>{ let cancelled=false; (async()=>{ const material = await createSimpleThreeMaterial(shaderKey); if(cancelled) return; 
    try {
      if(material.fragmentShader){
        // Ensure vPos available
        if(!/varying\s+vec3\s+vPos/.test(material.vertexShader)) {
          material.vertexShader = material.vertexShader.replace(/gl_Position\s*=\s*.+?;/, 'vPos = position; $&')
          material.vertexShader = 'varying vec3 vPos;\n' + material.vertexShader
        }
        if(!/varying\s+vec3\s+vPos/.test(material.fragmentShader)) {
          material.fragmentShader = 'varying vec3 vPos;\n' + material.fragmentShader
        }
        // Stripe slice coloration injection (placeholder slice sampling)
        const injectPattern = /gl_FragColor\s*=\s*vec4\(([^;]+)\);/;
        material.fragmentShader = material.fragmentShader.replace(injectPattern, 'vec3 baseCol = $1; float g = smoothstep(0.0,1.0,mod(vPos.x*0.07+uTime*0.3,1.0)); float h = smoothstep(0.0,1.0,mod(vPos.z*0.07+uTime*0.22,1.0)); vec3 slice = mix(baseCol*0.5, baseCol*1.25, g*h); gl_FragColor = vec4(slice,1.0);')
        material.needsUpdate = true
      }
    } catch (e) {
      console.error('Failed to modify shader in GroundModeB:', e)
      // Use unmodified material
    }
    setMat(material) })(); return ()=>{cancelled=true} }, [shaderKey])

  // Update material properties when surface config changes
  useEffect(() => {
    if (mat) {
      if (mat instanceof THREE.ShaderMaterial) {
        const uniforms = mat.uniforms
        if (uniforms) {
          if (uniforms.uMetalness) uniforms.uMetalness.value = surfaceConfig.material.metalness
          if (uniforms.uRoughness) uniforms.uRoughness.value = surfaceConfig.material.roughness
          if (uniforms.uColor) uniforms.uColor.value = new THREE.Color(surfaceConfig.material.color)
          if (uniforms.uDisplacementScale) uniforms.uDisplacementScale.value = surfaceConfig.displacement.scale
          if (uniforms.uAnimationSpeed) uniforms.uAnimationSpeed.value = surfaceConfig.animation.speed
        }
      } else if (mat instanceof THREE.MeshStandardMaterial) {
        mat.metalness = surfaceConfig.material.metalness
        mat.roughness = surfaceConfig.material.roughness
        mat.color = new THREE.Color(surfaceConfig.material.color)
        if (surfaceConfig.displacement.enabled) {
          mat.displacementScale = surfaceConfig.displacement.scale
        }
      }
    }
  }, [mat, surfaceConfig.material.metalness, surfaceConfig.material.roughness, surfaceConfig.material.color, surfaceConfig.displacement.scale, surfaceConfig.displacement.enabled, surfaceConfig.animation.speed])
  useFrame(({ clock }) => { const t = clock.getElapsedTime(); if(mat?.uniforms){ if(mat.uniforms.uTime) mat.uniforms.uTime.value = t; if(mat.uniforms.time) mat.uniforms.time.value = t } if (mat) updateArenaMaterialWithEnv(mat, env, pulses) })
  return mat ? (
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]}>
      <planeGeometry args={[200,200,1,1]} />
      <primitive object={mat} attach="material" />
    </mesh>
  ) : null
}

// Scene overlay: boundary box & mode selector UI ---------------------------------
function Boundary() {
  const grp = useRef()
  const limit = BOUNDARY_LIMIT
  const size = limit * 2
  return (
    <group ref={grp}>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(size, 0.01, size)]} />
        <lineBasicMaterial color={'#33ffaa'} linewidth={1} />
      </lineSegments>
    </group>
  )
}

// Context Loss Handler Component
function ContextLossHandler() {
  const { gl } = useThree()

  useEffect(() => {
    const handleContextLost = (event) => {
      event.preventDefault()
      logWebGL('error', 'Three.js Context Lost', {
        renderer: gl.info?.render,
        timestamp: performance.now()
      })
    }

    const handleContextRestored = (event) => {
      logWebGL('info', 'Three.js Context Restored', {
        renderer: gl.info?.render,
        timestamp: performance.now()
      })
    }

    const canvas = gl.domElement
    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', handleContextRestored)

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
    }
  }, [gl])

  return null
}

function SceneCore({ mode }) {
  return (
    <group>
      <SceneEnvironment skipLighting={true} />
      {mode === 'A' && <GroundModeA />}
      {mode === 'B' && <GroundModeB />}
      {mode === 'C' && <GroundModeC />}
      <Boundary />
    </group>
  )
}

export default function SceneViewer() {
  const [mode, setMode] = useState('A') // default to A (simple) to avoid potential issues
  const [playerPos] = useState([0,0.5,0])
  const bulletsRef = useRef([])
  const onShoot = (origin, dir) => { bulletsRef.current.push({ pos: origin.clone(), dir: new THREE.Vector3(...dir), t: 0 }) }
  const BulletPool = () => {
    useFrame((_, dt) => {
      bulletsRef.current.forEach(b => { b.pos.addScaledVector(b.dir, dt*38); b.t += dt })
      bulletsRef.current = bulletsRef.current.filter(b => b.t < 2.5)
    })
    return (
      <group>
        {bulletsRef.current.map((b,i)=>(
          <mesh key={i} position={b.pos}>
            <sphereGeometry args={[0.25,16,16]} />
            <meshBasicMaterial color={'#ffdd77'} />
          </mesh>
        ))}
      </group>
    )
  }
  return (
    <>
      <div style={{width:'100%',height:'calc(100vh - 80px)',position:'relative', display: 'flex'}}>
        <EnvironmentBuilder />
        <div style={{flex: 1}}>
          <Canvas
            shadows
            camera={{ position:[0,10,20], fov:52 }}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: "high-performance",
              failIfMajorPerformanceCaveat: false,
              preserveDrawingBuffer: true
            }}
            style={{ background: '#333', width: '100%', height: '100%' }}
            onCreated={({ gl }) => {
              logWebGL('info', 'Canvas created', { renderer: gl.info.render })
            }}
            onError={(error) => {
              logWebGL('error', 'Canvas error', { error: error.message })
            }}
          >
            <ContextLossHandler />
            <EnvironmentRenderer />
            <SceneCore mode={mode} />
            <OrbitControls makeDefault enableDamping dampingFactor={0.07} />
            <Player position={playerPos} onShoot={onShoot} isPaused={false} autoFire={false} setPositionRef={()=>{}} heroName={'Dokta'} heroRenderMode={'model'} />
            <BulletPool />
            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
              <GizmoViewport axisColors={["#FF3653", "#8ADB00", "#2C8FFF"]} labelColor="white" />
            </GizmoHelper>
          </Canvas>
        </div>
      </div>
      <DebugPanel />
    </>
  )
}
