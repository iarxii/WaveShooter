// Centralized action dispatcher
export const dispatchAction = (type, detail = {}) => {
  window.dispatchEvent(new CustomEvent("heroTunerCommand", { detail: { type, ...detail } }));
};

// Predefined action functions for consistency
export const inputActions = {
  jump: () => dispatchAction("jump"),
  dash: () => dispatchAction("dash"),
  shapeRunCW: () => dispatchAction("shapeRunner", { mode: "cw" }),
  shapeRunCCW: () => dispatchAction("shapeRunner", { mode: "ccw" }),
  specialAttack: () => dispatchAction("heroAction", { action: "special" }),
  heavyAttack: () => dispatchAction("heroAction", { action: "heavyAttack" }),
  lightAttack: () => dispatchAction("heroAction", { action: "lightAttack" }),
  jumpAttack: () => dispatchAction("heroAction", { action: "jumpAttack" }),
  forwardCharge: () => dispatchAction("heroAction", { action: "forwardCharge" }),
  death: () => dispatchAction("heroAction", { action: "death" }),
  togglePause: () => dispatchAction("togglePause"),
  toggleFireMode: () => dispatchAction("toggleFireMode"),
  pickupHold: (pressed) => { window.__pickupHoldState = pressed; },
};