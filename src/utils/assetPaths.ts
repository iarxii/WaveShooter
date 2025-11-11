// Utility helpers for static asset URL resolution.
// Provides tolerant fallbacks; prefer placing large binary/media assets under /public/assets
// so that direct string paths work even if Git LFS did not hydrate source copies during CI.

/** Build a URL to an asset located in the public/assets directory. */
export function publicAsset(rel: string): string {
  return `/assets/${rel}`.replace(/\\/g, '/');
}

/** Attempt to resolve a source asset via import.meta.url; fallback to public path. */
export function srcAsset(rel: string): string {
  try {
    // Using new URL requires the asset to exist under src during build; warnings occur if missing.
    return new URL(`../assets/${rel}`, import.meta.url).href;
  } catch {
    return publicAsset(rel);
  }
}

/** Prefer source asset if present; otherwise use public asset path. */
export function assetUrl(rel: string): string {
  return srcAsset(rel);
}

/**
 * Resolve a batch of asset names into a map; missing entries become undefined rather than throwing.
 */
export function assetMap<T extends string>(rels: T[]): Record<T, string | undefined> {
  const out: Record<string, string | undefined> = {};
  rels.forEach(r => {
    try {
      out[r] = new URL(`../assets/${r}`, import.meta.url).href;
    } catch {
      out[r] = publicAsset(r);
    }
  });
  return out as Record<T, string | undefined>;
}
