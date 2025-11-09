import { useEffect, useState } from 'react';
import * as perf from '../perf';

export default function PerfOverlay({ enabled = true }: { enabled?: boolean }) {
  const [snap, setSnap] = useState(perf.snapshot());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setSnap(perf.snapshot()), 500);
    return () => clearInterval(id);
  }, [enabled]);
  if (!enabled) return null;
  return (
    <div style={{ position: 'absolute', top: 8, left: 8, padding: '8px 10px', background: 'rgba(0,0,0,0.55)', borderRadius: 6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12, color: '#dfe7ff', pointerEvents: 'none', zIndex: 30 }}>
      <div>FPS: {snap.fps.toFixed(1)} • {snap.frameMs.toFixed(1)} ms</div>
      {snap.top.slice(0,3).map(s => (
        <div key={s.name}>
          {s.name}: {s.totalMs.toFixed(1)} ms ({s.calls}x, max {s.maxMs.toFixed(1)} ms)
        </div>
      ))}
    </div>
  );
}
