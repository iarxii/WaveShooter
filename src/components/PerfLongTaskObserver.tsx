import { useEffect } from 'react';

export default function PerfLongTaskObserver({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !("PerformanceObserver" in window)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obs = new (window as any).PerformanceObserver((list: PerformanceObserverEntryList) => {
      for (const entry of list.getEntries()) {
        if ((entry as PerformanceEntry).entryType === 'longtask') {
          // Surface long tasks if desired:
          // console.log('[perf] long task', entry.duration.toFixed(1), 'ms at', entry.startTime.toFixed(1));
        }
      }
    });
    try { obs.observe({ type: 'longtask', buffered: true } as unknown as PerformanceObserverInit); } catch {}
    return () => obs.disconnect();
  }, [enabled]);
  return null;
}
