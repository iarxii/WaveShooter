import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Player from '../entities/Player.jsx'
import { BOUNDARY_LIMIT } from '../game/constants.js'
import { compileSculptCode } from '../environments/ShaderParkCompiler'
import { useEnvironment } from '../contexts/EnvironmentContext'
import PlasmaCode from '../environments/sample_shaders/PlasmaSphere.js?raw'
import PlanetoidCode from '../environments/sample_shaders/BumpyPlanetoid.js?raw'
import VoidCode from '../environments/sample_shaders/VoidMaterial.js?raw'
import TurbulenceCode from '../environments/sample_shaders/Turbulence.js?raw'

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

// Option A: Background full-screen quad (shader) + separate collision ground
function GroundModeA({ shaderKey }) {
  const { size } = { size: 200 }
  const code = useMemo(()=> selectCodeByKey(shaderKey), [shaderKey])
  const matRef = useRef(null)
  const bgMeshRef = useRef(null)
  useEffect(()=>{ let cancelled=false; (async()=>{ const mat = await compileSculptCode(code, {}); if(!cancelled){ matRef.current = mat; if(bgMeshRef.current) bgMeshRef.current.material = mat } })(); return ()=>{cancelled=true} }, [code])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const u = matRef.current?.uniforms
    if (u) { if (u.uTime) u.uTime.value = t; if (u.time) u.time.value = t }
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
function GroundModeC({ shaderKey }) {
  const code = useMemo(()=> selectCodeByKey(shaderKey), [shaderKey])
  const [material, setMaterial] = useState(null)
  const rt = useMemo(()=> new THREE.WebGLRenderTarget(512,512,{ depthBuffer:false }), [])
  const offScene = useMemo(()=> new THREE.Scene(), [])
  const offCamera = useMemo(()=> new THREE.OrthographicCamera(-1,1,1,-1,0.1,10), [])
  const offMeshRef = useRef(null)
  useEffect(()=>{ offCamera.position.set(0,0,2); offCamera.lookAt(0,0,0) }, [offCamera])
  useEffect(()=>{ let cancelled=false; (async()=>{ const mat = await compileSculptCode(code, {}); if(cancelled) return; mat.uniforms.uTime = mat.uniforms.uTime || { value:0 }; setMaterial(mat); const m = new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat); offScene.add(m); offMeshRef.current = m })(); return ()=>{ cancelled=true } }, [code, offScene])
  useFrame(({ gl, clock }) => { const t = clock.getElapsedTime(); if(material?.uniforms){ if(material.uniforms.uTime) material.uniforms.uTime.value = t; if(material.uniforms.time) material.uniforms.time.value = t } gl.setRenderTarget(rt); gl.clear(); gl.render(offScene, offCamera); gl.setRenderTarget(null) })
  return (
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]}>
      <planeGeometry args={[200,200,1,1]} />
      <meshStandardMaterial map={rt.texture} color={'#ffffff'} metalness={0.1} roughness={0.8} />
    </mesh>
  )
}

// Option B (placeholder): Adapt shader to stripe slice look (no full raymarch adaptation yet)
function GroundModeB({ shaderKey }) {
  const code = useMemo(()=> selectCodeByKey(shaderKey), [shaderKey])
  const [mat, setMat] = useState(null)
  useEffect(()=>{ let cancelled=false; (async()=>{ const material = await compileSculptCode(code, {}); if(cancelled) return; if(material.fragmentShader){
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
    setMat(material) })(); return ()=>{cancelled=true} }, [code])
  useFrame(({ clock }) => { const t = clock.getElapsedTime(); if(mat?.uniforms){ if(mat.uniforms.uTime) mat.uniforms.uTime.value = t; if(mat.uniforms.time) mat.uniforms.time.value = t } })
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

function SceneCore({ mode, shaderKey }) {
  return (
    <group>
      <ambientLight intensity={0.6} />
      <directionalLight position={[30,50,20]} intensity={0.9} />
      {mode === 'A' && <GroundModeA shaderKey={shaderKey} />}
      {mode === 'B' && <GroundModeB shaderKey={shaderKey} />}
      {mode === 'C' && <GroundModeC shaderKey={shaderKey} />}
      <Boundary />
    </group>
  )
}

export default function SceneViewer() {
  const [mode, setMode] = useState('C') // default to C (offscreen) as recommended
  const [playerPos] = useState([0,0.5,0])
  const { env } = useEnvironment()
  const [followEnv, setFollowEnv] = useState(true)
  const [shaderKey, setShaderKey] = useState(() => ENV_SHADER_MAP[env.id] || 'planetoid')
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
      <div style={{position:'absolute',top:8,left:8,zIndex:20,background:'rgba(0,0,0,0.5)',padding:'8px 12px',borderRadius:8,fontSize:14,color:'#fff',backdropFilter:'blur(4px)'}}>
        <div style={{fontWeight:600,marginBottom:6}}>Scene Viewer</div>
        <label style={{display:'block',marginBottom:4}}>Render Mode:</label>
        <select value={mode} onChange={e=> setMode(e.target.value)} style={{padding:'4px 6px',borderRadius:4}}>
          <option value='A'>A - Background Quad</option>
          <option value='B'>B - Slice Adapt (Placeholder)</option>
          <option value='C'>C - Offscreen Texture</option>
        </select>
        <div style={{marginTop:8,fontSize:12,lineHeight:'16px',maxWidth:240}}>
          {mode==='A' && 'Full-screen quad shader + separate collision plane.'}
          {mode==='B' && 'Placeholder stripe adaptation simulating slice sampling.'}
          {mode==='C' && 'Offscreen ShaderPark render -> textured arena plane.'}
        </div>
        <hr style={{margin:'10px 0',opacity:0.3}} />
        <label style={{display:'block',marginBottom:4}}>Shader Sample:</label>
        <select disabled={followEnv} value={shaderKey} onChange={e=> { setShaderKey(e.target.value); }} style={{padding:'4px 6px',borderRadius:4,minWidth:160}}>
          <option value='plasma'>Plasma Sphere</option>
          <option value='planetoid'>Bumpy Planetoid</option>
          <option value='void'>Void Material</option>
          <option value='turbulence'>Turbulence</option>
        </select>
        <label style={{display:'flex',alignItems:'center',gap:6,marginTop:6,fontSize:12}}>
          <input type='checkbox' checked={followEnv} onChange={e=> setFollowEnv(e.target.checked)} /> Follow Environment
        </label>
        <div style={{marginTop:6,fontSize:11,opacity:0.75,maxWidth:240}}>
          {followEnv ? 'Linked: environment changes will switch shader.' : 'Manual: select any shader sample.'}
        </div>
      </div>
      <Canvas shadows camera={{ position:[0,48,48], fov:52 }}>
        <SceneCore mode={mode} shaderKey={shaderKey} />
        <Player position={playerPos} onShoot={onShoot} isPaused={false} autoFire={false} setPositionRef={()=>{}} heroName={'Dokta'} heroRenderMode={'model'} />
        <BulletPool />
      </Canvas>
    </div>
  )
}
