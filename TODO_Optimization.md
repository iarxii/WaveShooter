Starting (1/9) *Analyze low FPS context*

Below 10 FPS means we need to separate two categories fast: (A) you’re accidentally running in software rendering or throttled GPU mode, and/or (B) main‑thread CPU load (logic + animation + GC) is blowing the frame budget. I’ll outline a focused diagnosis + remediation plan you can start applying immediately, tying it to the instrumentation we’ve already added.

## 1. Rapid triage checklist (do in this order)

1. Confirm hardware acceleration really active  
   - Open chrome://gpu (Edge: edge://gpu). In the Graphics Feature Status section you want:
     - WebGL: Hardware accelerated
     - WebGL2: Hardware accelerated
     - ANGLE / D3D11 (or Metal/Vulkan) backend, NOT SwiftShader.
   - If you still see “Software only, hardware acceleration disabled”:  
     - Settings → System → “Use hardware acceleration when available” ON → relaunch.  
     - Disable conflicting flags/extensions (screen recorders, remote desktop virtualization).  
     - Update GPU drivers (Windows: GeForce Experience / AMD Adrenalin / Intel Driver & Support Assistant).  
     - If on Remote Desktop: Windows RDP often disables GPU; test locally or with Chrome Remote Desktop (CRD passes through GPU).
2. Record a short DevTools Performance profile with the performance overlay showing. Look for:
   - Long tasks > 16ms dominating main thread.
   - User Timing entries: which of enemy_ai, bullet_update, fx_orbs_update, anim_update spike.
   - Layout / Style recalculation spikes (means too many DOM overlay updates).
3. Open the Memory panel and watch for rapid allocation churn / GC (a sawtooth ramp every second means garbage pressure).

If hardware acceleration is off, fix that first; almost everything else is secondary because software rasterization will cap at single‑digit FPS regardless of optimization.

## 2. Interpreting your current sections

Section | Typical Cause | Remediation
--------|----------------|------------
enemy_ai | O(N enemies) loops scanning all enemies each frame | Spatial partition (grid or quadtree), reduce frequency (every 2–3 frames), early-out distance checks
bullet_update | Per-bullet math each frame | Convert to SoA arrays, increase bullet speed + reduce lifetime, pool & batch update, update every other frame for distant bullets
fx_orbs_update | Trig loops per orb | Precompute static positions for non-animated modes, reduce orb count for low quality
anim_update / anim_clip_resolve | Mixer blending & keyframe interpolation | Switch idle mixer to demand frameloop when static; reduce active actions; bake to GLTF with quantized tracks

Add soon: collision, spawn_wave, hazard_tick, effects_update, environment_update, render (wrapper around R3F’s after-render). This will expose the full frame pie.

## 3. High-impact quick code tweaks (low risk)

1. Adaptive DPR hard clamp under load  
   - If frameMs > 28 for last N frames: set renderer.setPixelRatio(Math.min(0.6, window.devicePixelRatio * 0.5)).
2. Switch to frameloop='demand' for hero viewer / debug panels when no input or animation changes for > 1s; call invalidate() only on state changes.
3. Reduce dynamic lights: keep only one directional + ambient/hemisphere; disable per-pixel shadows unless needed (or set shadow.mapSize lower).
4. LOD or scale-down environment grid size (fewer lines) or disable when not profiling navigation.
5. Batch or instance repeated geometry (bullets, orbs, pickups) using InstancedMesh.
6. Replace repeated new Vector3 allocations inside loops with shared temp vectors (enemy_ai already partly does this; ensure all loops follow suit).
7. Gate expensive loops to run every 2nd or 3rd frame (temporal staggering) – e.g., collision broadphase every frame, expensive AI scoring every third frame.

## 4. Enemy AI optimization path

Current pattern: iterate all enemies repeatedly for centroid + priority selection.

Better approach:
- Maintain a flat Float32Array of enemy positions updated once per frame in a centralized pass.
- Keep two lists: near (< MID_RANGE^2) and far; build them once per frame (or every 2 frames) and reuse for target choice.
- For cluster centroid: accumulate only until you reach a threshold of candidates; early exit if count >= needed (e.g., 5) to cut loops short.
- Add an index grid: bucket enemies into (xCell,zCell). For queries (short / mid / long range), touch only nearby buckets.

Instrumentation plan:
- perf.start('enemy_ai_buckets')
- perf.start('enemy_ai_target_select')

This will reveal if bucket build vs selection dominates.

## 5. Bullet system improvements

- Current: find free bullet with .find() (O(n)). Replace with circular index freelist or maintain a queue of inactive indices.
- Vector operations: operate on typed arrays (positionX[], positionZ[], dirX[], dirZ[], timeAlive[]).
- Culling: early discard bullets outside an inner radius; skip expensive updates for far ones (or simply expire earlier).
- Batch collision broadphase later (AABB per bucket) rather than inside bullet loop.

Add instrumentation: bullet_spawn, bullet_recycle (counts rather than timing—optionally store in counters & expose once/second).

## 6. Animation & FBX cost

- Convert frequently used FBX clips to GLTF baked animations (use Blender or FBX2glTF) – faster parse + smaller payload.
- Use three’s `useGLTF.preload` for those.
- Compress animation tracks (gltf-transform: `gltf-transform optimize in.glb out.glb --compress`).
- If only one active action at a time, force mixers to stop others immediately; avoid fading multiple large clips simultaneously.
- For static “shape poses”, pre-bake a few GLTF static frames instead of freezing an FBX action.

## 7. Texture & GPU memory pressure

Even if hardware acceleration is on, large uncompressed textures force slower uploads; steps:
- Convert large diffuse/normal maps to KTX2 (BasisU). Include a KTX2Loader setup; auto selects GPU format.
- Ensure power-of-two where possible for mipmapping; supply smaller variants for low-quality mode.
- Limit HDRI environment maps to 1K (you already use 1k; you can also generate a prefiltered PMREM once and reuse).

## 8. Shadow & overdraw mitigation

- Lower shadow map size (e.g., 1024→512) or disable if visual tradeoff acceptable.
- Use `frustumCulled=true` only where geometry is static and inside view; set `matrixAutoUpdate=false` for static meshes.
- Avoid large transparent planes overlapping (causes overdraw).
- Consider merging static ground + boundary into a single mesh.

## 9. Add missing instrumentation next

Add these sections (keeping names stable):
- collision
- hazard_tick
- spawn_wave
- effects_update
- environment_update
- render (wrap r3f after-frame callback: useFrame(() => { perf.start('render'); ... } ) or R3F events if needed)
Then snapshot again to re-rank biggest offenders.

## 10. Prioritized action sequence (assuming hardware acceleration is ON)

Order | Action | Est. Gain
------|--------|----------
1 | Confirm GPU acceleration (chrome://gpu) | 5–8× if currently software
2 | Adaptive DPR clamp + shadow reductions | 10–30% frame time drop
3 | Bullet pool O(1) allocation & typed arrays | 5–15%
4 | Enemy AI bucket + frequency throttle (every 2 frames) | 10–25%
5 | Instanced orbs & bullets | 5–20% (draw call reduction)
6 | Convert hot FBX to GLTF + animation compression | 5–15% (parse + per-frame)
7 | Frameloop demand in idle panels / hero viewer | 2–10% when not active
8 | Texture compression / KTX2 | VRAM, load time, minor per-frame
9 | Additional culling & LOD | 5–15% in busy scenes

## 11. Concrete code snippets (conceptual)

Enemy bucket example (outline):
- Keep global arrays enemyX[], enemyZ[], enemyRef[] updated each spawn/despawn.
- Build buckets once/frame:
  bucketKey = ((x >> cellShift) & mask) + ((z >> cellShift)&mask)*gridWidth
  push enemy index → bucket[bucketKey]
- Target selection queries only adjacent buckets (3×3 around player cell).

Bullet freelist idea:
Initialize: freeIndices = [0..N-1]
When spawn: idx = freeIndices.pop(); active.push(idx)
When recycle: freeIndices.push(idx)

## 12. Validate progress

After each optimization:
1. Enable overlay; log snapshot every 10 seconds (optional: `window.perfLog = setInterval(()=>console.log(perf.snapshot()), 10000)`).
2. Record one Performance profile focusing on user timing lanes.
3. Stop when frameMs < ~16 (60fps) on your machine or until largest sections flatten.

## 13. If still sub‑10 FPS after hardware acceleration fix

- Check Task Manager GPU column—if GPU usage near 0% while CPU main thread pegged: logic bound; keep pushing CPU loop optimizations.
- If GPU usage ~100% and CPU moderate: reduce draw calls (instancing), lower resolution (DPR), lower material/shader complexity, and compress textures.

## 14. Optional next step I can implement for you

I can:
- Add the remaining perf sections (collision, spawn_wave, hazard_tick, effects_update, environment_update, render).
- Refactor bullet pool to typed arrays & freelist.
- Introduce an AI bucket grid scaffold with instrumentation.

Let me know which of those you’d like me to implement first and I’ll proceed.

---

Reply with one of:
- “Add instrumentation” (and I’ll add the missing sections)
- “Optimize bullets”
- “Optimize enemy AI”
- “All of the above”

Or ask for deeper details on any step.