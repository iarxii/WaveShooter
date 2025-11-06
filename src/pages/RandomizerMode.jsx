// src/pages/RandomizerMode.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Html } from '@react-three/drei'
import { PathogenFromSpec } from '../characters/factory/PathogenFactory'

function randInt(min, max){ return Math.floor(min + Math.random()*(max-min+1)) }
function rand(min, max){ return min + Math.random()*(max-min) }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)] }

// Curated harmonious palettes (base/spike share hue; nodes/arcs are accents)
const PALETTES = [
  { base:'#B5764C', spike:'#B5764C', node:'#FFD24A', arc:'#FFE9A3', emissive:'#B0774F' },
  { base:'#6AB7FF', spike:'#6AB7FF', node:'#FFE08A', arc:'#FFEBCD', emissive:'#5AA7EF' },
  { base:'#FF7AB6', spike:'#FF7AB6', node:'#FFD1E8', arc:'#FFF0F6', emissive:'#F564A5' },
  { base:'#8BD17C', spike:'#8BD17C', node:'#EAF8D5', arc:'#FFF2C1', emissive:'#76C166' },
  { base:'#C9A6FF', spike:'#C9A6FF', node:'#FFE08A', arc:'#FFEBCD', emissive:'#B38BFA' },
  { base:'#FFB86B', spike:'#FFB86B', node:'#FFF0C2', arc:'#FFE5A0', emissive:'#F2A65A' },
];

function pickPalette(){
  const p = pick(PALETTES);
  return { baseColor:p.base, spikeColor:p.spike, nodeColor:p.node, arcColor:p.arc, emissive:p.emissive };
}

function randomSpec(i=0){
  const id = `rnd_${Date.now().toString(36)}_${i}`
  const baseShapes = ['icosahedron','sphere','triPrism','hexPrism','cylinder','capsule']
  const spikeStyles = ['cone','inverted','disk','block','tentacle']
  const palette = pickPalette()
  return {
    id,
    seed: Math.floor(Math.random()*1e9),
    baseShape: pick(baseShapes),
    radius: 1.0,
    height: rand(1.2, 2.4),
    scaleX: rand(0.75, 1.8),
    scaleY: rand(0.75, 2.2),
    // Force minimal detail for hard-edged shapes regardless of downstream LOD
    detail: 0,
    // Shape-aware spike and style choices
    spikeStyle: pick(spikeStyles),
    spikeCount: 0, // set below
    spikeLength: 0, // set below
    spikeRadius: 0, // set below
    spikeBaseShift: rand(-0.28, 0.32),
    spikePulse: true,
    spikePulseIntensity: rand(0.05, 0.35),
    nodeCount: randInt(2, 9),
    nodeStrobeMode: pick(['off','unified','alternating']),
    nodeStrobeColorA: '#FFD24A',
    nodeStrobeColorB: '#FFE9A3',
    nodeStrobeSpeed: rand(4, 12),
    arcCount: randInt(0, 7),
    ...palette,
    emissiveIntensityCore: rand(0.18, 0.55),
    spikeEmissive: palette.spikeColor,
    emissiveIntensitySpikes: rand(0, 0.32),
    metalnessCore: rand(0.1, 0.5), roughnessCore: rand(0.6, 0.95),
    metalnessSpikes: rand(0.05, 0.35), roughnessSpikes: rand(0.6, 0.95),
    metalnessNodes: 1.0, roughnessNodes: 0.25,
    spin: rand(0.12, 0.38), roll: rand(0, 0.28), breathe: rand(0.006, 0.02), flickerSpeed: rand(6, 10),
    hitboxEnabled: Math.random() < 0.5,
    hitboxVisible: false,
    hitboxScaleMin: rand(0.8, 1.0),
    hitboxScaleMax: rand(1.0, 1.4),
    hitboxSpeed: rand(0.4, 2.0),
    quality: pick(['low','med','high'])
  }
}

export default function RandomizerMode({ navVisible = false, setNavVisible }){
  const [count, setCount] = useState(9)
  const [regenToken, setRegenToken] = useState(0)
  const [lighting, setLighting] = useState('dark')
  const [showLabels, setShowLabels] = useState(false)
  const [specs, setSpecs] = useState(() => Array.from({length: 9}, (_,i) => randomSpec(i)))
  const [lockPalette, setLockPalette] = useState(false)
  const [lockedPalette, setLockedPalette] = useState(() => pickPalette())
  const [hitboxMode, setHitboxMode] = useState('sin')

  // Regenerate specs when count or token changes
  useEffect(() => {
    const fresh = Array.from({length: count}, (_,i) => randomSpec(i))
    // Apply locked theme if enabled
    setSpecs(lockPalette ? fresh.map(s => ({...s, ...lockedPalette, spikeEmissive: s.spikeEmissive ?? s.spikeColor})) : fresh)
  }, [count, regenToken, lockPalette, lockedPalette])

  // Shuffle only colors for current specs
  function shuffleColors(){
    if (lockPalette) {
      const p = pickPalette()
      setLockedPalette(p)
      setSpecs(prev => prev.map(s => ({ ...s, ...p, spikeEmissive: s.spikeEmissive ?? s.spikeColor })))
    } else {
      setSpecs(prev => prev.map(s => ({
        ...s,
        ...pickPalette(),
        spikeEmissive: s.spikeEmissive ?? s.spikeColor
      })))
    }
  }

  // Improve randomization by shape/style after initial object creation
  useEffect(() => {
    setSpecs(prev => prev.map(s => {
      const out = { ...s }
      // Hard-edged shapes forced minimal detail
      if (['cylinder','capsule','triPrism','hexPrism'].includes(out.baseShape)) {
        out.detail = 0
      } else {
        out.detail = pick([0,1,2])
      }

      // Style-aware spike configuration
      if (out.spikeStyle === 'tentacle') {
        out.spikeCount = randInt(14, 36)
        out.spikeLength = rand(0.5, 0.75)
        out.spikeRadius = rand(0.05, 0.1)
      } else if (out.spikeStyle === 'disk') {
        out.spikeCount = randInt(24, 60)
        out.spikeLength = rand(0.22, 0.38)
        out.spikeRadius = rand(0.1, 0.16)
      } else if (out.spikeStyle === 'block') {
        out.spikeCount = randInt(18, 44)
        out.spikeLength = rand(0.3, 0.55)
        out.spikeRadius = rand(0.09, 0.14)
      } else { // cone or inverted
        out.spikeCount = randInt(20, 64)
        out.spikeLength = rand(0.32, 0.58)
        out.spikeRadius = rand(0.08, 0.14)
      }

      // Shape-aware body stretching
      if (out.baseShape === 'capsule' || out.baseShape === 'cylinder') {
        out.scaleY = rand(1.0, 2.0)
        out.scaleX = rand(0.8, 1.4)
        out.height = rand(1.4, 2.6)
      } else if (out.baseShape === 'triPrism' || out.baseShape === 'hexPrism') {
        out.scaleY = rand(0.8, 1.6)
        out.scaleX = rand(0.9, 1.6)
        out.height = rand(1.2, 2.2)
      } else { // sphere/icosahedron
        out.scaleY = rand(0.8, 1.4)
        out.scaleX = rand(0.8, 1.4)
      }
      // Apply global hitbox mode selection
      out.hitboxMode = hitboxMode
      return out
    }))
  }, [count, regenToken, hitboxMode])

  return (
    <div style={{display:'grid', gridTemplateRows:'auto 1fr', height:'100vh'}}>
      <div style={{padding:'8px 12px', background:'#0B1220', color:'#E6F0FF', display:'flex', gap:12, alignItems:'center'}}>
        <a href="/" className="button" style={{textDecoration:'none'}}>Home</a>
        <strong>Randomizer Mode</strong>
        <label>Count: {count}</label>
        <input type="range" min={3} max={20} value={count} onChange={e=>setCount(Number(e.target.value))} />
        <label>Lighting</label>
        <select value={lighting} onChange={e=>setLighting(e.target.value)}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
        <button onClick={() => setNavVisible && setNavVisible(v => !v)}>{navVisible ? 'Hide Nav' : 'Show Nav'}</button>
        <label style={{display:'flex',alignItems:'center',gap:6}}>
          <input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)} /> Show Labels
        </label>
        <label style={{display:'flex',alignItems:'center',gap:6}}>
          <input type="checkbox" checked={lockPalette} onChange={e=>{
            const val = e.target.checked;
            setLockPalette(val);
            if (val) {
              const first = specs[0];
              const p = first ? { baseColor:first.baseColor, spikeColor:first.spikeColor, nodeColor:first.nodeColor, arcColor:first.arcColor, emissive:first.emissive } : pickPalette();
              setLockedPalette(p);
              setSpecs(prev => prev.map(s => ({...s, ...p})));
            }
          }} /> Lock Palette
        </label>
        <label>Hitbox Motion</label>
        <select value={hitboxMode} onChange={e=>setHitboxMode(e.target.value)}>
          <option value="sin">Sin</option>
          <option value="step">Step</option>
          <option value="noise">Noise</option>
        </select>
        <button onClick={()=>setRegenToken(x=>x+1)}>Regenerate</button>
        <button onClick={shuffleColors}>Shuffle Colors</button>
      </div>
      <Canvas camera={{ position:[0,18,28], fov:52 }}>
        {lighting === 'dark' ? (
          <>
            <color attach="background" args={[ '#07111E' ]} />
            <ambientLight intensity={0.55} />
            <directionalLight position={[10,16,6]} intensity={1.0} />
            <hemisphereLight intensity={0.35} groundColor={'#0A0A0F'} />
            <Grid args={[60,60]} position={[0,0,0]} />
          </>
        ) : (
          <>
            <color attach="background" args={[ '#EAF2FF' ]} />
            <ambientLight intensity={0.9} />
            <directionalLight position={[12,20,8]} intensity={0.7} />
            <hemisphereLight intensity={0.7} color={'#ffffff'} groundColor={'#DDE7F5'} />
            <Grid args={[60,60]} position={[0,0,0]} cellColor="#C9D8EE" sectionColor="#B2C7E6" />
          </>
        )}
        <group position={[0,0,0]}
               rotation={[0,0,0]}
        >
          {specs.map((s, i) => {
            const cols = Math.ceil(Math.sqrt(count))
            const spacing = 4.5
            const r = Math.floor(i / cols)
            const c = i % cols
            const x = (c - (cols-1)/2) * spacing
            const z = (r - (Math.ceil(count/cols)-1)/2) * spacing
            return (
              <group key={s.id} position={[x, 0.2, z]}>
                <PathogenFromSpec spec={s} />
                {showLabels && (
                  <Html position={[0, (s.scaleY ?? 1.0) * (s.radius ?? 1.0) + 1.0, 0]} center distanceFactor={8} transform>
                    <div style={{
                      background:'rgba(11,18,32,0.8)',
                      color:'#E6F0FF',
                      padding:'4px 6px',
                      borderRadius:4,
                      fontSize:12,
                      whiteSpace:'nowrap',
                      border:'1px solid rgba(255,255,255,0.08)'
                    }}>
                      {s.baseShape} • {s.spikeStyle} • spikes:{s.spikeCount} • q:{s.quality} • e:{s.emissiveIntensityCore?.toFixed(2)}
                    </div>
                  </Html>
                )}
              </group>
            )
          })}
        </group>
        <OrbitControls />
      </Canvas>
    </div>
  )
}
