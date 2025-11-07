// src/pages/HeroTuner.tsx
import React, { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { HeroFromSpec } from '../heroes/factory/HeroFactory'
import GLBHero from '../components/GLBHero'
import FBXAnimViewer from '../components/FBXAnimViewer'
import { HeroAnimTester, defaultAnimMap } from '../heroes/factory/HeroAnimTester'
import { liteSwordShieldMap } from '../heroes/factory/animMaps/liteSwordShieldMap'
import type { HeroSpec } from '../heroes/factory/HeroSpec'

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

export default function HeroTuner() {
    const [spec, setSpec] = useState<HeroSpec | null>(null)
    const [lightingMode, setLightingMode] = useState<'dark' | 'light'>('dark')
    const [source, setSource] = useState<'glb'|'procedural'|'fbx'|'animtest'>('glb')
    const [useLitePack, setUseLitePack] = useState(true)
    const [fbxScale, setFbxScale] = useState(0.01)
    const [showAdvanced, setShowAdvanced] = useState(false)

    // Start with a handy default if none loaded yet
    const ensureSpec = useMemo<HeroSpec>(() => spec ?? {
        id: 'hero_demo',
        seed: Math.floor(Math.random() * 1e9),
        bodyType: 'humanoid',
        scale: 1.0,
        height: 1.7,
        headSize: 0.18,
        shoulderWidth: 0.42,
        torsoLength: 0.45,
        pelvisWidth: 0.34,
        armLength: 0.45,
        forearmRatio: 0.48,
        legLength: 0.52,
        calfRatio: 0.48,
        thickness: 1.0,
        primaryColor: '#4C9AFF',
        secondaryColor: '#1E88E5',
        accentColor: '#FFD54F',
        skinColor: '#FFDFC4',
        emissive: '#66A3FF',
        emissiveIntensity: 0.25,
        metalness: 0.25,
        roughness: 0.6,
        visor: true,
        cape: false,
        shoulderPads: false,
        kneePads: true,
        backpack: false,
        fxRing: true,
        fxRingRadius: 1.2,
        fxRingIntensity: 0.5,
        fxMode: 'wave',
        fxSpeed: 1.0,
        fxAmplitude: 0.4,
        fxCount: 12,
        fxDirectionDeg: 0,
        fxShieldShape: 'circle',
        idleSway: 0.01,
        breathe: 0.01,
        walkCycle: 0,
    showJointLabels: false,
    rootBobAmp: 0.04,
        joint: {
            shoulderBaseXDeg: -8,
            elbowBaseXDeg: 10,
            hipBaseXDeg: 4,
            kneeBaseXDeg: 6,
            shoulderXMinDeg: -60, shoulderXMaxDeg: 60,
            elbowXMinDeg: -5, elbowXMaxDeg: 135,
            hipXMinDeg: -50, hipXMaxDeg: 50,
            kneeXMinDeg: 0, kneeXMaxDeg: 140,
        },
        // Motion controller defaults
        moveIntentX: 0,
        moveIntentZ: 0,
        leanMaxDeg: 12,
        shoulderSplayDeg: 10,
        armBendScale: 1.1,
        legBendScale: 0.9,
        actionPose: false,
        actionPoseIntensity: 0.8,
        quality: 'high',
    }, [spec])

    function update<K extends keyof HeroSpec>(k: K, v: HeroSpec[K]) {
        setSpec(prev => ({ ...(prev ?? ensureSpec), [k]: v }))
    }

    function updateJoint<K extends keyof NonNullable<HeroSpec['joint']>>(k: K, v: NonNullable<HeroSpec['joint']>[K]) {
        setSpec(prev => ({
            ...(prev ?? ensureSpec),
            joint: { ...(prev?.joint ?? ensureSpec.joint ?? {}), [k]: v }
        }))
    }

    function onImportJson(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            try {
                const obj = JSON.parse(String(reader.result)) as HeroSpec
                setSpec(obj)
            } catch (err) {
                console.error('Invalid JSON', err)
                alert('Invalid JSON file')
            }
        }
        reader.readAsText(file)
    }

    function exportJson() {
        const s = ensureSpec
        const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${s.id || 'hero'}.json`
        a.click()
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100vh', minWidth: '600px' }}>
            <aside style={{ padding: '1rem', background: '#0B1220', color: '#E6F0FF', overflow: 'auto' }}>
                <h2>Hero Tuner</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ display: 'inline-flex', flexDirection: 'column' }}>
                        <span>Import JSON</span>
                        <input type="file" accept="application/json" onChange={onImportJson} />
                    </label>
                    <button onClick={exportJson} style={{ marginLeft: 'auto' }}>Export JSON</button>
                </div>
                <hr />
                <label>ID</label>
                <input value={ensureSpec.id} onChange={e => update('id', e.target.value)} style={{ width: '100%' }} />
                <label>Seed</label>
                <input type="number" value={ensureSpec.seed} onChange={e => update('seed', Number(e.target.value))} style={{ width: '100%' }} />
                <h3>Lighting</h3>
                <label>Mode</label>
                <select value={lightingMode} onChange={e => setLightingMode(e.target.value as any)}>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                </select>
                <h3>Source</h3>
                <label>Model Source</label>
                <select value={source} onChange={e => setSource(e.target.value as any)}>
                    <option value="glb">Imported GLB (Sesta)</option>
                    <option value="procedural">Procedural (factory)</option>
                    <option value="fbx">FBX Single Clip</option>
                    <option value="animtest">Anim Controller (WASD/J/K/Space)</option>
                </select>
                {source === 'fbx' && (
                    <div style={{ marginTop: 8 }}>
                        <label>FBX Scale: {fbxScale.toFixed(3)}</label>
                        <input type="range" step={0.001} min={0.001} max={1} value={fbxScale} onChange={e => setFbxScale(Number(e.target.value))} />
                    </div>
                )}
                                {source === 'animtest' && (
                    <div style={{ marginTop: 8 }}>
                        <p style={{fontSize:12,lineHeight:1.3}}>
                            <strong>Controls:</strong><br/>
                            W/ArrowUp: Run Forward<br/>
                            S/ArrowDown: Run Backward<br/>
                            A/ArrowLeft: Strafe Left<br/>
                            D/ArrowRight: Strafe Right<br/>
                                                        Space: Jump, Shift+Space: Wall Jump<br/>
                                                        J: Light Attack, K: Heavy Attack, H: Jump Attack<br/>
                                                        U: Special, I: Forward Charge<br/>
                                                        X: Death
                        </p>
                        <label>Anim Scale: {fbxScale.toFixed(3)}</label>
                        <input type="range" step={0.001} min={0.001} max={1} value={fbxScale} onChange={e => setFbxScale(Number(e.target.value))} />
                        <label style={{display:'block',marginTop:6}}><input type="checkbox" checked={useLitePack} onChange={e=> setUseLitePack(e.target.checked)} /> Use Lite Sword+Shield Pack</label>
                                                {/* Simple point-and-click remapper */}
                                                <div style={{marginTop:8,borderTop:'1px solid #2b3b55',paddingTop:8}}>
                                                    <strong>Remap Actions (FBX)</strong>
                                                    {[
                                                        ['idle','Idle'],
                                                        ['runForward','Run Forward'],
                                                        ['runBackward','Run Backward'],
                                                        ['strafeLeft','Strafe Left'],
                                                        ['strafeRight','Strafe Right'],
                                                        ['jump','Jump'],
                                                        ['jumpWall','Wall Jump'],
                                                        ['attackLight','Attack Light'],
                                                        ['attackHeavy','Attack Heavy'],
                                                        ['attackSpecial','Attack Special'],
                                                        ['attackCharge','Attack Forward Charge'],
                                                    ].map(([key,label]) => (
                                                        <div key={key} style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                                                            <span style={{width:160}}>{label}</span>
                                                            <input type="file" accept=".fbx" onChange={(e)=>{
                                                                const f=e.target.files?.[0]; if(!f) return;
                                                                const url=URL.createObjectURL(f)
                                                                // store in session state map attached to window for simplicity
                                                                ;(window as any).__heroUserMap = {
                                                                    ...(window as any).__heroUserMap,
                                                                    [key]: url
                                                                }
                                                            }} />
                                                        </div>
                                                    ))}
                                                    {/* attackJump supports two files */}
                                                    <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                                                        <span style={{width:160}}>Attack Jump (2 files)</span>
                                                        <input type="file" accept=".fbx" multiple onChange={(e)=>{
                                                            const files=e.target.files; if(!files||files.length===0) return;
                                                            const urls=Array.from(files).slice(0,2).map(f=>URL.createObjectURL(f))
                                                            ;(window as any).__heroUserMap = {
                                                                ...(window as any).__heroUserMap,
                                                                attackJump: urls
                                                            }
                                                        }} />
                                                    </div>
                                                </div>
                    </div>
                )}

                <h3>Body</h3>
                <label>Body Type</label>
                <select value={ensureSpec.bodyType ?? 'humanoid'} onChange={e => update('bodyType', e.target.value as any)}>
                    <option value="humanoid">Humanoid</option>
                    <option value="capsule">Capsule</option>
                    <option value="blocky">Blocky</option>
                    <option value="android">Android</option>
                </select><br />
                <label>Scale: {ensureSpec.scale}</label>
                <input type="range" step={0.01} min={0.6} max={2.0} value={ensureSpec.scale ?? 1.0} onChange={e => update('scale', Number(e.target.value))} /><br />
                <label>Height: {ensureSpec.height}</label>
                <input type="range" step={0.01} min={1.2} max={2.2} value={ensureSpec.height ?? 1.7} onChange={e => update('height', Number(e.target.value))} /><br />
                <label>Head Size: {ensureSpec.headSize}</label>
                <input type="range" step={0.01} min={0.12} max={0.28} value={ensureSpec.headSize ?? 0.18} onChange={e => update('headSize', Number(e.target.value))} /><br />
                <label>Shoulder Width: {ensureSpec.shoulderWidth}</label>
                <input type="range" step={0.01} min={0.3} max={0.6} value={ensureSpec.shoulderWidth ?? 0.42} onChange={e => update('shoulderWidth', Number(e.target.value))} /><br />
                <label>Torso Length: {ensureSpec.torsoLength}</label>
                <input type="range" step={0.01} min={0.3} max={0.6} value={ensureSpec.torsoLength ?? 0.45} onChange={e => update('torsoLength', Number(e.target.value))} /><br />
                <label>Pelvis Width: {ensureSpec.pelvisWidth}</label>
                <input type="range" step={0.01} min={0.25} max={0.5} value={ensureSpec.pelvisWidth ?? 0.34} onChange={e => update('pelvisWidth', Number(e.target.value))} /><br />
                <label>Arm Length: {ensureSpec.armLength}</label>
                <input type="range" step={0.01} min={0.3} max={0.7} value={ensureSpec.armLength ?? 0.45} onChange={e => update('armLength', Number(e.target.value))} /><br />
                <label>Forearm Ratio: {ensureSpec.forearmRatio}</label>
                <input type="range" step={0.01} min={0.3} max={0.7} value={ensureSpec.forearmRatio ?? 0.48} onChange={e => update('forearmRatio', Number(e.target.value))} /><br />
                <label>Leg Length: {ensureSpec.legLength}</label>
                <input type="range" step={0.01} min={0.35} max={0.8} value={ensureSpec.legLength ?? 0.52} onChange={e => update('legLength', Number(e.target.value))} /><br />
                <label>Calf Ratio: {ensureSpec.calfRatio}</label>
                <input type="range" step={0.01} min={0.3} max={0.7} value={ensureSpec.calfRatio ?? 0.48} onChange={e => update('calfRatio', Number(e.target.value))} /><br />
                <label>Thickness: {ensureSpec.thickness}</label>
                <input type="range" step={0.01} min={0.6} max={1.8} value={ensureSpec.thickness ?? 1.0} onChange={e => update('thickness', Number(e.target.value))} /><br />

                <h3>Cosmetics</h3>
                <label>Primary</label><input type="color" value={ensureSpec.primaryColor ?? '#4C9AFF'} onChange={e => update('primaryColor', e.target.value)} />
                <label>Secondary</label><input type="color" value={ensureSpec.secondaryColor ?? '#1E88E5'} onChange={e => update('secondaryColor', e.target.value)} />
                <label>Accent</label><input type="color" value={ensureSpec.accentColor ?? '#FFD54F'} onChange={e => update('accentColor', e.target.value)} />
                <label>Skin</label><input type="color" value={ensureSpec.skinColor ?? '#FFDFC4'} onChange={e => update('skinColor', e.target.value)} />
                <label>Emissive</label><input type="color" value={ensureSpec.emissive ?? '#66A3FF'} onChange={e => update('emissive', e.target.value)} />
                <label>Emissive Intensity: {ensureSpec.emissiveIntensity}</label>
                <input type="range" step={0.01} min={0} max={2} value={ensureSpec.emissiveIntensity ?? 0.25} onChange={e => update('emissiveIntensity', Number(e.target.value))} /><br />
                <label>Metalness: {ensureSpec.metalness}</label>
                <input type="range" step={0.01} min={0} max={1} value={ensureSpec.metalness ?? 0.25} onChange={e => update('metalness', Number(e.target.value))} /><br />
                <label>Roughness: {ensureSpec.roughness}</label>
                <input type="range" step={0.01} min={0} max={1} value={ensureSpec.roughness ?? 0.6} onChange={e => update('roughness', Number(e.target.value))} /><br />

                <h3>Accessories</h3>
                <label><input type="checkbox" checked={ensureSpec.visor ?? true} onChange={e => update('visor', e.target.checked)} /> Visor</label><br />
                <label><input type="checkbox" checked={ensureSpec.cape ?? false} onChange={e => update('cape', e.target.checked)} /> Cape</label><br />
                <label><input type="checkbox" checked={ensureSpec.shoulderPads ?? false} onChange={e => update('shoulderPads', e.target.checked)} /> Shoulder Pads</label><br />
                <label><input type="checkbox" checked={ensureSpec.kneePads ?? true} onChange={e => update('kneePads', e.target.checked)} /> Knee Pads</label><br />
                <label><input type="checkbox" checked={ensureSpec.backpack ?? false} onChange={e => update('backpack', e.target.checked)} /> Backpack</label><br />

                <h3>FX</h3>
                <label><input type="checkbox" checked={ensureSpec.fxRing ?? true} onChange={e => update('fxRing', e.target.checked)} /> Orbit FX Ring</label><br />
                <label>Ring Radius: {ensureSpec.fxRingRadius}</label>
                <input type="range" step={0.01} min={0.6} max={2.0} value={ensureSpec.fxRingRadius ?? 1.2} onChange={e => update('fxRingRadius', Number(e.target.value))} /><br />
                <label>Ring Intensity: {ensureSpec.fxRingIntensity}</label>
                <input type="range" step={0.01} min={0} max={2.0} value={ensureSpec.fxRingIntensity ?? 0.5} onChange={e => update('fxRingIntensity', Number(e.target.value))} /><br />
                <label>Orb Animation</label>
                <select value={ensureSpec.fxMode ?? 'wave'} onChange={e => update('fxMode', e.target.value as any)}>
                    <option value="atom">Atom protons</option>
                    <option value="wave">Wave up/down</option>
                    <option value="push">Elastic push (aim)</option>
                    <option value="shield">Shield stack</option>
                </select><br />
                {ensureSpec.fxMode === 'shield' && (
                    <>
                        <label>Shield Shape</label>
                        <select value={ensureSpec.fxShieldShape ?? 'circle'} onChange={e => update('fxShieldShape', e.target.value as any)}>
                            <option value="circle">Circle</option>
                            <option value="diamond">Diamond</option>
                            <option value="pyramid">Pyramid (arrow tip)</option>
                        </select><br />
                    </>
                )}
                <label>Orb Count: {ensureSpec.fxCount}</label>
                <input type="range" min={3} max={24} value={ensureSpec.fxCount ?? 12} onChange={e => update('fxCount', Number(e.target.value))} /><br />
                <label>Speed: {ensureSpec.fxSpeed}</label>
                <input type="range" step={0.05} min={0} max={4} value={ensureSpec.fxSpeed ?? 1.0} onChange={e => update('fxSpeed', Number(e.target.value))} /><br />
                <label>Amplitude: {ensureSpec.fxAmplitude}</label>
                <input type="range" step={0.01} min={0} max={1.5} value={ensureSpec.fxAmplitude ?? 0.4} onChange={e => update('fxAmplitude', Number(e.target.value))} /><br />
                <label>Aim Direction (deg): {ensureSpec.fxDirectionDeg}</label>
                <input type="range" step={1} min={0} max={360} value={ensureSpec.fxDirectionDeg ?? 0} onChange={e => update('fxDirectionDeg', Number(e.target.value))} /><br />

                <h3>Debug</h3>
                <label><input type="checkbox" checked={ensureSpec.showJointLabels ?? false} onChange={e => update('showJointLabels', e.target.checked)} /> Show Joint Labels</label><br />
                <label>Label Mode</label>
                <select value={ensureSpec.labelMode ?? 'deg'} onChange={e => update('labelMode', e.target.value as any)}>
                    <option value="deg">Degrees (raw vs clamped)</option>
                    <option value="xyz">XYZ coordinates</option>
                </select><br />
                <label>Root Bob Amp: {ensureSpec.rootBobAmp}</label>
                <input type="range" step={0.005} min={0} max={0.12} value={ensureSpec.rootBobAmp ?? 0.04} onChange={e => update('rootBobAmp', Number(e.target.value))} /><br />

                <details style={{ margin: '0.5rem 0' }} open={showAdvanced} onToggle={e => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
                    <summary style={{ cursor: 'pointer' }}><strong>Advanced: Joint Bases & Clamps</strong></summary>
                    <div style={{ paddingLeft: 8 }}>
                        <h4>Bases (deg)</h4>
                        <label>Shoulder Base X: {ensureSpec.joint?.shoulderBaseXDeg}</label>
                        <input type="number" value={ensureSpec.joint?.shoulderBaseXDeg ?? 0} onChange={e => updateJoint('shoulderBaseXDeg', Number(e.target.value))} />
                        <input type="range" min={-90} max={90} step={1} value={ensureSpec.joint?.shoulderBaseXDeg ?? 0} onChange={e => updateJoint('shoulderBaseXDeg', Number(e.target.value))} /><br />
                        <label>Elbow Base X: {ensureSpec.joint?.elbowBaseXDeg}</label>
                        <input type="number" value={ensureSpec.joint?.elbowBaseXDeg ?? 0} onChange={e => updateJoint('elbowBaseXDeg', Number(e.target.value))} />
                        <input type="range" min={-90} max={90} step={1} value={ensureSpec.joint?.elbowBaseXDeg ?? 0} onChange={e => updateJoint('elbowBaseXDeg', Number(e.target.value))} /><br />
                        <label>Hip Base X: {ensureSpec.joint?.hipBaseXDeg}</label>
                        <input type="number" value={ensureSpec.joint?.hipBaseXDeg ?? 0} onChange={e => updateJoint('hipBaseXDeg', Number(e.target.value))} />
                        <input type="range" min={-90} max={90} step={1} value={ensureSpec.joint?.hipBaseXDeg ?? 0} onChange={e => updateJoint('hipBaseXDeg', Number(e.target.value))} /><br />
                        <label>Knee Base X: {ensureSpec.joint?.kneeBaseXDeg}</label>
                        <input type="number" value={ensureSpec.joint?.kneeBaseXDeg ?? 0} onChange={e => updateJoint('kneeBaseXDeg', Number(e.target.value))} />
                        <input type="range" min={-90} max={90} step={1} value={ensureSpec.joint?.kneeBaseXDeg ?? 0} onChange={e => updateJoint('kneeBaseXDeg', Number(e.target.value))} /><br />

                        <h4>Clamps (deg)</h4>
                        <label>Shoulder X Min: {ensureSpec.joint?.shoulderXMinDeg}</label>
                        <input type="number" value={ensureSpec.joint?.shoulderXMinDeg ?? 0} onChange={e => updateJoint('shoulderXMinDeg', Number(e.target.value))} />
                        <input type="range" min={-120} max={120} step={1} value={ensureSpec.joint?.shoulderXMinDeg ?? 0} onChange={e => updateJoint('shoulderXMinDeg', Number(e.target.value))} />
                        <label>Max: {ensureSpec.joint?.shoulderXMaxDeg}</label>
                        <input type="number" value={ensureSpec.joint?.shoulderXMaxDeg ?? 0} onChange={e => updateJoint('shoulderXMaxDeg', Number(e.target.value))} />
                        <input type="range" min={-120} max={120} step={1} value={ensureSpec.joint?.shoulderXMaxDeg ?? 0} onChange={e => updateJoint('shoulderXMaxDeg', Number(e.target.value))} /><br />

                        <label>Elbow X Min: {ensureSpec.joint?.elbowXMinDeg}</label>
                        <input type="number" value={ensureSpec.joint?.elbowXMinDeg ?? 0} onChange={e => updateJoint('elbowXMinDeg', Number(e.target.value))} />
                        <input type="range" min={-120} max={120} step={1} value={ensureSpec.joint?.elbowXMinDeg ?? 0} onChange={e => updateJoint('elbowXMinDeg', Number(e.target.value))} />
                        <label>Max: {ensureSpec.joint?.elbowXMaxDeg}</label>
                        <input type="number" value={ensureSpec.joint?.elbowXMaxDeg ?? 0} onChange={e => updateJoint('elbowXMaxDeg', Number(e.target.value))} />
                        <input type="range" min={-120} max={120} step={1} value={ensureSpec.joint?.elbowXMaxDeg ?? 0} onChange={e => updateJoint('elbowXMaxDeg', Number(e.target.value))} /><br />

                        <label>Hip X Min: {ensureSpec.joint?.hipXMinDeg}</label>
                        <input type="number" value={ensureSpec.joint?.hipXMinDeg ?? 0} onChange={e => updateJoint('hipXMinDeg', Number(e.target.value))} />
                        <input type="range" min={-120} max={120} step={1} value={ensureSpec.joint?.hipXMinDeg ?? 0} onChange={e => updateJoint('hipXMinDeg', Number(e.target.value))} />
                        <label>Max: {ensureSpec.joint?.hipXMaxDeg}</label>
                        <input type="number" value={ensureSpec.joint?.hipXMaxDeg ?? 0} onChange={e => updateJoint('hipXMaxDeg', Number(e.target.value))} />
                        <input type="range" min={-120} max={120} step={1} value={ensureSpec.joint?.hipXMaxDeg ?? 0} onChange={e => updateJoint('hipXMaxDeg', Number(e.target.value))} /><br />

                        <label>Knee X Min: {ensureSpec.joint?.kneeXMinDeg}</label>
                        <input type="number" value={ensureSpec.joint?.kneeXMinDeg ?? 0} onChange={e => updateJoint('kneeXMinDeg', Number(e.target.value))} />
                        <input type="range" min={-120} max={120} step={1} value={ensureSpec.joint?.kneeXMinDeg ?? 0} onChange={e => updateJoint('kneeXMinDeg', Number(e.target.value))} />
                        <label>Max: {ensureSpec.joint?.kneeXMaxDeg}</label>
                        <input type="number" value={ensureSpec.joint?.kneeXMaxDeg ?? 0} onChange={e => updateJoint('kneeXMaxDeg', Number(e.target.value))} />
                        <input type="range" min={-120} max={120} step={1} value={ensureSpec.joint?.kneeXMaxDeg ?? 0} onChange={e => updateJoint('kneeXMaxDeg', Number(e.target.value))} /><br />

                        <button type="button" onClick={() => {
                            update('rootBobAmp', 0.04 as any)
                            setSpec(prev => ({ ...(prev ?? ensureSpec), joint: {
                                shoulderBaseXDeg: -8, elbowBaseXDeg: 10, hipBaseXDeg: 4, kneeBaseXDeg: 6,
                                shoulderXMinDeg: -60, shoulderXMaxDeg: 60,
                                elbowXMinDeg: -5, elbowXMaxDeg: 135,
                                hipXMinDeg: -50, hipXMaxDeg: 50,
                                kneeXMinDeg: 0, kneeXMaxDeg: 140,
                            } }))
                        }}>Reset Advanced to defaults</button>
                    </div>
                </details>

                <h3>Controller</h3>
                <label>Move X (strafe): {ensureSpec.moveIntentX}</label>
                <input type="range" step={0.01} min={-1} max={1} value={ensureSpec.moveIntentX ?? 0} onChange={e => update('moveIntentX', Number(e.target.value))} /><br />
                <label>Move Z (forward/back): {ensureSpec.moveIntentZ}</label>
                <input type="range" step={0.01} min={-1} max={1} value={ensureSpec.moveIntentZ ?? 0} onChange={e => update('moveIntentZ', Number(e.target.value))} /><br />
                <label>Lean Max (deg): {ensureSpec.leanMaxDeg}</label>
                <input type="range" step={1} min={0} max={30} value={ensureSpec.leanMaxDeg ?? 12} onChange={e => update('leanMaxDeg', Number(e.target.value))} /><br />

                <h3>Rig Tuning</h3>
                <label>Shoulder Splay (deg): {ensureSpec.shoulderSplayDeg}</label>
                <input type="range" step={1} min={-35} max={35} value={ensureSpec.shoulderSplayDeg ?? 10} onChange={e => update('shoulderSplayDeg', Number(e.target.value))} /><br />
                <label>Arm Bend Scale: {ensureSpec.armBendScale}</label>
                <input type="range" step={0.05} min={0.5} max={2.0} value={ensureSpec.armBendScale ?? 1.1} onChange={e => update('armBendScale', Number(e.target.value))} /><br />
                <label>Leg Bend Scale: {ensureSpec.legBendScale}</label>
                <input type="range" step={0.05} min={0.5} max={2.0} value={ensureSpec.legBendScale ?? 0.9} onChange={e => update('legBendScale', Number(e.target.value))} /><br />
                <label>Arm Bend Direction</label>
                <select value={ensureSpec.armBendDirection ?? 'backward'} onChange={e => update('armBendDirection', e.target.value as any)}>
                    <option value="backward">Backward (default)</option>
                    <option value="forward">Forward</option>
                </select><br />
                <label>Body Tilt (deg): {ensureSpec.bodyTiltDeg}</label>
                <input type="range" step={1} min={-20} max={20} value={ensureSpec.bodyTiltDeg ?? 0} onChange={e => update('bodyTiltDeg', Number(e.target.value))} /><br />

                <h3>Action Pose</h3>
                <label><input type="checkbox" checked={ensureSpec.actionPose ?? false} onChange={e => update('actionPose', e.target.checked)} /> Enable Action Pose</label><br />
                <label>Intensity: {ensureSpec.actionPoseIntensity}</label>
                <input type="range" step={0.01} min={0} max={1} value={ensureSpec.actionPoseIntensity ?? 0.8} onChange={e => update('actionPoseIntensity', Number(e.target.value))} /><br />

                <h3>Animation</h3>
                <label>Idle Sway: {ensureSpec.idleSway}</label>
                <input type="range" step={0.001} min={0} max={0.05} value={ensureSpec.idleSway ?? 0.01} onChange={e => update('idleSway', Number(e.target.value))} /><br />
                <label>Breathe: {ensureSpec.breathe}</label>
                <input type="range" step={0.001} min={0} max={0.05} value={ensureSpec.breathe ?? 0.01} onChange={e => update('breathe', Number(e.target.value))} /><br />
                <label>Walk Cycle Speed: {ensureSpec.walkCycle}</label>
                <input type="range" step={0.05} min={0} max={3} value={ensureSpec.walkCycle ?? 0} onChange={e => update('walkCycle', Number(e.target.value))} /><br />

                <h3>Quality</h3>
                <select value={ensureSpec.quality ?? 'high'} onChange={e => update('quality', e.target.value as any)}>
                    <option value="low">Low</option>
                    <option value="med">Medium</option>
                    <option value="high">High</option>
                </select>
            </aside>

            <Canvas camera={{ position: [0, 1.6, 3.4], fov: 46 }}>
                {lightingMode === 'dark' ? (
                    <>
                        <color attach="background" args={['#07111E']} />
                        <ambientLight intensity={0.45} />
                        <directionalLight position={[3, 6, 3]} intensity={1.1} />
                        <hemisphereLight intensity={0.35} groundColor={'#0A0A0F'} />
                        <Grid args={[20, 20]} position={[0, 0, 0]} />
                    </>
                ) : (
                    <>
                        <color attach="background" args={['#EAF2FF']} />
                        <ambientLight intensity={0.9} />
                        <directionalLight position={[4, 8, 2]} intensity={0.7} />
                        <hemisphereLight intensity={0.7} color={'#ffffff'} groundColor={'#DDE7F5'} />
                        <Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#C9D8EE" sectionColor="#B2C7E6" />
                    </>
                )}
                <group position={[0, 0.1, 0]}>
                    {source === 'procedural' && <HeroFromSpec spec={ensureSpec} />}
                    {source === 'glb' && <GLBHero />}
                    {source === 'fbx' && <FBXAnimViewer scale={fbxScale} />}
                                        {source === 'animtest' && (
                                            <HeroAnimTester
                                                anims={(window as any).__heroUserMap ?? (useLitePack ? liteSwordShieldMap : defaultAnimMap())}
                                                scale={fbxScale}
                                            />
                                        )}
                </group>
                {/* Axis widget (X/Y/Z) in the viewport corner */}
                <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                    <GizmoViewport axisColors={["#FF3653", "#8ADB00", "#2C8FFF"]} labelColor="white" />
                </GizmoHelper>
                <OrbitControls enablePan={false} />
            </Canvas>
        </div>
    )
}
