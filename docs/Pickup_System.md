Pickup System

This document describes the in-game pickup system, the built-in pickup types, their data shapes, life-times and how to add new pickups.

Overview

- Pickups are proximity-based world items. When the player comes within a small radius they are collected and immediately apply their effect.
- The pickup system is implemented in `src/App.jsx` (state + spawn/collect logic) and the visual/interaction is provided by the `Pickup` component inside the same file.
- Pickups are intentionally lightweight and time-limited. A global `MAX_PICKUPS` cap prevents excessive concurrent pickups for performance reasons.

Data shape

A pickup object (stored in the `pickups` array in `src/App.jsx`) looks like:

{
  id: number,            // unique id
  pos: [x, y, z],        // world position
  type: string,          // pickup type (see list below)
  amount?: number,       // numeric payload when relevant (e.g. armour amount, power amount)
  lifetimeMaxSec?: number// how long the pickup stays in world (optional)
}

New pickups should follow this shape. The `spawnPickup(type, atPos)` helper in `src/App.jsx` places instances into the `pickups` array.

Pickup types

The game includes several pickup kinds. Each type below documents effect, duration and notes.

- health
  - Effect: Heals the player for +25 HP (reduced by regen debuff if active)
  - Lifetime: ~30s

- power
  - Effect: Grants a power-up which gives a wider bullet spread and visual effect. Adds score equal to the pickup `amount`.
  - Duration: variable (proportional to `amount`, typically 5–10s)

- invuln
  - Effect: Grants player invulnerability for 5s and stun behaviour on collisions.
  - Duration: 5s

- bombs
  - Effect: Activates a bomb-kit that periodically spawns bombs from the player for a short duration.
  - Duration: ~6s total when activated

- life
  - Effect: Grants an extra life (1UP) and triggers a shield-stacking visual window.
  - Lifetime: single concurrently allowed (spawn logic prevents many life pickups)

- armour (new)
  - Effect: Adds Armour Points (AP) to the player's armour pool. The amount is randomized (10–50 AP).
  - Lifetime: ~20s
  - Notes: Armour uses the game's "armor-first" damage model (see `docs/Hero_Armour_and_Health_System.md`). When the pickup is collected it will immediately add AP and push an armour floater event for UI feedback.

- lasers (new)
  - Effect: Temporarily upgrades player bullets to very high damage and allows bullets to damage the Cone Boss (which is otherwise immune to normal bullets).
  - Duration: 5s
  - Notes: This effect multiplies the base bullet damage for the effect duration and clears when the timer expires.

- shield (new)
  - Effect: Creates a translucent shield bubble around the player that continuously pushes nearby enemies away while active.
  - Duration: 5s
  - Notes: The visual is implemented with `ShieldBubble` (in `src/App.jsx`). The logic applies periodic impulses to nearby enemies to keep them at a distance.

- pulsewave (new)
  - Effect: Emits three short bursts that launch nearby enemies into the air. Each launched enemy is accompanied by an "air-bomb" spawned at their location that will land and explode on contact (similar to the player's bombs).
  - Duration: ~5s (3 bursts spaced across the effect window)
  - Notes: The effect is implemented by scheduling three bursts; each burst applies immediate impulses then spawns bombs that behave like normal bombs so they will detonate and stun/damage enemies when they land.

Implementation notes

- Main implementation is inside `src/App.jsx`:
  - `spawnPickup(type, atPos)` creates pickup entries.
  - `Pickup` component (also in `src/App.jsx`) renders the world geometry and handles player proximity collection.
  - `onPickupCollect(id)` applies the effect for the collected pickup type and triggers UI (pickup feed/popups & SFX).

- Effects are pause-aware: most timed effects decrement only while the game is not paused.

- Bomb reuse: The pulse wave implementation reuses the game's `bombs` handling: when a burst launches an enemy, a transient air-bomb is spawned using the same bomb structure so it will explode on landing using existing bomb logic.

How to add a new pickup

1. Choose a unique `type` string.
2. Add a branch in `spawnPickup` to add the pickup object to the `pickups` array (set `lifetimeMaxSec` and any `amount` payload).
3. Add a visual case in the `Pickup` component (geometry/material or text label).
4. Add a branch in `onPickupCollect` implementing the effect. Prefer to use refs for timers (e.g. `myEffectRemainingRef`) and state for UI (`setMyEffect({active:true})`). Use pause-aware loops (see existing `useEffect` timers in the file).
5. If the effect interacts with enemies, prefer to call methods on runtime enemy objects exposed on `window.gameEnemies` (they expose helpers like `impulse(x,z,strength)` and `stun(ms)`).

Files to inspect

- `src/App.jsx` — Pickup system, pickup rendering, spawn/collect logic, effects and visual components (Pickup, ShieldBubble, Bomb, AOEBlast, etc.)
- `src/entities/Player.jsx` — player API and helper functions (some pickups affect player state/visuals)
- `docs/Hero_Armour_and_Health_System.md` — armor-first damage model and how armour is consumed by incoming damage

Questions or follow-ups

- Want different numeric tuning for lasers damage, shield radius/strength, or pulse wave radius/timing? I implemented conservative defaults (lasers: ~4x damage, shield radius 6, pulse bursts 3x over ~3.4s) but can tune them quickly.
- Would you like a dedicated pickup icon atlas or unique model assets for the new pickups? I left them as simple geometry so it's easy to swap in art later.

*** End Patch