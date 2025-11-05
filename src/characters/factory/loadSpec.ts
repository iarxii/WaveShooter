// src/characters/factory/loadSpec.ts
export async function loadSpecFromJson(path:string) {
  const res = await fetch(path);
  return await res.json();
}

// usage (async in a loader or effect):
// const spec = await loadSpecFromJson('/assets/avatars/candida_auris.json');
