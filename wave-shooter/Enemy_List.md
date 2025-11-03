# Enemy List and Properties

Based on the current codebase, here are all the enemy types and their properties:

## 1. **Minion** (Basic Enemy)
- **Appearance**: Red sphere (0.6 radius)
- **Health**: 1 HP
- **Speed**: 18 base, capped at 12 units/sec
- **Contact Damage**: 2
- **Behavior**: Direct chase with obstacle avoidance
- **Special**: Can spawn as boss variant (12% chance)
- **Knockback**: 12.0 strength, 8.0 decay
- **Spawn Rate**: Regular enemies in all waves

## 2. **Boss Minion** (Enhanced Minion)
- **Appearance**: Orange hexagon (1.6 radius cylinder, 6 sides)
- **Health**: 3 HP
- **Speed**: 6 base, capped at 12 units/sec
- **Contact Damage**: 20
- **Behavior**: Same as minion but slower and tankier
- **Knockback**: 8.0 strength, 6.0 decay
- **Spawn Rate**: 12% chance when spawning regular minions

## 3. **Triangle Boss**
- **Appearance**: Purple triangular prism (2.2 radius, 3 sides)
- **Health**: 5 HP → 20 HP (based on constants vs spawn)
- **Speed**: 6 * 2.3 = 13.8 base, with separate caps for charge (18) and circle (12)
- **Contact Damage**: 31
- **Behavior**: 
  - Circles around player at 8 unit radius
  - Charges directly at player every 3 seconds for 1.5 seconds
  - Turns red when charging
- **Special**: Warning indicator when charging
- **Knockback**: 7.0 strength, 6.0 decay
- **Spawn Rate**: Every 3rd wave

## 4. **Cone Boss**
- **Appearance**: Orange cone standing on tip (1.6 radius base, 2.6 height)
- **Health**: 10 HP
- **Speed**: Stationary, but jumps with ballistic trajectory
- **Contact Damage**: 42 (highest)
- **Behavior**:
  - Waits 10 seconds, then leaps to player's position
  - 3-second cooldown between jumps
  - Area damage on landing (4.4 radius)
  - Contact damage while at rest (1.6 radius)
- **Special**: Ballistic jump physics with gravity
- **Knockback**: Uses boss values (8.0 strength, 6.0 decay)
- **Spawn Rate**: 80% chance per wave, max 6 concurrent

## 5. **Pipe Boss**
- **Appearance**: Blue metallic cylinder (1.2 radius, 1.6 height)
- **Health**: 2 HP
- **Speed**: Stationary
- **Contact Damage**: 20 (boss-tier)
- **Behavior**:
  - Rises from ground over 3 seconds
  - Launches 2-6 flying drones every 4-6 seconds
  - Spawns at arena edges/corners
- **Special**: Drone factory - creates Flying Drones
- **Knockback**: 8.0 strength, 6.0 decay
- **Spawn Rate**: 60% chance per wave

## 6. **Cluster Boss**
- **Appearance**: Clump of 7 red spheres (0.5 radius each)
- **Health**: 3 HP
- **Speed**: 8 units/sec
- **Contact Damage**: 20 (boss-tier)
- **Behavior**: Direct chase toward player
- **Special**: Splits into smaller orbs on death (onSplit callback)
- **Knockback**: 8.0 strength, 6.0 decay
- **Spawn Rate**: 40% chance instead of regular minion

## 7. **Flying Drone** (Spawned by Pipe Boss)
- **Appearance**: Red capsule with tips, leaves trail when diving
- **Health**: 1 HP
- **Speed**: 10 units/sec orbit, 16-18 dive speed
- **Contact Damage**: Unknown (kills on contact)
- **Behavior**:
  - Orbits at 4 unit altitude
  - Dives toward player when close (<7 units) or after 5 seconds
  - Despawns when hitting ground
- **Special**: 
  - Immune to bullets (isFlying flag)
  - Can be killed by boundary jump collision
  - Visual trail during dive phase
- **Spawn Rate**: 2-6 per Pipe Boss launch (max 16 total active)

## Global Enemy Properties

### **Scaling by Wave**
- **Damage Scale**: +4% per wave (max 4x at wave 100)
- **Speed Scale**: +3% enemy speed per wave (max 1.5x)
- **Health**: Static per enemy type

### **Stun & Knockback System**
- All enemies can be stunned (yellow stun bullets)
- Knockback applied with distance-based strength (max 8.0 distance)
- Exponential decay on knockback impulses
- Visual shake during stun

### **Spawn Mechanics**
- **Drop-in Animation**: All enemies spawn from portals at height 8-10, fall at 10 units/sec
- **Portal System**: 2-4 portals per wave, 2-6 second stagger between enemy drops
- **Boss Spawn Locations**: Separate portals at arena edges for special bosses

### **Contact Damage Values**
```javascript
CONTACT_DAMAGE = {
  minion: 2,
  boss: 20,      // Boss Minion, Pipe Boss, Cluster Boss
  triangle: 31,  // Triangle Boss
  cone: 42,      // Cone Boss (highest damage)
}
```

This comprehensive enemy roster provides varied gameplay mechanics from basic swarm enemies (Minions) to complex boss encounters with unique behaviors like the Triangle Boss's charge attacks and the Cone Boss's area-denial jumps.