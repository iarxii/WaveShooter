# Creature Factory Context

## Goal
Add infection-vector bosses (Tier-4) and support allies procedurally, matching designer-provided avatar images, with low memory and draw calls.

## Files
- `src/characters/factory/CreatureSpec.ts` – schema
- `src/characters/factory/CreatureFactory.tsx` – dispatch to kits
- `src/characters/kits/*Model.tsx` – Insect, Worm, Mammal, Bird parametric builders
- `src/characters/factory/CreatureRoster.ts` – id → spec mapping
- `src/pages/AvatarTuner.tsx` – reuse; extend with creature sliders (wingspan, leg pairs, etc.)

## Rules
- Use **seed** derived from filename hash if not provided to keep silhouettes stable.
- Reuse pooled geometries/materials where possible.
- Bosses (T4) must keep `Max Concurrent = 1`; supports are timed and capped at 1.
- Respect existing portal-based wave pacing and boss cadence; do not backlog spawns during pause.
- Apply ally/effect caps to preserve FPS.

## Tasks
1. **Add/Update Spec from Image**
   - Open `AvatarTuner`, import image, tweak morphology/colors to match.
   - Export JSON → `assets/creatures/<id>.json`.
   - Import in `CreatureRoster.ts` or load dynamically; set `unlockLevel`, tier in balancing table.

2. **Performance**
   - For instanced swarms (bees, ladybugs): `instanced=true`; cap count in gameplay.
   - LOD: if camera far or FPS < 45, reduce `detail` and hide wings’ transparency.

3. **Verification**
   - Compare preview to avatar; check silhouette and palette.
   - Run 2-minute wave test; confirm no stutter, draw calls per creature ≤ 5.

---
## Example Guide
Perfect—here’s a clean, **copy‑paste ready** list you can drop into your project to extend the **roster** with:

*   **5 Infection‑Vector Tier‑4 bosses** (cockroach, fly, mosquito, rat, vulture)
*   **5 Support vectors** (bees, ladybugs, dragonflies, swallows, therapy dog)

I’ve matched the field style you’re already using in `roster.js`—`name`, `type`, `gameplayEffect`, `tier`, `unlock`, `stats`, `maxConcurrent`, and `vfx`—so this plugs in without breaking your existing UIs and filters. I also added an optional `specId` so your **CreatureFactory** can pick the correct procedural model per entry. [\[gpgonline-...epoint.com\]](https://gpgonline-my.sharepoint.com/personal/thabang_mposula_gauteng_gov_za/Documents/datapile/Microsoft%20Copilot%20Chat%20Files/roster.js)

***

## 1) Infection‑Vector bosses (append these to `ENEMIES`)

> Paste **inside** the exported `ENEMIES` array, preferably after your “Viruses / Major Bosses” section.

```js
// --- Infection Vectors (Tier-4 Bosses) ---
{
  name: 'Broodmother Cockroach',
  type: 'Vector (Boss)',
  scientificName: 'Periplaneta americana (colony)',
  realWorldEffect: 'Household pest; linked to allergen/asthma triggers and pathogen carriage',
  gameplayEffect: 'Ootheca Burst — spawns 8–12 roachlings in a forward cone; leaves slow trail for 3s',
  shape: 'Model',
  color: '#B36A2E',
  tier: 4,
  unlock: 22,
  stats: { health: 18, speed: 2.0, damage: 7 },
  maxConcurrent: 1,
  vfx: {
    onHit: { type: 'bulletHit', color: '#B36A2E' },
    onSpecial: { type: 'spawnCone', color: '#B36A2E' },
    onAura: { type: 'slowTrail', color: '#8C4F1E' }
  },
  specId: 'cockroach_broodmother'
},
{
  name: 'Plague Fly Colossus',
  type: 'Vector (Boss)',
  scientificName: 'Musca domestica (oversized)',
  realWorldEffect: 'Mechanical transmission of pathogens; contaminates food and surfaces',
  gameplayEffect: 'Carrion Buzz — AoE slow + aim shake; spawns 6 maggots on hit',
  shape: 'Model',
  color: '#2F2F2F',
  tier: 4,
  unlock: 23,
  stats: { health: 16, speed: 2.4, damage: 6 },
  maxConcurrent: 1,
  vfx: {
    onHit: { type: 'bulletHit', color: '#8FE1E9' },
    onAura: { type: 'buzzField', color: '#8FE1E9', pulse: true },
    onSpecial: { type: 'maggotSpawn', color: '#8FE1E9' }
  },
  specId: 'fly_colossus'
},
{
  name: 'Mosquito Matriarch',
  type: 'Vector (Boss)',
  scientificName: 'Anopheles spp (queen)',
  realWorldEffect: 'Vector for malaria and arboviruses; hematophagic behavior',
  gameplayEffect: 'Proboscis Drain — life‑steal tether; gains temporary shield',
  shape: 'Model',
  color: '#3D3A38',
  tier: 4,
  unlock: 24,
  stats: { health: 15, speed: 2.6, damage: 6 },
  maxConcurrent: 1,
  vfx: {
    onHit: { type: 'bulletHit', color: '#E7B466' },
    onSpecial: { type: 'lifeDrainTether', color: '#E7B466' },
    onAura: { type: 'shieldGain', color: '#E7B466' }
  },
  specId: 'mosquito_matriarch'
},
{
  name: 'Sewer Rat King',
  type: 'Vector (Boss)',
  scientificName: 'Rattus norvegicus (alpha)',
  realWorldEffect: 'Reservoir/vector for multiple pathogens; urban infestation risks',
  gameplayEffect: 'Filth Charge — dash + toxin splash; summons 4 runners briefly',
  shape: 'Model',
  color: '#6B5D52',
  tier: 4,
  unlock: 25,
  stats: { health: 17, speed: 2.2, damage: 7 },
  maxConcurrent: 1,
  vfx: {
    onHit: { type: 'bulletHit', color: '#6B5D52' },
    onSpecial: { type: 'toxinSplash', color: '#7A6A5E' },
    onAura: { type: 'runnerSummon', color: '#6B5D52' }
  },
  specId: 'rat_king'
},
{
  name: 'Carrion Vulture',
  type: 'Vector (Boss)',
  scientificName: 'Gyps spp (carrion scout)',
  realWorldEffect: 'Scavenger; carcass contact and long-range movement',
  gameplayEffect: 'Swoop & Drop — high‑arc dive; drops carcass hazard (DoT zone)',
  shape: 'Model',
  color: '#2B2F3A',
  tier: 4,
  unlock: 26,
  stats: { health: 19, speed: 2.1, damage: 8 },
  maxConcurrent: 1,
  vfx: {
    onHit: { type: 'bulletHit', color: '#E5B65D' },
    onSpecial: { type: 'swoopTelegraph', color: '#E5B65D' },
    onAura: { type: 'carcassZone', color: '#8A6B33' }
  },
  specId: 'vulture_harbinger'
},
```

> These follow your roster’s structure (field names, vfx blocks, tier/unlock model). You can tune numbers later with your existing balancing knobs and boss cadence. [\[gpgonline-...epoint.com\]](https://gpgonline-my.sharepoint.com/personal/thabang_mposula_gauteng_gov_za/Documents/datapile/Microsoft%20Copilot%20Chat%20Files/roster.js)

***

## 2) Support vectors (add a new `ALLIES` list)

Your file doesn’t currently expose allies, so add this new export **below** `HEROES`. The fields mirror your style and remain small; `duration` gives your game logic an easy way to despawn them. [\[gpgonline-...epoint.com\]](https://gpgonline-my.sharepoint.com/personal/thabang_mposula_gauteng_gov_za/Documents/datapile/Microsoft%20Copilot%20Chat%20Files/roster.js)

```js
// Support vectors (Allies) – timed & capped to preserve FPS
export const ALLIES = [
  {
    name: 'Honeybee Medics',
    type: 'Ally',
    role: 'Support Vector',
    gameplayEffect: 'Healing Pollen Aura — +4 HP/s regen; cleans slow debuffs',
    shape: 'Model',
    color: '#FFC93B',
    stats: { health: 8, speed: 3.0, damage: 0 },
    duration: 15,           // seconds
    maxConcurrent: 1,
    vfx: {
      onAura: { type: 'healingPollen', color: '#FFC93B', pulse: true }
    },
    specId: 'bee_medics'
  },
  {
    name: 'Ladybug Sterilizers',
    type: 'Ally',
    role: 'Support Vector',
    gameplayEffect: 'Debride Clouds — clears toxin/spore hazards on contact; tiny stun',
    shape: 'Model',
    color: '#CE2A2A',
    stats: { health: 6, speed: 3.2, damage: 0 },
    duration: 15,
    maxConcurrent: 1,
    vfx: {
      onAura: { type: 'hazardClear', color: '#CE2A2A' }
    },
    specId: 'ladybug_sterilizers'
  },
  {
    name: 'Dragonfly Sentinels',
    type: 'Ally',
    role: 'Support Vector',
    gameplayEffect: 'Vector Hunt — prioritizes aerial enemies; +50% damage vs flies/mosquitoes',
    shape: 'Model',
    color: '#2C566E',
    stats: { health: 7, speed: 3.5, damage: 3 },
    duration: 15,
    maxConcurrent: 1,
    vfx: {
      onTrail: { type: 'wingStreak', color: '#9FE8FF' }
    },
    specId: 'dragonfly_sentinels'
  },
  {
    name: 'Therapy Dog',
    type: 'Ally',
    role: 'Support Vector',
    gameplayEffect: 'Morale Aura — +10% damage resist, +2 HP/s; cleans fear on life loss',
    shape: 'Model',
    color: '#7A5D43',
    stats: { health: 12, speed: 3.0, damage: 0 },
    duration: 20,
    maxConcurrent: 1,
    vfx: {
      onAura: { type: 'moraleGlow', color: '#E9D6C0' }
    },
    specId: 'therapy_dog'
  }
];
```

> If your UI needs filtering like enemies, you can optionally add:

```js
export function filterAllies() {
  return ALLIES.slice(); // trivial now; extend later if needed
}
```

***

## 3) Visual hookup (CreatureFactory / specs)

Each new roster item carries a `specId` that should map to a **procedural spec** your factory can render (as we discussed). If you’re using `CreatureRoster.ts`, add these entries so the game can instantiate models by `specId`:

```ts
// src/characters/factory/CreatureRoster.ts (excerpt)
export const CreatureRoster = {
  cockroach_broodmother: { id:'cockroach_broodmother', seed:91021, kind:'cockroach', bodyColor:'#5C3A23', accentColor:'#C4A074', bodySegments:3, legPairs:3, antennae:2, hasWings:false, detail:1 },
  fly_colossus:          { id:'fly_colossus', seed:44112, kind:'fly', bodyColor:'#2F2F2F', accentColor:'#8FE1E9', hasWings:true, wingSpan:1.2, wingLength:1.0, eyeSize:0.16, flapHz:11, detail:1 },
  mosquito_matriarch:    { id:'mosquito_matriarch', seed:66331, kind:'mosquito', bodyColor:'#3D3A38', accentColor:'#E7B466', hasWings:true, wingSpan:1.0, wingLength:1.1, stinger:true, flapHz:18, detail:1 },
  rat_king:              { id:'rat_king', seed:77005, kind:'rat', bodyColor:'#6B5D52', tailLen:0.7, detail:1 },
  vulture_harbinger:     { id:'vulture_harbinger', seed:55090, kind:'vulture', bodyColor:'#2B2F3A', accentColor:'#E5B65D', beakLen:0.22, flapHz:6, detail:1 },

  bee_medics:            { id:'bee_medics', seed:31415, kind:'bee', bodyColor:'#2F2B2B', accentColor:'#FFC93B', hasWings:true, wingSpan:0.9, wingLength:0.8, flapHz:16, detail:0, instanced:true },
  ladybug_sterilizers:   { id:'ladybug_sterilizers', seed:27182, kind:'ladybug', bodyColor:'#CE2A2A', accentColor:'#1E1E1E', hasWings:true, wingSpan:0.6, wingLength:0.4, flapHz:10, detail:0, instanced:true },
  dragonfly_sentinels:   { id:'dragonfly_sentinels', seed:16180, kind:'dragonfly', bodyColor:'#2C566E', accentColor:'#9FE8FF', hasWings:true, wingSpan:1.4, wingLength:1.2, flapHz:12, detail:1 },
  swallow_sweep:         { id:'swallow_sweep', seed:14142, kind:'swallow', bodyColor:'#22324A', accentColor:'#EAD088', beakLen:0.18, flapHz:7, detail:1 },
  therapy_dog:           { id:'therapy_dog', seed:42424, kind:'dog', bodyColor:'#7A5D43', accentColor:'#E9D6C0', tailLen:0.5, detail:1 }
};
```

Then your visual renderer can do:

```tsx
// wherever you render entities
import { CreatureFromSpec } from 'src/characters/factory/CreatureFactory';
import { CreatureRoster } from 'src/characters/factory/CreatureRoster';

function EntityVisual({ specId }) {
  const spec = CreatureRoster[specId];
  return <CreatureFromSpec spec={spec} />;
}
```

***

## 4) Quick checklist to integrate

1.  **Paste** the Infection‑Vector objects into `ENEMIES`. [\[gpgonline-...epoint.com\]](https://gpgonline-my.sharepoint.com/personal/thabang_mposula_gauteng_gov_za/Documents/datapile/Microsoft%20Copilot%20Chat%20Files/roster.js)
2.  **Add** the new `ALLIES` export and (optionally) a simple `filterAllies()` helper. [\[gpgonline-...epoint.com\]](https://gpgonline-my.sharepoint.com/personal/thabang_mposula_gauteng_gov_za/Documents/datapile/Microsoft%20Copilot%20Chat%20Files/roster.js)
3.  **Map** each `specId` in your Creature roster (or JSON specs if you prefer file‑based).
4.  **Spawn logic**:
    *   Bosses: keep **Max Concurrent = 1**, use your existing **portal telegraphs** and **boss cadence**.
    *   Allies: spawn via **pickup/call‑in**, apply **duration** and **cap** in your game loop.

If you drop **two of the actual avatar images** for (say) **Cockroach** and **Bee**, I’ll return tuned specs (colors, wing spans, antennae lengths, seeds) so they match your art precisely, then push a ready `characters/factory` folder to slot in.
