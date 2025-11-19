# Hero Special Items

## Overview
This document outlines the special items mechanic for the player in the Healthcare Heroes game. Players can equip up to 4 special items in their inventory, each with unique abilities to place hazards on the battlefield to combat enemies. These items are based on the Voxel Painter Example, allowing players to interactively place geometry/voxels on the plane.

## Inventory System
- **Max Capacity**: 4 items
- **Equipping**: Items are equipped in inventory slots
- **Cooldowns**: All hazard items have cooldowns after use
- **Placement**: Items are placed using a voxel painter-style interface

## Special Items

### 1. Vacuum Portal
- **Description**: Creates a void that attracts enemies towards it. Enemies that fall into the void are killed.
- **Enemy Behavior**: Enemies can detect the hazard and will attempt to move away from it.
- **Cooldown**: [TBD - to be determined based on balance]
- **Implementation Notes**:
  - Attraction force towards the portal center
  - Detection radius for enemy avoidance
  - Instant kill on contact with void

### 2. Bleach Blocks
- **Description**: Solidified bleach blocks that create temporary walls to block enemy movement.
- **Damage**: Causes -1 damage to enemies that run into the blocks.
- **Duration**: Temporary (blocks disappear after time or on destruction)
- **Cooldown**: [TBD - to be determined based on balance]
- **Implementation Notes**:
  - Collision detection with enemies
  - Damage on contact
  - Visual representation as blocks

### 3. Anti-biotic Bomb
- **Description**: Large area-of-effect (AOE) bomb that explodes and damages enemies in the area, with lingering damage for a short duration.
- **Effect**: Initial explosion damage + damage over time in the affected area
- **Cooldown**: [TBD - to be determined based on balance]
- **Implementation Notes**:
  - Large AOE radius
  - Explosion animation
  - Damage tick system for duration

### 4. Support Vectors (Fixed Slot)
- **Description**: Calls in support vectors to aid the player.
- **Recharge System**: 
  - Starts at 0%
  - Gains 25% charge per 30 enemy kills
  - Max 100% charge
  - Using the ability resets charge to 0%
- **No Cooldown**: Recharge-based instead of cooldown
- **Implementation Notes**:
  - Kill counter tracking
  - Charge percentage display
  - Ability activation when fully charged

## Implementation Checklist

### Core Systems
- [x] Create inventory system with 4 slots
- [x] Implement voxel painter interface for item placement
- [x] Add cooldown system for items 1-3
- [x] Implement recharge system for item 4

### Vacuum Portal
- [x] Create portal placement logic
- [👎] Implement enemy attraction mechanics (framework exists, needs full implementation)
- [ ] Add enemy detection and avoidance AI
- [ ] Implement void kill zone
- [ ] Add visual effects for portal

### Bleach Blocks
- [x] Create block placement and rendering
- [ ] Implement collision detection
- [ ] Add contact damage system
- [ ] Implement block lifetime/destruction
- [ ] Add visual effects for blocks

### Anti-biotic Bomb
- [x] Create bomb placement and physics
- [ ] Implement explosion mechanics
- [ ] Add AOE damage system
- [ ] Implement damage-over-time effect
- [ ] Add explosion and lingering visual effects

### Support Vectors
- [x] Implement kill counter system
- [x] Add charge percentage tracking
- [ ] Create support vector summoning logic
- [x] Add charge reset on use
- [x] Implement UI for charge display

### UI/UX
- [x] Create inventory UI with item slots
- [ ] Add item selection and equipping interface (items equipped by default)
- [👎] Implement cooldown/recharge visual indicators (basic "Wait" text, needs dynamic progress bars)
- [x] Add placement preview for voxel painter
- [ ] Create item tooltips and descriptions

### Controls
- [x] Add keyboard mappings (7,8,9,0 for slot selection)
- [x] Add gamepad trigger controls (left trigger for aim indicator, right trigger for placement)

### Balance & Testing
- [ ] Determine appropriate cooldown times for items 1-3
- [ ] Balance enemy avoidance strength for vacuum portal
- [ ] Test damage values and durations
- [ ] Verify recharge rate for support vectors
- [ ] Playtest for fun factor and balance

### Integration
- [x] Integrate with existing game systems (player, enemies, UI)
- [x] Add to game save/load system (localStorage persistence)
- [ ] Implement tutorial or help system for new mechanics
- [ ] Add sound effects for item usage
- [ ] Create particle effects for hazards