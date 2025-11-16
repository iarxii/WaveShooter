// Centralized input action dispatcher
export const dispatchHeroAction = (action) => {
  window.dispatchEvent(new CustomEvent("heroTunerCommand", { detail: { type: "heroAction", action } }));
};

export const dispatchShapeRunner = (mode) => {
  window.dispatchEvent(new CustomEvent("heroTunerCommand", { detail: { type: "shapeRunner", mode } }));
};

export const dispatchTogglePause = () => {
  window.dispatchEvent(new CustomEvent("heroTunerCommand", { detail: { type: "togglePause" } }));
};

export const dispatchToggleFireMode = () => {
  window.dispatchEvent(new CustomEvent("heroTunerCommand", { detail: { type: "toggleFireMode" } }));
};

export const dispatchPickupHold = (pressed) => {
  window.__pickupHoldState = pressed;
};