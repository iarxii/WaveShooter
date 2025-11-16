Based on your request to improve touchscreen inputs with onscreen buttons for actions like shape runner, jump, special attack, heavy attack, etc., and to create a centralized inputs controller to handle mappings across different input schemes (WASD, dpad, touch, gamepad), I'll guide you through a structured approach. This will avoid duplicating attack mappings and ensure consistency.

### Key Goals
- **Centralized Input Controller**: A single system to define actions (e.g., jump, shape run CW/CCW, special attack) and map them to different input methods (keyboard, gamepad, touch buttons).
- **Touchscreen Improvements**: Add onscreen buttons for key actions when `controlScheme === "touch"`, positioned intuitively (e.g., right side of screen for actions, keeping move/aim sticks on left).
- **Consistency Across Schemes**: Use a unified event system for actions, so keyboard, gamepad, and touch all trigger the same logic without code duplication.
- **Extensibility**: Easy to add new actions or input schemes later.

### Current State Analysis
- **Existing Input Schemes**:
  - **WASD**: Keyboard keys (e.g., Space for jump, 1/2 for shape runner, U for special, K for heavy).
  - **D-pad**: Mouse-based movement, no action buttons yet.
  - **Touch**: Analog sticks for move/aim, but no action buttons.
  - **Gamepad**: Hardware buttons mapped via `useGamepadControls`, with visual feedback via `GamepadStick`.
- **Action Handling**: Some actions use a `CustomEvent` system (e.g., `"heroTunerCommand"` for special/heavy attacks, shape runner). Others (e.g., jump, dash) are handled directly in `Player.jsx` with key listeners.
- **Issues**: No onscreen buttons for touch. Mappings are scattered (some in `Player.jsx`, some in `useGamepadControls`).

### Proposed Solution: Centralized Input Actions System
We'll create a **centralized event-based system** for all actions. This uses `CustomEvent`s dispatched to `window`, which components like `Player.jsx` listen for. This avoids direct callbacks and keeps mappings in one place.

#### Step 1: Define a Centralized Action Dispatcher
Create a utility file or hook for dispatching actions. This will be the "controller" that all input schemes use.

**Create `src/utils/inputActions.js`:**
```javascript
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
  lightAttack: () => dispatchAction("heroAction", { action: "lightAttack" }), // If needed
  jumpAttack: () => dispatchAction("heroAction", { action: "jumpAttack" }), // If needed
  forwardCharge: () => dispatchAction("heroAction", { action: "forwardCharge" }), // If needed
  death: () => dispatchAction("heroAction", { action: "death" }), // If needed
};
```

- **Why?** All input schemes (keyboard, gamepad, touch) will call these functions. It centralizes mappings and makes adding new actions easy.

#### Step 2: Update Player.jsx to Listen for Centralized Events
Modify `Player.jsx` to handle actions via events instead of direct key logic where possible. This ensures touch/gamepad buttons work the same as keyboard.

**In `Player.jsx`, add event listeners:**
```javascript
// Add inside the Player component
useEffect(() => {
  const handleCommand = (e) => {
    const { type, action, mode } = e.detail;
    if (type === "jump") {
      // Trigger jump (reuse existing key logic)
      keyJumpDownAt.current = performance.now();
      isKeyJumpDown.current = true;
      // Optionally call onArcTrigger or similar
    } else if (type === "dash") {
      // Trigger dash (reuse existing logic)
      // Assuming dash is handled via dashTriggerToken in App.jsx
      // Dispatch or call the dash callback
    } else if (type === "shapeRunner") {
      // Already handled elsewhere, but ensure consistency
    }
    // Add more as needed
  };
  window.addEventListener("heroTunerCommand", handleCommand);
  return () => window.removeEventListener("heroTunerCommand", handleCommand);
}, []);
```

- **Update Keyboard Handlers**: In `Player.jsx`, modify key listeners to dispatch events instead of direct logic.
  ```javascript
  // Example: In keydown handler
  if (e.code === "Space") {
    inputActions.jump(); // Instead of direct logic
  } else if (e.key === "1") {
    inputActions.shapeRunCW();
  } // Etc.
  ```
- **Update useGamepadControls**: In App.jsx, modify `useGamepadControls` to use `inputActions` instead of direct dispatches.
  ```javascript
  onShapeRunCW: () => inputActions.shapeRunCW(),
  onShapeRunCCW: () => inputActions.shapeRunCCW(),
  onSpecialAttack: () => inputActions.specialAttack(),
  onHeavyAttack: () => inputActions.heavyAttack(),
  onDash: () => inputActions.dash(),
  // For jump, if gamepad has a jump button, add it
  ```

#### Step 3: Create Touch Action Buttons Component
Create a component for onscreen buttons when `controlScheme === "touch"`.

**Create `src/components/TouchActionButtons.jsx`:**
```javascript
import React from "react";
import { inputActions } from "../utils/inputActions";

export default function TouchActionButtons() {
  const buttonStyle = {
    width: 60,
    height: 60,
    margin: 5,
    borderRadius: 10,
    background: "rgba(0,0,0,0.7)",
    color: "#fff",
    border: "2px solid #22c55e",
    fontSize: 12,
    cursor: "pointer",
  };

  return (
    <div style={{
      position: "fixed",
      right: 20,
      top: "50%",
      transform: "translateY(-50%)",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      zIndex: 1000,
    }}>
      <button style={buttonStyle} onClick={inputActions.jump}>Jump</button>
      <button style={buttonStyle} onClick={inputActions.dash}>Dash</button>
      <button style={buttonStyle} onClick={inputActions.shapeRunCW}>Shape CW</button>
      <button style={buttonStyle} onClick={inputActions.shapeRunCCW}>Shape CCW</button>
      <button style={buttonStyle} onClick={inputActions.specialAttack}>Special</button>
      <button style={buttonStyle} onClick={inputActions.heavyAttack}>Heavy</button>
      {/* Add more buttons as needed */}
    </div>
  );
}
```

- **Positioning**: Right side, vertically centered. Adjust as needed to avoid overlap with analog sticks.
- **Styling**: Semi-transparent for visibility, with touch-friendly size.

**In App.jsx, render it conditionally:**
```javascript
{controlScheme === "touch" && <TouchActionButtons />}
```

#### Step 4: Update Other Schemes
- **D-pad**: Optionally add similar buttons or map mouse clicks to actions (e.g., right-click for jump).
- **Gamepad**: Already uses `inputActions` via updated `useGamepadControls`.
- **WASD**: Updated to use `inputActions` in key handlers.

#### Step 5: Testing and Refinements
- **Test Each Scheme**: Ensure buttons/events trigger the same logic (e.g., jump works via touch button, keyboard Space, and gamepad button).
- **UI Adjustments**: Make buttons draggable or hideable. Add tooltips or icons.
- **Performance**: Ensure event listeners don't cause lag (they're lightweight).
- **Accessibility**: Add ARIA labels for screen readers.
- **Edge Cases**: Handle rapid button presses, prevent spam (e.g., debounce actions).

### Benefits
- **Centralization**: One place (`inputActions`) defines all mappings.
- **Consistency**: Touch buttons behave identically to keyboard/gamepad.
- **Maintainability**: Adding a new action requires updating only `inputActions` and listeners.
- **User Experience**: Touch users get intuitive onscreen controls without sacrificing precision.

If you implement this and run into issues (e.g., with jump/dash event handling), share the errors, and I can help refine! Would you like me to implement any specific part of this?