# App Structure

This document outlines the app's new page-based architecture, shared contexts, and how it ties into the Leveling System.

## Pages

- Landing (`src/pages/Landing.jsx`)
  - Overview of the game and latest stats from GameContext (Best Score, Best Wave, Total Play Time).
  - Links to start the game and open the Character Viewer.
- Game (`src/pages/Game.jsx`)
  - Hosts the core game runtime by rendering `src/App.jsx` (canvas + HUD). This keeps the game loop intact while enabling routing.
  - Game over events are recorded into HistoryContext (last 50 runs) with score, wave, timestamp, and Performance Mode flag.
- Character Viewer (`src/pages/CharacterViewer.jsx`)
  - Lets you browse enemies and heroes with unlock level and tier. Currently uses a small in-file dataset aligned with `Updated_Enemy_List.md` and `Hero_List.md`.
  - Future: centralize roster data in a `data/` module to avoid duplication.

## Shared Contexts

- GameContext (`src/contexts/GameContext.jsx`)
  - Global stats surfaced in the UI: `bestScore`, `bestWave`, `performanceMode`, `totalPlayTimeMs`.
  - Mirrors localStorage so HUD/landing stay in sync even while the game updates values.
- HistoryContext (`src/contexts/HistoryContext.jsx`)
  - Persists a compact run history to localStorage (last 50 entries).
  - `addRun({ score, wave, at, performanceMode })` is called by the game on Game Over.

## Routing

- `src/AppRouter.jsx` wraps the app with `HistoryProvider` and `GameProvider`, renders a fixed `NavBar`, and declares routes:
  - `/` → Landing
  - `/game` → Game page
  - `/characters` → Character Viewer

## Leveling System Integration

- The Leveling System is implemented data-first inside `src/App.jsx` via `LEVEL_CONFIG` (budgets, caps, unlocks, tier weights, boss chances).
- Spawn planning respects level gates and caps. Performance Mode (toggle in the game UI) clamps caps for lower-spec devices.
- Documentation:
  - `docs/Leveling_System.md` — design and parameters
  - `Balancing_Table.md` / `Updated_Enemy_List.md` — tiers, unlocks, caps reference

## Notes & Next Steps

- Migrate enemy/hero metadata into a shared `src/data/roster.js` and reuse in Character Viewer and spawn logic comments.
- Consider a small History view on the Landing page (best N recent runs).
- If/when `App.jsx` is further modularized, move the Canvas/HUD into `src/features/game/` and keep `src/pages/Game.jsx` as a thin host.
