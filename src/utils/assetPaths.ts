// Utility helpers for static asset URL resolution.
// Provides tolerant fallbacks; prefer placing large binary/media assets under /public/assets
// so that direct string paths work even if Git LFS did not hydrate source copies during CI.

/** Build a URL to an asset located in the public/assets directory. */
export function publicAsset(rel: string): string {
  if (!rel || typeof rel !== 'string') return ''
  const url = `/assets/${rel}`.replace(/\\/g, '/');
  return registerAsset(url);
}

/** Attempt to resolve a source asset via import.meta.url; fallback to public path. */
export function srcAsset(rel: string): string {
  if (!rel || typeof rel !== 'string') return ''
  try {
    // Using new URL requires the asset to exist under src during build; warnings occur if missing.
    const url = new URL(`../assets/${rel}`, import.meta.url).href;
    return registerAsset(url);
  } catch {
    return publicAsset(rel);
  }
}

/** Prefer source asset if present; but route large moved directories directly to public.
 * Moved dirs: models/, sounds/, hdri/ live under /public/assets to avoid bundling & LFS issues.
 * Character images & small UI art remain in src/assets so they still benefit from hashing.
 */
export function assetUrl(rel: string): string {
  if (!rel || typeof rel !== 'string') {
    if ((import.meta as any).env?.DEV) {
      try { console.warn('[assets] assetUrl called with invalid rel:', rel) } catch {}
    }
    return ''
  }
  // Single source of truth: serve everything from /public/assets
  return publicAsset(rel)
}

/**
 * Resolve a batch of asset names into a map; missing entries become undefined rather than throwing.
 */
export function assetMap<T extends string>(rels: T[]): Record<T, string | undefined> {
  const out: Record<string, string | undefined> = {};
  rels.forEach(r => { out[r] = r ? publicAsset(r) : undefined })
  return out as Record<T, string | undefined>
}

// --- Dev-time asset 404 checker ---
const assetRegistry: Set<string> = new Set();

function registerAsset(url: string): string {
  // Only register same-origin assets
  try {
    if (!url) return url
    const u = new URL(url, window.location.origin);
    if (u.origin === window.location.origin) assetRegistry.add(u.pathname + u.search);
  } catch {
    // ignore invalid
  }
  return url;
}

export async function verifyRegisteredAssets(options: { sampleLimit?: number } = {}): Promise<void> {
  if (!(import.meta as any).env?.DEV) return; // dev only
  const limit = options.sampleLimit ?? 200;
  const urls = Array.from(assetRegistry).slice(0, limit);
  const checks = urls.map(async (u) => {
    try {
      const res = await fetch(u, { method: 'HEAD', cache: 'no-store' });
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.warn('[assets] 404/Bad status for', u, res.status);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[assets] fetch failed for', u, e?.toString?.());
    }
  });
  await Promise.allSettled(checks);
}
