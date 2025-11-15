# Controller Support (Xbox One PDP / PS4 DualShock)

This project now includes basic gamepad support for standard-mapped controllers (Microsoft Xbox One family, Sony PS4 DualShock). The implementation focuses on core gameplay actions: movement, aiming, shooting (auto-fire), dash ability, and pause toggling.

## Summary

| Action            | Xbox / PS4 Input            | Keyboard Equivalent       |
|-------------------|-----------------------------|---------------------------|
| Move              | Left Stick (inverted Y)     | WASD / Arrow Keys         |
| Aim               | Right Stick (Y invert opt.) | Mouse (orientation)       |
| Fire (Hold)       | RT / R2 (when Auto-Fire OFF)| Left-click / Auto-Fire    |
| Dash Ability      | A/Cross and B/Circle        | 3 key                     |
| Pause / Resume    | Start / Options             | Escape / Space            |
| Toggle Auto-Fire  | D-Pad Up                    | F key                     |
| Heavy Attack      | Y / Triangle                | —                         |
| Jump              | X / Square                  | —                         |
| Shape Run (CW)    | LB / L1                     | 2 (after swap)            |
| Shape Run (CCW)   | RB / R1                     | 1 (after swap)            |
| Special Attack    | LB+RB / L1+R1               | —                         |

Notes:
1. D-Pad is no longer tied to movement; Up toggles Auto-Fire mode.
2. If Auto-Fire mode is OFF, holding RT/R2 enables firing while held; release stops. If Auto-Fire mode is ON, RT does not disable it.
3. Dash preserves the existing cooldown (10s) and i-frame window (250ms) used by keyboard input.
4. Pause is gated: no toggling during respawn countdown or game over state.

## Architecture Overview

The hook `useGamepadControls` (file: `src/utils/gamepad.ts`) polls the Gamepad API each animation frame:

```mermaid
flowchart TD
  A[navigator.getGamepads()] --> B{Connected Pad?}
  B -- yes --> C[Read axes/buttons]
  C --> D[Normalize + deadzone left stick (Y invert option)]
  C --> E[Normalize + deadzone right stick]
  D --> F[Update moveRef]
  E --> G[Update aimRef]
  C --> H[Edge detect buttons]
  H --> I[Pause (Start/Options)]
  H --> J[Dash (A/Cross)]
  C --> K[RT/R2 fires only if Auto-Fire OFF]
  C --> M[D-Pad Up toggles Auto-Fire]
  B -- no --> L[Reset refs / clear auto-fire]
```

The game already used `dpadVecRef` and `aimInputRef` refs in `App.jsx`. The hook feeds these so existing movement & aiming logic remains unchanged.

## Hook Responsibilities

1. Device Detection: Chooses first connected pad in `navigator.getGamepads()`.
2. Movement: Left stick (axes 0,1) mapped to X/Z with forward = -Y axis. Falls back to D-Pad buttons (12–15) if stick is at rest.
3. Aiming: Right stick (axes 2,3) mapped similarly to X/Z (forward = -Y). Sensitivity and deadzone configurable.
4. Auto-Fire: RT/R2 (button index 7) sets `autoFire` state while held; cleans up when released/disconnected.
5. Dash: Edge-detected press of button 0 (A/Cross) triggers dash logic identical to keyboard 3 key.
6. Pause: Edge-detected press of button 9 (Start/Options) toggles pause, respecting gating conditions.
7. Disconnection: Clears movement, aim, and auto-fire when pad disconnects.

## Deadzone Handling

Sticks use a tunable deadzone (default 0.18). Values inside the deadzone report 0. Outside, values are rescaled to preserve full range:

```
normalized = sign(v) * (abs(v) - deadzone) / (1 - deadzone)
```

This prevents slow drift while maintaining sensitivity near the edges.

## Extensibility

To add more actions:
- Extend the hook to detect additional buttons (e.g., LB/L1 for secondary ability, Y/Triangle for pickup interaction).
- Provide callbacks from `App.jsx` similar to `onDash`.
- Keep edge detection: compare previous vs current `pressed` state.

To add rumble (vibration):
- Check `gp.vibrationActuator` and call `playEffect('dual-rumble', { duration, strongMagnitude, weakMagnitude })` when dash triggers or player takes damage.

## Implementation Files

| File | Purpose |
|------|---------|
| `src/utils/gamepad.ts` | Gamepad polling & mapping hook |
| `src/App.jsx` | Integrates hook; wires movement, aim, dash, pause, auto-fire |

## Testing Procedure

1. Connect Xbox One or PS4 controller via USB or Bluetooth.
2. Start dev server: `npm run dev`.
3. Open browser dev tools console; confirm one gamepad appears in `navigator.getGamepads()`.
4. Move left stick: Player should move without keyboard input.
5. Move right stick: Player orientation / aim should follow; firing should align with aim when RT pressed.
6. Press RT: Continuous firing begins; release RT stops.
7. Press A/Cross: Dash triggers if cooldown elapsed.
8. Press Start/Options: Pause overlay toggles (not during respawn/game over).
9. Disconnect controller mid-hold: Movement, aim, and auto-fire clear.

## Known Limitations

- No per-user remapping UI yet.
- Right-stick aim does not rotate a visible crosshair; player orientation changes only.
- Analog trigger pressure is treated as digital (pressed/not pressed) for simplicity.
- Multiple controllers: first connected pad wins; additional pads ignored.

## Future Enhancements

- Add Settings UI to adjust deadzones & sensitivity.
- Support secondary ability binding (LB/L1 or Y/Triangle).
- Optional aim assist / smoothing.
- Visual controller input overlay (for stream/debug).
- Rumble feedback for damage, dash start, pickup collection.

---
Last updated: 2025-11-15
