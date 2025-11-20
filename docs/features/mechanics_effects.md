# Mechanics and Effects

This document maps roster entries to their in-game mechanics and the shared systems that power them.

## Core player systems

- Primary Health: 100
- Armor/Shield: 500
- Damage routing: Armor absorbs damage first. When armor reaches 0, health takes damage. Visual floaters show +/- deltas for health and armor.
- Corrosion debuff: Damages armor only for 3 every 0.5s while active, and shows a CORROSION buff indicator.
  - Base duration: 5 seconds per application (re-applies/extends on re-entry to corrosive hazards).
- Speed effects:
  - Speed Boost: +duration buff (visual indicator, green). Guarantees at least +12 over base speed (typically ~36–38) for 4s after touching a boost plane.
  - Slow (Debuff): -10% speed for 4s (visual indicator, orange).
 - Pickup QoL: Life pickups magnetize toward the player when within ~16 units, helping collection near corners or heavy pressure.

## Hazard zones

Enemies can emit area hazards that apply periodic damage and/or status effects while the player stands inside.
All hazard visuals render slightly above the ground to prevent z-fighting with the floor.
- Common fields:
  - radius (u): spatial size of the hazard.
  - tickMs: damage/effect evaluation interval (ms).
  - durationMs: lifetime of the hazard (ms).
  - slow: optional movement slow (fractional 0..1) while inside.
  - type:
    - toxin: deals direct health damage per tick via dps.
    - corrosive: applies the corrosion debuff (armor damage over time) and optional slow.

## Implemented roster effects (current)

- C. difficile (T1, unlock 6)
  - Shape: Circle, Color: Yellow
  - Effect: Toxin Cloud — every 10s, emits a toxin field that lasts 6s.
    - radius: 4.5; tickMs: 500; dps: 2; slow: 40%; duration: 6000ms

- P. aeruginosa XDR (T3, unlock 12)
  - Shape: Triangle, Color: Dark Green
  - Effect: Corrosive Burst — every 8s, emits a corrosive field that lasts 5s.
    - radius: 3.6; tickMs: 500; slow: 20%; duration: 5000ms
    - Inside the field, the player gains the CORROSION debuff (armor-only damage over time).

- K. pneumoniae ESBL (T2, unlock 6)
  - Shape: Pentagon, Color: Blue
  - Effect: Enzyme Shield — nullifies bullets during a periodic shield window.
    - Cycle: 10s period; 3s active; during active, player bullets are ignored.
    - Visual: Subtle emissive pulse while the shield is active.

- K. pneumoniae CRE (T3, unlock 10)
  - Effect: Carbapenem Wall — immune to stun effects.
    - Implementation: stunImmune trait; enemy ignores stun attempts (dash/bomb/invuln stun).

- E. coli ESBL (T1, unlock 5)
  - Effect: Rapid Division — spawns a clone on crossing 50% HP.
    - Implementation: First time the enemy drops to <= 50% HP, it spawns one clone with ~half max health; clone does not split again.

## Systems planned (not yet fully wired)

- A. baumannii MDR — Biofilm Armor: regenerates 10% max health every 5s.
- A. baumannii XDR — Extreme Resilience: brief invulnerability after taking damage.
- Enterobacter ESBL — Adaptive Shield: defense boost near allies.
- Enterobacter CRE — Cluster Defense: buffs nearby allies’ speed.
- P. aeruginosa MDR — Toxin Spray: creates a slowing zone intermittently.
- E. coli CRE — Mutation Surge: gains a speed burst when damaged.
- UV Radiation — Mutation Burst: global enemy speed up (+30%).
- Benzene — Carcinogenic Field: reduces player regen (future system).
- X-rays — Radiation Pulse: periodic AoE damage around the entity.
- Nitrosamines — Toxic Mist: slowly drains player health while nearby.

## Notes

- Enemy shapes and move speeds are driven by `src/data/roster.js` and visualized by `src/entities/RosterEnemy.jsx`.
- Hazard rendering and ticking lives in `App.jsx` (HazardZone component + hazard tick effect).
- The leveling system gates unlocks and tier weights; caps and spawn budgets are data-driven in LEVEL_CONFIG.
- Values above are tuned for readability and will be iterated for balance.

## New: Bouncers and Firepower/Drops

- Bouncers: Cyan ring telegraphs sit for 4s, then a unit launches straight upward from that spot and despawns after a short time. Purely positional pressure (no ground clutter).
- Firepower: Default fire is triple-shot at a faster rate (120ms). Power-ups upgrade to 5-stream; rare 90–100 power still triggers radial barrages (3 waves/sec).
- Drops: Invulnerability and Bomb Kit drop rates are increased and scale upward with waves for survivability at higher difficulty.
