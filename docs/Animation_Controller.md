# Animation Controller (FBX) — Test Harness

This document explains the test character controller added to the Hero Factory folder, how it maps inputs to animations, and several memory‑optimization strategies for animation assets.

## Components overview

- `src/heroes/factory/HeroAnimTester.tsx`
  - Exports `HeroAnimTester` — a lightweight controller that:
    - Loads FBX files (one per action) lazily via `@react-three/drei` `useFBX`
    - Plays the first clip available in each FBX via `useAnimations`
    - Switches actions based on keyboard input with a simple cross‑fade
  - Exports `defaultAnimMap()` — convenience map wiring all actions to a known sample until real files are pointed.
  - Actions supported (keys):
    - W/ArrowUp → runForward
    - S/ArrowDown → runBackward
    - A/ArrowLeft → strafeLeft
    - D/ArrowRight → strafeRight
    - Space → jump
    - J → attackLight, K → attackHeavy
    - X → death

- `src/pages/HeroTuner.tsx`
  - Added a Source option: “Anim Controller (WASD/J/K/Space)”
  - Adds an FBX Scale slider to fit the model to the scene.

## How it works

Each action is a small sub-component (`FBXAction`) that:
- Loads a single FBX file
- Mounts its scene under a container `group`
- Binds the first `AnimationAction` returned by `useAnimations`
- Plays when active and fades out when inactive

The controller keeps several of these children and toggles visibility. This avoids retargeting and allows using disparate FBX files quickly as a test harness.

## Wiring your animation pack

1) Put your FBX animation files in:
   `src/assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/`

2) Use the provided Lite Sword+Shield map or pass a custom map to `HeroAnimTester`:

```ts
import { HeroAnimTester } from '../heroes/factory/HeroAnimTester'
import { liteSwordShieldMap } from '../heroes/factory/animMaps/liteSwordShieldMap'

// Option A: use the built-in Lite pack mapping
<HeroAnimTester anims={liteSwordShieldMap} />

// Option B: roll your own mapping
const anims = {
  idle: '.../Idle.fbx',
  runForward: '.../RunForward.fbx',
  runBackward: '.../RunBackward.fbx',
  strafeLeft: '.../StrafeLeft.fbx',
  strafeRight: '.../StrafeRight.fbx',
  attackLight: '.../AttackLight.fbx',
  attackHeavy: '.../AttackHeavy.fbx',
  jump: '.../Jump.fbx',
  death: '.../Death.fbx',
}
```

3) In the tuner, choose Source → Anim Controller. Use the scale slider to size it.

## Memory optimization notes

Short‑term (with separate FBX files):
- Lazy loading: clips load on first activation; thanks to `useFBX` caching, subsequent uses are instant.
- Keep only a small set active: we render a few groups and toggle visibility; only one plays at a time.
- Consider unmounting rarely used actions to free GPU memory if memory pressure becomes visible.

Medium‑term (recommended):
- Consolidate to a single rigged mesh with multiple clips (glTF/GLB):
  - Export a single `.glb` with the character mesh and all animation clips.
  - This shares geometry/materials and reduces memory and draw calls.
- Retarget FBX clips to the shared skeleton once, then save into the GLB to avoid runtime retargeting.
- Use texture compression (KTX2) and mesh compression (Draco/Meshopt) during export.

Long‑term (production):
- Implement a clip registry with reference counting + LRU eviction:
  - Keep N recently used clips resident; unload others (dispose) when not used for a while.
- Animation layers and partial‑body masks (upper‑body attacks over locomotion) to minimize full‑body clip permutations.
- Bake to 30 FPS where acceptable; reduce keyframe density; remove redundant tracks.

## Known tradeoffs in this test harness
- Each action currently maintains its own FBX scene instance. This is simple and robust for testing different files, but uses more memory than a unified rig.
- For gameplay, move toward a single skinned mesh with many clips in one GLB, or a shared mixer targeting a common skeleton.

## Future extensions
- UI in the tuner to remap actions → files at runtime (JSON import/export).
- Crossfade duration slider; attack priority/interrupt rules.
- Optional localStorage persistence for the chosen map and scale.
