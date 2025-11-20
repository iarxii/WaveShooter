# Animation Controller (FBX) — Test Harness

This document explains the test character controller added to the Hero Factory folder, how it maps inputs to animations, and several memory‑optimization strategies for animation assets.

## Components overview

- `src/heroes/factory/HeroAnimTester.tsx`
  - Exports `HeroAnimTester` — lightweight per‑action FBX controller with:
    - Lazy loading via `useFBX`, deep cloning through `SkeletonUtils.clone` to prevent flicker/reparent artifacts.
    - Direct binding of animation clips to the rendered FBX root (<primitive>) to eliminate `PropertyBinding: No target` errors.
    - Mount‑only‑current option (default) to avoid multiple mixers and stutter; can mount all for comparison.
    - Easing option that temporarily lengthens cross‑fade when entering/leaving idle or changing movement directions.
    - Isolation mode to test a single FBX file (URL or file input) outside control logic.
    - Dump Clip Info button reporting tracks/key counts for diagnostics.
    - Debug overlay with collapsible panel: FPS (throttled), fade slider, Stats, AdaptiveDpr, frameloop mode, invert directions, ease transitions, isolation controls and recent log.
    - Invert directions toggle (persisted in localStorage, default on in game context) to match gameplay orientation.
    - Random Shape Runner pose (press V) that loads a random static pose FBX from `action_poses/` and freezes the first frame.
  - Exports `defaultAnimMap()` — convenience mapping pointing every supported action to a bundled sample until real files supplied.
  - Actions & keys now supported:
    - W/ArrowUp → runForward
    - S/ArrowDown → runBackward
    - A/ArrowLeft → strafeLeft
    - D/ArrowRight → strafeRight
    - Space → jump (Shift+Space → wall jump)
    - J → attackLight, K → attackHeavy
    - H → attackJump (multi‑file variant list supported)
    - U → attackSpecial, I → attackCharge
    - X → death
    - V → shapePose (random static action pose)

- `src/pages/HeroTuner.tsx`
  - Source selector reorganized:
    1. Anim Controller (default)
    2. Anim Model Viewer (multi FBX clip loader; selectable list; scale slider)
    3. Pose Viewer (static GLB/FBX display)
    4. Procedural (legacy hero factory body)
  - Controller panel includes live input status grid and runtime remap of each action → FBX via file inputs (with multi‑file attackJump variant). Debug overlay show/hide checkbox wires to `showDebugPanel` prop.
  - Anim Model Viewer panel adds reusable FX Orbs controls (mode, shape, count, speed, amplitude) rendered via `FXOrbs` component.
  - Pose Viewer loads and scales GLB/GLTF or FBX for static inspection.

## How it works

Each action uses `FBXAction` which:
- Loads a single FBX file (cached by drei) and deep‑clones skeleton (unless clone disabled in isolation test).
- Renders the cloned root with `<primitive object={rootObj} />` so bone names remain stable for animation bindings.
- Binds first available `AnimationAction` and manages play/stop without triggering React state updates (avoids update depth loops).
- On URL change hard‑stops prior clip to prevent lingering states.
- Optionally pauses and seeks for static pose mode.

The controller can mount all actions (comparison) or only the current action (default for perf). Visibility + mixer isolation eliminate cross‑mix stutter.

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

Short‑term (separate FBX files):
- Lazy loading via `useFBX` & only mounting current action → minimal mixers.
- Deep clone per action prevents flicker caused by Three reparenting bones.
- Isolation mode helps distinguish loader issues vs controller logic.

Medium‑term (recommended):
- Consolidate FBX set into single GLB with clips; remove per‑action duplication.
- Pre‑bake pose variations (shape runner) into additive or partial clips for layered playback.
- Apply KTX2 / Meshopt compression once in pipeline.

Long‑term (production):
- Clip registry (refcount + LRU eviction) & streaming for large packs.
- Layered locomotion + upper‑body actions; partial masks reduce variants.
- Keyframe reduction & selective 30FPS baking for CPU/GPU savings.

## Known tradeoffs
- Separate FBX per action inflates memory; acceptable for rapid iteration but not final shipping path.
- Paused pose mode reuses first frame of clip; true static pose assets could be exported as geometry-only to reduce load time.

## Recent improvements (session recap)
- Eliminated flicker via deep cloning (SkeletonUtils.clone) per action.
- Removed stutter by mounting only current action and hard-stopping inactive clips.
- Fixed PropertyBinding errors with primitive root rendering.
- Added FPS, Stats, AdaptiveDpr, frameloop toggle, invert directions (persisted), easing transitions.
- Added isolation mode + Dump Clip Info diagnostics.
- Added random Shape Runner pose trigger (V key).
- Added collapsible debug overlay; external show/hide control from tuner.
- Integrated FX orbs panel & rendering in Anim Model Viewer via `FXOrbs`.

## Future extensions
- Action priority/interrupt graph & queued transitions.
- Layered/partial clip blending (upper-body attacks over locomotion).
- LocalStorage persistence of full action→file remap and scale.
- Integrated clip trimming & time scrubber for pose capture.
