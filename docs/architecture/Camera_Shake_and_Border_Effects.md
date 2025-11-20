# Camera Shake and Border Effects System

## Overview
This system provides visual feedback through camera shakes and border effects to enhance gameplay immersion and provide important status indicators.

## Camera Shake System

### Triggers
- **Damage Taken**: Subtle shake when player takes damage (0.8 intensity, 500ms)
- **Bomb Kit Explosion**: Shake when near explosion radius (1.2 intensity, 800ms)
- **Laser Array Charging**: 5-second shake during charge-up phase (0.6 intensity, 5000ms)

### Implementation Details
- Uses sine wave oscillation for natural shake motion
- Shake intensity scales with event severity
- Duration-based shake with smooth decay
- Non-blocking - doesn't interfere with camera controls

### Technical Specs
- Shake frequency: 10-20 Hz
- Maximum displacement: 0.5-2.0 units
- Duration: 0.5-5 seconds depending on trigger
- Uses performance.now() for timing

## Border Effects System

### Viewport Vignettes
- **Low Health**: Red vignette when health < 30%
- **Pickup Proximity**: Green vignette when near power-ups within 8 units
- **Laser Charging**: Purple vignette during laser charge-up

### Pulsate Effects
- **Critical Health**: Pulsing red border when health < 30%
- **Power-up Available**: Pulsing green glow for nearby pickups
- **Laser Charging**: Pulsing purple border during laser charge-up

### Implementation Details
- CSS-based effects using box-shadow and border-radius
- HTML overlay elements positioned fixed
- Opacity and scale animations using CSS transitions
- Color-coded for different effect types

### Technical Specs
- Vignette opacity: 0.1-0.4
- Pulsate frequency: 1-2 Hz
- Border width: 2-8px
- Uses CSS animations for performance

## Integration Points

### App.jsx Modifications
- Camera shake state management with triggerCameraShake function
- Border effect state management with setBorderEffects
- Event listeners for damage, explosions, laser states, and pickup proximity
- Canvas camera position updates with shake offset
- HTML overlay elements for border effects

### Performance Considerations
- Minimal impact on frame rate
- GPU-accelerated CSS animations
- Efficient state updates
- Cleanup on component unmount

## Code Structure

### State Management
```jsx
const [cameraShake, setCameraShake] = useState({ active: false, intensity: 0, duration: 0, startTime: 0 });
const [borderEffects, setBorderEffects] = useState({
  lowHealth: false,
  pickupGlow: false,
  laserCharging: false,
  vignetteColor: null
});
```

### Camera Position Calculation
```jsx
const cameraPosition = useMemo(() => {
  const basePos = [0, 35, 30];
  if (!cameraShake.active) return basePos;
  const elapsed = performance.now() - cameraShake.startTime;
  const progress = Math.min(elapsed / cameraShake.duration, 1);
  const intensity = cameraShake.intensity * (1 - progress);
  const shakeX = Math.sin(elapsed * 0.02) * intensity;
  const shakeY = Math.cos(elapsed * 0.015) * intensity * 0.5;
  const shakeZ = Math.sin(elapsed * 0.025) * intensity;
  return [basePos[0] + shakeX, basePos[1] + shakeY, basePos[2] + shakeZ];
}, [cameraShake]);
```

### Border Effects Rendering
```jsx
{borderEffects.lowHealth && (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'none', border: '4px solid rgba(239, 68, 68, 0.8)',
    borderRadius: '8px', animation: 'pulse 1s infinite', zIndex: 1000
  }} />
)}
```

## Future Enhancements
- Screen space effects for explosions
- Controller vibration feedback
- Audio-visual synchronization
- Customizable intensity settings</content>
<parameter name="filePath">c:\AppDev\Healthcare_Heroes_Harzard_Wave_Battle\docs\Camera_Shake_and_Border_Effects.md