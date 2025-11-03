# Leveling System

This document defines how enemies unlock and spawn as the player progresses, with a focus on performance and memory limits.

## Overview
- Level equals Wave number for now. Level 1 == Wave 1, Level 2 == Wave 2, etc.
- Higher-tier enemies unlock at higher levels and have lower spawn rates.
- Every wave has a spawn budget and global caps to keep FPS stable.

## Tiers
- T1 (Common): baseline enemies
- T2 (Uncommon): tougher specials
- T3 (Rare): bosses and hazards
- T4 (Apex): late-game hazards

See `Balancing_Table.md` for Tier, Unlock Level, and Max Concurrent per enemy.

## Unlock Levels (summary)
- Implemented in code today:
  - Minion (T1): L1+
  - Boss Minion (T2): L4+
  - Triangle Boss (T3): L3+ (every 3 levels)
  - Cone Boss (T3): L6+
  - Pipe Boss (T3): L7+
  - Cluster Boss (T2): L8+
  - Flying Drone (T2): L7+ (spawned by Pipe Boss)
- Expanded roster (pathogens & mutagens): see `Updated_Enemy_List.md` and `Balancing_Table.md` for exact unlocks (e.g., MRSA L5, X-rays L12, Nitrosamines L13).

## Spawn Budget
Each level L has a points budget used to spawn enemies for that wave.

- Budget formula (default):
  - B(L) = 8 + 2 × L for L ≤ 10
  - B(L) = 28 + 3 × (L − 10) for L > 10
- Example budgets: L1=10, L5=18, L10=28, L12=34, L15=43

Enemy cost weights (implementation guidance):
- Minion: 1
- Boss Minion: 3
- Cluster Boss: 8
- Triangle Boss: 10
- Pipe Boss: 12
- Cone Boss: 12
- Flying Drone: 0.5 (counts only while active; spawned via Pipe budget, respects drone cap)

Budget is spent until either the budget is exhausted or global caps are reached. If caps are hit, downshift to cheaper enemies or defer spawns.

## Global Caps (memory/FPS safety)
- Active enemies cap: ActiveMax(L) = min(16 + ⌊L/2⌋, 48)
- Active bosses cap: BossMax = 1 (L1–4), 2 (L5–8), 3 (L9+)
- Flying drones cap: 16 (global)
- Per-type caps: see `Balancing_Table.md` (Max Concurrent column)

Low-spec fallback (optional): clamp ActiveMax to 24 and BossMax to 2.

## Spawn Weights by Tier
Weights are applied after filtering by unlock level.
- Levels 1–4: T1 100%
- Levels 5–7: T1 80% • T2 20%
- Levels 8–10: T1 60% • T2 30% • T3 10%
- Levels 11–12: T1 40% • T2 35% • T3 20% • T4 5%
- Levels 13+: T1 30% • T2 35% • T3 25% • T4 10%

Within a tier, distribute weight evenly by type unless a type is capped; overflow rolls down to the next available type in that tier, or to the next lower tier if necessary.

## Boss Schedule
- Triangle Boss: spawns every 3 levels starting L3 (existing behavior)
- Cone Boss: eligible from L6; 80% chance per wave, max 6 concurrent
- Pipe Boss: eligible from L7; 60% chance per wave
- Cluster Boss: eligible from L8; 40% chance to replace a regular minion batch

All bosses respect BossMax and the global ActiveMax cap.

## Implementation Notes (for `src/App.jsx`)
- Track `level` (alias for `waveNumber`).
- On wave start:
  1) Build an allowed pool by filtering enemy types where `level >= unlockLevel`.
  2) Compute `budget = B(level)` and `ActiveMax(level)`.
  3) Choose a tier mix using the table above, then pick concrete types using enemy costs.
  4) Enforce caps: global, per-type (Max Concurrent), bosses, and drones.
  5) If near caps, prefer cheaper enemies (minions) and skip expensive spawns.

- Optional extension: surface a difficulty slider that scales B(L) and ActiveMax.

### Config sketch (future-proofing)
```jsonc
{
  "levelIsWave": true,
  "budget": { "base": 8, "perLevel": 2, "over10": 3 },
  "caps": { "activeBase": 16, "activePer2Levels": 1, "activeMax": 48, "bossBands": [[1,4,1],[5,8,2],[9,999,3]], "drones": 16 },
  "tiers": [
    { "levelRange": [1,4],  "weights": { "T1": 1.0 } },
    { "levelRange": [5,7],  "weights": { "T1": 0.8, "T2": 0.2 } },
    { "levelRange": [8,10], "weights": { "T1": 0.6, "T2": 0.3, "T3": 0.1 } },
    { "levelRange": [11,12],"weights": { "T1": 0.4, "T2": 0.35, "T3": 0.2, "T4": 0.05 } },
    { "levelRange": [13,99],"weights": { "T1": 0.3, "T2": 0.35, "T3": 0.25, "T4": 0.1 } }
  ],
  "costs": { "minion": 1, "bossMinion": 3, "cluster": 8, "triangle": 10, "pipe": 12, "cone": 12, "drone": 0.5 }
}
```

## Edge Cases
- If budget remains but all eligible types are capped, stop spawning and carry budget over to the next wave (optional).
- If a boss is scheduled but BossMax reached, retry as a non-boss pick of the same tier or roll down a tier.
- Drones only count toward the drone cap; do not double-count them against the boss cap.

## Success Criteria
- FPS remains stable even at high levels due to caps and budgets.
- Enemy variety increases with level due to unlocks and tier weights.
- No sudden difficulty spikes: weights ramp gradually.

## Cross-refs
- `Balancing_Table.md` — stats, tiers, unlock levels, and per-type caps
- `Enemy_List.md` — in-game enemies and properties
- `Updated_Enemy_List.md` — expanded roster with tiers and unlocks
