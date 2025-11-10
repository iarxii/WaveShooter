// Pure helper for applying damage to a hero's armor and health.
// Implements the "armor-first" damage model described in docs/Hero_Armour_and_Health_System.md

export function applyDamageToHero(state = {}, damage = {}) {
  const result = {
    health: typeof state.health === "number" ? state.health : 0,
    armor: typeof state.armor === "number" ? state.armor : 0,
    events: [],
    killed: false,
  };

  const amt = Number(damage.amount) || 0;
  if (amt <= 0) return result;

  let remaining = amt;

  const pushEvent = (type, delta, source) => {
    // delta is negative for damage (consistent with doc)
    result.events.push({ type, delta, source });
  };

  if (damage.bypassArmor) {
    const beforeHp = result.health;
    result.health = Math.max(0, result.health - remaining);
    pushEvent("hp", result.health - beforeHp, damage.source);
    remaining = 0;
  } else {
    const beforeArmor = result.armor;
    const armorAbsorb = Math.min(result.armor, remaining);
    // reduce armor by the amount absorbed
    result.armor = Math.max(0, result.armor - remaining);
    remaining = Math.max(0, remaining - armorAbsorb);

    if (result.armor - beforeArmor !== 0) {
      pushEvent("armor", result.armor - beforeArmor, damage.source);
    }

    if (remaining > 0) {
      const beforeHp = result.health;
      result.health = Math.max(0, result.health - remaining);
      pushEvent("hp", result.health - beforeHp, damage.source);
    }
  }

  result.killed = result.health <= 0;
  return result;
}

export default applyDamageToHero;
