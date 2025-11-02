# Wave Shooter: Healthcare Heroes

A clean, fast top-down wave shooter built with React, Vite, and three.js. You play as healthcare-inspired heroes who repel waves of mutagens and viruses. Enemies emerge through directional portals that open around you, drop in from above, and then engage.

Tech: React + @react-three/fiber + three.js + Vite
Focus: snappy controls, clear visuals, and readable wave pressure
Extras: object-pooled bullets, pause-aware spawns, distance-scaled knockback, auto-fire toggle

See `Concept.md` for the game concept and roadmap.

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL in your browser.

## Controls
- Move: D-Buttons (default) or WASD (toggle in UI)
- Aim: Mouse
- Fire: Left-click (or toggle Auto-Fire with F)
- Pause: ESC or SPACE

### Accessibility
- Control scheme toggle:
	- D-Buttons Control (on-screen directional pad; default)
	- WASD Control (keyboard)
- "+ Shape runner" auto-move: optional circle/triangle/rectangle paths; manual input temporarily overrides.

See `ACCESSIBILITY.md` for details and roadmap.

## Gameplay highlights
- Directional portal spawns: portals open in distinct directions around the player and drop enemies in.
- Staggered waves: enemies arrive in batches per portal during each wave.
- Bosses: periodic Triangle Boss with charge and circle behaviors.
- Pickups: Health (+25) and Power (score + bullet buff) collected by proximity with brief pop-ups.
	- Power-ups roll an amount between 50–100 with a weighted distribution:
		- 50–80 common (~70%), 81–89 less common (~25%), 90–100 rare (~5%).
	- Higher amounts scale size; 90–100 become a pulsing diamond.
	- While a power-up effect is active, new bullets are larger and blue; for 90–100, radial barrages fire 3 waves/sec.
 - Edge launch + ground slam: hitting the play-space boundary launches you up and forward toward the cursor; landing triggers a 2s AOE shockwave that pushes enemies back.

## Tuning knobs
Edit `src/App.jsx` constants to balance feel and difficulty:
- Bullet: `BULLET_SPEED`, `BULLET_LIFETIME`, `FIRE_RATE`, `BULLET_POOL_SIZE`
- Knockback: `KNOCKBACK.*`, `KNOCKBACK_DECAY.*`, `KNOCKBACK_DISTANCE_MAX`
- Spawn: wave cadence (12s), enemies per wave/portal, portal duration, drop speed/height
 - Pickups: balanced for faster game pace
	 - On enemy death, pickup drop chance ~20%.
	 - After each wave, ~35% chance to spawn one ambient pickup.
	 - Health pickups last 30s; Power pickups last 15s.

These rates were nudged up to keep up with the increased movement speeds and enemy aggression so players have slightly more sustain and opportunities for power bursts.

## Folder structure
- `src/App.jsx` — main game systems (player, enemies, spawning, collisions)
- `src/styles.css` — UI and overlays
- `Concept.md` — concept and future refinements

## Notes
- Pause is global and spawns are pause-aware.
- Bullets use object pooling to minimize GC.
- Knockback is stronger up close and fades with distance.

## Troubleshooting
- If nothing renders: ensure your browser supports WebGL and you’re on a recent Chrome/Edge/Firefox.
- If inputs don’t respond: click the canvas once to focus.
