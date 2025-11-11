import React, { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import ConeBoss from '../entities/ConeBoss.jsx'
import TriangleBoss from '../entities/TriangleBoss.jsx'
import PipeBoss from '../entities/PipeBoss.jsx'
import ClusterBoss from '../entities/ClusterBoss.jsx'
import Minion from '../entities/Minion.jsx'
import StarBoss from '../entities/StarBoss.jsx'
import { PathogenFromSpec } from '../characters/factory/PathogenFactory'

export default function SpecialBossViewer(){
  const [entity, setEntity] = useState('ConeBoss')
  const [visualScale, setVisualScale] = useState(1)
  const [animate, setAnimate] = useState(false)
  const playerRef = useRef({ current: { x:0,y:0,z:0 } })

  const entityProps = useMemo(()=>({ id: 'preview', pos: [0,0.5,0], playerPosRef: playerRef.current, onDie: ()=>{}, health: 10, isPaused: !animate, spawnHeight: 0 }), [animate])
  const [renderSpec, setRenderSpec] = useState(true)

  function makeSpecFor(entityName){
    // lightweight specs used only for viewer preview; mirror AvatarTuner presets roughly
    switch(entityName){
      // Intentionally do NOT return a spec for ConeBoss so the viewer always renders its procedural entity.
      case 'ConeBoss': return null;
      case 'TriangleBoss': return { id:'influenza', seed:2, baseShape:'sphere', radius:1.2, height:1.2, detail:1, spikeCount:36, spikeLength:0.42, spikeRadius:0.08, spikeStyle:'disk', baseColor:'#16a34a', spikeColor:'#86efac', nodeColor:'#bbf7d0', emissive:'#16a34a', emissiveIntensityCore:0.22 };
      case 'PipeBoss': return { id:'hepac', seed:3, baseShape:'snake', radius:1.1, detail:1, spikeCount:40, spikeLength:0.36, spikeRadius:0.12, spikeStyle:'block', baseColor:'#bfdbfe', spikeColor:'#fa1515ff', emissive:'#93c5fd', emissiveIntensityCore:0.18 };
      case 'ClusterBoss': return { id:'rotavirus', seed:4, baseShape:'sphere', radius:1.25, detail:2, spikeCount:28, spikeLength:0.5, spikeStyle:'inverted', baseColor:'#1e40af', spikeColor:'#93c5fd', emissive:'#60a5fa', emissiveIntensityCore:0.25 };
      case 'Minion': return { id:'adeno', seed:5, baseShape:'icosahedron', radius:1.0, detail:2, spikeCount:24, spikeLength:0.9, spikeStyle:'tentacle', baseColor:'#60a5fa', spikeColor:'#60a5fa', emissive:'#60a5fa', emissiveIntensityCore:0.2 };
      case 'StarBoss': return { id:'papilloma', seed:6, baseShape:'sphere', radius:1.15, detail:1, spikeCount:36, spikeLength:0.44, spikeStyle:'block', baseColor:'#fde68a', spikeColor:'#f59e0b', emissive:'#fbbf24', emissiveIntensityCore:0.22 };
      default: return null
    }
  }

  return (
    <div style={{display:'grid',gridTemplateColumns:'300px 1fr',height:'100vh',minWidth:720}}>
      <aside style={{padding:16,background:'#07111E',color:'#E6F0FF'}}>
        <h2>Special Boss Viewer</h2>
        <p style={{opacity:0.85}}>This viewer loads the entities' procedural meshes directly (no AvatarTuner overrides).</p>
        <label style={{display:'block',marginTop:8}}>Entity</label>
        <select value={entity} onChange={e=>setEntity(e.target.value)}>
          <option>ConeBoss</option>
          <option>TriangleBoss</option>
          <option>PipeBoss</option>
          <option>ClusterBoss</option>
          <option>Minion</option>
          <option>StarBoss</option>
        </select>

        <label style={{display:'block',marginTop:12}}>Scale</label>
        <input type="range" min={0.4} max={2.5} step={0.1} value={visualScale} onChange={e=>setVisualScale(Number(e.target.value))} />
        <div style={{marginTop:6}}>{visualScale.toFixed(1)}x</div>

        <label style={{display:'block',marginTop:12}}>
          <input type="checkbox" checked={animate} onChange={e=>setAnimate(e.target.checked)} /> Animate (enable entity behavior)
        </label>

        <div style={{marginTop:16}}>
          <Link to="/">Back to Avatar Tuner</Link>
        </div>
      </aside>

      <main style={{background:'#07111E'}}>
        <Canvas camera={{ position: [0, 2, 4], fov: 50 }}>
          <color attach="background" args={["#07111E"]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[3,6,3]} intensity={0.9} />
          <Grid args={[20,20]} position={[0,0,0]} />
          {/* Render selected entity at center. ConeBoss is always rendered as its procedural entity. */}
          {entity === 'ConeBoss' ? (
            <ConeBoss {...entityProps} visualScale={visualScale} />
          ) : renderSpec ? (
            (() => {
              const s = makeSpecFor(entity)
              if (!s) return null
              return <group position={[0,0.15,0]} scale={[visualScale, visualScale, visualScale]}>
                <PathogenFromSpec spec={s} />
              </group>
            })()
          ) : (
            <>
              {entity === 'TriangleBoss' && <TriangleBoss {...entityProps} speedScale={1} />}
              {entity === 'PipeBoss' && <PipeBoss {...entityProps} visualScale={visualScale} />}
              {entity === 'ClusterBoss' && <ClusterBoss {...entityProps} visualScale={visualScale} />}
              {entity === 'Minion' && <Minion {...entityProps} visualScale={visualScale} />}
              {entity === 'StarBoss' && <StarBoss spec={null} position={[0,0.5,0]} />}
            </>
          )}

          <OrbitControls enablePan={false} autoRotate={false} />
        </Canvas>
      </main>
    </div>
  )
}
