# Environment System (HDRI + Themes)

This project now supports runtime environment themes powered by HDRI image-based lighting, with smooth exposure transitions and fog presets.

## What’s included

- Drei Environment component to load HDRI files
- EnvironmentContext with an app-wide state for the current theme
- SceneEnvironment that:
  - Applies the selected HDRI as scene.environment (and optionally as background)
  - Tweens renderer exposure for soft transitions
  - Applies linear or exponential fog presets per theme
  - Adds a subtle ambient light to complement IBL
- NavBar selector (top bar) to switch themes during gameplay
- Vite configured to include .hdr assets

## Available themes (initial)

- Hospital Room — neutral indoor clinical light
- Surgery Suite — bright cold indoor light
- Outdoor Puresky — outdoor, can enable HDRI background

HDRIs are located in `src/assets/hdri/`.

## How to add a new environment

1. Place a new `.hdr` file in `src/assets/hdri/`.
2. Open `src/environments/environments.ts` and add a new spec:
   - `id`: unique string
   - `label`: display name
   - `hdri`: imported path to the HDRI
   - `background` (optional): true to set sky background
   - `exposure`: renderer exposure target (around 0.8–1.4)
   - `fog` (optional): set `type` to `linear` with `near`/`far`, or `exp2` with `density`
   - `ambient` (optional): small ambient light color/intensity

The theme will appear automatically in the NavBar dropdown.

## Transitions

- On switch, the renderer’s toneMappingExposure is smoothly interpolated to the theme’s target.
- Fog is swapped to the new preset.
- For full HDRI crossfades, consider blending between two PMREM textures; current implementation favors simplicity and performance. See next steps below.

## Files

- `src/contexts/EnvironmentContext.tsx` — context, hooks, and `<SceneEnvironment />`
- `src/environments/environments.ts` — theme specs
- `src/components/NavBar.jsx` — environment selector UI
- `vite.config.js` — includes `**/*.hdr`
- `src/types/assets.d.ts` — declares `*.hdr` module

## Next steps (optional)

- True environment crossfade by capturing both env PMREM targets and lerping in a custom shader or via a dual-box-probe trick.
- Per-level or scripted transitions (e.g., wave-based or boss-based).
- Color grading LUTs per theme via postprocessing.
- Procedural Lightformers for indoor bounce lighting accents.
- Background blur amount per theme (`<Environment blur={...} />`).
