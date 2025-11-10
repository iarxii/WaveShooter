import assert from "assert";
import { describe, it } from "node:test";
import { applyDamageToHero } from "./damage.js";

describe("applyDamageToHero - armor-first behavior", () => {
  it("reduces armor when armor > damage and leaves health intact", () => {
    const s = { health: 100, armor: 50 };
    const r = applyDamageToHero(s, { amount: 30, source: "bullet" });
    assert.equal(r.armor, 20);
    assert.equal(r.health, 100);
    assert.equal(r.events.length, 1);
    assert.equal(r.events[0].type, "armor");
    assert.equal(r.events[0].delta, -30);
  });

  it("reduces armor to zero when damage equals armor", () => {
    const s = { health: 100, armor: 40 };
    const r = applyDamageToHero(s, { amount: 40 });
    assert.equal(r.armor, 0);
    assert.equal(r.health, 100);
    assert.equal(r.events.length, 1);
    assert.equal(r.events[0].type, "armor");
    assert.equal(r.events[0].delta, -40);
  });

  it("applies overflow damage to health after armor is depleted", () => {
    const s = { health: 100, armor: 20 };
    const r = applyDamageToHero(s, { amount: 50 });
    // 20 absorbed by armor -> armor becomes 0, remaining 30 applied to health
    assert.equal(r.armor, 0);
    assert.equal(r.health, 70);
    // Two events: armor then hp
    assert.equal(r.events.length, 2);
    assert.equal(r.events[0].type, "armor");
    assert.equal(r.events[0].delta, -20);
    assert.equal(r.events[1].type, "hp");
    assert.equal(r.events[1].delta, -30);
  });

  it("bypassArmor flag deals damage directly to HP", () => {
    const s = { health: 80, armor: 100 };
    const r = applyDamageToHero(s, { amount: 30, bypassArmor: true });
    assert.equal(r.armor, 100);
    assert.equal(r.health, 50);
    assert.equal(r.events.length, 1);
    assert.equal(r.events[0].type, "hp");
    assert.equal(r.events[0].delta, -30);
  });

  it("handles zero and negative damage as no-op", () => {
    const s = { health: 90, armor: 40 };
    const r = applyDamageToHero(s, { amount: 0 });
    assert.equal(r.armor, 40);
    assert.equal(r.health, 90);
    assert.equal(r.events.length, 0);
  });

  it("reports killed when damage reduces health to zero or below", () => {
    const s = { health: 20, armor: 5 };
    const r = applyDamageToHero(s, { amount: 30 });
    // 5 armor, 25 to health -> health becomes 0
    assert.equal(r.armor, 0);
    assert.equal(r.health, 0);
    assert.equal(r.killed, true);
  });
});
