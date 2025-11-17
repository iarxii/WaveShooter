// src/pages/AvatarTuner.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom'
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { PathogenFromSpec } from '../characters/factory/PathogenFactory';
import { CreatureFromSpec } from '../characters/factory/CreatureFactory';
import { CreatureMeshSpec } from '../characters/factory/CreatureSpec';
import ConeBoss from '../entities/ConeBoss.jsx'
import TriangleBoss from '../entities/TriangleBoss.jsx'
import PipeBoss from '../entities/PipeBoss.jsx'
import ClusterBoss from '../entities/ClusterBoss.jsx'
import Minion from '../entities/Minion.jsx'
import StarBoss from '../entities/StarBoss.jsx'
import type { AvatarSpec } from '../characters/factory/AvatarSpec';

// --- tiny color helper ---
function rgbToHex([r,g,b]: number[]) {
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2, '0')).join('');
}
function clamp(v:number,min:number,max:number){ return Math.max(min,Math.min(max,v)); }

// naive k-means (k=3) for dominant colors — fast enough for 256px thumbnail
async function dominantColorsFromBlob(blob: Blob, k=3): Promise<string[]> {
  const img = await createImageBitmap(blob);
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

async function dominantColors(input: File | string, k=3): Promise<string[]> {
  if (typeof input !== 'string') {
    const blob = await input.arrayBuffer().then(b=>new Blob([b]));
    return dominantColorsFromBlob(blob, k);
  }
  const res = await fetch(input);
  const blob = await res.blob();
  return dominantColorsFromBlob(blob, k);
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
  const [spec,setSpec] = useState<AvatarSpec | CreatureMeshSpec | null>(null);
  const [mode, setMode] = useState<'pathogen' | 'creature'>('pathogen');
  const [lightingMode, setLightingMode] = useState<'dark'|'light'>('dark');
  const [galleryOpen, setGalleryOpen] = useState<boolean>(true);
  const [pickedImageUrl, setPickedImageUrl] = useState<string | null>(null);
  const [previewEntityMesh, setPreviewEntityMesh] = useState(false)
  const [previewEntityType, setPreviewEntityType] = useState('ConeBoss')
  const mockPlayerRef = useRef({ current: { x: 0, y: 0, z: 0 } })

  // Discover enemy avatar images with Vite glob
  // Vite glob typing fallback: cast import.meta as any to access glob
  const enemyImageUrls = useMemo(() => {
    try {
      const mods = (import.meta as any).glob('../assets/character_imgs/enemy_avatar/**/*.{png,jpg,jpeg,gif,webp}', { eager: true, as: 'url' }) as Record<string,string>;
      return Object.entries(mods)
        .sort((a,b)=>a[0].localeCompare(b[0]))
        .map(([,url])=>url);
    } catch {
      return [] as string[];
    }
  }, []);

  // Set default spec when mode changes
  useEffect(() => {
    if (mode === 'pathogen') {
      const defaultPathogenSpec: AvatarSpec = {
        id: 'default-pathogen',
        seed: 12345,
        baseShape: 'icosahedron',
        radius: 1.0,
        height: 2.0,
        scaleX: 1.0,
        scaleY: 1.0,
        detail: 1,
        spikeCount: 12,
        spikeLength: 0.5,
        spikeRadius: 0.11,
        spikeStyle: 'cone',
        spikeBaseShift: 0.0,
        spikePulse: true,
        spikePulseIntensity: 0.25,
        nodeCount: 8,
        arcCount: 6,
        baseColor: '#B5764C',
        spikeColor: '#B5764C',
        nodeColor: '#FFD24A',
        arcColor: '#FFE9A3',
        emissive: '#B0774F',
        emissiveIntensityCore: 0.35,
        spikeEmissive: '#B5764C',
        emissiveIntensitySpikes: 0.12,
        metalnessCore: 0.25, roughnessCore: 0.85,
        metalnessSpikes: 0.15, roughnessSpikes: 0.9,
        metalnessNodes: 1.0, roughnessNodes: 0.25,
        nodeStrobeMode: 'off',
        nodeStrobeColorA: '#FFD24A',
        nodeStrobeColorB: '#FFE9A3',
        nodeStrobeSpeed: 8.0,
        spin: 0.22, breathe: 0.014, flickerSpeed: 7.5,
        roll: 0.0,
        hitboxEnabled: false,
        hitboxVisible: false,
        hitboxScaleMin: 1.0,
        hitboxScaleMax: 1.0,
        hitboxSpeed: 1.0,
        hitboxMode: 'sin',
        quality: 'high'
      };
      setSpec(defaultPathogenSpec);
    } else {
      const defaultCreatureSpec: CreatureMeshSpec = {
        id: 'default-creature',
        seed: 12345,
        kind: 'insect',
        body: { length: 1.5, width: 0.5, height: 0.4, segments: 2 },
        appendages: {
          limbs: { count: 6, length: 0.8, thickness: 0.08 },
          wings: { span: 2.0, length: 1.8, flapHz: 10 }
        },
        features: {
          eyes: { size: 0.1, count: 2 },
          mouth: 'mandibles',
          texture: 'smooth'
        },
        colors: { body: '#5C3A23', accent: '#C4A074', eyes: '#000000' },
        detail: 1,
        modelUrl: undefined,
        animation: { spin: 0, breathe: 0 }
      };
      setSpec(defaultCreatureSpec);
    }
  }, [mode]);

  async function onDrop(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (mode === 'pathogen') {
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
        emissiveIntensityCore: 0.35,
        spikeEmissive: c2 ?? '#B5764C',
        emissiveIntensitySpikes: 0.12,
        metalnessCore: 0.25, roughnessCore: 0.85,
        metalnessSpikes: 0.15, roughnessSpikes: 0.9,
        metalnessNodes: 1.0, roughnessNodes: 0.25,
        nodeStrobeMode: 'off',
        nodeStrobeColorA: c1 ?? '#FFD24A',
        nodeStrobeColorB: c3 ?? '#FFE9A3',
        nodeStrobeSpeed: 8.0,
        spin: 0.22, breathe: 0.014, flickerSpeed: 7.5,
        roll: 0.0,
        hitboxEnabled: false,
        hitboxVisible: false,
        hitboxScaleMin: 1.0,
        hitboxScaleMax: 1.0,
        hitboxSpeed: 1.0,
        hitboxMode: 'sin',
        quality: 'high'
      };
      setSpec(initial);
    } else {
      // Creature mode
      const [c1,c2,c3] = await dominantColors(f);
      const initial: CreatureMeshSpec = {
        id: f.name.replace(/\.[^.]+$/,'').toLowerCase(),
        seed: Math.floor(Math.random()*1e9),
        kind: 'insect', // Default to insect
        body: { length: 1.5, width: 0.5, height: 0.4, segments: 2 },
        appendages: {
          limbs: { count: 6, length: 0.8, thickness: 0.08 },
          wings: { span: 2.0, length: 1.8, flapHz: 10 }
        },
        features: {
          eyes: { size: 0.1, count: 2 },
          mouth: 'mandibles',
          texture: 'smooth'
        },
        colors: { body: c2 ?? '#5C3A23', accent: c1 ?? '#C4A074', eyes: '#000000' },
        detail: 1,
        modelUrl: undefined,
        animation: { spin: 0, breathe: 0 }
      };
      setSpec(initial);
    }
    setGalleryOpen(false);
  }

  async function onPickImage(url: string){
    setPickedImageUrl(url);
    const [c1,c2,c3] = await dominantColors(url);
    // For hints, we convert the URL to a blob and reuse estimateShapeHints via a File-like path
    // estimateShapeHints expects a File; we can create a Blob File with a mock name
    const res = await fetch(url);
    const blob = await res.blob();
    const fakeFile = new File([blob], 'picked.png', { type: blob.type || 'image/png' });
    const hints = await estimateShapeHints(fakeFile);
    const initial: AvatarSpec = {
      id: 'picked_' + Math.floor(Math.random()*1e6),
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
      emissiveIntensityCore: 0.35,
      spikeEmissive: c2 ?? '#B5764C',
      emissiveIntensitySpikes: 0.12,
      metalnessCore: 0.25, roughnessCore: 0.85,
      metalnessSpikes: 0.15, roughnessSpikes: 0.9,
      metalnessNodes: 1.0, roughnessNodes: 0.25,
      nodeStrobeMode: 'off',
      nodeStrobeColorA: c1 ?? '#FFD24A',
      nodeStrobeColorB: c3 ?? '#FFE9A3',
      nodeStrobeSpeed: 8.0,
      spin: 0.22, breathe: 0.014, flickerSpeed: 7.5,
      roll: 0.0,
      hitboxEnabled: false,
      hitboxVisible: false,
      hitboxScaleMin: 1.0,
      hitboxScaleMax: 1.0,
      hitboxSpeed: 1.0,
      hitboxMode: 'sin',
      quality: 'high'
    };
    setSpec(initial);
    setGalleryOpen(false);
  }

  function update<K extends keyof AvatarSpec>(k:K, v:AvatarSpec[K]) {
    if (!spec) return;
    setSpec({ ...spec, [k]: v });
  }

  function updateCreature<K extends keyof CreatureMeshSpec>(k:K, v:CreatureMeshSpec[K]) {
    if (!spec || mode !== 'creature') return;
    setSpec({ ...spec, [k]: v } as CreatureMeshSpec);
  }

  function exportJson(){
    if (!spec) return;
    const blob = new Blob([JSON.stringify(spec,null,2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${spec.id}.json`;
    a.click();
  }

  // --- Special Boss Presets (generate AvatarSpec matching boss art directions) ---
  function makeInfluenzaSpec(): AvatarSpec {
    return {
      id: 'influenza', seed: Math.floor(Math.random()*1e9), baseShape: 'sphere',
      radius: 1.2, height: 1.2, scaleX: 1, scaleY: 1, detail: 1,
      spikeCount: 36, spikeLength: 0.42, spikeRadius: 0.08, spikeStyle: 'disk',
      spikePulse: true, spikePulseIntensity: 0.18,
      baseColor: '#16a34a', spikeColor: '#86efac', nodeColor: '#bbf7d0', arcColor: '#bbf7d0',
      emissive: '#16a34a', emissiveIntensityCore: 0.22, emissiveIntensitySpikes: 0.08,
      quality: 'high'
    } as AvatarSpec
  }

  function makeHepCSpec(): AvatarSpec {
    return {
      id: 'hepatitis_c', seed: Math.floor(Math.random()*1e9), baseShape: 'sphere',
      radius: 1.1, height: 1.1, scaleX: 1, scaleY: 1, detail: 1,
      spikeCount: 40, spikeLength: 0.36, spikeRadius: 0.12, spikeStyle: 'block',
      baseColor: '#bfdbfe', spikeColor: '#facc15', nodeColor: '#fde68a', arcColor: '#fef3c7',
      emissive: '#93c5fd', emissiveIntensityCore: 0.18, emissiveIntensitySpikes: 0.06,
      quality: 'high'
    } as AvatarSpec
  }

  function makeRotavirusSpec(): AvatarSpec {
    return {
      id: 'rotavirus', seed: Math.floor(Math.random()*1e9), baseShape: 'sphere',
      radius: 1.25, height: 1.25, scaleX: 1, scaleY: 1, detail: 2,
      spikeCount: 28, spikeLength: 0.5, spikeRadius: 0.09, spikeStyle: 'inverted',
      baseColor: '#1e40af', spikeColor: '#93c5fd', nodeColor: '#bfdbfe', arcColor: '#bfdbfe',
      emissive: '#60a5fa', emissiveIntensityCore: 0.25, emissiveIntensitySpikes: 0.08,
      quality: 'high'
    } as AvatarSpec
  }

  function makeBacteriophageSpec(): AvatarSpec {
    // multi-part look approximated with elongated body and clustered spikes
    return {
      id: 'bacteriophage', seed: Math.floor(Math.random()*1e9), baseShape: 'cylinder',
      radius: 0.9, height: 2.0, scaleX: 0.9, scaleY: 1.6, detail: 2,
      spikeCount: 18, spikeLength: 0.9, spikeRadius: 0.12, spikeStyle: 'tentacle',
      baseColor: '#f97316', spikeColor: '#fde68a', nodeColor: '#fff7ed', arcColor: '#fff7ed',
      emissive: '#fb923c', emissiveIntensityCore: 0.28, emissiveIntensitySpikes: 0.12,
      quality: 'high'
    } as AvatarSpec
  }

  function makePapillomaSpec(): AvatarSpec {
    return {
      id: 'papillomavirus', seed: Math.floor(Math.random()*1e9), baseShape: 'sphere',
      radius: 1.15, height: 1.15, scaleX: 1, scaleY: 1, detail: 1,
      spikeCount: 36, spikeLength: 0.44, spikeRadius: 0.1, spikeStyle: 'block',
      baseColor: '#fde68a', spikeColor: '#f59e0b', nodeColor: '#fff7ed', arcColor: '#fff7ed',
      emissive: '#fbbf24', emissiveIntensityCore: 0.22, emissiveIntensitySpikes: 0.1,
      quality: 'high'
    } as AvatarSpec
  }

  function makeEbolaSpec(): AvatarSpec {
    return {
      id: 'ebolavirus', seed: Math.floor(Math.random()*1e9), baseShape: 'snake',
      radius: 0.8, height: 2.4, scaleX: 0.9, scaleY: 1.6, detail: 2,
      spikeCount: 0, spikeLength: 0.0, spikeRadius: 0.06, spikeStyle: 'tentacle',
      baseColor: '#6b21a8', spikeColor: '#ef4444', nodeColor: '#fca5a5', arcColor: '#fca5a5',
      emissive: '#7c3aed', emissiveIntensityCore: 0.2, emissiveIntensitySpikes: 0.06,
      segmentCount: 18, segmentSpacing: 0.5, snakeCurvature: 0.6, quality: 'high'
    } as AvatarSpec
  }

  function makeAdenoSpec(): AvatarSpec {
    return {
      id: 'adenovirus', seed: Math.floor(Math.random()*1e9), baseShape: 'icosahedron',
      radius: 1.0, height: 1.0, scaleX: 1, scaleY: 1, detail: 2,
      spikeCount: 24, spikeLength: 0.9, spikeRadius: 0.06, spikeStyle: 'tentacle',
      spikeEmissive: '#93c5fd', baseColor: '#60a5fa', spikeColor: '#60a5fa', nodeColor: '#fff',
      emissive: '#60a5fa', emissiveIntensityCore: 0.2, emissiveIntensitySpikes: 0.12,
      quality: 'high'
    } as AvatarSpec
  }

  function applyBossPreset(kind: string){
    let s: AvatarSpec | null = null
    switch(kind){
      case 'influenza': s = makeInfluenzaSpec(); break
      case 'hepc': s = makeHepCSpec(); break
      case 'rotavirus': s = makeRotavirusSpec(); break
      case 'bacteriophage': s = makeBacteriophageSpec(); break
      case 'papilloma': s = makePapillomaSpec(); break
      case 'ebola': s = makeEbolaSpec(); break
      case 'adeno': s = makeAdenoSpec(); break
      default: break
    }
    if (s) { setSpec(s); setGalleryOpen(false); }
  }

  function applyCreaturePreset(kind: string){
    // For now, load from CreatureRoster
    import('../characters/factory/CreatureRoster').then(({ CreatureRoster }) => {
      const s = CreatureRoster[kind];
      if (s) { setSpec(s); setGalleryOpen(false); }
    });
  }

  return (
    <div style={{display:'grid', gridTemplateColumns:'320px 1fr', height:'100vh',minWidth:'600px'}}>
      <aside style={{padding:'1rem', background:'#0B1220', color:'#E6F0FF', overflow:'auto'}}>
        <h2>Avatar Tuner</h2>
        <div style={{ marginBottom: 12 }}>
          <label>Mode: </label>
          <button onClick={() => setMode('pathogen')} disabled={mode === 'pathogen'}>Pathogen</button>
          <button onClick={() => setMode('creature')} disabled={mode === 'creature'}>Creature</button>
        </div>
        <input type="file" accept="image/*" onChange={onDrop}/>
        <div style={{marginTop:12, marginBottom:12}}>
          {mode === 'pathogen' ? (
            <>
              <h3>Special Boss Presets</h3>
              <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                <button onClick={()=>applyBossPreset('influenza')}>Influenza</button>
                <button onClick={()=>applyBossPreset('hepc')}>Hepatitis C</button>
                <button onClick={()=>applyBossPreset('rotavirus')}>Rotavirus</button>
                <button onClick={()=>applyBossPreset('bacteriophage')}>Bacteriophage</button>
                <button onClick={()=>applyBossPreset('papilloma')}>Papillomavirus</button>
                <button onClick={()=>applyBossPreset('ebola')}>Ebolavirus</button>
                <button onClick={()=>applyBossPreset('adeno')}>Adenovirus</button>
              </div>
            </>
          ) : (
            <>
              <h3>Creature Presets</h3>
              <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                <button onClick={()=>applyCreaturePreset('cockroach_broodmother')}>Cockroach Broodmother</button>
                <button onClick={()=>applyCreaturePreset('fly_colossus')}>Fly Colossus</button>
                <button onClick={()=>applyCreaturePreset('bee_medics')}>Bee Medics</button>
                <button onClick={()=>applyCreaturePreset('rat_king')}>Rat King</button>
              </div>
            </>
          )}
          <div style={{marginTop:10}}>
            <button onClick={exportJson}>Export JSON</button>
          </div>
        </div>
        <div style={{margin:'8px 0'}}>
          <button onClick={()=>setGalleryOpen(true)} disabled={galleryOpen}>
            {galleryOpen ? 'Select an Image Below' : 'Change Image'}
          </button>
        </div>
        {galleryOpen && (
          <div>
            <h3>Pick from Library</h3>
            {enemyImageUrls.length === 0 && (
              <p style={{opacity:0.8}}>No images found under assets/character_imgs/enemy_avatar.</p>
            )}
            <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8}}>
              {enemyImageUrls.map((url, idx)=>(
                <div key={idx} style={{cursor:'pointer', background:'#0f172a', border:'1px solid #1e293b', borderRadius:8, padding:6}} onClick={()=>onPickImage(url)}>
                  <img src={url} style={{width:'100%', height:96, objectFit:'cover', borderRadius:6}}/>
                  <div style={{fontSize:12, opacity:0.85, marginTop:4}}>{url.split('/').slice(-2).join('/')}</div>
                </div>
              ))}
            </div>
            <hr/>
          </div>
        )}
        {!spec ? <p style={{opacity:0.8}}>Drop an avatar image or pick from the library to auto‑generate a starting spec.</p> : (
          <>
            <hr/>
            {!galleryOpen && (
              <div style={{marginBottom:8}}>
                <button onClick={()=>setGalleryOpen(true)}>Change Image</button>
              </div>
            )}
            {mode === 'pathogen' && spec ? (
              <>
                <label>ID</label>
                <input value={spec.id} onChange={e=>update('id', e.target.value)} style={{width:'100%'}}/>
                <label>Seed</label>
                <input type="number" value={spec.seed} onChange={e=>update('seed', Number(e.target.value))} style={{width:'100%'}}/>
                {/* Pathogen sliders */}
                <h3>Lighting</h3>
                <label>Mode</label>
                <select value={lightingMode} onChange={e=>setLightingMode(e.target.value as any)}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
                <h3>Shape</h3>
                <label>Base Shape</label>
                <select value={spec.baseShape ?? 'icosahedron'} onChange={e=>update('baseShape', e.target.value as any)}>
                  <option value="icosahedron">Icosahedron</option>
                  <option value="sphere">Sphere</option>
                  <option value="triPrism">Tri Prism</option>
                  <option value="hexPrism">Hex Prism</option>
                  <option value="cylinder">Cylinder</option>
                  <option value="capsule">Capsule</option>
                  <option value="cube">Cube</option>
                  <option value="snake">Snake (segmented)</option>
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
                {/* Boxy shape spike clusters */}
                {(['cube','cylinder','capsule','triPrism','hexPrism'] as any).includes(spec.baseShape ?? '') && (
                  <>
                    <h3>Spike Clusters</h3>
                    <label>
                      <input type="checkbox" checked={spec.spikeClusterMidEnabled ?? false} onChange={e=>update('spikeClusterMidEnabled', e.target.checked)} /> Mid Ring
                    </label><br/>
                    <label>
                      <input type="checkbox" checked={spec.spikeClusterEndsEnabled ?? false} onChange={e=>update('spikeClusterEndsEnabled', e.target.checked)} /> End Rings
                    </label><br/>
                    <label>Mid Ring Count: {spec.spikeMidClusterCount ?? 8}</label>
                    <input type="range" min={0} max={48} value={spec.spikeMidClusterCount ?? 8} onChange={e=>update('spikeMidClusterCount', Number(e.target.value))}/><br/>
                    <label>End Ring Count: {spec.spikeEndClusterCount ?? 8}</label>
                    <input type="range" min={0} max={48} value={spec.spikeEndClusterCount ?? 8} onChange={e=>update('spikeEndClusterCount', Number(e.target.value))}/><br/>
                    <small style={{opacity:0.8}}>Note: Cluster spikes are currently additive; we can subtract from random spikes in a later step.</small>
                  </>
                )}

                {/* Snake shape parameters */}
                {(spec.baseShape === 'snake') && (
                  <>
                    <h3>Snake Segments</h3>
                    <label>Segments: {spec.segmentCount ?? 8}</label>
                    <input type="range" min={2} max={32} value={spec.segmentCount ?? 8} onChange={e=>update('segmentCount', Number(e.target.value))}/><br/>
                    <label>Spacing: {spec.segmentSpacing ?? 0.6}</label>
                    <input type="range" step={0.01} min={0.2} max={1.5} value={spec.segmentSpacing ?? 0.6} onChange={e=>update('segmentSpacing', Number(e.target.value))}/><br/>
                    <label>Curvature: {spec.snakeCurvature ?? 0.3}</label>
                    <input type="range" step={0.01} min={0} max={1.0} value={spec.snakeCurvature ?? 0.3} onChange={e=>update('snakeCurvature', Number(e.target.value))}/><br/>
                    <label>Twist: {spec.snakeTwist ?? 0.2}</label>
                    <input type="range" step={0.01} min={0} max={1.0} value={spec.snakeTwist ?? 0.2} onChange={e=>update('snakeTwist', Number(e.target.value))}/><br/>
                    <label>Taper Start: {spec.segmentRadiusScaleStart ?? 1.0}</label>
                    <input type="range" step={0.01} min={0.5} max={1.5} value={spec.segmentRadiusScaleStart ?? 1.0} onChange={e=>update('segmentRadiusScaleStart', Number(e.target.value))}/><br/>
                    <label>Taper End: {spec.segmentRadiusScaleEnd ?? 0.6}</label>
                    <input type="range" step={0.01} min={0.2} max={1.5} value={spec.segmentRadiusScaleEnd ?? 0.6} onChange={e=>update('segmentRadiusScaleEnd', Number(e.target.value))}/><br/>
                    <small style={{opacity:0.8}}>Tip: Set spikeStyle to "tentacle" for animated quills along segments.</small>
                  </>
                )}
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

                <h3>Node Strobe</h3>
                <label>Mode</label>
                <select value={spec.nodeStrobeMode ?? 'off'} onChange={e=>update('nodeStrobeMode', e.target.value as any)}>
                  <option value="off">Off</option>
                  <option value="unified">Unified</option>
                  <option value="alternating">Alternating</option>
                </select><br/>
                <label>Color A</label><input type="color" value={spec.nodeStrobeColorA ?? (spec.nodeColor ?? '#FFD24A')} onChange={e=>update('nodeStrobeColorA', e.target.value)}/>
                <label>Color B</label><input type="color" value={spec.nodeStrobeColorB ?? (spec.arcColor ?? '#FFE9A3')} onChange={e=>update('nodeStrobeColorB', e.target.value)}/>
                <label>Speed: {spec.nodeStrobeSpeed ?? 8}</label>
                <input type="range" step={0.1} min={0} max={20} value={spec.nodeStrobeSpeed ?? 8} onChange={e=>update('nodeStrobeSpeed', Number(e.target.value))}/><br/>

                <h3>Material</h3>
                <label>Core Emissive Intensity: {spec.emissiveIntensityCore ?? 0.35}</label>
                <input type="range" step={0.01} min={0} max={1.5} value={spec.emissiveIntensityCore ?? 0.35} onChange={e=>update('emissiveIntensityCore', Number(e.target.value))}/><br/>
                <label>Spike Emissive Intensity: {spec.emissiveIntensitySpikes ?? 0.12}</label>
                <input type="range" step={0.01} min={0} max={1.0} value={spec.emissiveIntensitySpikes ?? 0.12} onChange={e=>update('emissiveIntensitySpikes', Number(e.target.value))}/><br/>
                <label>Spike Emissive Color</label>
                <input type="color" value={spec.spikeEmissive ?? (spec.spikeColor ?? '#B5764C')} onChange={e=>update('spikeEmissive', e.target.value)}/>
                <label>Core Roughness: {spec.roughnessCore ?? 0.85}</label>
                <input type="range" step={0.01} min={0} max={1} value={spec.roughnessCore ?? 0.85} onChange={e=>update('roughnessCore', Number(e.target.value))}/><br/>
                <label>Spike Roughness: {spec.roughnessSpikes ?? 0.9}</label>
                <input type="range" step={0.01} min={0} max={1} value={spec.roughnessSpikes ?? 0.9} onChange={e=>update('roughnessSpikes', Number(e.target.value))}/><br/>
                <label>Spike Metalness: {spec.metalnessSpikes ?? 0.15}</label>
                <input type="range" step={0.01} min={0} max={1} value={spec.metalnessSpikes ?? 0.15} onChange={e=>update('metalnessSpikes', Number(e.target.value))}/><br/>

                <h3>Animation</h3>
                <label>Spin: {spec.spin}</label>
                <input type="range" step={0.01} min={0} max={1} value={spec.spin ?? 0.22} onChange={e=>update('spin', Number(e.target.value))}/><br/>
                <label>Roll: {spec.roll ?? 0}</label>
                <input type="range" step={0.01} min={0} max={1} value={spec.roll ?? 0} onChange={e=>update('roll', Number(e.target.value))}/><br/>
                <label>Breathe: {spec.breathe}</label>
                <input type="range" step={0.001} min={0} max={0.03} value={spec.breathe ?? 0.014} onChange={e=>update('breathe', Number(e.target.value))}/><br/>

                {/* Add an Attack Animation Section */}
                <h3>Attack Animation</h3>
                <label>Attack Speed: {spec.attackSpeed ?? 1.0}</label>
                <input type="range" step={0.1} min={0} max={5} value={spec.attackSpeed ?? 1.0} onChange={e=>update('attackSpeed', Number(e.target.value))}/><br/>
                <label>Attack Range: {spec.attackRange ?? 1.0}</label>
                <input type="range" step={0.1} min={0} max={5} value={spec.attackRange ?? 1.0} onChange={e=>update('attackRange', Number(e.target.value))}/><br/>

                <h3>Hitbox</h3>
                <label>
                  <input type="checkbox" checked={spec.hitboxEnabled ?? false} onChange={e=>update('hitboxEnabled', e.target.checked)} /> Enabled
                </label><br/>
                <label>
                  <input type="checkbox" checked={spec.hitboxVisible ?? false} onChange={e=>update('hitboxVisible', e.target.checked)} /> Show Hitbox
                </label><br/>
                <label>Motion</label>
                <select value={spec.hitboxMode ?? 'sin'} onChange={e=>update('hitboxMode', e.target.value as any)}>
                  <option value="sin">Sin</option>
                  <option value="step">Step</option>
                  <option value="noise">Noise</option>
                </select><br/>
                <label>Scale Min: {spec.hitboxScaleMin ?? 1.0}</label>
                <input type="range" step={0.01} min={0.5} max={2.0} value={spec.hitboxScaleMin ?? 1.0} onChange={e=>update('hitboxScaleMin', Number(e.target.value))}/><br/>
                <label>Scale Max: {spec.hitboxScaleMax ?? 1.0}</label>
                <input type="range" step={0.01} min={0.5} max={2.0} value={spec.hitboxScaleMax ?? 1.0} onChange={e=>update('hitboxScaleMax', Number(e.target.value))}/><br/>
                <label>Speed: {spec.hitboxSpeed ?? 1.0}</label>
                <input type="range" step={0.1} min={0} max={10} value={spec.hitboxSpeed ?? 1.0} onChange={e=>update('hitboxSpeed', Number(e.target.value))}/><br/>

                <button onClick={exportJson} style={{marginTop:'12px'}}>Export JSON</button>
              </>
            ) : mode === 'creature' && spec && 'body' in spec ? (
              <>
                <label>ID</label>
                <input value={(spec as CreatureMeshSpec).id} onChange={e=>updateCreature('id', e.target.value)} style={{width:'100%'}}/>
                <label>Seed</label>
                <input type="number" value={(spec as CreatureMeshSpec).seed} onChange={e=>updateCreature('seed', Number(e.target.value))} style={{width:'100%'}}/>
                <label>Model URL (optional)</label>
                <input value={(spec as CreatureMeshSpec).modelUrl || ''} onChange={e=>updateCreature('modelUrl', e.target.value || undefined)} style={{width:'100%'}}/>
                <h3>Body</h3>
                <label>Length: {(spec as CreatureMeshSpec).body.length}</label>
                <input type="range" step={0.1} min={0.5} max={3.0} value={(spec as CreatureMeshSpec).body.length} onChange={e=>updateCreature('body', { ...(spec as CreatureMeshSpec).body, length: Number(e.target.value) })}/><br/>
                <label>Width: {(spec as CreatureMeshSpec).body.width}</label>
                <input type="range" step={0.1} min={0.2} max={1.0} value={(spec as CreatureMeshSpec).body.width} onChange={e=>updateCreature('body', { ...(spec as CreatureMeshSpec).body, width: Number(e.target.value) })}/><br/>
                <label>Height: {(spec as CreatureMeshSpec).body.height}</label>
                <input type="range" step={0.1} min={0.2} max={1.0} value={(spec as CreatureMeshSpec).body.height} onChange={e=>updateCreature('body', { ...(spec as CreatureMeshSpec).body, height: Number(e.target.value) })}/><br/>
                <label>Segments: {(spec as CreatureMeshSpec).body.segments}</label>
                <input type="range" min={1} max={5} value={(spec as CreatureMeshSpec).body.segments} onChange={e=>updateCreature('body', { ...(spec as CreatureMeshSpec).body, segments: Number(e.target.value) })}/><br/>
                <h3>Colors</h3>
                <label>Body Color</label>
                <input type="color" value={(spec as CreatureMeshSpec).colors.body} onChange={e=>updateCreature('colors', { ...(spec as CreatureMeshSpec).colors, body: e.target.value })}/><br/>
                <label>Accent Color</label>
                <input type="color" value={(spec as CreatureMeshSpec).colors.accent} onChange={e=>updateCreature('colors', { ...(spec as CreatureMeshSpec).colors, accent: e.target.value })}/><br/>
                <h3>Animation</h3>
                <label>Spin: {(spec as CreatureMeshSpec).animation.spin}</label>
                <input type="range" step={0.01} min={0} max={0.1} value={(spec as CreatureMeshSpec).animation.spin} onChange={e=>updateCreature('animation', { ...(spec as CreatureMeshSpec).animation, spin: Number(e.target.value) })}/><br/>
                <label>Breathe: {(spec as CreatureMeshSpec).animation.breathe}</label>
                <input type="range" step={0.01} min={0} max={0.1} value={(spec as CreatureMeshSpec).animation.breathe} onChange={e=>updateCreature('animation', { ...(spec as CreatureMeshSpec).animation, breathe: Number(e.target.value) })}/><br/>
                <button onClick={exportJson} style={{marginTop:'12px'}}>Export JSON</button>
              </>
            ) : null}
          </>
        )}
      </aside>

      <Canvas camera={{ position:[0,1.6,3.4], fov:46 }}>
        {lightingMode === 'dark' ? (
          <>
            <color attach="background" args={['#07111E']} />
            <ambientLight intensity={0.45} />
            <directionalLight position={[3,6,3]} intensity={1.1} />
            <hemisphereLight intensity={0.35} groundColor={'#0A0A0F'} />
            <Grid args={[20,20]} position={[0,0,0]} />
          </>
        ) : (
          <>
            <color attach="background" args={['#EAF2FF']} />
            <ambientLight intensity={0.9} />
            <directionalLight position={[4,8,2]} intensity={0.7} />
            <hemisphereLight intensity={0.7} color={'#ffffff'} groundColor={'#DDE7F5'} />
            <Grid args={[20,20]} position={[0,0,0]} cellColor="#C9D8EE" sectionColor="#B2C7E6" />
          </>
        )}
        {spec && (
          // If previewEntityMesh is true, render the entity's procedural mesh instead of PathogenFromSpec
          previewEntityMesh ? (
            (() => {
              const pos = [0, 0.5, 0]
              const commonProps = { id: 'preview', pos, playerPosRef: mockPlayerRef.current, onDie: ()=>{}, health: 1, isPaused: true, spawnHeight: 0 }
              switch (previewEntityType) {
                case 'ConeBoss': return <ConeBoss {...commonProps} onDamagePlayer={()=>{}} visualScale={1} />
                case 'TriangleBoss': return <TriangleBoss {...commonProps} speedScale={1} />
                case 'PipeBoss': return <PipeBoss {...commonProps} onLaunchDrones={()=>{}} visualScale={1} />
                case 'ClusterBoss': return <ClusterBoss {...commonProps} visualScale={1} />
                case 'Minion': return <Minion {...commonProps} visualScale={1} />
                case 'StarBoss': return <StarBoss spec={spec} position={pos} />
                default: return mode === 'creature' && 'body' in spec ? <CreatureFromSpec spec={spec as CreatureMeshSpec} /> : <PathogenFromSpec spec={spec as AvatarSpec} />
              }
            })()
          ) : (
            <group position={[0,0.15,0]}>
              {mode === 'creature' && 'body' in spec ? <CreatureFromSpec spec={spec as CreatureMeshSpec} /> : <PathogenFromSpec spec={spec as AvatarSpec}/>}
            </group>
          )
        )}
        <OrbitControls enablePan={false}/>
        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport axisColors={["#FF3653", "#8ADB00", "#2C8FFF"]} labelColor="white" />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}