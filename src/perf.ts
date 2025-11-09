// Lightweight performance logger core
// API: start(name), end(name), frame(dtMs), snapshot(), reset(), withPerf(name, fn)

type SectionSample = {
  name: string;
  calls: number;
  totalMs: number;
  maxMs: number;
  lastMs: number;
};

const sections = new Map<string, SectionSample>();
const starts = new Map<string, number>();
let frameMsEMA = 16.7; // Exponential moving average for frame time

export function frame(dtMs: number) {
  // Smooth a bit for readability in overlay
  frameMsEMA = frameMsEMA * 0.9 + dtMs * 0.1;
}

export function start(name: string) {
  const t = performance.now();
  starts.set(name, t);
  try {
    performance.mark(`${name}:start`);
  } catch {}
}

export function end(name: string) {
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

    // User Timing API for DevTools correlation
    try {
      performance.mark(`${name}:end`);
      performance.measure(name, `${name}:start`, `${name}:end`);
    } catch {}
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

export function withPerf<T>(name: string, fn: () => T): T {
  start(name);
  try {
    return fn();
  } finally {
    end(name);
  }
}

// Optional helper to quickly dump snapshot in console
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).perfDump = () => snapshot();
