import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Group, BoxGeometry, MeshBasicMaterial, Mesh } from 'three'
import { SkeletonUtils } from 'three-stdlib'
import { useFBX, useAnimations, Html, Stats, AdaptiveDpr } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
// Import a sample clip so even the default map resolves to a bundled URL
import sampleRunBack from '../../assets/models/dr_dokta_anim_poses/Standing Run Back.fbx'

type ActionName =
  | 'idle'
  | 'runForward'
  | 'runBackward'
  | 'strafeLeft'
  | 'strafeRight'
  | 'attackLight'
  | 'attackHeavy'
  | 'attackJump'
  | 'attackSpecial'
  | 'attackCharge'
  | 'jump'
  | 'jumpWall'
  | 'death'

export type HeroAnimMap = Partial<Record<ActionName, string | string[]>>

function FBXAction({ url, active, scale = 0.01, onStatus, suppressWarnings = true, fade = 0, dumpToken, disableClone = false }: { url: string, active: boolean, scale?: number, onStatus?: (s:string)=>void, suppressWarnings?: boolean, fade?: number, dumpToken?: number, disableClone?: boolean }) {
  // Optionally suppress noisy FBX skinning warnings (benign; Three supports max 4 influences)
  useEffect(() => {
    if (!suppressWarnings) return
    const prev = console.warn
    const prefix = 'THREE.FBXLoader: Vertex has more than 4 skinning weights'
    console.warn = (...args: any[]) => {
      const msg = args?.[0]
      if (typeof msg === 'string' && msg.startsWith(prefix)) return
      prev(...args)
    }
    return () => { console.warn = prev }
  }, [suppressWarnings])
  const fbx = useFBX(url) as any
  const group = useRef<Group>(null!)
  // Create a unique deep clone so the same FBX URL can be used by multiple actions without reparenting flicker
  const cloned = useMemo(() => (fbx ? SkeletonUtils.clone(fbx) : null), [fbx]) as any
  const rootObj = useMemo(() => (disableClone ? fbx : cloned), [disableClone, fbx, cloned])
  // Bind animations directly to the rendered root object (clone or original) to ensure track target nodes resolve
  const { actions, names } = useAnimations(fbx?.animations || [], rootObj as any)
  // Cache first clip reference + playing state
  const clipRef = useRef<any>(null)
  const playingRef = useRef<boolean>(false)
  const prevUrlRef = useRef<string>(url)
  useEffect(() => {
    // If URL changed, force stop previous clip so new one can start cleanly
    if (url !== prevUrlRef.current) {
      try { clipRef.current?.stop() } catch {}
      playingRef.current = false
      prevUrlRef.current = url
    }
    // Update clip ref when animation list changes
    if (names?.[0] && actions?.[names[0]]) {
      clipRef.current = actions[names[0]]
      // Attempt autoplay when active and not already playing
      if (active && !playingRef.current) {
        clipRef.current.reset()
        if (fade > 0) clipRef.current.fadeIn(fade)
        clipRef.current.play()
        playingRef.current = true
      }
    }
  }, [actions, names, url, active, fade])

  // Report load once per URL
  const loadedReported = useRef<string | null>(null)
  useEffect(() => {
    const childCount = (rootObj?.children?.length || 0)
    if (rootObj && loadedReported.current !== url) {
      // loaded once; avoid logging to prevent state churn
      loadedReported.current = url
    }
  }, [rootObj, fbx, url])

  // Advise if a non-imported "src/..." path is provided (won't resolve at runtime in Vite)
  useEffect(() => {
    // Silent now to avoid render loops from status logging
  }, [url])

  // React to active flag directly (safe: we do not set React state here)
  useEffect(() => {
    const clip = clipRef.current
    if (!clip) return
    if (active && !playingRef.current) {
      clip.reset()
      if (fade > 0) clip.fadeIn(fade)
      clip.play()
      playingRef.current = true
    } else if (!active && playingRef.current) {
      try { clip.stop() } catch {}
      playingRef.current = false
    }
    return () => {
      try { clip?.stop() } catch {}
      playingRef.current = false
    }
  }, [active, fade])

  // Dump clip info on request
  useEffect(() => {
    if (!dumpToken) return
    if (!active) return
    const anims = fbx?.animations || []
    const summary: string[] = []
    summary.push(`dump:${url} clips:${anims.length}`)
    if (anims.length > 0) {
      const clip = anims[0]
      summary.push(` clip[0]: name:"${clip?.name || 'unnamed'}" duration:${clip?.duration?.toFixed?.(3) || clip?.duration}s tracks:${clip?.tracks?.length || 0}`)
      const tracks = clip?.tracks || []
      const maxReport = Math.min(5, tracks.length)
      let totalKeys = 0
      for (let i = 0; i < maxReport; i++) {
        const t: any = tracks[i]
        const keys = Array.isArray(t?.times) ? t.times.length : (t?.times?.length || 0)
        totalKeys += keys
        summary.push(`  - track[${i}]: ${t?.name || 'track'} type:${t?.ValueTypeName || t?.constructor?.name} keys:${keys}`)
      }
      if (tracks.length > maxReport) summary.push(`  ... ${tracks.length - maxReport} more tracks hidden`)
      summary.push(` totalKeys(first ${maxReport}): ${totalKeys}`)
    }
  summary.forEach(s => onStatus?.(s))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dumpToken])

  // Fallback placeholder cube if model has no children
  const showPlaceholder = (rootObj?.children?.length ?? 0) === 0
  const placeholder = useMemo(() => {
    if (!showPlaceholder) return null
    const geom = new BoxGeometry(1,1,1)
    const mat = new MeshBasicMaterial({ color: 0xff00ff, wireframe: true })
    return new Mesh(geom, mat)
  }, [showPlaceholder])

  return <group ref={group} scale={[scale, scale, scale]} visible={active} frustumCulled={false}>
    {rootObj && <primitive object={rootObj} />}
    {showPlaceholder && placeholder && <primitive object={placeholder} />}
  </group>
}

export function HeroAnimTester({
  anims,
  scale = 0.01,
  debug = true,
  onlyCurrentMount = true,
  fade = 0,
}: {
  anims: HeroAnimMap,
  scale?: number,
  debug?: boolean,
  /** When true, only mount the currently active action's FBX to avoid multiple mixers */
  onlyCurrentMount?: boolean,
  /** Crossfade duration seconds; set 0 to hard switch */
  fade?: number,
}) {
  // Track keyboard input and map to a desired action
  const keysRef = useRef<{[k:string]: boolean}>({})
  const [current, setCurrent] = useState<ActionName>('idle')
  const [variant, setVariant] = useState<{[K in ActionName]?: number}>({})
  const [statusLog, setStatusLog] = useState<string[]>([])
  const [fadeDur, setFadeDur] = useState<number>(fade)
  const [currentOnly, setCurrentOnly] = useState<boolean>(onlyCurrentMount)
  const [showStats, setShowStats] = useState<boolean>(false)
  const [useAdaptiveDpr, setUseAdaptiveDpr] = useState<boolean>(false)
  const [frameLoopMode, setFrameLoopMode] = useState<'always' | 'demand'>('always')
  const [fps, setFps] = useState<number>(0)
  const three = useThree() as any
  const setFrameloop = three?.setFrameloop
  // Isolation (single FBX) mode
  const [isolation, setIsolation] = useState<boolean>(false)
  const [isoUrl, setIsoUrl] = useState<string | null>(null)
  const [isoScale, setIsoScale] = useState<number>(scale)
  const prevIsoUrl = useRef<string | null>(null)
  const [dumpToken, setDumpToken] = useState<number>(0)
  const [disableClone, setDisableClone] = useState<boolean>(false)

  // Cleanup object URLs
  useEffect(() => {
    if (prevIsoUrl.current && prevIsoUrl.current.startsWith('blob:') && prevIsoUrl.current !== isoUrl) {
      try { URL.revokeObjectURL(prevIsoUrl.current) } catch {}
    }
    prevIsoUrl.current = isoUrl
    return () => {
      if (prevIsoUrl.current && prevIsoUrl.current.startsWith('blob:')) {
        try { URL.revokeObjectURL(prevIsoUrl.current) } catch {}
      }
    }
  }, [isoUrl])

  // Sync external fade prop
  useEffect(() => { setFadeDur(fade) }, [fade])
  const pushStatus = useCallback((s:string)=> setStatusLog(l => {
    const next = [...l, s]
    return next.slice(-10) // keep last 10
  }), [])

  const onDown = useCallback((e: KeyboardEvent) => {
    keysRef.current[e.key.toLowerCase()] = true
  }, [])
  const onUp = useCallback((e: KeyboardEvent) => {
    keysRef.current[e.key.toLowerCase()] = false
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [onDown, onUp])

  // FPS counter (smoothed + throttled to avoid update depth/render storms)
  const fpsSmooth = useRef<number>(0)
  const fpsAcc = useRef<number>(0)
  useFrame((state: any, delta: number) => {
    const instFps = 1 / Math.max(1e-6, delta)
    fpsSmooth.current = fpsSmooth.current ? fpsSmooth.current * 0.9 + instFps * 0.1 : instFps
    fpsAcc.current += delta
    if (fpsAcc.current >= 0.25) { // update 4x/sec
      setFps(fpsSmooth.current)
      fpsAcc.current = 0
    }
  })

  // Decide action based on keys each 50ms
  useEffect(() => {
    const id = setInterval(() => {
      const k = keysRef.current
      const pressed = (n: string) => !!(k[n])
      const w = pressed('w') || pressed('arrowup')
      const s = pressed('s') || pressed('arrowdown')
      const a = pressed('a') || pressed('arrowleft')
      const d = pressed('d') || pressed('arrowright')
      const space = pressed(' ') || pressed('space')
      const shift = pressed('shift')
      const j = space
      const attackLightKey = pressed('j')
      const attackHeavyKey = pressed('k')
      const attackJumpKey = pressed('h')
      const attackSpecialKey = pressed('u')
      const attackChargeKey = pressed('i')
      const attack = attackLightKey || attackHeavyKey
      const dead = pressed('x') // X to trigger death test

      let next: ActionName = 'idle'
      if (dead) next = 'death'
      else if (shift && j) next = 'jumpWall'
      else if (j) next = 'jump'
      else if (attackSpecialKey) next = 'attackSpecial'
      else if (attackChargeKey) next = 'attackCharge'
      else if (attackJumpKey) next = 'attackJump'
      else if (attack) next = attackHeavyKey ? 'attackHeavy' : 'attackLight'
      else if (w) next = 'runForward'
      else if (s) next = 'runBackward'
      else if (a) next = 'strafeLeft'
      else if (d) next = 'strafeRight'

      if (next !== current) {
        setCurrent(next)
        if (next === 'attackJump') {
          const sources = anims.attackJump
          const count = Array.isArray(sources) ? sources.length : 1
          const idx = Math.floor(Math.random() * Math.max(1, count))
          setVariant(v => ({ ...v, attackJump: idx }))
        }
        pushStatus(`action:${next}`)
      }
    }, 50)
    return () => clearInterval(id)
  }, [current, pushStatus, anims])

  // Prepare a list of action to source (string or string[]). We resolve URL at render time in ResolvedAction.
  const items = useMemo(() => {
    const m: [ActionName, string | string[] ][] = []
    const push = (name: ActionName) => { const u = anims[name]; if (u) m.push([name, u]) }
    push('idle')
    push('runForward')
    push('runBackward')
    push('strafeLeft')
    push('strafeRight')
    push('attackLight')
    push('attackHeavy')
    push('attackJump')
    push('attackSpecial')
    push('attackCharge')
    push('jump')
    push('jumpWall')
    push('death')
    return m
  }, [anims])

  // Helper to resolve URL for a given action/variant without creating a nested component (avoids remount churn)
  const resolveUrl = useCallback((name: ActionName, src: string | string[]) => {
    const idx = variant[name] ?? 0
    return Array.isArray(src) ? src[Math.max(0, Math.min(idx, src.length - 1))] : src
  }, [variant])

  return (
    <group>
      {useAdaptiveDpr && <AdaptiveDpr pixelated />}
      {showStats && <Stats showPanel={0} className="r3f-stats" />}
      {isolation ? (
        isoUrl ? (
          <FBXAction url={isoUrl} active scale={isoScale} onStatus={pushStatus} suppressWarnings fade={fadeDur} dumpToken={dumpToken} disableClone={disableClone} />
        ) : null
      ) : currentOnly ? (
        (() => {
          // Resolve url for current, fallback to idle if missing
          const src = anims[current]
          const resolvedName: ActionName = (src ? current : (anims.idle ? 'idle' : current))
          const fallbackSrc = src || anims.idle
          if (!fallbackSrc) return null
          const url = resolveUrl(resolvedName, fallbackSrc)
          return (
            <FBXAction key={`${resolvedName}`} url={url} active={true} scale={scale} onStatus={pushStatus} suppressWarnings fade={fadeDur} dumpToken={dumpToken} disableClone={disableClone} />
          )
        })()
      ) : (
        items.map(([name, src]) => {
          const url = resolveUrl(name, src)
          return (
            <FBXAction key={name} url={url} active={current === name} scale={scale} onStatus={pushStatus} suppressWarnings fade={fadeDur} dumpToken={dumpToken} disableClone={disableClone} />
          )
        })
      )}
      {debug && (
        <Html position={[0,2*scale,0]} style={{pointerEvents:'auto'}}>
          <div style={{background:'rgba(0,0,0,0.55)',padding:'6px 8px',fontSize:12,lineHeight:'16px',maxWidth:340,color:'#fff',borderRadius:4}}>
            <strong>Anim Debug</strong><br/>
            Current: {current}<br/>
            FPS: {fps.toFixed(0)} | Mount: {currentOnly ? 'current' : 'all'}<br/>
            Fade: {fadeDur.toFixed(2)}s
            <input type="range" min={0} max={0.5} step={0.05} value={fadeDur}
              onChange={(e) => setFadeDur(parseFloat((e.target as HTMLInputElement).value))}
              style={{ width: 160, verticalAlign:'middle', marginLeft: 8 }} />
            <div style={{marginTop:6}}>
              <label style={{marginRight:10}}>
                <input type="checkbox" checked={showStats} onChange={(e)=>setShowStats(e.currentTarget.checked)} /> Stats (drei)
              </label>
              <label style={{marginRight:10}}>
                <input type="checkbox" checked={useAdaptiveDpr} onChange={(e)=>setUseAdaptiveDpr(e.currentTarget.checked)} /> AdaptiveDpr
              </label>
              <label>
                <input type="checkbox" checked={!currentOnly} onChange={(e)=>{
                  setCurrentOnly(!e.currentTarget.checked ? true : false)
                }} /> Mount all actions
              </label>
            </div>
            <div style={{marginTop:8,paddingTop:6,borderTop:'1px solid rgba(255,255,255,0.2)'}}>
              <strong>Isolation test (single FBX)</strong><br/>
              <label style={{marginRight:10}}>
                <input type="checkbox" checked={isolation} onChange={(e)=> setIsolation(e.currentTarget.checked)} /> Enable isolation mode
              </label>
              <div style={{marginTop:6}}>
                <input type="file" accept=".fbx" onChange={(e:any) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const url = URL.createObjectURL(file)
                  setIsoUrl(url)
                  pushStatus(`iso:file:${file.name}`)
                }} />
              </div>
              <div style={{marginTop:6}}>
                <label>
                  <input type="checkbox" checked={disableClone} onChange={(e)=> setDisableClone(e.currentTarget.checked)} /> Disable Skeleton Clone
                </label>
              </div>
              <div style={{marginTop:6}}>
                <input type="text" placeholder="Paste FBX URL" value={isoUrl || ''}
                  onChange={(e:any)=> setIsoUrl(e.target.value || null)} style={{width: '100%'}} />
              </div>
              <div style={{marginTop:6}}>
                Scale: {isoScale}
                <input type="range" min={0.001} max={0.1} step={0.001} value={isoScale}
                  onChange={(e) => setIsoScale(parseFloat((e.target as HTMLInputElement).value))}
                  style={{ width: 160, verticalAlign:'middle', marginLeft: 8 }} />
              </div>
              <div style={{marginTop:6}}>
                <button onClick={() => setDumpToken(t => t + 1)}>Dump Clip Info</button>
              </div>
              <div style={{fontSize:11,opacity:0.9,marginTop:4}}>
                Isolation renders one FBX with a single mixer. If stutter persists here, it likely comes from the file or loader, not the controller.
              </div>
            </div>
            <div style={{marginTop:6}}>
              Frameloop:
              <label style={{marginLeft:8,marginRight:6}}>
                <input type="radio" name="frameloop" checked={frameLoopMode==='always'} onChange={() => {
                  setFrameLoopMode('always')
                  try { setFrameloop?.('always') } catch {}
                }} /> always
              </label>
              <label>
                <input type="radio" name="frameloop" checked={frameLoopMode==='demand'} onChange={() => {
                  setFrameLoopMode('demand')
                  try { setFrameloop?.('demand') } catch {}
                }} /> demand
              </label>
              <div style={{fontSize:11,opacity:0.9,marginTop:4}}>
                Tip: "always" renders every frame (smoothest). "demand" renders only on updates; call invalidate() when state changes for best perf.
              </div>
            </div>
            <div style={{marginTop:8}}>
              <strong>Log</strong>
              {statusLog.map((s,i)=>(<div key={i}>{s}</div>))}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

// A convenience default map that points unknown actions to the provided sample
export function defaultAnimMap(baseDir = 'src/assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack') : HeroAnimMap {
  // NOTE: replace the placeholders below with exact filenames present in your pack.
  // For now we reuse the known sample Standing Run Back for demonstration.
  const runBack = sampleRunBack
  return {
    idle: runBack,
    runForward: runBack,
    runBackward: runBack,
    strafeLeft: runBack,
    strafeRight: runBack,
    attackLight: runBack,
    attackHeavy: runBack,
    jump: runBack,
    death: runBack,
  }
}
