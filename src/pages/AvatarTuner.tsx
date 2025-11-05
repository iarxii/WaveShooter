// src/pages/AvatarTuner.tsx
import React, { useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { PathogenFromSpec } from '../characters/factory/PathogenFactory';
import type { AvatarSpec } from '../characters/factory/AvatarSpec';

// --- tiny color helper ---
function rgbToHex([r,g,b]: number[]) {
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2, '0')).join('');
}
function clamp(v:number,min:number,max:number){ return Math.max(min,Math.min(max,v)); }

// naive k-means (k=3) for dominant colors — fast enough for 256px thumbnail
async function dominantColors(file: File, k=3): Promise<string[]> {
  const img = await createImageBitmap(await file.arrayBuffer().then(b=>new Blob([b])));
  const cnv = new OffscreenCanvas(256,256);
  const ctx = cnv.getContext('2d')!;
  ctx.drawImage(img,0,0,256,256);
  const { data } = ctx.getImageData(0,0,256,256);
  // sample every 4th pixel to speed up
  const samples:number[][] = [];
  for (let i=0;i<data.length;i+=16) samples.push([data[i],data[i+1],data[i+2]]);
  // init centroids
  const centroids = samples.slice(0,k);
  const assign = new Array(samples.length).fill(0);
  for (let iter=0;iter<6;iter++){
    // assign
    for (let i=0;i<samples.length;i++){
      let best=0, bestD=1e9;
      for (let c=0;c<k;c++){
        const dx=samples[i][0]-centroids[c][0], dy=samples[i][1]-centroids[c][1], dz=samples[i][2]-centroids[c][2];
        const d=dx*dx+dy*dy+dz*dz;
        if (d<bestD){bestD=d;best=c;}
      }
      assign[i]=best;
    }
    // update
    const sums = Array.from({length:k},()=>[0,0,0,0]);
    for (let i=0;i<samples.length;i++){
      const a=assign[i]; sums[a][0]+=samples[i][0]; sums[a][1]+=samples[i][1]; sums[a][2]+=samples[i][2]; sums[a][3]++;
    }
    for (let c=0;c<k;c++){
      if (sums[c][3]>0){ centroids[c]=[sums[c][0]/sums[c][3],sums[c][1]/sums[c][3],sums[c][2]/sums[c][3]]; }
    }
  }
  return centroids.map(v => rgbToHex(v.map(x=>Math.round(x)) as any));
}

// very light “texture character” estimator -> suggests detail/spike counts
function estimateShapeHints(file: File){
  // Without running heavy edge-detection, we just base detail/spikes on average contrast.
  // Your agent (or you) can override these; this is only a starting point.
  return new Promise<{ detail:0|1|2, spikeCount:number, spikeLength:number, nodeCount:number, arcCount:number }>(async (resolve)=>{
    const img = await createImageBitmap(await file.arrayBuffer().then(b=>new Blob([b])));
    const cnv = new OffscreenCanvas(160,160);
    const ctx = cnv.getContext('2d')!;
    ctx.drawImage(img,0,0,160,160);
    const { data } = ctx.getImageData(0,0,160,160);
    let mean=0, n=0;
    for (let i=0;i<data.length;i+=16){
      const r=data[i], g=data[i+1], b=data[i+2];
      const l = (0.2126*r+0.7152*g+0.0722*b)/255;
      mean += l; n++;
    }
    mean/=n;
    let variance=0;
    for (let i=0;i<data.length;i+=16){
      const r=data[i], g=data[i+1], b=data[i+2];
      const l=(0.2126*r+0.7152*g+0.0722*b)/255;
      variance += (l-mean)*(l-mean);
    }
    variance/=n;
    // Map variance -> "busyness"
    const busy = clamp(variance*6,0,1);
    const detail:0|1|2 = busy>0.66?2:busy>0.33?1:0;
    const spikeCount = Math.round(24 + busy*36);    // 24..60
    const spikeLength = 0.36 + busy*0.18;           // 0.36..0.54
    const nodeCount = Math.round(3 + busy*5);       // 3..8
    const arcCount  = Math.round(2 + busy*6);       // 2..8
    resolve({ detail, spikeCount, spikeLength, nodeCount, arcCount });
  });
}

export default function AvatarTuner() {
  const [file,setFile] = useState<File|null>(null);
  const [spec,setSpec] = useState<AvatarSpec|null>(null);

  async function onDrop(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const [c1,c2,c3] = await dominantColors(f);
    const hints = await estimateShapeHints(f);
    const initial: AvatarSpec = {
      id: f.name.replace(/\.[^.]+$/,'').toLowerCase(),
      seed: Math.floor(Math.random()*1e9),
      baseShape:'icosahedron',
      radius: 1.0,
      height: 2.0,
      scaleX: 1.0,
      scaleY: 1.0,
      detail: hints.detail,
      spikeCount: hints.spikeCount,
      spikeLength: hints.spikeLength,
      spikeRadius: 0.11,
      spikeStyle: 'cone',
  spikeBaseShift: 0.0,
  spikePulse: true,
  spikePulseIntensity: 0.25,
      nodeCount: hints.nodeCount,
      arcCount: hints.arcCount,
      baseColor: c2 ?? '#B5764C',
      spikeColor: c2 ?? '#B5764C',
      nodeColor: c1 ?? '#FFD24A',
      arcColor: c3 ?? '#FFE9A3',
      emissive: c2 ?? '#B0774F',
      metalnessCore: 0.25, roughnessCore: 0.85,
      metalnessNodes: 1.0, roughnessNodes: 0.25,
      spin: 0.22, breathe: 0.014, flickerSpeed: 7.5,
      quality: 'high'
    };
    setSpec(initial);
  }

  function update<K extends keyof AvatarSpec>(k:K, v:AvatarSpec[K]) {
    if (!spec) return;
    setSpec({ ...spec, [k]: v });
  }

  function exportJson(){
    if (!spec) return;
    const blob = new Blob([JSON.stringify(spec,null,2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${spec.id}.json`;
    a.click();
  }

  return (
    <div style={{display:'grid', gridTemplateColumns:'320px 1fr', height:'100vh',minWidth:'600px'}}>
      <aside style={{padding:'1rem', background:'#0B1220', color:'#E6F0FF', overflow:'auto'}}>
        <h2>Avatar Tuner</h2>
        <input type="file" accept="image/*" onChange={onDrop}/>
        {!spec ? <p style={{opacity:0.8}}>Drop an avatar image to auto‑generate a starting spec.</p> : (
          <>
            <hr/>
            <label>ID</label>
            <input value={spec.id} onChange={e=>update('id', e.target.value)} style={{width:'100%'}}/>
            <label>Seed</label>
            <input type="number" value={spec.seed} onChange={e=>update('seed', Number(e.target.value))} style={{width:'100%'}}/>

            <h3>Shape</h3>
                <label>Base Shape</label>
                <select value={spec.baseShape ?? 'icosahedron'} onChange={e=>update('baseShape', e.target.value as any)}>
                  <option value="icosahedron">Icosahedron</option>
                  <option value="sphere">Sphere</option>
                  <option value="triPrism">Tri Prism</option>
                  <option value="hexPrism">Hex Prism</option>
                  <option value="cylinder">Cylinder</option>
                  <option value="capsule">Capsule</option>
                </select><br/>
            <label>Detail</label>
            <input type="range" min={0} max={2} value={spec.detail ?? 1} onChange={e=>update('detail', Number(e.target.value) as 0|1|2)}/><br/>
            <label>Height (Y scale): {spec.scaleY}</label>
            <input type="range" step={0.01} min={0.6} max={3.0} value={spec.scaleY ?? 1.0} onChange={e=>update('scaleY', Number(e.target.value))}/><br/>
            <label>Width (X scale): {spec.scaleX}</label>
            <input type="range" step={0.01} min={0.5} max={2.5} value={spec.scaleX ?? 1.0} onChange={e=>update('scaleX', Number(e.target.value))}/><br/>
            {(spec.baseShape === 'cylinder' || spec.baseShape === 'capsule' || spec.baseShape === 'triPrism' || spec.baseShape === 'hexPrism') && (
              <>
                <label>Body Length (for {spec.baseShape}): {spec.height}</label>
                <input type="range" step={0.01} min={0.6} max={3.0} value={spec.height ?? 2.0} onChange={e=>update('height', Number(e.target.value))}/><br/>
              </>
            )}
            <label>Spike Count: {spec.spikeCount}</label>
            <input type="range" min={12} max={72} value={spec.spikeCount ?? 42} onChange={e=>update('spikeCount', Number(e.target.value))}/><br/>
            <label>Spike Length: {spec.spikeLength}</label>
            <input type="range" step={0.01} min={0.25} max={0.65} value={spec.spikeLength ?? 0.45} onChange={e=>update('spikeLength', Number(e.target.value))}/><br/>
            <label>Spike Base Shift: {spec.spikeBaseShift}</label>
            <input type="range" step={0.01} min={-0.6} max={0.6} value={spec.spikeBaseShift ?? 0} onChange={e=>update('spikeBaseShift', Number(e.target.value))}/><br/>
            <label>Spike Style</label>
            <select value={spec.spikeStyle ?? 'cone'} onChange={e=>update('spikeStyle', e.target.value as any)}>
              <option value="cone">Cone</option>
                  <option value="inverted">Inverted</option>
                  <option value="disk">Disk</option>
                  <option value="block">Block</option>
                  <option value="tentacle">Tentacle</option>
                </select><br/>
            <label>
              <input type="checkbox" checked={spec.spikePulse ?? true} onChange={e=>update('spikePulse', e.target.checked)} /> Spike Pulse
            </label><br/>
            <label>Pulse Intensity: {spec.spikePulseIntensity}</label>
            <input type="range" step={0.01} min={0} max={0.6} value={spec.spikePulseIntensity ?? 0.25} onChange={e=>update('spikePulseIntensity', Number(e.target.value))}/><br/>
            <label>Node Count: {spec.nodeCount}</label>
            <input type="range" min={0} max={12} value={spec.nodeCount ?? 6} onChange={e=>update('nodeCount', Number(e.target.value))}/><br/>
            <label>Arc Count: {spec.arcCount}</label>
            <input type="range" min={0} max={12} value={spec.arcCount ?? 5} onChange={e=>update('arcCount', Number(e.target.value))}/><br/>

            <h3>Colors</h3>
            <label>Base</label><input type="color" value={spec.baseColor ?? '#B5764C'} onChange={e=>update('baseColor', e.target.value)}/>
            <label>Spikes</label><input type="color" value={spec.spikeColor ?? '#B5764C'} onChange={e=>update('spikeColor', e.target.value)}/>
            <label>Nodes</label><input type="color" value={spec.nodeColor ?? '#FFD24A'} onChange={e=>update('nodeColor', e.target.value)}/>
            <label>Arcs</label><input type="color" value={spec.arcColor ?? '#FFE9A3'} onChange={e=>update('arcColor', e.target.value)}/>
            <label>Emissive</label><input type="color" value={spec.emissive ?? '#B0774F'} onChange={e=>update('emissive', e.target.value)}/>

            <h3>Animation</h3>
            <label>Spin: {spec.spin}</label>
            <input type="range" step={0.01} min={0} max={1} value={spec.spin ?? 0.22} onChange={e=>update('spin', Number(e.target.value))}/><br/>
            <label>Breathe: {spec.breathe}</label>
            <input type="range" step={0.001} min={0} max={0.03} value={spec.breathe ?? 0.014} onChange={e=>update('breathe', Number(e.target.value))}/><br/>

            <button onClick={exportJson} style={{marginTop:'12px'}}>Export JSON</button>
          </>
        )}
      </aside>

      <Canvas camera={{ position:[0,1.6,3.4], fov:46 }}>
        <color attach="background" args={['#07111E']} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[3,6,3]} intensity={1.1} />
        <hemisphereLight intensity={0.35} groundColor={'#0A0A0F'} />
        <Grid args={[20,20]} position={[0,0,0]} />
        {spec && (
          <group position={[0,0.15,0]}>
            <PathogenFromSpec spec={spec}/>
          </group>
        )}
        <OrbitControls enablePan={false}/>
      </Canvas>
    </div>
  );
}