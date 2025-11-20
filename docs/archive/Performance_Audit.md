# Performance Audit — WaveShooter

Date: 2025-11-14
Author: automated audit (pair-programming style)

This document summarizes a pass through the game's systems (components, render loop, and entity management) to locate caching opportunities and performance hotspots. It lists observations, likely root causes for the mid/late-wave framerate collapse (and one- or two-second blanking), and prioritized recommended optimizations with a special section for mobile devices.

This is an audit and recommendation list only — no code changes were made.

## Quick summary

- Observed: many entities (enemies, bullets, pickups, effects) are created and mapped into React component trees each frame/each tick. This increases GC pressure, reconciliation work, and draw calls as wave count grows.
- Symptom (user report): at ~wave 60+ framerate tanks and screen blanks for ~1–2s as if a remount occurs. Likely causes: large synchronous GC pause, frequent React root re-renders/remounts (or heavy Suspense fallback), or a heavy single-frame work spike (allocations, rebuilds, or resource re-creation).
- Existing good practices found in codebase: use of AdaptiveDpr, PerfCollector/PerfOverlay, and explicit mapping of entity arrays in `src/App.jsx`. These provide instrumentation and dynamic DPR but don't eliminate allocation and per-frame work.

## How I inspected the project (what I reviewed)

- `src/App.jsx` (main render loop): maps arrays (enemies, bullets, bombs, pickups, etc.) into React children (lots of small components). This is the central scene composition point.
- Presence of performance helpers: `AdaptiveDpr`, `PerfCollector`, `PerfOverlay`, `PerfLongTaskObserver`.
- Entity components (e.g., `FlyingDroneEntity`, `MinionEntity`, `TriangleBossEntity`, `Bullet`, `Bomb`, `Pickup`) are instantiated from arrays in the top-level render.

Notes: I didn't modify code — this audit focuses on design, caching, and further optimization suggestions.

---

## Detailed findings and reasoning

1) Large React tree with per-frame mapping

- The top-level `App.jsx` maps many arrays into JSX each render (enemies.map(...), bullets.map(...)). Each mapping call creates new inline objects and inline functions (props such as `assets={{ bodyGeom, tipGeom, ... }}` and lambdas like `onExpire={(id) => setBouncers(prev => ... )}`).
- Every time the arrays change (or parent state updates), React must reconcile many children. If keys are not stable or props change identity often (new object/array/func instances), children are forced to re-render even if internal state hasn't changed.
- Recommendation: reduce allocation of inline props, stabilize keys and props, and memoize entity components (e.g., React.memo) where possible so a re-render only occurs when visible state actually changes.

2) Per-frame allocations and temporary objects

- Inline arrays/objects (for example `playerBaseSpeed * (cameraMode === "topdown" ? topDownSpeedMul || 1 : 1)` is okay as a value, but assets and many prop objects are re-created each render). Also callbacks created inline cause referential inequality.
- Frequent creation of temporary THREE.Vector3/Quaternion/arrays during updates (common in game loops) will increase GC. On weaker/mobile devices the garbage collector can stall the main thread.
- Recommendation: reuse objects via refs or pools. Use useMemo/useCallback to prevent re-creating props and functions. Avoid allocating arrays inside `render` where you can compute once and store references.

3) Draw call explosion and missing instancing

- Many enemies of similar geometry are created as separate mesh objects. Each mesh leads to draw calls. As enemies scale up, draw calls increase linearly, hurting CPU->GPU submission time.
- Recommendation: use InstancedMesh or GPU instancing for repeated simple enemies (minions, small drones). Instancing reduces draw calls by grouping identical geometry and material into a single draw.

4) Scene complexity: shadows, lights, and postprocessing

- Each `directionalLight` and shadow-casting object increases cost. If many meshes cast shadows, shadow map updates are expensive.
- Recommendation: reduce castShadow usage, lower shadow map size, selectively disable shadows for low-quality modes or mobile. Consider baking ambient/light into textures for static elements.

5) Particle/effects systems

- FX (confetti, fx orbs, shield bubble, trails) can spawn many small objects. If these are implemented as many meshes rather than batched particle systems, they add CPU/GPU overhead.
- Recommendation: consolidate particles into a single Points/InstancedMesh-based particle system (shader-driven) and limit max particle counts based on quality profile.

6) Use of Suspense / remount causes

- The blanking symptom (screen empties briefly) looks like the renderer falling back to Suspense fallback or a large synchronous remount (or canvas context lost and restored). There is at least one `React.Suspense` in `App.jsx` wrapping the scene. A remount of the entire tree would show the reported effect.
- A Suspense fallback will show if an async resource (model or texture via GLTFLoader or useLoader) is re-requested because the component unmounted and remounted or cache invalidated.
- Recommendation: ensure loaders/caches are stable (cache loaded GLTFs/textures globally using a loader cache or a centralized resource manager). Avoid unmounting heavy subtrees — prefer toggling visibility or using lazy loads that keep a cached resource.

7) Physics or AI update frequency

- If heavy physics or AI calculations run at the same frequency as rendering (and scale with enemy count), you can hit CPU overload. There may be expensive per-enemy logic executed synchronously on the main thread.
- Recommendation: run non-render-critical logic at a lower tick rate (e.g., 10–20 Hz) or offload expensive pathfinding/AI to Web Workers. Use a simple tiered AI approach: LOD on behavior complexity.

8) Memory pressure and GC

- Frequent object churn + growing arrays will cause garbage collector spikes. The 1–2s blank suggests a major GC sweep or synchronous blocking task causing a frame stall.
- Recommendation: reduce allocations per frame and profile with DevTools to confirm GC pauses. Use object pools (bullets, temp vectors, particle objects) to recycle instead of allocate/free.

9) Frequent setState and re-renders

- If many small setState calls happen frequently (e.g., per-entity state updates that bubble to the top-level App), React will schedule many re-renders.
- Recommendation: localize state in entity components where possible and use refs for mutable values that don't need to trigger React updates. Batch updates with functional state updates or a single aggregator per tick.

10) Asset reuse and stable references

- Example from App.jsx: `assets={{ bodyGeom: droneBodyGeom, tipGeom: droneTipGeom, trailGeom: droneTrailGeom, bodyMat: droneBodyMat, tipMat: droneTipMat }}` — if these `*_geom` and `*_mat` vars are stable references (from a loader or useMemo), fine; if created per render then expensive. Ensure these are loaded once and reused via refs or a shared resource context.

---

## Reproduction & measurement guidance (how to prove cause)

1. Reproduce with DevTools on desktop:
   - Open Chrome/Edge DevTools Performance tab. Record while starting at lower waves and run to wave ~60.
   - Capture the timeline when stutter/blank happens. Look for: major "GC" events, long tasks, or React component mount/unmount spikes.
2. Use the existing `PerfCollector` and `PerfOverlay` components to log FPS and long task timing to console and a file (or on-screen graph). Capture memory usage and GC events.
3. Use React Profiler to capture component render counts and durations. Focus on top-level components (App, heavy entity components).
4. Run an allocation profile (DevTools: Memory -> Allocation instrumentation on timeline) to identify spike that correlates with blanking.
5. Record renderer info each frame (if using three.js, `renderer.info` shows draw calls, triangles). Log it every 1s to see trends as wave increases.

Metrics to collect during experiments:
- FPS over time
- max single-frame time
- frequency and duration of GC pauses
- draw calls and triangles
- JS main-thread % used and long tasks
- heap size and allocation rate

---

## Prioritized recommendations (high to low)

High-impact (do these first, low-risk):
- 1) Stabilize props & reduce re-allocations: use useMemo/useCallback and avoid creating new objects in render. Pass stable refs for shared assets and callback references where possible.
- 2) Component memoization: wrap entity components with React.memo (or equivalent) so they only update on prop change. Ensure prop identity is stable.
- 3) Object pooling for bullets/particles/minions: reuse entity instances instead of creating/destroying frequently. A simple pool reduces pressure on GC and allocation spikes.
- 4) Use InstancedMesh for many identical enemies (Minion, Drone). Reduce draw calls dramatically.

Medium-impact (more effort):
- 5) Move non-visual logic off the render path: throttle physics/AI updates and/or move to Web Workers.
- 6) Consolidate particle effects into shader-driven systems using a single draw call (Points/InstancedMesh + GPU-based animation).
- 7) Reduce shadows and complex materials on mobile and provide quality presets. Use AdaptiveDpr more aggressively on mobile.

Lower-impact / long-term:
- 8) Spatial partitioning (quadtree/octree) for cheap cullling and neighbor queries instead of scanning full enemy lists.
- 9) LOD for geometry and shader complexity based on distance and screen size.
- 10) Use compressed and sized-down textures for mobile; use texture atlases where applicable.

---

## Mobile-specific advice

Mobile devices are typically CPU/GPU and memory constrained. Pay attention to:

- Lower default DPR for mobile (0.6–0.8). `AdaptiveDpr` is present — consider setting tighter min/max on mobile and capping resolution.
- Reduce particles and special FX counts at runtime for phones. Use a quality setting that disables expensive effects.
- Avoid expensive fragment shaders on many objects. Simplify materials via `MeshBasicMaterial` or `MeshLambertMaterial` when possible.
- Limit shadow casters and lower shadow map sizes on mobile. Consider toggling shadows off by default on phones.
- Use InstancedMesh aggressively — mobile GPUs benefit greatly from fewer draw calls.
- Reduce memory usage: smaller textures and fewer simultaneous audio buffers.
- Prefer CSS UI (DOM) for HUD where possible rather than re-rendering canvas overlays.

---

## Quick checklist for an initial low-risk experiment (2–4 hours)

1. Add logging instrumentation (if not already): record FPS, renderer.info (drawCalls), and a GC/long task counter.
2. Make a single small change: memoize one frequent entity component (e.g., `MinionEntity`) and ensure props are stable. Measure before/after.
3. Replace per-entity material/geometry passing with stable refs from a centralized `ResourceContext` (no functional change, but avoids identity churn).
4. Implement a simple object pool for bullets (reuse bullet objects rather than recreating). Measure allocation rate change.
5. If these give measurable improvements, plan larger work (instancing & particle system refactor).

---

## Example contract for changes (what to expect from optimizations)

- Inputs: enemy count (N), bullet count (B), particle count (P), quality setting (Q), device profile.
- Outputs: reduced mean frame time (ms), fewer GC pauses (ms), lower draw calls.
- Success criteria:
  - 30–60% reduction in draw calls for large waves via instancing.
  - GC pause reductions to <200ms worst-case on desktop; <300ms worst-case on mobile.
  - No visible remount/blanking after optimization runs.

Edge cases to watch:
- Very high enemy counts that exceed memory (=> cap spawn).
- Background tabs—reduced tick frequency to avoid runaway CPU usage.
- Device-specific driver bugs triggered by instancing or WebGL state changes.

---

## Suggested short-term implementation roadmap (for the team)

Phase A (low risk, quick wins):
- Instrumentation & baseline measurements.
- Memoize components and stabilize props via `useMemo` / `useCallback` / stable refs.
- Implement object pooling for the most-churned objects (bullets, pickups, small effects).

Phase B (medium work):
- Replace collections of similar meshes with InstancedMesh.
- Consolidate particles into GPU-driven particle systems.
- Limit shadows & postprocessing based on quality tier.

Phase C (larger refactor):
- Move AI/physics to Web Workers (or decouple update frequency).
- Implement spatial partitioning for culling and neighbor queries.
- Create a ResourceManager to ensure loader caches never get invalidated (fixing Suspense fallbacks).

---

## Potential root causes for the reported 'blanking' at wave ~60

- Large GC pause from high allocation rate as many objects are created/destroyed around that wave.
- A big synchronous job (e.g., mass spawn causing many setState and consequent React re-renders) that blocks the main thread long enough to appear as a screen blank.
- A Suspense fallback triggered by unintentional unmount/remount of a subtree that requests async assets again (e.g., models/textures) and shows fallback while loading.
- WebGL context hiccup (less likely but possible) if the app creates/destroys GPU resources fast or hits GPU memory limits; this would show as blanking combined with WebGL errors.

Use the reproduction/measurement guidance above to distinguish between these causes.

---

## Tools & commands to run while testing (local)

Use the browser performance tools and in-game overlay:

- Chrome/Edge DevTools Performance (record trace)
- Chrome DevTools Memory -> Allocation instrumentation on timeline
- React Profiler
- Add a short logger to record `renderer.info` and `performance.now()` spikes

If you need a small script or console snippet to log renderer info each second I can provide it in a follow-up.

---

## Next steps I recommend the team take immediately

1. Reproduce the blanking with DevTools and record a trace. Identify whether GC or long task is the cause.
2. Implement the small experiments in "Quick checklist" (memoize one entity, pool bullets) and measure impact.
3. If GC is the issue, prioritize object pooling and avoiding allocations in render paths.
4. If draw calls are the issue, research InstancedMesh for the most numerous enemy types.

If you want, I can produce a small patch that only adds logging and a single memoization to prove the pattern before larger refactors.

---

## Closing notes

This document is intentionally pragmatic: start with instrumentation and low-risk changes (memoize, reuse, pool), measure, then move to bigger refactors (instancing, worker offload, consolidated particle systems). The presence of `AdaptiveDpr` and `Perf*` helpers is a good foundation: use them as signals while iterating.

If you'd like, I can:
- produce a short patch that adds per-second logged metrics (FPS, draw calls, heap, allocation rate), or
- implement one low-risk optimization (memoize `MinionEntity` and stable props) and run a local validation.

Tell me which you'd prefer next and I can implement the change+measurement or walk you through the DevTools steps to capture a trace.

---

## Actions Taken 2025-11-14

Low-risk caching and prop-stability refactors were implemented to reduce unnecessary React re-renders and allocation churn. No behavioral changes were intended.

- Entity memoization: Wrapped frequently-rendered entities with `React.memo` so they only re-render when props actually change.
  - `src/entities/Minion.jsx`
  - `src/entities/FlyingDrone.jsx`
  - `src/entities/TriangleBoss.jsx`
  - `src/entities/PipeBoss.jsx`
  - `src/entities/ClusterBoss.jsx`
  - `src/entities/ConeBoss.jsx`
  - `src/entities/RosterEnemy.jsx`
  - `src/entities/StarBoss.jsx`
  - `src/entities/Player.jsx`

- Stabilized prop identities in `src/App.jsx` using `useMemo`:
  - `camSpeedMul`: memoized camera-mode speed multiplier to avoid recalculations and prop churn.
  - `droneAssets`: single stable object bundling drone geometry/material refs passed to `FlyingDrone`.
  - `heroPrimaryColor`: memoized numeric color derived from `selectedHero` and reused for player visuals.
  - `autoFollowSpec`: stable object for auto-follow behavior, derived from `invulnEffect` and inputs.

- Replaced inline expressions/objects with the memoized values where used:
  - `basePlayerSpeed` now uses `playerBaseSpeed * camSpeedMul`.
  - `PlayerEntity` receives `primaryColor={heroPrimaryColor}` and `autoFollow={autoFollowSpec}` instead of inline `useMemo` objects.
  - Enemy speed multipliers and drone asset props use stable memoized primitives/objects to minimize re-renders.

Expected impact:
- Fewer needless React renders for entities as parent state changes.
- Reduced per-frame allocations from inline objects/functions, lowering GC pressure.
- More consistent frame pacing, especially in larger waves and on mobile.

Next recommended steps (post-change):
- Capture before/after traces on wave 60+ to quantify improvements (FPS, long tasks, GC, draw calls).
- Prioritize InstancedMesh for numerous enemies and particle consolidation for the next optimization phase.
