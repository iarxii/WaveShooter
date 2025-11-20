# Game Optimization Report

This report documents the performance-focused changes made to stabilize frame rate, reduce runtime overhead, and give you fast tuning controls during playtesting.

## Summary of Changes

- Arena growth: introduced modes (time and milestone), then fully disabled via feature flag to eliminate constant ticking and checks.
- Cameras: both top-down and static cameras frame the arena using `boundaryLimit` for consistent scale and fewer recalculations.
- Performance overlays & profiling:
  - Lightweight FPS meter that samples via `requestAnimationFrame` and updates ~2x/sec.
  - In-canvas Perf Overlay (live frame ms + top 3 timed sections from custom profiler).
  - Drei `Stats` overlay re-enabled behind a toggle for deeper GPU/CPU timing when necessary.
  - Custom profiler (`src/utils/perf.js`) with granular sections: `player.update`, `wave.plan`, `wave.cycle`, `collision`, `hazards.tick`.
  - Long Task observer: main-thread long tasks recorded under `longtask`.
- Enemy spawn pressure: added a configurable multiplier to reduce the number of basic enemies while preserving pacing; foundation for auto-tuning.
- OrbitControls: mounted only in static camera mode to reduce input/interaction overhead.
- AOE effect arrays: capped to the last 12 entries to avoid accumulating GPU draw and JS work over time.
- Hazard ticking cadence: kept at 100ms (10Hz), which is performant and smooth enough for gameplay.

## Tuning Knobs (UI + Persistence)

All settings persist to `localStorage` and can be adjusted in the right-side panel.

- Spawn pressure multiplier (`spawnPressureMul`)
  - Range: 0.5–1.2 (default 0.9)
  - Effect: Scales the count of basic enemies per wave. Lower values reduce load.
  - Persistence key: `spawnPressureMul`
  - Pickup coupling: Total pickup drop chance is automatically scaled by the inverse of spawn pressure (clamped). When pressure is lower, drops become more frequent to maintain resource flow; when pressure is higher, drop rates ease back to avoid overload.
- Top-down speed multiplier (`topDownSpeedMul`)
  - Range: 0.5–3.0 (default per prior session or fallback)
  - Effect: Scales player and enemies in top-down mode to maintain intended speed-feel.
  - Persistence key: `topDownSpeedMul`
- Performance overlays
  - Lightweight FPS: quick feedback with minimal overhead.
  - Perf Overlay: shows frame time and hottest code sections (top 3) updating every ~0.5s.
  - Drei Stats: full resource breakdown (optional, heavier).
  - Longtask tracking: visible in console via `window.__perf.getReport()` (entries under name `longtask`).

## Arena Growth

- Feature flag: `ARENA_GROWTH_DISABLED` (currently `true`).
- Outcome: No time-based or milestone-based arena growth code runs, removing per-second timers and per-wave checks.
- If you want to re-enable growth later, disable the flag and use milestone mode (every N waves) to avoid per-second ticking.

## Implementation Notes

- Spawn pressure is applied where `basicsToSpawn` is computed inside `spawnWave`, using a ref (`spawnPressureMulRef`) so the latest value is read without re-registering callbacks.
- Pickup economy coupling: enemy-death drop gate and ambient post-wave pickup probabilities are multiplied by an inverse pressure factor (1 / spawnPressure) and clamped to reasonable ranges. This keeps health/power/bombs/invuln availability consistent across different spawn densities.
- Cameras compute framing from `boundaryLimit` so that any arena size changes (if re-enabled) are automatically respected.
- AOE caps (12) apply to dashes, slams, and bombs—keeps visuals snappy without runaway lists.
- Profiler instrumentation:
  - `player.update` (existing)
  - `wave.plan` (spawn planning & budgeting)
  - `wave.cycle` (periodic wave loop trigger)
  - `collision` (bullet-enemy collision pass)
  - `hazards.tick` (hazard zone evaluation)
  - `longtask` (PerformanceObserver long tasks >50ms)
  - Add more with `perf.start(name)` / `perf.end(name)` or `perf.add(name, duration)`.
- Perf Overlay: Renders via Drei `<Html>` in the main `Canvas`, sampling the profiler every 500ms, showing FPS (smoothed) + frame time + top sections.
- Long Task Observer: hooks into `PerformanceObserver` and aggregates durations under `longtask`.

## Quick Verification

- Expected FPS target: 53–60 on test hardware (dev build may be lower; confirm with production build).
- With arena growth disabled and spawn pressure at 0.9, frame pacing should be noticeably smoother.
- Use Perf Overlay to confirm `collision` and `wave.plan` stay well under the frame budget in steady state.
- Use `window.__perf.getReport()` for a detailed snapshot; inspect `top` array for cumulative section timings.
- Enable Drei `Stats` only when diagnosing deeper GPU issues (disable again afterward to reclaim CPU/GPU headroom).

## Known Hotspots and Next Ideas

- Shape runner "hold" mode can still be choppy on lower-end hardware.
  - Consider throttling trail updates or reducing particle counts when FPS < 55.
  - Consider culling or pooling visual elements aggressively during high-load windows.
- If wave density spikes, consider:
  - Lowering `spawnPressureMul` to 0.8–0.85.
  - Spreading spawn bursts across frames (batching groundwork in place; extend to portal scheduling if needed).
  - Adjusting the pickup coupling clamp window if you prefer more/less generosity at extreme pressures.
- Potential worker offloads: geometry randomization / factory spec generation if `wave.plan` becomes dominant.
- Add instrumentation for: bouncer spawning, bomb explosion damage loop, regeneration tick, and AI steering (per-enemy) if they emerge as top contributors.

## How to Adjust During Playtests

1. Start a run and keep the FPS meter visible.
2. If FPS dips below 55 persistently, lower Spawn Pressure by 5–10%.
3. If gameplay feels too fast/slow in top-down, adjust `Top-down speed multiplier` in small increments (±0.1).
4. Only enable Drei `Stats` when you need deeper diagnostics; turn it off afterward.

## Rollback/Restore

- All UI-driven changes persist to `localStorage`. Use the UI to reset sliders, or clear site storage to return to defaults.

## File Touch Points

- `src/App.jsx`
  - Spawn pressure state, persistence, ref, and UI slider.
  - Growth flag guarding arena growth logic.
  - FPS meter, Perf Overlay, Long Task observer, and Drei `Stats` toggles.
  - Profiler section instrumentation (`wave.plan`, `wave.cycle`, `collision`, `hazards.tick`).
  - AOE cap logic and camera speed multiplier handling.

- `src/entities/FlyingDrone.jsx`
  - Accepts `boundaryLimit` and `speedScale`, using them to clamp and scale motion.

## Success Criteria

- Build: PASS
- Lint/Typecheck: PASS
- Runtime: No errors; FPS stabilized nearer 60 with default settings.
- Profiler: Sections populate; no section consistently dominates frame time (>60% of frame) under normal load.

If you want me to auto-tune spawn pressure based on FPS in real-time, I can add a feedback controller next (e.g., sample FPS over 5 seconds, adjust pressure by small increments).

## Using the Profiler

Console helpers:

```js
window.__perf.getReport();                 // latest snapshot
console.table(window.__perf.getReport().top);
```

In code, add a new section:

```js
perf.start('mySystem');
// ... work ...
perf.end('mySystem');
```

Or record a pre-measured duration:

```js
perf.add('decode.audio', 12.4); // ms
```

The Perf Overlay (top of canvas) shows FPS, frame ms, and top 3 cumulative section times for the current sample window.
