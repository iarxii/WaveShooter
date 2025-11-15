import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei'
import ShaderParkLogOverlay from '../components/ShaderPark/ShaderParkLogOverlay'
import * as THREE from 'three'
import Player from '../entities/Player.jsx'
import { SceneEnvironment } from '../contexts/EnvironmentContext'
import { BOUNDARY_LIMIT } from '../game/constants.js'
import { compileSculptCode } from '../environments/ShaderPark/ShaderParkCompiler'
import { useEnvironment } from '../contexts/EnvironmentContext'
import PlasmaCode from '../environments/ShaderPark/sample_shaders/PlasmaSphere.js?raw'
import PlanetoidCode from '../environments/ShaderPark/sample_shaders/BumpyPlanetoid.js?raw'
import VoidCode from '../environments/ShaderPark/sample_shaders/VoidMaterial.js?raw'
import TurbulenceCode from '../environments/ShaderPark/sample_shaders/Turbulence.js?raw'
import { createArenaMaterial, updateArenaMaterialWithEnv } from '../environments/arenaMaterial'

// Mode helpers --------------------------------------------------------------
// Mapping from environment id to default shader sample
const ENV_SHADER_MAP = {
  proc_hazard_hospital: 'plasma',
  proc_hazard_lab: 'planetoid',
  proc_blue_sky: 'void',
  proc_darkmode: 'turbulence',
  hospital: 'planetoid',
  surgery: 'planetoid',
  orchard: 'planetoid'
}

const SHADER_SOURCES = {
  plasma: PlasmaCode,
  planetoid: PlanetoidCode,
  void: VoidCode,
  turbulence: TurbulenceCode
}

function selectCodeByKey(key) {
  return SHADER_SOURCES[key] || PlanetoidCode
}

// Simple Three.js ShaderMaterial for fallback / ThreeJS pipeline
function createSimpleThreeMaterial(variant) {
  // wrapper: create the richer arena material for a named variant
  return createArenaMaterial(variant)
}

// Option A: Background full-screen quad (shader) + separate collision ground
function GroundModeA({ shaderKey, engine }) {
  const { size } = { size: 200 }
  const { env, pulses } = useEnvironment()
  const code = useMemo(()=> selectCodeByKey(shaderKey), [shaderKey])
  const matRef = useRef(null)
  const bgMeshRef = useRef(null)
  useEffect(()=>{ let cancelled=false; (async()=>{
    if (engine === 'shaderpark') {
      const mat = await compileSculptCode(code, {});
      if(!cancelled){ matRef.current = mat; if(bgMeshRef.current) bgMeshRef.current.material = mat }
    } else {
      const mat = createSimpleThreeMaterial(shaderKey)
      if(!cancelled){ matRef.current = mat; if(bgMeshRef.current) bgMeshRef.current.material = mat }
    }
  })(); return ()=>{cancelled=true} }, [code, engine])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const u = matRef.current?.uniforms
    if (u) { if (u.uTime) u.uTime.value = t; if (u.time) u.time.value = t }
    if (engine !== 'shaderpark' && matRef.current) {
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
function GroundModeC({ shaderKey, engine }) {
  const code = useMemo(()=> selectCodeByKey(shaderKey), [shaderKey])
  const [material, setMaterial] = useState(null)
  const { gl, size } = useThree()
  const rtRef = useRef(null)
  const [, setRtReady] = useState(0)
  const offScene = useMemo(()=> new THREE.Scene(), [])
  const offCamera = useMemo(()=> new THREE.OrthographicCamera(-1,1,1,-1,0.1,10), [])
  const offMeshRef = useRef(null)
  const { env, pulses } = useEnvironment()
  // keep render target sized to canvas (create/dispose safely and cap size)
  useEffect(()=>{
    const dpr = (gl && gl.getPixelRatio) ? gl.getPixelRatio() : (window.devicePixelRatio || 1)
    const maxCap = Math.min((gl && gl.capabilities && gl.capabilities.maxTextureSize) || 4096, 2048)
    const w = Math.min(maxCap, Math.max(256, Math.floor(size.width * dpr)))
    const h = Math.min(maxCap, Math.max(256, Math.floor(size.height * dpr)))
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

  useEffect(()=>{
    let cancelled=false
    ;(async()=>{
      let mat = null
      if (engine === 'shaderpark') mat = await compileSculptCode(code, {})
      else mat = createSimpleThreeMaterial(shaderKey)
      if(cancelled) return
      // defensive: ensure uTime/time uniforms exist
      if(mat && mat.uniforms){ mat.uniforms.uTime = mat.uniforms.uTime || { value: 0 }; mat.uniforms.time = mat.uniforms.time || { value: 0 } }
      // replace previous offscreen mesh if any and dispose its material
      if(offMeshRef.current){ try { offScene.remove(offMeshRef.current); offMeshRef.current.geometry?.dispose(); if(offMeshRef.current.material?.dispose) offMeshRef.current.material.dispose(); } catch(e){} }
      if(mat){ const m = new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat); offScene.add(m); offMeshRef.current = m }
      setMaterial(mat)
    })()
    return ()=>{ cancelled=true }
  }, [code, offScene, engine])

  useFrame(({ gl, clock }) => {
    const t = clock.getElapsedTime()
    if(material?.uniforms){ if(material.uniforms.uTime) material.uniforms.uTime.value = t; if(material.uniforms.time) material.uniforms.time.value = t }
    if (engine !== 'shaderpark' && material) updateArenaMaterialWithEnv(material, env, pulses)
    // defensive: only render to target if it exists
    if (rtRef.current) {
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
function GroundModeB({ shaderKey, engine }) {
  const code = useMemo(()=> selectCodeByKey(shaderKey), [shaderKey])
  const [mat, setMat] = useState(null)
  const { env, pulses } = useEnvironment()
  useEffect(()=>{ let cancelled=false; (async()=>{ const material = (engine === 'shaderpark') ? await compileSculptCode(code, {}) : createSimpleThreeMaterial(shaderKey); if(cancelled) return; if(material.fragmentShader){
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
    setMat(material) })(); return ()=>{cancelled=true} }, [code, engine])
  useFrame(({ clock }) => { const t = clock.getElapsedTime(); if(mat?.uniforms){ if(mat.uniforms.uTime) mat.uniforms.uTime.value = t; if(mat.uniforms.time) mat.uniforms.time.value = t } if (engine !== 'shaderpark' && mat) updateArenaMaterialWithEnv(mat, env, pulses) })
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

function SceneCore({ mode, shaderKey, engine }) {
  return (
    <group>
      <SceneEnvironment />
      <ambientLight intensity={0.6} />
      <directionalLight position={[30,50,20]} intensity={0.9} />
      {mode === 'A' && <GroundModeA shaderKey={shaderKey} engine={engine} />}
      {mode === 'B' && <GroundModeB shaderKey={shaderKey} engine={engine} />}
      {mode === 'C' && <GroundModeC shaderKey={shaderKey} engine={engine} />}
      <Boundary />
    </group>
  )
}

export default function SceneViewer() {
  const [mode, setMode] = useState('C') // default to C (offscreen) as recommended
  const [playerPos] = useState([0,0.5,0])
  const { env } = useEnvironment()
  const [followEnv, setFollowEnv] = useState(true)
  const [engine, setEngine] = useState(() => {
    try { return localStorage.getItem('env_engine') || 'three' } catch (e) { return 'three' }
  }) // 'shaderpark' or 'three'
  useEffect(() => { try { localStorage.setItem('env_engine', engine) } catch (e) {} }, [engine])
  useEffect(() => { try { window.dispatchEvent(new CustomEvent('env_engine_changed', { detail: engine })) } catch (e) {} }, [engine])
  const [shaderKey, setShaderKey] = useState(() => {
    try {
      return localStorage.getItem('env_shader') || ENV_SHADER_MAP[env.id] || 'planetoid'
    } catch (e) { return ENV_SHADER_MAP[env.id] || 'planetoid' }
  })
  // Listen to global shader changes from the NavBar or other UI
  useEffect(() => {
    const onChange = (ev) => { try { const v = ev?.detail || localStorage.getItem('env_shader'); if (v) { setShaderKey(v); setFollowEnv(false) } } catch(e){} }
    const onStorage = (ev) => { if (ev.key === 'env_shader') { setShaderKey(ev.newValue || ENV_SHADER_MAP[env.id] || 'planetoid'); setFollowEnv(false) } }
    window.addEventListener('env_shader_changed', onChange)
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener('env_shader_changed', onChange); window.removeEventListener('storage', onStorage) }
  }, [])
  // Update shader when environment changes if follow enabled
  useEffect(()=> { if(followEnv) setShaderKey(ENV_SHADER_MAP[env.id] || 'planetoid') }, [env.id, followEnv])
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
    <div style={{width:'100%',height:'100vh',position:'relative'}}>
      <ShaderParkLogOverlay />
      <div style={{position:'absolute',top:100,left:8,zIndex:20,background:'rgba(0,0,0,0.5)',padding:'8px 12px',borderRadius:8,fontSize:14,color:'#fff',backdropFilter:'blur(4px)'}}>
        <div style={{fontWeight:600,marginBottom:6}}>Scene Viewer</div>
        <label style={{display:'block',marginBottom:4}}>Render Mode:</label>
        <select value={mode} onChange={e=> setMode(e.target.value)} style={{padding:'4px 6px',borderRadius:4}}>
          <option value='A'>A - Background Quad</option>
          <option value='B'>B - Slice Adapt (Placeholder)</option>
          <option value='C'>C - Offscreen Texture</option>
        </select>
        <div style={{marginTop:8,fontSize:12,lineHeight:'16px',maxWidth:240}}>
            {mode==='A' && (engine==='shaderpark' ? 'Full-screen ShaderPark quad + separate collision plane.' : 'Full-screen ThreeJS ShaderMaterial quad + separate collision plane.')}
            {mode==='B' && (engine==='shaderpark' ? 'Placeholder ShaderPark slice adaptation.' : 'Placeholder ThreeJS slice adaptation.')}
            {mode==='C' && (engine==='shaderpark' ? 'Offscreen ShaderPark render -> textured arena plane.' : 'Offscreen ThreeJS ShaderMaterial render -> textured arena plane.')}
        </div>
          <div style={{marginTop:8}}>
            <label style={{display:'block',marginBottom:4}}>Engine:</label>
            <select value={engine} onChange={e=> setEngine(e.target.value)} style={{padding:'4px 6px',borderRadius:4}}>
              <option value='shaderpark'>ShaderPark pipeline</option>
              <option value='three'>Three.js ShaderMaterial</option>
            </select>
          </div>
        <hr style={{margin:'10px 0',opacity:0.3}} />
        <label style={{display:'block',marginBottom:4}}>Shader Sample:</label>
        <select disabled={followEnv} value={shaderKey} onChange={e=> { setShaderKey(e.target.value); }} style={{padding:'4px 6px',borderRadius:4,minWidth:160}}>
          <option value='plasma'>Plasma Sphere</option>
          <option value='planetoid'>Bumpy Planetoid</option>
          <option value='void'>Void Material</option>
          <option value='turbulence'>Turbulence</option>
          <option value='veins'>Veins (Three.js)</option>
          <option value='infection'>Infection Stain (Three.js)</option>
          <option value='grid'>Containment Grid (Three.js)</option>
          <option value='bioelectric'>Bioelectric Veins (Three.js)</option>
        </select>
        <label style={{display:'flex',alignItems:'center',gap:6,marginTop:6,fontSize:12}}>
          <input type='checkbox' checked={followEnv} onChange={e=> setFollowEnv(e.target.checked)} /> Follow Environment
        </label>
        <div style={{marginTop:6,fontSize:11,opacity:0.75,maxWidth:240}}>
          {followEnv ? 'Linked: environment changes will switch shader.' : 'Manual: select any shader sample.'}
        </div>
      </div>
      <Canvas shadows camera={{ position:[0,48,48], fov:52 }}>
        <SceneCore mode={mode} shaderKey={shaderKey} engine={engine} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.07} />
        <Player position={playerPos} onShoot={onShoot} isPaused={false} autoFire={false} setPositionRef={()=>{}} heroName={'Dokta'} heroRenderMode={'model'} />
        <BulletPool />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={["#FF3653", "#8ADB00", "#2C8FFF"]} labelColor="white" />
        </GizmoHelper>
      </Canvas>
    </div>
  )
}
