import { useFrame } from '@react-three/fiber';
import * as perf from '../perf';

export default function PerfCollector({ enabled = true }: { enabled?: boolean }) {
  useFrame((_, dt) => {
    if (!enabled) return;
    perf.frame(dt * 1000);
  });
  return null;
}
