# Wave Shooter: Healthcare Heroes vs. Mutagens

## Elevator pitch
A fast, top-down wave shooter where you play as healthcare-inspired heroes combating waves of mutagens and viruses. Enemies emerge through directional portals and drop into the arena, keeping pressure focused and readable while you kite, aim, and control space.

## Theme
- Player fantasy: frontline healthcare professionals as agile, empowered heroes.
- Enemies: hazardous agents (pathogens and mutagens) represented by stylized shapes with educational metadata.
- Visual language: clean, clinical palette with energetic highlights for combat feedback.

## Core loop
1. Survive directional enemy waves that spawn via portals.
2. Move (WASD) and aim with the mouse; fire to neutralize threats.
3. Collect pickups to recover health or boost score.
4. Clear waves, face periodic bosses, and climb the score ladder.

## Enemy design (mutagens)
- Minions: common chasers that coordinate loosely and avoid clustering.
- Boss (Hex/"Pathogen"): heavier units that push and absorb more damage.
- Triangle Boss: periodic elite with charge/circle behaviors; cannot be damaged during its charge to avoid mid-dash despawns.

## Portal-based spawning (requested)
- Enemies no longer appear randomly around the player.
- Each wave opens 2–4 ground portals at distinct directions around the player’s current position.
- From each portal, enemies drop in from above, land, and then engage the player.
- Directional pressure: spawns are grouped so you can read threats and make deliberate kiting choices.

## Movement & combat
- WASD to move; mouse to aim; left-click to shoot.
- Auto-fire default ON; toggle with F.
- Camera modes: Follow (9), Static with zoom (0), Top-Down (8).
- Auto-aim (Follow/Top-Down): prioritizes nearby clusters at short/mid range, otherwise picks highest-priority long-range target (cone > boss > minion).
- Bullets use object pooling for performance.
- Knockback on hit provides separation; scaled by distance for punchy close-range hits.

## Pickups
- Health packs (+25 Health)
- Power-ups (+50 to +100 Score, weighted toward 50–80)
- Invulnerability (5s) — enables "shape runner" with circle/hexagon/rectangle and shape DoT while active; hold 1 (CCW) or 2 (CW) to auto-follow the ring.
- While holding 1/2 during invulnerability, shots become yellow stun bullets (no damage) that briefly stun enemies.
- Pickups are proximity-based with brief pop-ups.

## Waves & pacing
- Waves arrive on a fixed cadence.
- Within a wave, portals open and spawn staggered batches.
- Every few waves, a Triangle Boss enters via a dedicated portal.
- The game respects pause state—spawns won’t backlog while paused.
- Pickup economy: health probability reduced ~30% to keep runs readable and reduce on-field clutter; a MAX_PICKUPS cap limits concurrent pickups for FPS.

## UI & feedback
- Minimal clean HUD: wave, score, health, lives.
- Aim ray for clarity; ground grid for orientation.
- Camera controls hint: 9 Follow • 0 Static (zoom) • 8 Top-Down; Invulnerability ring follow: hold 1/2.
- Pause overlay with clear resume/restart prompts and life-lost countdown.

## Tuning knobs (selected)
- Bullet: speed, lifetime, fire rate, pool size.
- Knockback: per-enemy base strength, decay, distance scaling.
- Spawn: wave interval, enemies per portal, portal lifetime, drop speed/height.

## Future refinements
- Hero classes with unique passives/ultimates.
- Ranged enemy types (spitters, beamers) with telegraphed attacks.
- Hazard tiles (slow/clean zones) and temporary barriers.
- XP/progression, meta unlocks, loadouts.
- Visual polish for portals (particles, shaders, sound).

## Glossary
- Portal: a visual ground marker that opens and drops enemies in over a short period.
- Drop-in: the brief fall animation from a higher Y position to the ground before enemies activate.
- Wave: a spawning window during which one or more portals open and release enemies.
