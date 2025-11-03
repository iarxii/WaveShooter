# Wave Shooter — New Enemies, Shield, and QoL

This update adds a Pipe (cylinder) boss that spawns flying drones, a Cluster boss that splits into minions, a boundary-jump shield, a milestone Life pickup, confetti on new highs, and persistence for play time and control scheme.

## New enemies

- PipeBoss: rises for ~3s, then launches 2–6 flying drones every 4–6s near arena edges/corners; low HP compared to other bosses.
- FlyingDrone: red capsule with tips; orbits while tracking the player and dives when close or after ~5s. Immune to bullets, bombs, and invuln DoT; killable by boundary-jump collision or self-destruct on ground impact.
- ClusterBoss: clump of red orbs (boss) with modest HP. On death, splits into 4–6 standard minion orbs.

## Mobility and difficulty

- Speed caps: Player base speed capped at 65; enemy speed modifier capped at 1.6×.
- Restart resets both player speed and enemy speed modifier to baseline.

## Shield and pickups

- Boundary jump invulnerability shows a faint shield around the player while airborne.
- Invulnerability pickup (shape runner) now grants 2s of extra protection after the auto-arc landing.
- Life pickup: rare spawn every 3 waves (milestone); grants +1 life (up to 5).

## HUD and feedback

- HUD shows current flying drone count and the speed indicators: “Enemies xS • Player P”.
- Confetti bursts celebrate a new high score once per run.
 - New Abilities panel shows Dash cooldown and status.

## Persistence

- Control scheme is persisted to localStorage and restored on reload.
- Best score, best wave, and total play time (ms) are persisted in localStorage.

## Performance notes

- Drones capped to 16 active; drones share geometries and materials to reduce allocations.
- Trails use a small, fixed node count and are only active during dives.
- Confetti uses InstancedMesh for a short-lived, lightweight burst.

# Wave Shooter: Healthcare Heroes

A clean, fast top-down wave shooter built with React, Vite, and three.js. You play as healthcare-inspired heroes who repel waves of mutagens and viruses. Enemies emerge through directional portals that open around you, drop in from above, and then engage.

Tech: React + @react-three/fiber + three.js + Vite
Focus: snappy controls, clear visuals, and readable wave pressure
Extras: object-pooled bullets, pause-aware spawns, distance-scaled knockback, auto-fire (default ON), camera modes

See `Concept.md` for the game concept and roadmap.

## Recent Gameplay Tweaks

- Bouncers (new): Cyan ground rings telegraph for 4s, then a unit launches straight upward and despawns. Adds vertical motion moments and spacing pressure without cluttering the ground.
- Hazards lifted: All hazard visuals render slightly above the floor to prevent z-fighting.
- Movement tuning: Slow debuff reduced to 10% (was 40%). Speed boosts now guarantee a noticeable increase (at least +12 over your base speed, typically ~36–38) for 4s.
- Drops: Invulnerability and Bomb Kit drops are significantly more common and scale up at higher waves.
- Firepower: Faster fire rate (120ms), higher bullet damage, default triple-shot. Power-ups upgrade to a 5-stream fan; rare 90–100 power still triggers radial barrages.
- QoL: Life pickups now magnetize toward the player within a generous radius so you don’t have to pixel-perfectly collide at the corners under pressure.
 - Invulnerability now clears and blocks portal slow: picking up Invulnerability removes existing slow debuffs and prevents portal slow while active.
 - Visibility: Pickup sizes are multiplied by a global scale you can adjust in the UI (0.5×–4.0×). Default is 3×, layered on top of camera-based scaling.
 - Feedback: When Invulnerability cancels an existing slow debuff, a brief blue shimmer pulses around the player as a visual confirmation.

## Leveling system
Higher-level enemies unlock at higher levels to control memory and difficulty. Level currently equals Wave.

- Read the full design in `docs/Leveling_System.md`.
- Balancing and unlocks are summarized in `Balancing_Table.md` and `Updated_Enemy_List.md`.
 - Roster mechanics and new hazard/armor systems are documented in `docs/mechanics_effects.md`.

## App structure and pages

The app now uses routing with shared contexts:

- Pages: Landing (`/`), Game (`/game`), Character Viewer (`/characters`). See `docs/App_Structure.md`.
- Contexts: `GameContext` (best score/wave, performance mode, play time) and `HistoryContext` (last 50 runs).
- The Game page renders the existing `src/App.jsx` (game canvas + HUD), so gameplay remains unchanged while navigation and state sharing improve.

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL in your browser.

## Controls
- Move: D-Buttons (default) or WASD (toggle in UI)
- Aim: Mouse
- Fire: Left-click (Auto-Fire default ON; toggle with F)
- Pause: ESC or SPACE
 - Camera modes: 9 Follow • 0 Static (zoom enabled) • 8 Top-Down (2D-style)
 - Shape runner follow (during Invulnerability): hold 1 = CCW • hold 2 = CW
 - Dash: press 3 to perform a fast dash (~0.25s) covering roughly 20% of the arena. 10s cooldown. Grants brief invulnerability during the dash and pushes nearby enemies away.

### Accessibility
- Control scheme toggle:
	- D-Buttons Control (on-screen directional pad; default)
	- WASD Control (keyboard)
- Invulnerability “shape runner”: circle/hexagon/rectangle path visualization; hold 1/2 to auto-follow perimeter while active.
- Static camera has mouse wheel zoom; rotate/pan remain disabled to keep orientation simple.

See `ACCESSIBILITY.md` for details and roadmap.

## Gameplay highlights
- Directional portal spawns: portals open in distinct directions around the player and drop enemies in.
- Staggered waves: enemies arrive in batches per portal during each wave.
- Bosses: periodic Triangle Boss with charge and circle behaviors; immune to damage while charging to avoid mid-dash despawns.
- Pickups: Health (+25), Power (score + bullet buff), and Invulnerability (5s) collected by proximity with brief pop-ups.
	- Power-ups roll an amount between 50–100 with a weighted distribution:
		- 50–80 common (~70%), 81–89 less common (~25%), 90–100 rare (~5%).
	- Higher amounts scale size; 90–100 become a pulsing diamond.
	- Default fire is a triple stream. While a power-up is active, bullets are larger/blue and fire in a 5-stream fan; for 90–100, radial barrages fire 3 waves/sec.
- Invulnerability (yellow capsule):
	- Visualizes a circle/hexagon/rectangle ring at arena center.
	- Hold 1 (CCW) or 2 (CW) to auto-follow the ring perimeter.
	- Enemies inside the shape take periodic damage over time.
	- While holding 1/2 during invulnerability, shots become yellow stun bullets (no damage) that briefly stun enemies.
- Auto-aim (Follow and Top-Down camera modes):
	- Prefers aiming at nearby clusters (centroid) at short/mid range; otherwise targets the highest-priority enemy (cone > boss > minion) at long range.
 - Edge launch + ground slam: hitting the play-space boundary launches you up and forward toward the cursor; landing triggers a 2s AOE shockwave that pushes enemies back.
 - Dash ability (3): while off cooldown, dash in your aim direction to quickly reposition; you are invulnerable during the dash window and nearby enemies are pushed aside.

## Tuning knobs
Edit `src/App.jsx` constants to balance feel and difficulty:
- Bullet: `BULLET_SPEED`, `BULLET_LIFETIME`, `FIRE_RATE`, `BULLET_POOL_SIZE`
- Knockback: `KNOCKBACK.*`, `KNOCKBACK_DECAY.*`, `KNOCKBACK_DISTANCE_MAX`
- Spawn: wave cadence (12s), enemies per wave/portal, portal duration, drop speed/height
 - Pickups & performance:
	 - On enemy death, pickup drop chance ~20%; power vs health mix biased toward power.
	 - After each wave, ~35% chance to spawn one ambient pickup; health rate reduced by ~30%.
	 - Health pickups last 30s; Power pickups last 15s; Invulnerability lasts 5s.
	 - MAX_PICKUPS cap to limit concurrent pickups for FPS stability.
 - Shape runner: `SHAPE_PATH_RADIUS` controls ring size (decoupled from arena boundary).

These rates were nudged up to keep up with the increased movement speeds and enemy aggression so players have slightly more sustain and opportunities for power bursts.

## Folder structure
- `src/App.jsx` — main game systems (player, enemies, spawning, collisions)
- `src/styles.css` — UI and overlays
- `Concept.md` — concept and future refinements

## Notes
- Pause is global and spawns are pause-aware.
- Bullets use object pooling to minimize GC.
- Knockback is stronger up close and fades with distance.
 - Camera modes: Follow (smooth), Static (zoom), Top-Down (2D-style); zoom disabled in Follow/Top-Down to avoid fighting camera rigs.
 - Auto-Fire is ON by default; toggle with F.

## Troubleshooting
- If nothing renders: ensure your browser supports WebGL and you’re on a recent Chrome/Edge/Firefox.
- If inputs don’t respond: click the canvas once to focus.
