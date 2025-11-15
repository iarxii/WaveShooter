// src/pages/HeroTuner.tsx
import React, { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import PerfCollector from '../components/PerfCollector'
import PerfLongTaskObserver from '../components/PerfLongTaskObserver'
import PerfOverlay from '../components/PerfOverlay'
import * as perf from '../perf'
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, useFBX, useGLTF, useAnimations } from '@react-three/drei'
import { HeroFromSpec } from '../heroes/factory/HeroFactory'

// Simple multi-clip viewer: load a single FBX at a time and play its first clip
function MultiFBXAnimViewer({ url, scale = 0.01, onReady, freezeAtFirstFrame = false }: { url?: string | null, scale?: number, onReady?: (info: { object: THREE.Object3D, hips?: THREE.Object3D | null }) => void, freezeAtFirstFrame?: boolean }) {
    if (!url) return null
    return <DynamicFBXPlayer url={url} scale={scale} onReady={onReady} freezeAtFirstFrame={freezeAtFirstFrame} />
}

function DynamicFBXPlayer({ url, scale = 0.01, onReady, freezeAtFirstFrame = false }: { url: string, scale?: number, onReady?: (info: { object: THREE.Object3D, hips?: THREE.Object3D | null }) => void, freezeAtFirstFrame?: boolean }) {
    perf.start('loader_parse')
    const fbx: any = useFBX(url)
    perf.end('loader_parse')
    const { actions, names } = useAnimations(fbx.animations || [], fbx)
    // Try to locate a hips/pelvis bone on load and notify parent
    React.useEffect(() => {
        if (!fbx) return
        const findHips = (root: THREE.Object3D): THREE.Object3D | null => {
            const candidates = ['mixamorigHips', 'Hips', 'hips', 'pelvis', 'Pelvis']
            for (const name of candidates) {
                const found = root.getObjectByName(name)
                if (found) return found
            }
            // fallback: first Bone in hierarchy
            let hips: THREE.Object3D | null = null
            root.traverse(obj => { if (!hips && (obj as any).isBone) hips = obj })
            return hips
        }
        onReady?.({ object: fbx, hips: findHips(fbx) })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fbx])
    React.useEffect(() => {
        if (!names || names.length === 0) return
        const first = actions?.[names[0]]
        if (!first) return
        if (freezeAtFirstFrame) {
            first.reset().play()
            first.paused = true
            first.time = 0
        } else {
            first.reset().fadeIn(0.2).play()
        }
        return () => { first.fadeOut(0.15) }
    }, [actions, names, freezeAtFirstFrame])
    return <primitive object={fbx} scale={scale} position={[0, 0, 0]} />
}

function PoseFBX({ url, scale = 1, onReady }: { url: string, scale?: number, onReady?: (info: { object: THREE.Object3D, hips?: THREE.Object3D | null }) => void }) {
    perf.start('loader_parse')
    const fbx: any = useFBX(url)
    perf.end('loader_parse')
    React.useEffect(() => {
        if (!fbx) return
        const findHips = (root: THREE.Object3D): THREE.Object3D | null => {
            const candidates = ['mixamorigHips', 'Hips', 'hips', 'pelvis', 'Pelvis']
            for (const name of candidates) { const found = root.getObjectByName(name); if (found) return found }
            let hips: THREE.Object3D | null = null
            root.traverse(obj => { if (!hips && (obj as any).isBone) hips = obj })
            return hips
        }
        onReady?.({ object: fbx, hips: findHips(fbx) })
    }, [fbx, onReady])
    return <primitive object={fbx} scale={scale} />
}

function PoseGLTF({ url, scale = 1, onReady }: { url: string, scale?: number, onReady?: (info: { object: THREE.Object3D, hips?: THREE.Object3D | null }) => void }) {
    perf.start('loader_parse')
    const gltf: any = useGLTF(url)
    perf.end('loader_parse')
    React.useEffect(() => {
        if (!gltf?.scene) return
        const scene: THREE.Object3D = gltf.scene
        const findHips = (root: THREE.Object3D): THREE.Object3D | null => {
            const candidates = ['mixamorigHips', 'Hips', 'hips', 'pelvis', 'Pelvis']
            for (const name of candidates) { const found = root.getObjectByName(name); if (found) return found }
            let hips: THREE.Object3D | null = null
            root.traverse(obj => { if (!hips && (obj as any).isBone) hips = obj })
            return hips
        }
        onReady?.({ object: scene, hips: findHips(scene) })
    }, [gltf, onReady])
    return <primitive object={gltf.scene} scale={[scale, scale, scale]} />
}

// Pose viewer supports GLB/GLTF or FBX
function PoseViewer({ url, scale = 1, onReady }: { url?: string, scale?: number, onReady?: (info: { object: THREE.Object3D, hips?: THREE.Object3D | null }) => void }) {
    if (!url) return null
    const ext = url.toLowerCase().split('.').pop()
    if (ext === 'fbx') return <PoseFBX url={url} scale={scale} onReady={onReady} />
    if (ext === 'glb' || ext === 'gltf') return <PoseGLTF url={url} scale={scale} onReady={onReady} />
    return null
}

// Side-panel subcomponent for animViewer settings
function AnimViewerPanel({ fbxScale, setFbxScale, urls, setUrls, index, setIndex, backflipUrl, setBackflipUrl }: { fbxScale: number, setFbxScale: (v: number) => void, urls: string[], setUrls: (v: string[]) => void, index: number, setIndex: (i: number) => void, backflipUrl?: string, setBackflipUrl: (u: string | undefined) => void }) {
    return (
        <div style={{ marginTop: 8 }}>
            <label>FBX Scale: {fbxScale.toFixed(3)}</label>
            <input type="range" step={0.001} min={0.001} max={1} value={fbxScale} onChange={e => setFbxScale(Number(e.target.value))} />
            <div style={{ marginTop: 8 }}>
                <input type="file" accept=".fbx" multiple onChange={(e: any) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length === 0) return
                    const newUrls = files.map((f: any) => URL.createObjectURL(f))
                    setUrls([...(urls || []), ...newUrls])
                    setIndex((urls?.length || 0))
                }} />
                <div style={{ maxHeight: 120, overflow: 'auto', marginTop: 6, border: '1px solid #2b3b55', padding: 6 }}>
                    {urls.length === 0 ? <div style={{ fontSize: 12, opacity: 0.8 }}>No clips loaded</div> : urls.map((u, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <input type="radio" name="clip" checked={index === i} onChange={() => setIndex(i)} />
                            <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.split('/').pop()}</span>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px dashed #2b3b55' }}>
                    <strong>Special Backflip (Key 3)</strong>
                    <input type="file" accept=".fbx" onChange={(e: any) => {
                        const f = e.target.files?.[0]
                        if (!f) { setBackflipUrl(undefined); return }
                        const u = URL.createObjectURL(f)
                        setBackflipUrl(u)
                    }} />
                    {backflipUrl && <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>Loaded: {backflipUrl.split('/').pop()}</div>}
                </div>
            </div>
        </div>
    )
}
// Side-panel subcomponent for pose viewer settings
function PosePanel() {
    return (
        <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 12, lineHeight: 1.3 }}>
                Pose Viewer: choose a static GLB/FBX mesh (placeholder). Future: file picker & transform tools.
            </p>
        </div>
    )
}
import { HeroAnimTester } from '../heroes/factory/HeroAnimTester'
import { defaultAnimMap } from '../heroes/factory/defaultAnimMap'
import FXOrbs from '../components/FXOrbs'
import { liteSwordShieldMap } from '../heroes/factory/animMaps/liteSwordShieldMap'
import type { HeroSpec } from '../heroes/factory/HeroSpec'

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

export default function HeroTuner() {
    const [showPerf, setShowPerf] = useState(false)
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.code === 'F9') setShowPerf(v => !v) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])
    const [spec, setSpec] = useState<HeroSpec | null>(null)
    const [lightingMode, setLightingMode] = useState<'dark' | 'light'>('dark')
    const [source, setSource] = useState<'controller' | 'animViewer' | 'pose' | 'procedural'>('controller')
    const [useLitePack, setUseLitePack] = useState(true)
    const [showAnimDebug, setShowAnimDebug] = useState<boolean>(true)
    const [showViewerFx, setShowViewerFx] = useState<boolean>(true)
    const [viewerFxMode, setViewerFxMode] = useState<'atom' | 'wave' | 'push' | 'shield'>('wave')
    const [viewerFxShape, setViewerFxShape] = useState<'circle' | 'diamond' | 'pyramid'>('circle')
    const [viewerHitboxEnabled, setViewerHitboxEnabled] = useState<boolean>(false)
    const [viewerHitboxVisible, setViewerHitboxVisible] = useState<boolean>(false)
    const [viewerHitboxScaleMin, setViewerHitboxScaleMin] = useState<number>(1)
    const [viewerHitboxScaleMax, setViewerHitboxScaleMax] = useState<number>(1)
    const [viewerHitboxSpeed, setViewerHitboxSpeed] = useState<number>(1)
    const [viewerHitboxMode, setViewerHitboxMode] = useState<'sin' | 'step' | 'noise'>('sin')
    const [fbxScale, setFbxScale] = useState(0.01)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [backflipUrl, setBackflipUrl] = useState<string | undefined>()
    // Anim Viewer selections
    const [animUrls, setAnimUrls] = useState<string[]>([])
    const [animIndex, setAnimIndex] = useState<number>(-1)
    // Shape Runner directional mode (none|cw|ccw) using dynamic pose cycling
    const [shapeRunnerMode, setShapeRunnerMode] = useState<'none' | 'cw' | 'ccw'>('none')
    const [shapeRunnerTick, setShapeRunnerTick] = useState<number>(0)
    const [viewerFollowTarget, setViewerFollowTarget] = useState<THREE.Object3D | null>(null)
    // Pose viewer selection
    const [poseUrl, setPoseUrl] = useState<string | undefined>()
    const [poseScale, setPoseScale] = useState<number>(1)
    // Input highlight (controller)
    const [pressed, setPressed] = useState<{ [k: string]: boolean }>({})
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => setPressed(p => ({ ...p, [e.key.toLowerCase()]: true }))
        const up = (e: KeyboardEvent) => setPressed(p => ({ ...p, [e.key.toLowerCase()]: false }))
        window.addEventListener('keydown', down)
        window.addEventListener('keyup', up)
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
    }, [])
    // Preload any user-selected FBX clips only when the Anim Viewer is active
    React.useEffect(() => {
        if (source !== 'animViewer') return
        const unique = Array.from(new Set(animUrls.filter(Boolean)))
        unique.forEach(u => { if (/\.fbx($|\?)/i.test(u)) { try { (useFBX as any).preload?.(u) } catch {} } })
        if (backflipUrl && /\.fbx($|\?)/i.test(backflipUrl)) { try { (useFBX as any).preload?.(backflipUrl) } catch {} }
    }, [animUrls, backflipUrl, source])
    // Preload pose viewer asset only when Pose Viewer is active (source === 'pose')
    React.useEffect(() => {
        if (source !== 'pose') return
        if (!poseUrl) return
        if (/\.fbx($|\?)/i.test(poseUrl)) { try { (useFBX as any).preload?.(poseUrl) } catch {} }
        else { try { (useGLTF as any).preload?.(poseUrl) } catch {} }
    }, [poseUrl, source])
    // Anim Viewer keyboard shortcuts
    React.useEffect(() => {
        if (source !== 'animViewer') return
        const onKey = (e: KeyboardEvent) => {
            const k = e.key
            if (k === '1') { setShapeRunnerMode('cw') }
            else if (k === '2') { setShapeRunnerMode('ccw') }
            else if (k === '3') {
                setShapeRunnerMode('none')
                if (backflipUrl) {
                    const idxExisting = animUrls.findIndex(u => u === backflipUrl)
                    if (idxExisting >= 0) setAnimIndex(idxExisting)
                    else {
                        setAnimUrls(prev => [...prev, backflipUrl])
                        setAnimIndex(animUrls.length)
                    }
                } else {
                    const idx = animUrls.findIndex(u => /backflip|dash/i.test(u.split('/').pop() || ''))
                    if (idx >= 0) setAnimIndex(idx)
                }
            } else if (k === 'Escape' || k === 'esc') {
                setShapeRunnerMode('none')
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [source, animUrls, backflipUrl])
    // Shape Runner pose cycling (uses loaded animUrls as poses, freezing at first frame)
    React.useEffect(() => {
        if (source !== 'animViewer') return
        if (shapeRunnerMode === 'none' || animUrls.length === 0) return
        if (animIndex < 0) setAnimIndex(0)
        const step = () => {
            setAnimIndex(prev => {
                const N = animUrls.length
                if (N === 0) return -1
                if (prev < 0) return 0
                return shapeRunnerMode === 'cw' ? (prev + 1) % N : (prev - 1 + N) % N
            })
        }
        const id = setInterval(step, 2500)
        return () => clearInterval(id)
    }, [shapeRunnerMode, animUrls, source])
    // External bridge: listen for heroTunerCommand CustomEvents dispatched from Game App
    React.useEffect(() => {
        const handler = (e: any) => {
            const detail = e.detail
            if (!detail) return
            if (detail.type === 'shapeRunner') {
                setShapeRunnerMode(detail.mode === 'cw' ? 'cw' : detail.mode === 'ccw' ? 'ccw' : 'none')
                if (source !== 'animViewer') setSource('animViewer')
            } else if (detail.type === 'heroAction' && detail.action === 'dashBackward') {
                // Reuse existing key '3' logic (backflip/dash) from animViewer shortcut
                setShapeRunnerMode('none')
                if (source !== 'animViewer') setSource('animViewer')
                if (backflipUrl) {
                    const idxExisting = animUrls.findIndex(u => u === backflipUrl)
                    if (idxExisting >= 0) setAnimIndex(idxExisting)
                    else {
                        setAnimUrls(prev => [...prev, backflipUrl])
                        setAnimIndex(animUrls.length)
                    }
                } else {
                    const idx = animUrls.findIndex(u => /backflip|dash/i.test(u.split('/').pop() || ''))
                    if (idx >= 0) setAnimIndex(idx)
                }
            }
        }
        window.addEventListener('heroTunerCommand', handler)
        return () => window.removeEventListener('heroTunerCommand', handler)
    }, [source, animUrls, backflipUrl])
    // Cleanup object URLs for animUrls on unmount
    React.useEffect(() => {
        return () => { try { animUrls.forEach(u => { if (u.startsWith('blob:')) URL.revokeObjectURL(u) }) } catch { } }
    }, [animUrls])

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
                {(() => {
                    const isController = source === 'controller'; const isAnimViewer = source === 'animViewer'; const isPose = source === 'pose'; const isProcedural = source === 'procedural'; return (
                        <>
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
                            <label>Animation Source</label>
                            <select value={source} onChange={e => setSource(e.target.value as any)}>
                                <option value="controller">1. Anim Controller (default)</option>
                                <option value="animViewer">2. Anim Model Viewer (FBX clips)</option>
                                <option value="pose">3. Pose Viewer (GLB/FBX static)</option>
                                <option value="procedural">4. Procedural</option>
                            </select>
                            {source === 'animViewer' && <AnimViewerPanel fbxScale={fbxScale} setFbxScale={setFbxScale} urls={animUrls} setUrls={setAnimUrls} index={animIndex} setIndex={setAnimIndex} backflipUrl={backflipUrl} setBackflipUrl={setBackflipUrl} />}
                            {source === 'animViewer' && (
                                <div style={{ marginTop: 10, padding: '8px 8px', border: '1px solid #2b3b55', borderRadius: 4 }}>
                                    <strong>Viewer FX Orbs</strong><br />
                                    <label style={{ display: 'block', marginTop: 4 }}>
                                        <input type="checkbox" checked={showViewerFx} onChange={(e) => setShowViewerFx(e.currentTarget.checked)} /> Enable FX Ring
                                    </label>
                                    <label style={{ display: 'block', marginTop: 4 }}>
                                        Mode:
                                        <select value={viewerFxMode} onChange={(e) => setViewerFxMode(e.target.value as any)} style={{ marginLeft: 6 }}>
                                            <option value="atom">Atom</option>
                                            <option value="wave">Wave</option>
                                            <option value="push">Push</option>
                                            <option value="shield">Shield Stack</option>
                                        </select>
                                    </label>
                                    {viewerFxMode === 'shield' && (
                                        <label style={{ display: 'block', marginTop: 4 }}>
                                            Shield Shape:
                                            <select value={viewerFxShape} onChange={(e) => setViewerFxShape(e.target.value as any)} style={{ marginLeft: 6 }}>
                                                <option value="circle">Circle</option>
                                                <option value="diamond">Diamond</option>
                                                <option value="pyramid">Pyramid</option>
                                            </select>
                                        </label>
                                    )}
                                    <label style={{ display: 'block', marginTop: 4 }}>Count: {ensureSpec.fxCount}</label>
                                    <input type="range" min={3} max={32} value={ensureSpec.fxCount ?? 12} onChange={(e) => update('fxCount', Number(e.target.value))} />
                                    <label style={{ display: 'block', marginTop: 4 }}>Speed: {ensureSpec.fxSpeed}</label>
                                    <input type="range" min={0} max={4} step={0.05} value={ensureSpec.fxSpeed ?? 1} onChange={(e) => update('fxSpeed', Number(e.target.value))} />
                                    <label style={{ display: 'block', marginTop: 4 }}>Amplitude: {ensureSpec.fxAmplitude}</label>
                                    <input type="range" min={0} max={1.5} step={0.01} value={ensureSpec.fxAmplitude ?? 0.4} onChange={(e) => update('fxAmplitude', Number(e.target.value))} />
                                    <div style={{ marginTop: 8, borderTop: '1px solid #2b3b55', paddingTop: 6 }}>
                                        <strong>Hitbox</strong><br />
                                        <label style={{ display: 'block', marginTop: 4 }}>
                                            <input type="checkbox" checked={viewerHitboxEnabled} onChange={(e) => setViewerHitboxEnabled(e.currentTarget.checked)} /> Enable Hitbox
                                        </label>
                                        <label style={{ display: 'block', marginTop: 4 }}>
                                            <input type="checkbox" checked={viewerHitboxVisible} onChange={(e) => setViewerHitboxVisible(e.currentTarget.checked)} /> Show Hitbox Mesh
                                        </label>
                                        <label style={{ display: 'block', marginTop: 4 }}>Ring Radius: {ensureSpec.fxRingRadius}</label>
                                        <input type="range" min={0.4} max={3} step={0.01} value={ensureSpec.fxRingRadius ?? 1.2} onChange={(e) => update('fxRingRadius', Number(e.target.value))} />
                                        <label style={{ display: 'block', marginTop: 4 }}>Intensity: {ensureSpec.fxRingIntensity}</label>
                                        <input type="range" min={0} max={2} step={0.05} value={ensureSpec.fxRingIntensity ?? 0.5} onChange={(e) => update('fxRingIntensity', Number(e.target.value))} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                                            <div>
                                                <label style={{ display: 'block' }}>Scale Min: {viewerHitboxScaleMin.toFixed(2)}</label>
                                                <input type="range" min={0.2} max={2} step={0.01} value={viewerHitboxScaleMin} onChange={(e) => setViewerHitboxScaleMin(Number(e.target.value))} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block' }}>Scale Max: {viewerHitboxScaleMax.toFixed(2)}</label>
                                                <input type="range" min={0.2} max={3} step={0.01} value={viewerHitboxScaleMax} onChange={(e) => setViewerHitboxScaleMax(Number(e.target.value))} />
                                            </div>
                                        </div>
                                        <label style={{ display: 'block', marginTop: 4 }}>Pulse Speed: {viewerHitboxSpeed.toFixed(2)}</label>
                                        <input type="range" min={0} max={5} step={0.05} value={viewerHitboxSpeed} onChange={(e) => setViewerHitboxSpeed(Number(e.target.value))} />
                                        <label style={{ display: 'block', marginTop: 4 }}>Pulse Mode</label>
                                        <select value={viewerHitboxMode} onChange={(e) => setViewerHitboxMode(e.target.value as any)}>
                                            <option value="sin">Sine</option>
                                            <option value="step">Step</option>
                                            <option value="noise">Noise</option>
                                        </select>
                                    </div>
                                    <div style={{ marginTop: 8, borderTop: '1px solid #2b3b55', paddingTop: 6 }}>
                                        <strong>Shape Runner</strong><br />
                                        <p style={{ fontSize: 11, opacity: 0.85, margin: '4px 0' }}>Shape Runner: 1 = Clockwise, 2 = Counter‑Clockwise. Key 3 triggers Dash/Backflip (mapped dashBackward). Poses freeze first frame & cycle.</p>
                                        <label style={{ display: 'block', marginTop: 4 }}>Mode: {shapeRunnerMode}</label>
                                        <div style={{ fontSize: 10, opacity: 0.7 }}>Keys: 1=CW, 2=CCW (shapePose), 3=Dash/Backflip (dashBackward)</div>
                                    </div>
                                </div>
                            )}
                            {isController && (
                                <div style={{ marginTop: 8 }}>
                                    <label style={{ display: 'block', marginBottom: 6 }}>
                                        <input type="checkbox" checked={showAnimDebug} onChange={(e) => setShowAnimDebug(e.currentTarget.checked)} /> Show Debug UI (overlay)
                                    </label>
                                    <p style={{ fontSize: 12, lineHeight: 1.3 }}>
                                        <strong>Controls:</strong><br />
                                        W/ArrowUp: Run Forward<br />
                                        S/ArrowDown: Run Backward<br />
                                        A/ArrowLeft: Strafe Left<br />
                                        D/ArrowRight: Strafe Right<br />
                                        Space: Jump, Shift+Space: Wall Jump<br />
                                        J: Light Attack, K: Heavy Attack, H: Jump Attack<br />
                                        U: Special, I: Forward Charge<br />
                                        X: Death<br />
                                        1: Shape Runner (Clockwise pose)<br />
                                        2: Shape Runner (Counter‑Clockwise pose)<br />
                                        3: Dash Back / Backflip (dashBackward)
                                    </p>
                                    <div style={{ marginTop: 6, padding: 6, border: '1px solid #2b3b55' }}>
                                        <strong>Input Status</strong>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: 6, fontSize: 12 }}>
                                            {['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', ' ', 'shift', 'j', 'k', 'h', 'u', 'i', 'x', '1', '2', '3'].map(k => (
                                                <div key={k} style={{ padding: '4px 6px', borderRadius: 4, textAlign: 'center', background: pressed[k] ? '#2d5bff' : 'transparent', border: '1px solid #2b3b55' }}>
                                                    {k === ' ' ? 'Space' : k}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <label>Anim Scale: {fbxScale.toFixed(3)}</label>
                                    <input type="range" step={0.001} min={0.001} max={1} value={fbxScale} onChange={e => setFbxScale(Number(e.target.value))} />
                                    <label style={{ display: 'block', marginTop: 6 }}><input type="checkbox" checked={useLitePack} onChange={e => setUseLitePack(e.target.checked)} /> Use Lite Sword+Shield Pack</label>
                                    {/* Simple point-and-click remapper */}
                                    <div style={{ marginTop: 8, borderTop: '1px solid #2b3b55', paddingTop: 8 }}>
                                        <strong>Remap Actions (FBX)</strong>
                                        {[
                                            ['idle', 'Idle'],
                                            ['runForward', 'Run Forward'],
                                            ['runBackward', 'Run Backward'],
                                            ['strafeLeft', 'Strafe Left'],
                                            ['strafeRight', 'Strafe Right'],
                                            ['jump', 'Jump'],
                                            ['jumpWall', 'Wall Jump'],
                                            ['attackLight', 'Attack Light'],
                                            ['attackHeavy', 'Attack Heavy'],
                                            ['attackSpecial', 'Attack Special'],
                                            ['attackCharge', 'Attack Forward Charge'],
                                        ].map(([key, label]) => (
                                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                <span style={{ width: 160 }}>{label}</span>
                                                <input type="file" accept=".fbx" onChange={(e) => {
                                                    const f = e.target.files?.[0]; if (!f) return;
                                                    const url = URL.createObjectURL(f)
                                                        // store in session state map attached to window for simplicity
                                                        ; (window as any).__heroUserMap = {
                                                            ...(window as any).__heroUserMap,
                                                            [key]: url
                                                        }
                                                }} />
                                            </div>
                                        ))}
                                        {/* attackJump supports two files */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                            <span style={{ width: 160 }}>Attack Jump (2 files)</span>
                                            <input type="file" accept=".fbx" multiple onChange={(e) => {
                                                const files = e.target.files; if (!files || files.length === 0) return;
                                                const urls = Array.from(files).slice(0, 2).map(f => URL.createObjectURL(f))
                                                    ; (window as any).__heroUserMap = {
                                                        ...(window as any).__heroUserMap,
                                                        attackJump: urls
                                                    }
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {isPose && (
                                <div style={{ marginTop: 8 }}>
                                    <PosePanel />
                                    <div style={{ marginTop: 6 }}>
                                        <input type="file" accept=".glb,.gltf,.fbx" onChange={(e: any) => {
                                            const f = e.target.files?.[0]; if (!f) return
                                            const u = URL.createObjectURL(f)
                                            setPoseUrl(u)
                                        }} />
                                    </div>
                                    <div style={{ marginTop: 6 }}>
                                        <label>Pose Scale: {poseScale.toFixed(3)}</label>
                                        <input type="range" min={0.01} max={5} step={0.01} value={poseScale} onChange={(e) => setPoseScale(Number(e.target.value))} />
                                    </div>
                                </div>
                            )}

                            {/* Procedural-only controls */}
                            {isProcedural && (
                                <>

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
                                                setSpec(prev => ({
                                                    ...(prev ?? ensureSpec), joint: {
                                                        shoulderBaseXDeg: -8, elbowBaseXDeg: 10, hipBaseXDeg: 4, kneeBaseXDeg: 6,
                                                        shoulderXMinDeg: -60, shoulderXMaxDeg: 60,
                                                        elbowXMinDeg: -5, elbowXMaxDeg: 135,
                                                        hipXMinDeg: -50, hipXMaxDeg: 50,
                                                        kneeXMinDeg: 0, kneeXMaxDeg: 140,
                                                    }
                                                }))
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

                                </>
                            )}
                        </>
                    )
                })()}
            </aside>

            <Canvas camera={{ position: [0, 1.6, 3.4], fov: 46 }}>
                {/* Performance collection for Hero Tuner */}
                <PerfCollector enabled={true} />
                <PerfLongTaskObserver enabled={true} />
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
                    {source === 'controller' && (
                        <HeroAnimTester
                            anims={(window as any).__heroUserMap ?? (useLitePack ? liteSwordShieldMap : defaultAnimMap())}
                            scale={fbxScale}
                            showDebugPanel={showAnimDebug}
                        />
                    )}
                    {source === 'animViewer' && (
                        <group>
                            <MultiFBXAnimViewer
                                url={animIndex >= 0 ? animUrls[animIndex] : undefined}
                                scale={fbxScale}
                                freezeAtFirstFrame={shapeRunnerMode !== 'none'}
                                onReady={({ object, hips }) => {
                                    setViewerFollowTarget(hips || object)
                                }}
                            />
                            {showViewerFx && (
                                <FXOrbs
                                    spec={{ ...ensureSpec, fxRing: true, fxMode: viewerFxMode, fxShieldShape: viewerFxShape }}
                                    quality={ensureSpec.quality ?? 'high'}
                                    forceShow
                                    followTarget={viewerFollowTarget}
                                    hitboxEnabled={viewerHitboxEnabled}
                                    hitboxVisible={viewerHitboxVisible}
                                    hitboxScaleMin={viewerHitboxScaleMin}
                                    hitboxScaleMax={viewerHitboxScaleMax}
                                    hitboxSpeed={viewerHitboxSpeed}
                                    hitboxMode={viewerHitboxMode}
                                />
                            )}
                        </group>
                    )}
                    {source === 'pose' && (
                        <group>
                            <PoseViewer url={poseUrl} scale={poseScale} onReady={({ object, hips }) => setViewerFollowTarget(hips || object)} />
                            {showViewerFx && (
                                <FXOrbs
                                    spec={{ ...ensureSpec, fxRing: true, fxMode: viewerFxMode, fxShieldShape: viewerFxShape }}
                                    quality={ensureSpec.quality ?? 'high'}
                                    forceShow
                                    followTarget={viewerFollowTarget}
                                    hitboxEnabled={viewerHitboxEnabled}
                                    hitboxVisible={viewerHitboxVisible}
                                    hitboxScaleMin={viewerHitboxScaleMin}
                                    hitboxScaleMax={viewerHitboxScaleMax}
                                    hitboxSpeed={viewerHitboxSpeed}
                                    hitboxMode={viewerHitboxMode}
                                />
                            )}
                        </group>
                    )}
                </group>
                {/* Axis widget (X/Y/Z) in the viewport corner */}
                <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                    <GizmoViewport axisColors={["#FF3653", "#8ADB00", "#2C8FFF"]} labelColor="white" />
                </GizmoHelper>
                <TrackedOrbitControls enablePan={false} />
            </Canvas>
            {/* Toggle with F9 */}
            <PerfOverlay enabled={showPerf} />
        </div>
    )
}

// Wrap OrbitControls to record per-frame update cost (tiny but visible when interacting)
function TrackedOrbitControls(props: any) {
    return (
        <>
            <OrbitControls {...props} />
            <OrbitPerfTick />
        </>
    )
}
function OrbitPerfTick() {
    // Each frame, emit a tiny measure so you can correlate interactions in the overlay
    // This doesn't measure OrbitControls internal cost precisely, but provides a visible lane
    // for camera manipulation periods.
    useFrame(() => { perf.start('orbit_controls_update'); perf.end('orbit_controls_update') })
    return null
}
