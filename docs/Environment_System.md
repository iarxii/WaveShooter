# Environment System (HDRI Themes + Dynamic Arena Hazards)

The environment layer combines HDRI-driven global illumination with a dynamic, animated arena surface and timed hazards (pillars, holes, pulses) to keep gameplay visually and mechanically engaging.

## Core Capabilities

### Static / Thematic Lighting
* HDRI image-based lighting via `@react-three/drei/Environment` (PMREM processed)
* Smooth exposure tweening per theme (renderer `toneMappingExposure` interpolation)
* Theme-defined fog (linear or exp2) swapped on theme change
* Optional HDRI as background (skybox) when `background: true`
* Ambient light accent (low-intensity fill) per theme

### Dynamic Arena & Hazards
* Shader-driven arena floor with pulsations, vein emissive patterns, ripple pulses
* Telegraph rings (emissive) before hazards activate
* Rising / falling instanced pillars that obstruct movement
* Opening floor holes (apertures) that drop actors
  * Player: respawn above arena with 5% HP reduction
  * Enemies: immediately die (fall cleanup + FX/SFX)
* Pulse events (visual + optional slight camera shake / low-frequency rumble)
* Wave or random scheduler controlling hazard cadence & intensity
* Theme-aware colors and hazard profiles (frequency, intensity, emissive hues)

## Available Themes (Initial)
* Hospital Room — neutral indoor clinical light
* Surgery Suite — bright cold indoor light
* Outdoor Puresky — outdoor, can enable HDRI background

Additions for dynamic arena: each theme may define `arenaColors` and `hazardProfile` to influence visuals and timing (see configuration section below).

HDRIs live in `src/assets/hdri/`.

## Adding / Editing a Theme
1. Place new `.hdr` in `src/assets/hdri/`.
2. Extend `src/environments/environments.ts` and add/update a spec:
   * `id`: unique string
   * `label`: display name
   * `hdri`: imported path
   * `background?`: boolean
   * `exposure`: target exposure (≈ 0.8–1.4 typical)
   * `fog?`: `{ type: 'linear', near, far }` or `{ type: 'exp2', density }`
   * `ambient?`: `{ color: string | number, intensity: number }`
   * `arenaColors?`: `{ base, veins, telegraph, pillar, hole }` (colors as hex or number)
   * `hazardProfile?`: `{ frequency: number, maxConcurrent: number, minSpacing: number, pulseAmplitude: number }`
   * `fogPulse?`: optional `{ enabled: boolean, strength: number }` to modulate fog density on pulses

Theme selector auto-populates in the NavBar; dynamic arena colors & rates adjust instantly when switching.

## Dynamic Arena Architecture

### Components & Modules (planned / in progress)
* `ArenaSurface.tsx` — Renders shader ground, manages pulses & telegraph rings
* `DynamicHazards.ts` — Orchestrates hazard scheduling (pillars, holes, pulses)
* `hazards/types.ts` — Type definitions for `HazardEvent` and hazard configs
* `PillarInstanced.tsx` — Instanced pillar mesh manager (rise/fall animation)
* Integration hooks in `EnvironmentContext.tsx` exposing an events API

### Hazard Event Model
```
HazardEvent {
  id: string
  kind: 'pulse' | 'pillar' | 'hole'
  position: [x, z] | Array<[x, z]> // clusters
  radius?: number
  startAt: number // ms timestamp or relative
  duration: number
  telegraphTime: number // ms before activation
  intensity?: number // 0–1 visual/emissive scaling
}
```

### Events API (EnvironmentContext)
```ts
triggerPulse(pos: [number, number], opts)
spawnPillars(clusterSpec)
openHole(pos: [number, number], opts)
setHazardMode(modeConfig)
```

### Player & Enemy Interaction
* Falling threshold (y < configured fallY) triggers `onFall(actor)`
* Player: respawn above arena center (or last safe pos) with 5% health penalty
* Enemy: flagged dead with cause 'fall'; credit awarded; FX/SFX emitted

### Telegraphing & Feedback
* Emissive ring grows / fades during `telegraphTime`
* Slight shader color shift or vein brightness surge on activation
* Optional screen shake + low-frequency sound for high-intensity pulses

## Rendering & Shaders
* Vertex displacement (low amplitude) for breathing effect (sine over time)
* Fragment effects:
  * Vein mask from simple noise / distance fields
  * Ripple pulses from expanding circles (time-based radius)
  * Telegraph ring: additive emissive color lerp
* Uniform batching: `time`, `pulseEvents[] (center + startTime)`, intensity scalars
* Instanced pillars share material; per-instance attributes for rise progress
* Holes: use radial mask (clip/discard or alpha blend) + depth fallback; optionally geometry scaling

## Performance Considerations
* GPU instancing for pillars (one draw call) — keep geometry simple (≤ 64 verts)
* Limit simultaneous active pulses & holes (cap via `hazardProfile.maxConcurrent`)
* Use lightweight noise (value / fbm with ≤2 octaves) to avoid shader ALU spikes
* Time-slice scheduling to avoid creating multiple hazards in the same frame
* Profiling via `PerfOverlay` & `PerfCollector` components

## Transitions
* Exposure tween: lerp renderer `toneMappingExposure` to new theme target
* Fog preset swapped; optional `fogPulse` modulates density briefly during pulses
* Arena shaders update color uniforms gradually (smooth color lerp over ~0.5s)
* Future upgrade: dual PMREM blend for true HDRI crossfade

## Files (Current & Planned)
* `src/contexts/EnvironmentContext.tsx` — Theme state + hazard events API
* `src/environments/environments.ts` — Theme specs (extended with arena & hazard fields)
* `src/components/NavBar.jsx` — Theme & dynamic arena toggles
* `src/environments/ArenaSurface.tsx` — Shader ground (planned)
* `src/environments/DynamicHazards.ts` — Scheduler (planned)
* `src/environments/hazards/types.ts` — Types (planned)
* `src/environments/pillars/PillarInstanced.tsx` — Pillar renderer (planned)
* `vite.config.js` — Asset inclusion (`**/*.hdr`)
* `src/types/assets.d.ts` — Declares `*.hdr`

## Extending Further (Next Steps)
* True HDRI crossfade (dual environment blend or custom probe lerp)
* Wave-scripted hazard narrative (boss phase intensification)
* Color grading LUT per theme via postprocessing chain
* Procedural Lightformers for indoor bounce / accent lighting
* Adaptive difficulty: hazard frequency scales with player performance
* Arena topology changes (progressive elevation, moving sectors)

## Quick Implementation Checklist
1. Extend theme objects with `arenaColors`, `hazardProfile`
2. Add `ArenaSurface` with initial pulse visual
3. Wire basic `triggerPulse` into context
4. Implement hole logic & fall handling (player respawn penalty / enemy death)
5. Add instanced pillars & scheduler
6. Add UI toggles & debug tools
7. Integrate sound + screen shake hooks
8. Optimize & profile

---
Use this document as the authoritative reference when extending or tuning the environment or hazards. Keep it updated as features land.

## Shader Park Integration for Environments

The current limitation: the sample Shader Park scripts you copied are not compiling because they rely on the full Shader Park DSL runtime (ray‑march context + helper intrinsics) that the npm package does not auto‑inject when you just pass raw source text. Functions like mirrorN, setMaxIterations, sphere(), noise(), box(), mixGeo(), etc. exist only inside the interpreter’s internal DSL scope reconstructed by createSculpture. Supplying a bare string directly to sculpt/glsl converters without wrapping it in the expected function signature causes ReferenceErrors and fallback.

Key constraints causing your ground shaders not to appear as intended:
1. DSL context missing: The code snippets from shaderpark.com are fragments executed inside their online runtime where all DSL helpers are globally injected. The npm module expects either:
   createSculpture(() => { /* DSL calls here */ })
   or sculptToThreeJSMaterial(codeWrappedFunction)
   You are feeding plain text, so those global helpers aren’t defined.
2. Mixed styles: PlasmaSphere.js looks like a GLSL / SDF style (defines shade, surfaceDistance). Others (BumpyPlanetoid/VoidMaterial/Turbulence) use pure DSL calls. They require different compile paths (glslToThreeJSMaterial vs sculptToThreeJSMaterial). Auto‑detection failed.
3. Plane usage vs ray-march: Shader Park materials are written to ray-march a 3D shape in the fragment shader. Applying them directly to a large horizontal plane makes the “sculpt” appear as a flattened color field (or causes discard / depth artifacts), not the intended volumetric look. The canonical approach is a full‑screen quad (covering view) or a centered object; for a ground you need to adapt color logic (sample shade() at a fixed y-slice).
4. Flicker / z-fighting: Fallback + previous arena material both tried to render; depth writes and polygon offset changes produced flicker. Ray-marched materials often rely on disabling depthTest and drawing last.
5. Fog + camera: TopDown / StaticCamera large distance amplifies fog effect; when you darken environment, the ray-marched colors get washed, making it look like “not working.”

You have three viable paths to get true Shader Park look on the arena:

Option A (Recommended): Render Shader Park code to an offscreen full-screen quad as the background; keep a separate invisible physics ground plane for gameplay. This preserves the sculpt visuals without needing to “project” them onto geometry.

Option B: Sample the SDF/ray-march at a fixed horizontal slice. Modify the generated fragment shader: instead of marching along view ray, evaluate color at plane height (y = 0) using the DSL noise/color logic to produce a 2D procedural texture. This requires editing generated shader source before material creation.

Option C: Use Shader Park only to produce a dynamic texture (via WebGLRenderTarget + full-screen pass), then map that texture onto a standard plane (MeshStandardMaterial or ShaderMaterial) for the arena. Least invasive to gameplay systems.

Below is a concrete integration for Option C: compile DSL, render to target each frame, apply resulting texture to the arena plane.

````tsx
// ...existing code...
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { compileSculptCode } from './ShaderParkCompiler' // new helper (see below)
import plasmaSrc from './sample_shaders/PlasmaSphere.js?raw'
import planetoidSrc from './sample_shaders/BumpyPlanetoid.js?raw'
import voidSrc from './sample_shaders/VoidMaterial.js?raw'
import turbSrc from './sample_shaders/Turbulence.js?raw'
import { useEnvironment } from '../contexts/EnvironmentContext'

const MAP: Record<string,string> = {
  proc_hazard_hospital: plasmaSrc,
  proc_hazard_lab: planetoidSrc,
  proc_blue_sky: voidSrc,
  proc_darkmode: turbSrc,
  hospital_room: planetoidSrc,
  surgery_suite: planetoidSrc,
  outdoor_puresky: planetoidSrc
}

export function ShaderParkGround({ size=200 }) {
  const { envId } = useEnvironment()
  const { gl } = useThree()
  const materialRef = useRef<THREE.ShaderMaterial|null>(null)
  const planeRef = useRef<THREE.Mesh|null>(null)
  const rt = useMemo(()=> new THREE.WebGLRenderTarget(512,512,{ generateMipmaps:true }),[])
  const quadScene = useMemo(()=> new THREE.Scene(),[])
  const quadCam = useMemo(()=> new THREE.OrthographicCamera(-1,1,1,-1,0,1),[])
  const quadMesh = useRef<THREE.Mesh>()

  // Compile once per env change
  useEffect(()=>{
    const src = MAP[envId] || planetoidSrc
    const sculptMat = compileSculptCode(src)
    // Build full-screen quad for offscreen render
    if (quadMesh.current) {
      quadScene.remove(quadMesh.current)
    }
    quadMesh.current = new THREE.Mesh(
      new THREE.PlaneGeometry(2,2),
      sculptMat
    )
    quadScene.add(quadMesh.current)
    // Assign texture as map on arena shader material
    if (materialRef.current) {
      materialRef.current.uniforms.uTex.value = rt.texture
    }
  },[envId])

  const arenaMat = useMemo(()=> new THREE.ShaderMaterial({
    uniforms: {
      uTex: { value: rt.texture },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uTex;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec3 col = texture2D(uTex, vUv).rgb;
        // Mild pulse mod
        col += 0.05 * sin(uTime*0.8);
        gl_FragColor = vec4(col,1.0);
      }
    `,
    side: THREE.DoubleSide
  }),[rt.texture])

  useEffect(()=> { materialRef.current = arenaMat }, [arenaMat])

  useFrame((_,dt)=>{
    if (materialRef.current) materialRef.current.uniforms.uTime.value += dt
    // Render Shader Park sculpt to target
    gl.setRenderTarget(rt)
    gl.clear()
    gl.render(quadScene, quadCam)
    gl.setRenderTarget(null)
  })

  return (
    <mesh ref={planeRef} rotation={[-Math.PI/2,0,0]} position={[0,-0.02,0]}>
      <planeGeometry args={[size,size,1,1]} />
      <primitive object={arenaMat} attach="material" />
    </mesh>
  )
}
// ...existing code...
````

Add a proper sculpt compiler wrapper:

````ts
// ...existing code...
import * as THREE from 'three'
import * as SP from 'shader-park-core'

// Detect if source resembles GLSL (has surfaceDistance or shade)
const isGLSL = (src:string) => /surfaceDistance|shade\s*\(/.test(src)

// Wrap DSL code inside a function expected by sculpt compiler
function wrapDSL(src:string) {
  return `() => { ${src} }`
}

export function compileSculptCode(src:string): THREE.ShaderMaterial {
  try {
    if (isGLSL(src)) {
      // Convert GLSL fragment to material
      const mat = SP.glslToThreeJSMaterial(src)
      mat.transparent = false
      mat.depthWrite = true
      return mat
    } else {
      const fn = eval(wrapDSL(src)) // returns () => { ...DSL... }
      const mat = SP.sculptToThreeJSMaterial(fn)
      mat.transparent = false
      mat.depthWrite = true
      return mat
    }
  } catch (e) {
    console.warn('[ShaderParkCompiler] fallback', e)
    return new THREE.ShaderMaterial({
      uniforms:{ uTime:{value:0} },
      vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader:`varying vec2 vUv; uniform float uTime;
        void main(){ vec3 col=vec3(0.15,0.2,0.28)+0.1*sin(uTime+vUv.x*10.); gl_FragColor=vec4(col,1.); }`
    })
  }
}
// ...existing code...
````

Update procedural factory to mount ShaderParkGround only:

````tsx
// ...existing code...
import { ShaderParkGround } from './ShaderParkGround'

export function ProceduralEnvironmentFactory() {
  return (
    <group>
      <ShaderParkGround size={200} />
    </group>
  )
}
// ...existing code...
````

If you still want pulse integration: add uPulseAmp uniform and modulate col in fragment shader; call triggerPulse to animate amplitude.

Fog fix for distant cameras (avoid obscuring top-down):
- In EnvironmentContext or SceneEnvironment: when cameraMode is 'topdown' or 'static', scale fog.color alpha or disable fog unless a flag (e.g. env.allowFogForHighCams) is true.

Example conditional disable:

````tsx
// ...existing code...
const effectiveFog = useMemo(()=>{
  if (!merged.fog?.enabled) return null
  if (cameraMode === 'topdown' || cameraMode === 'static') {
    return { ...merged.fog, enabled:false } // disable for clarity
  }
  return merged.fog
},[merged.fog,cameraMode])
// Use effectiveFog instead of merged.fog downstream
// ...existing code...
````

Summary:
- Main limitation was missing DSL execution context; raw strings alone fail for advanced Shader Park helpers.
- Ray-marching output is not naturally a ground texture; you must adapt via offscreen render or shader modification.
- Using an offscreen pass (Option C) gives a reliable arena surface while preserving sample aesthetics.

Confirm which path you prefer (A full-screen background, C offscreen texture mapping, or deeper modification B), and I can refine further or add pulse/telegraph integration next.
