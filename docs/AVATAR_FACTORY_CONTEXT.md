# Avatar Factory Context (for Coding Agent)

## Purpose
Create and maintain procedural enemy models that visually match provided avatar images, without external 3D tools. The outputs must be memory-efficient and deterministic.

## Invariants
- Do not add new runtime textures or large binary meshes.
- Share geometries and materials across entities where possible.
- Use `seed` to keep silhouettes stable per enemy type.
- Respect performance caps from game code (drones, pickups, etc.).

## File Layout
- `src/characters/Pathogen.jsx` – procedural renderer (spikes/nodes/arcs).
- `src/characters/factory/AvatarSpec.ts` – spec schema.
- `src/characters/factory/PathogenFactory.tsx` – pooled factory.
- `src/characters/factory/EnemyRoster.ts` – mapping from enemy id → AvatarSpec.
- `src/pages/AvatarTuner.tsx` – image-to-spec UI.
- Exported JSON specs saved in `assets/avatars/*.json` when the designer requests it.

## Commands / Tasks
1. **Add/Update enemy from image**
   - Input: image file and enemy id (e.g., `candida_auris`).
   - Run `AvatarTuner`, load image, accept auto-suggest, then tweak to match reference.
   - Export JSON as `assets/avatars/candida_auris.json`.
   - Update `EnemyRoster.ts` to import and use that spec OR load at runtime.

2. **Batch import**
   - For a folder of images, generate initial specs with the tuner’s auto-suggest, set the `id` to sanitized filename, and save JSONs.
   - Ensure `seed` is stable by hashing the filename.

3. **Performance tuning**
   - Minions: enforce `detail=0`, `spikeCount≤28`, `arcCount=0`.
   - Elites: `detail=1`, `spikeCount 32–48`, `arcCount 2–4`.
   - Bosses: `detail=1..2`, `spikeCount 44–64`, `arcCount 4–8`.
   - If FPS dips < 45, drop to fallback LOD (reduce spikes by 30%, arcs→0). Implement via a single selector near the spawner.

4. **Material/Geometry pooling**
   - When adding new looks, prefer reusing pool descriptors (same cone sizes, same node sphere, same core detail) to minimize new buffer/allocation churn.

5. **Verification**
   - Compare the on-screen result in `/characters/AvatarTuner` side-by-side with the reference image.
   - Confirm silhouette + palette match within reasonable tolerance.
   - Run a 2-minute wave test; no GC spikes, no stutter.

## Acceptance Criteria
- New enemy renders with <5 draw calls (core + instanced spikes + instanced nodes + lines).
- No new heavy dependencies.
- JSON spec ≤ 1 KB.
- Deterministic across sessions for the same `seed`.
