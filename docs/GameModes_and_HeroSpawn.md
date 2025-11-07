# Game Modes and Hero Spawn Wiring

Date: 2025-11-07

This document captures the initial wiring of game modes and how the hero is spawned in the actual game using the Hero Factory.

## Modes Overview

We added a new Game Mode page at `/modes` to choose between:

- Campaign (Coming Soon)
  - Will contain curated missions/objectives and special Hazard Agent enemies.
  - For now: the mode is disabled and provides a link to the Character Viewer so players can preview enemies.
- Wave Battle (Current)
  - Existing gameplay that spawns randomized enemies.
  - This will evolve into a wave-based horde-shooter roguelite.

Landing page now routes the Start Game button to `/modes`.

Files:
- `src/pages/GameMode.jsx` – New page with two styled cards for Campaign and Wave Battle.
- `src/AppRouter.jsx` – Added route `/modes`.
- `src/pages/Landing.jsx` – Start button now links to `/modes`.

## Hero Factory in the Game

The player character is rendered by `src/entities/Player.jsx`. We now auto-select the hero render mode based on the selected hero:

- Dr Dokta → Hero Factory controller (animated factory avatar).
- Others → Existing visuals (FBX/GLB if available or block fallback), until animation packs are ready.

Implementation details:
- `src/App.jsx`
  - `heroRenderMode` persisted in localStorage (existing).
  - New effect auto-sets `heroRenderMode` to `factory` when the selected hero name contains "Dokta"; otherwise to `model`.
- `src/entities/Player.jsx`
  - If `heroRenderMode === 'factory'`, renders `<HeroFromSpec />` with a live controller object (move/aim) driving the factory rig.
  - Else uses hero-specific model (Dr Dokta / Sr Sesta) or block fallback.

Rationale:
- Only Dr Dokta currently has a full animation/controller set. This guard ensures we show the best experience for Dokta while keeping others functional with the existing controller visuals.
- As more heroes gain animation packs, we can expand the mapping in the App-level effect or expose an options menu to force the mode.

## Planned Refinements

- Campaign mode UI/flow and first mission skeleton.
- Expand animation support to additional heroes and update the auto-mode mapping.
- Game Mode specific settings (e.g., wave pacing, difficulty presets).
- Optional toggle to override the auto mode and lock the preferred hero render (factory/model) per user.
