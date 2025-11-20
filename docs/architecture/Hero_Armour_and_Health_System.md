# Hero Armour and Health System

## Purpose
Document the armour-first damage model for heroes so engineers and designers have a clear, testable, and implementable plan.

Goals:
- Ensure armour absorbs damage before HP is reduced.
- Define data shapes, damage flow, UX feedback (floaters/VFX/SFX), edge cases, and integration points in the codebase.
- Provide a migration plan and tests for incremental implementation.

## Summary of Behaviour
1. Damage is applied to a hero via a single entrypoint (recommended): applyDamageToHero(damage, opts).
2. Armour ("Armor") is reduced first until it reaches 0. Only after armour is depleted should HP change.
3. Some damage types may bypass armour (e.g., true damage, environmental hazards) — support bypass flags.
4. When damage consumes armour entirely and still has remaining magnitude, the overflow reduces HP.
5. Visual and audio feedback: armour floaters (armorEvents) show armour loss; HP floaters (hpEvents) show HP loss.

## Data Shapes / API Contract
- Hero state (partial):
  - health: number (e.g., 0-100)
  - armor: number (e.g., 0-500)

- Damage object (recommended):
  - amount: number (positive)
  - source?: string (optional id or description)
  - type?: string (e.g., "physical", "explosive", "env")
  - bypassArmor?: boolean (default false)
  - stun?: number (optional) — stun magnitude if applicable

- Function contract
  - applyDamageToHero(heroState, damage, opts?) -> { newHealth, newArmor, events }
    - Inputs: current hero state + damage
    - Outputs: new computed values and an array of visual/game events (e.g., { hpDelta, armorDelta, killed, overflow })
    - Error modes: invalid inputs -> no-op and log

Success criteria:
- Armor decreases first. HP decreases only from overflow or bypassed damage.
- All callers can rely on returned events to emit floaters and VFX consistently.

## Recommended Algorithm / Pseudocode

function applyDamageToHero({health, armor}, damage) {
  if (damage.amount <= 0) return { health, armor, events: [] };

  const events = [];
  let remaining = damage.amount;

  if (damage.bypassArmor) {
    // Directly damage health
    const hpBefore = health;
    health = Math.max(0, health - remaining);
    events.push({ type: 'hp', delta: health - hpBefore });
    remaining = 0;
  } else {
    // Apply to armor first
    const armorBefore = armor;
    const armorAbsorb = Math.min(armor, remaining);
    armor = Math.max(0, armor - remaining);
    remaining = Math.max(0, remaining - armorAbsorb);

    if (armor - armorBefore !== 0) {
      events.push({ type: 'armor', delta: armor - armorBefore });
    }

    if (remaining > 0) {
      const hpBefore = health;
      health = Math.max(0, health - remaining);
      events.push({ type: 'hp', delta: health - hpBefore });
    }
  }

  const killed = health <= 0;
  return { health, armor, events, killed };
}

Notes:
- deltas are negative values when damage occurs. Callers should invert sign for floaters if they expect positive upward floats for healing, or use the absolute value based on UX.

## UI / UX: Floaters and Visuals
- App currently manages `hpEvents` and `armorEvents` arrays and renders `HpFloater` for both (see `src/App.jsx`).
- Expect the damage handler to return event objects that map to these arrays:
  - For armour damage: push { id, amount: -X, start: pos, ... } to `armorEvents`.
  - For hp damage: push { id, amount: -Y, start: pos, ... } to `hpEvents`.
- When a single damage instance causes armour followed by HP overflow, emit both types of events (armor then hp) so the player sees sequential floaters.
- VFX: play a metallic-hit SFX/VFX when armour is hit; play a blood/hurt SFX when HP is hit. If armour was fully depleted this frame, trigger a brief flash on the player model.

## Integration Points (where to call the handler)
Search and update callers to use the central handler. Likely files:
- `src/entities/Player.jsx` — player collision and damage methods
- `src/entities/Minion.jsx`, `FlyingDrone.jsx`, `ClusterBoss.jsx` — when they trigger player damage (call to central handler)
- `src/App.jsx` — AOE/Bomb explosion handlers already determine which enemies are hit. Replace inline logic with call to the handler and then emit events to UI.
- Bullet/hit logic — any code that computes damage to the player.

Concrete example (in App.jsx bomb explode handler):
- Instead of directly reducing `health` in a setState call, do:
  const { health: newHealth, armor: newArmor, events } = applyDamageToHero({health, armor}, { amount: damageAmount, source: 'bomb', type: 'explosive' });
  setHealth(newHealth);
  setArmor(newArmor);
  events.forEach(e => {
    if (e.type === 'armor') setArmorEvents(prev => [...prev, makeArmorEvent(e.delta, pos)]);
    if (e.type === 'hp') setHpEvents(prev => [...prev, makeHpEvent(e.delta, pos)]);
  });

## Edge Cases
- Overkill: damage greater than armor + HP -> HP clamps to 0 and killed flag true.
- Negative incoming damage: ignore.
- Slow/staggered application: if damage should be applied over time, use a different handler that accepts duration or a DOT type; this doc focuses on immediate instances.
- Simultaneous multiple hits: callers may batch several damage events in one frame. The canonical approach: apply sequentially in the order events arrive, or batch-sum them then call handler once per frame (preferred for predictability).
- Armor regeneration: If armour regen exists (on pickup or ability), ensure it increases the `armor` state and triggers UI updates without affecting HP.
- Bypass rules: provide a clear list of damage sources that bypass armour (e.g., traps, poison, certain boss abilities).

## Testing Plan
- Unit tests for `applyDamageToHero`:
  - armour > damage: only armour decreases.
  - armour == damage: armour -> 0, HP unchanged.
  - armour < damage: armour -> 0, HP reduced by remaining.
  - bypassArmor true: HP only.
  - zero/negative damage: no state change.
- Integration tests / playtest:
  - Bomb AOE that hits player while armour > 0: only armour floater shows.
  - Multiple bullets in quick succession that deplete armour then damage HP: show sequential floaters.

Suggested test harness: Jest + React Testing Library for UI events, and a small pure-function unit test for the damage logic.

## Migration & Implementation Steps (small incremental plan)
1. Add a pure helper `src/utils/damage.js` (or `.ts`) and implement `applyDamageToHero` with unit tests. (Low risk; pure function.)
2. Replace direct health/armor math in `src/App.jsx` bomb/bullet handlers with calls to the helper and emit floaters from returned events.
3. Update `Player.jsx` damage/collision logic to call the helper.
4. Add or update SFX/VFX triggers based on returned events (e.g., `armor` event -> metallic hit SFX).
5. Run tests and do quick playcheck to verify behaviour.

## Example: `applyDamageToHero` signature (JS)

export function applyDamageToHero(state, damage) {
  // state: { health, armor }
  // damage: { amount, bypassArmor?, type?, source? }
  // returns: { health, armor, events, killed }
}

## Event shape for UI mapping
- { type: 'armor' | 'hp', delta: number, source?: string }
  - delta is negative for damage.
  - UI helpers can convert to floaters with absolute value.

## Notes for Designers
- Decide whether armour decays or persists between waves.
- Decide whether armour should block status effects (stun, corrosion) or only raw HP damage.

## Next Steps / Follow-ups
- Implement the helper and tests (see todo list item 3).
- Sweep the codebase to replace direct health/armor modifications (todo list item 2).
- Add game-play telemetry for armour-related deaths vs HP deaths for balance.

---

File created by the engineering doc generator on behalf of the team. If you'd like, I can now implement the pure helper and add unit tests, then update the `App.jsx` bomb/aoe handlers to use it.  