# Accessibility Features

This project aims to be playable with different input preferences and assistive patterns. Below are features implemented or planned.

## Pickup popups
- Auto-dismiss after 3 seconds with a smooth fade.
- Non-blocking overlay; no interaction required.

## Control scheme toggle (implemented)
Choose the preferred way to move the player:
- D-Buttons Control — Default; on-screen directional buttons for mouse/touch users.
- WASD Control — Keyboard control.

Current status:
- The D-Buttons overlay is active by default, supports mouse and touch, and feeds a normalized movement vector into the player without per-frame allocations.
- You can switch schemes at runtime from the left-side panel; changes take effect immediately.

## "+ Shape runner" auto-move (implemented)
When enabled, the player automatically moves in a repeating geometric pattern while you focus on aiming and firing.
- Patterns: Circular, Triangular, Rectangular.
- Behavior: the player follows the path at a steady pace, respects pause and bounds; manual input (D-Buttons or WASD) temporarily overrides while pressed.

Current status:
- Available and integrated; uses requestAnimationFrame with ref-based vectors to avoid per-frame allocations.

## Roadmap
1. Settings persistence
   - Remember control scheme and shape runner options via localStorage.
2. Visual tuning
   - Provide a per-user contrast theme toggle for aim beam and crosshair.

## Notes
- All new features will follow the project’s memory discipline: no per-frame object creation and reuse of buffers/refs.
- If you have specific accessibility requests (e.g., remappable keys, larger on-screen controls), please open an issue.
