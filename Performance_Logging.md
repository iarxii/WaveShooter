# DevTools Performance Metrics Logger — Design & Implementation

This document explains how the in‑game DevTools Performance Metrics logger was designed, how it integrates with React Three Fiber (R3F), and how you can re‑create it after a rollback. It’s focused on low‑overhead frame sampling, section timing via the User Timing API, and visibility through an optional in‑canvas overlay.

## Goals

- Make performance issues visible during gameplay without pausing the app.
- Attribute frame time to the heaviest sections (e.g., collision, enemy AI, spawns, effects).
- Keep overhead tiny (no allocations in the hot path; reuse buffers).
- Integrate with Chrome/Edge/Firefox DevTools via the User Timing API.
- Toggle on/off from the UI without changing code paths.

## High‑level architecture

- Perf store: a tiny module with a ring buffer that tracks per‑frame data and aggregates “sections” (named timers).
- API surface:
  - `perf.start(name)` / `perf.end(name)` to measure sections.
  - `perf.frame(dtMs)` to record each frame duration.
  - `perf.snapshot()` to read the top sections and summary.
  - `perf.reset()` to clear buffers.
- DevTools integration: `performance.mark()` and `performance.measure()` around sections to make them show up in the Performance panel.
- Long task observer: `PerformanceObserver({type: 'longtask'})` to surface main‑thread stalls (>50ms tasks).
- UI: Optional `<PerfOverlay />` shows FPS, frame ms, and top 3 sections, updating about twice per second.

## Data model (conceptual)

- Section sample: `{ name, calls, totalMs, maxMs, lastMs }`
- Frame sample: `{ timeMs }` stored in a small ring buffer to compute moving averages and FPS.
- Long tasks: `{ startTime, duration, name: 'longtask' }` appended to a capped list.

## Implementation walkthrough

You can re‑create the system in three small parts. Filenames below reflect a common layout; adjust to your project structure as needed.

### 1) perf core (src/perf.js)

Responsibilities:
- Provide `start/end` timers with minimal overhead.
- Record `frame(dtMs)` each render to compute FPS.
- Expose `snapshot()` for overlays and `reset()` for dev testing.
- Optionally emit User Timing marks/measures for DevTools.

Key design details:
- Use `performance.now()` for timestamps.
- Keep a `Map<string, SectionAccumulator>` in module scope; reuse objects to avoid GC pressure.
- Avoid creating arrays per frame; aggregate into accumulators and only format when `snapshot()` is called.

Example API (simplified):

```ts
// src/perf.js
const sections = new Map();
const starts = new Map();
let frameCount = 0;
let lastFrameAt = performance.now();
let frameMsEMA = 16.7; // EMA smoothing for readability

export function frame(dtMs) {
  frameCount++;
  frameMsEMA = frameMsEMA * 0.9 + dtMs * 0.1;
}

export function start(name) {
  const t = performance.now();
  starts.set(name, t);
  performance.mark(`${name}:start`);
}

export function end(name) {
  const t = performance.now();
  const s = starts.get(name);
  if (s != null) {
    const d = t - s;
    let acc = sections.get(name);
    if (!acc) sections.set(name, (acc = { name, calls: 0, totalMs: 0, maxMs: 0, lastMs: 0 }));
    acc.calls++;
    acc.totalMs += d;
    acc.lastMs = d;
    if (d > acc.maxMs) acc.maxMs = d;

    performance.mark(`${name}:end`);
    performance.measure(name, `${name}:start`, `${name}:end`);
  }
}

export function snapshot() {
  const list = Array.from(sections.values()).sort((a, b) => b.totalMs - a.totalMs);
  const totalFrameMs = frameMsEMA;
  const fps = 1000 / Math.max(1e-3, totalFrameMs);
  return { fps, frameMs: totalFrameMs, top: list.slice(0, 5) };
}

export function reset() {
  sections.clear();
  starts.clear();
}
```

Notes:
- The real version used a tiny ring buffer for recent frames; EMA works fine for on‑screen display.
- We emit User Timing marks so the Performance panel shows named measures.

### 2) frame collector (under Canvas)

In R3F, `useFrame` must be called inside a Canvas subtree. Create a small component to record frame time and avoid hook misuse elsewhere:

```tsx
// src/components/PerfCollector.tsx
import { useFrame } from '@react-three/fiber';
import * as perf from '../perf';

export default function PerfCollector({ enabled = true }) {
  useFrame((_, dt) => {
    if (!enabled) return;
    perf.frame(dt * 1000);
  });
  return null;
}
```

Mount it once under your `<Canvas>` when debugging.

### 3) overlay and long‑task observer (optional)

Overlay: read `perf.snapshot()` on an interval (e.g., 500ms) and render a small UI with FPS and top sections.

```tsx
// src/components/PerfOverlay.tsx
import { useEffect, useState } from 'react';
import * as perf from '../perf';

export default function PerfOverlay() {
  const [snap, setSnap] = useState(perf.snapshot());
  useEffect(() => {
    const id = setInterval(() => setSnap(perf.snapshot()), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ position: 'absolute', top: 8, left: 8, padding: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 6, fontFamily: 'monospace', fontSize: 12 }}>
      <div>FPS: {snap.fps.toFixed(1)} • {snap.frameMs.toFixed(1)} ms</div>
      {snap.top.slice(0,3).map(s => (
        <div key={s.name}>
          {s.name}: {s.totalMs.toFixed(1)} ms ({s.calls}x, max {s.maxMs.toFixed(1)} ms)
        </div>
      ))}
    </div>
  );
}
```

Long‑task observer: capture main‑thread stalls and optionally surface them in the overlay or console.

```ts
// src/components/PerfLongTaskObserver.tsx
import { useEffect } from 'react';

export default function PerfLongTaskObserver({ enabled = true }) {
  useEffect(() => {
    if (!enabled || !('PerformanceObserver' in window)) return;
    const obs = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') {
          // You can push to a store, or just log:
          // console.log('Long task', entry.duration.toFixed(1), 'ms at', entry.startTime.toFixed(1));
        }
      }
    });
    try { obs.observe({ type: 'longtask', buffered: true }); } catch {}
    return () => obs.disconnect();
  }, [enabled]);
  return null;
}
```

## Integration guide (re‑apply after rollback)

- Add files:
  - `src/perf.js` (core)
  - `src/components/PerfCollector.tsx`
  - `src/components/PerfOverlay.tsx` (optional)
  - `src/components/PerfLongTaskObserver.tsx` (optional)
- Mount under your `<Canvas>` (within a React.Suspense if you use one):
  - `<PerfCollector enabled={true} />`
  - `<PerfLongTaskObserver enabled={true} />`
  - `<PerfOverlay />` behind a debug toggle so it’s easy to hide.
- Instrument hot sections with `perf.start(name)` and `perf.end(name)`:
  - Collision detection loop
  - Enemy AI updates
  - Spawn wave generation/batching
  - Environment/hazard ticks
  - Effects/system updates (e.g., screen‑space effects)

Example (collision pass):

```ts
perf.start('collision');
// ... broadphase + narrowphase work ...
perf.end('collision');
```

Tip: If you wrap logic in helpers, consider a small utility:

```ts
export function withPerf(name, fn) {
  perf.start(name);
  try { return fn(); } finally { perf.end(name); }
}
```

## DevTools Performance panel (User Timing)

Because the logger emits `performance.mark/measure`, your named sections appear in the Performance panel timeline when you record a profile. This makes it easy to correlate in‑game sections with browser traces and long tasks.

- Marks: `${name}:start` and `${name}:end`
- Measure: `${name}` computed from those marks
- You can filter to “User Timing” in the panel to focus on your sections.

## Controls and UX

- Toggle overlay: expose a boolean in your Debug/Accessibility panel.
- Reset stats: call `perf.reset()` when starting a new level or on user request.
- Sampling cadence: overlay polls every ~500ms; the core records every frame without allocations.

## Performance characteristics

- Hot path work is O(1) per `start/end` pair with a small constant factor.
- No arrays or closures allocated per frame; objects are reused.
- Overlay polling is decoupled (interval) to avoid extra renders.

## Troubleshooting

- “useFrame cannot be used outside of Canvas”: ensure the collector lives under `<Canvas>`.
- “Measures don’t appear in DevTools”: verify User Timing is enabled and you’re recording a fresh profile.
- Overlay missing or flickering: keep overlay in the HTML layer (position: absolute) or render it as a sibling to Canvas.
- Excessive section names: keep the set of names small and stable to avoid Map churn.

## Suggested section names for this project

- `collision`
- `enemy_ai`
- `spawn_wave`
- `hazard_tick`
- `effects_update`
- `player_update`

Using consistent names keeps the top list meaningful and comparable between runs.

## Minimal checklist (to rebuild quickly)

- Create `src/perf.js` with `start/end/frame/snapshot/reset`.
- Add `<PerfCollector enabled />` under Canvas.
- Add `<PerfOverlay />` and `<PerfLongTaskObserver enabled />` behind a debug toggle.
- Wrap the heavy loops with `perf.start/end` calls.
- Record a DevTools Performance profile and inspect the User Timing lane.

---

If you want, you can also wire a small export function (e.g., `window.perfDump = () => JSON.stringify(perf.snapshot())`) to copy the top sections into bug reports. This keeps profiling lightweight and shareable without shipping third‑party profilers.
