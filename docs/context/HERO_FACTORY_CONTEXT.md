# Hero Factory Context (for Coding Agent)

## Purpose
Build and maintain fully procedural hero avatars that are stylized, lightweight, and deterministic, without relying on external DCC pipelines. The goal is to give designers fine control over hero body proportions and cosmetic options while keeping runtime memory and draw calls low.

## Invariants
- No large textures or heavyweight meshes at runtime; use parametric primitives (box/sphere/capsule) only.
- Share geometries and materials across instances via pooling to reduce allocations and memory churn.
- Use a `seed` (if randomness is involved) to keep silhouettes and cosmetic variants deterministic per hero id.
- Respect game performance caps and integrate gracefully with the existing enemy/avatar factory pipelines.

## File Layout
- `src/heroes/factory/HeroSpec.ts` – TypeScript schema for hero parameters (body proportions, palette, accessories, FX, animation hints).
- `src/heroes/factory/HeroFactory.tsx` – Pooled, procedural renderer that builds a hero from a `HeroSpec`.
- (Optional) `src/pages/HeroTuner.tsx` – A page similar to `AvatarTuner` to live‑tune hero specs (not included yet).

## Spec Model (HeroSpec)
- Body shape and proportions:
  - `bodyType`: 'humanoid' | 'capsule' | 'blocky' | 'android'
  - `scale`, `height`
  - `headSize`, `shoulderWidth`, `torsoLength`, `pelvisWidth`
  - `armLength`, `forearmRatio`, `legLength`, `calfRatio`, `thickness`
- Palette and materials:
  - `primaryColor`, `secondaryColor`, `accentColor`, `skinColor`
  - `emissive`, `emissiveIntensity`, `metalness`, `roughness`
- Accessories:
  - `visor`, `cape`, `shoulderPads`, `kneePads`, `backpack`
- FX and animation:
  - `fxRing`, `fxRingRadius`, `fxRingIntensity`
  - Orb modes: `fxMode` = 'atom' | 'wave' | 'push' | 'shield'
  - Shield sub-shape: `fxShieldShape` = 'circle' | 'diamond' | 'pyramid' (when `fxMode='shield'`)
  - Orb layout + motion: `fxCount`, `fxSpeed`, `fxAmplitude`, `fxDirectionDeg`
  - Body motion hints: `idleSway`, `breathe`, `walkCycle`
- Quality/LOD:
  - `quality`: 'low' | 'med' | 'high'

All properties are optional in the spec; the factory provides sensible defaults.

## Commands / Tasks
1. Create/Update a hero
   - Author a `HeroSpec` in code or JSON.
   - Render with `<HeroFromSpec spec={spec} />`.
   - Use consistent `seed` for deterministic silhouettes if any randomized choices are introduced later.

2. Batch presets
   - Maintain a small set of preset `HeroSpec`s for common silhouettes (e.g., heavy, agile, android).
   - Designers can duplicate and tweak presets, then commit as code or JSON files.

3. Performance tuning
   - Prefer `quality='low'|'med'` on low‑end devices; reduces capsule segment counts, detail radii, and FX particle counts.
   - If FPS < 45, dynamically toggle FX ring off and/or reduce its radius/particle size (single selector near spawner/renderer).
   - Keep material descriptors shared (same colors/roughness/metalness) where possible to hit the material pool.

4. Pooling & reuse
   - The factory caches geometries and materials by descriptor keys.
   - When adjusting sizes, prefer scaling transforms over creating new geometry shapes/radii whenever quality permits.

5. Verification
   - Run the character in a test scene for 2 minutes (idle + movement) and confirm no GC spikes.
   - Ensure draw calls remain low: torso/pelvis/head/limbs (~10–14) + small accessories + FX ring (< 6) yields < 25 calls typical.

## Acceptance Criteria
- A hero renders using only parametric primitives; no external large textures required.
- Pooled geoms/materials are reused across multiple hero instances.
- Customization covers proportions, palette, accessories, and FX/animation hints.
- Orb FX ring optional & multi-mode; enabling it keeps draw calls modest (< ~6 extra) and can be disabled dynamically.
- Deterministic results per spec; same seed yields identical build.
- Orb logic reusable in non‑procedural contexts via extracted `FXOrbs` component.

## Integration Notes
- Game can render procedural heroes or FBX per‑action animation harness (`HeroAnimTester`).
- FX orb system extracted into `FXOrbs` so Anim Model Viewer can display orbs without procedural body.
- Source switching (controller / anim viewer / pose / procedural) handled in `HeroTuner`.
- Keep exported surface minimal (`HeroFromSpec`, `defaultHeroSpec`).
## Recent Improvements (session recap)
- Added joint base/clamp spec & root bob amplitude control.
- Live joint labels (deg / xyz) with compact font.
- Directional input inversion persisted (default true) in GameContext.
- Deep cloning per FBX action (prevents bone reparent flicker) and mount-only-current to cut stutter.
- Animation isolation mode & collapsible debug overlay (FPS, frameloop, AdaptiveDpr, Stats, fade control, easing toggle).
- Random action pose trigger integrated (shape runner pose) in animation tester.
- FX orbs extracted (`FXOrbs`) with multi-mode & shield sub-shape selection; integrated into Anim Model Viewer.
