# Avatar Factory Context (for Coding Agent)

## Purpose
Create and maintain procedural enemy models that visually match provided avatar images or roster specifications, without external 3D tools. The outputs must be memory-efficient and deterministic. Now includes modular factories for different enemy types (Pathogens, Mutagens, Infection Vectors, Support Vectors).

## Invariants
- Do not add new runtime textures or large binary meshes.
- Share geometries and materials across entities where possible.
- Use `seed` or roster data to keep silhouettes stable per enemy type.
- Respect performance caps from game code (drones, pickups, etc.).
- Separate concerns: PathogenFactory for pathogens, dedicated factories for other types.

## File Layout
- `src/characters/Pathogen.jsx` – procedural renderer for pathogens, integrates SnakePathogen.
- `src/characters/Mutagen.jsx` – factory for mutagen enemies with specific designs and attack patterns.
- `src/characters/InfectionVector.jsx` – factory for infection vector bosses.
- `src/characters/SupportVector.jsx` – factory for support vector allies.
- `src/characters/ProceduralUtils.js` – shared utilities for grouped meshes and RNG.
- `src/characters/factory/AvatarSpec.ts` – spec schema (for pathogens).
- `src/characters/factory/PathogenFactory.tsx` – pooled factory for pathogens.
- `src/characters/factory/EnemyRoster.ts` – mapping from enemy id → AvatarSpec (pathogens).
- `src/pages/AvatarTuner.tsx` – image-to-spec UI for pathogens.
- `data/roster.js` – roster data for all enemy types.
- Exported JSON specs saved in `assets/avatars/*.json` when the designer requests it (for pathogens).

## Commands / Tasks
1. **Add/Update enemy from image (Pathogens)**
   - Input: image file and enemy id (e.g., `candida_auris`).
   - Run `AvatarTuner`, load image, accept auto-suggest, then tweak to match reference.
   - Export JSON as `assets/avatars/candida_auris.json`.
   - Update `EnemyRoster.ts` to import and use that spec OR load at runtime.

2. **Add/Update enemy from roster (Mutagens, Vectors)**
   - Input: roster entry with type, name, shape, color, etc.
   - For Mutagens: Implement specific designs (e.g., star for UV, ring for Benzene) in `Mutagen.jsx`.
   - For Vectors: Use `specId` to integrate with `CreatureFactory.tsx` for animal models.
   - Test procedural generation in game.

3. **Batch import**
   - For a folder of images, generate initial specs with the tuner’s auto-suggest, set the `id` to sanitized filename, and save JSONs.
   - Ensure `seed` is stable by hashing the filename.
   - For roster-based, update `roster.js` directly.

4. **Performance tuning**
   - Minions: enforce `detail=0`, `spikeCount≤28`, `arcCount=0`.
   - Elites: `detail=1`, `spikeCount 32–48`, `arcCount 2–4`.
   - Bosses: `detail=1..2`, `spikeCount 44–64`, `arcCount 4–8`.
   - For new factories: Use instancing for swarms, pool geometries.
   - If FPS dips < 45, drop to fallback LOD (reduce spikes by 30%, arcs→0). Implement via a single selector near the spawner.

5. **Material/Geometry pooling**
   - When adding new looks, prefer reusing pool descriptors (same cone sizes, same node sphere, same core detail) to minimize new buffer/allocation churn.
   - Extend pooling to new factories as needed.

6. **Extend AvatarTuner for other types**
   - Add tabs or selectors for enemy type (e.g., "Mutagen").
   - For Mutagens: Sliders for star points, ring radius, laser parameters.
   - Export specs to roster or JSON.

## Acceptance Criteria
- New enemy renders with <5 draw calls (core + instanced spikes + instanced nodes + lines).
- No new heavy dependencies.
- JSON spec ≤ 1 KB.
- Deterministic across sessions for the same `seed` or roster data.
- Modular: Separate factories don't conflict with PathogenFactory.
