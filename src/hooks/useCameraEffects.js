import { useState, useEffect, useCallback } from "react";

export function useCameraEffects() {
    // Camera shake system
    const [cameraShake, setCameraShake] = useState({
        active: false,
        intensity: 0,
        duration: 0,
        startTime: 0,
    });
    // Camera shake debug controls
    const [debugCameraShakeIntensity, setDebugCameraShakeIntensity] = useState(
        () => {
            const v = parseFloat(localStorage.getItem("dbgCameraShakeIntensity"));
            return isFinite(v) ? v : 1.0;
        }
    );
    // Persist camera shake debug values
    useEffect(() => {
        localStorage.setItem(
            "dbgCameraShakeIntensity",
            String(debugCameraShakeIntensity)
        );
    }, [debugCameraShakeIntensity]);

    const triggerCameraShake = useCallback(
        (intensity, duration) => {
            setCameraShake({
                active: true,
                intensity: intensity * debugCameraShakeIntensity,
                duration,
                startTime: performance.now(),
            });
        },
        [debugCameraShakeIntensity]
    );

    const [cameraPosition, setCameraPosition] = useState([0, 35, 30]);
    useEffect(() => {
        if (!cameraShake.active) {
            setCameraPosition([0, 35, 30]);
            return;
        }
        const interval = setInterval(() => {
            const elapsed = performance.now() - cameraShake.startTime;
            const progress = Math.min(elapsed / cameraShake.duration, 1);
            const intensity = cameraShake.intensity * (1 - progress); // decay over time
            if (progress >= 1) {
                setCameraShake({
                    active: false,
                    intensity: 0,
                    duration: 0,
                    startTime: 0,
                });
                setCameraPosition([0, 35, 30]);
                clearInterval(interval);
                return;
            }
            const shakeX = Math.sin(elapsed * 0.02) * intensity;
            const shakeY = Math.cos(elapsed * 0.015) * intensity * 0.5;
            const shakeZ = Math.sin(elapsed * 0.025) * intensity;
            setCameraPosition([0 + shakeX, 35 + shakeY, 30 + shakeZ]);
        }, 16); // ~60fps
        return () => clearInterval(interval);
    }, [cameraShake]);

    // Border effects system
    const [borderEffects, setBorderEffects] = useState({
        lowHealth: false,
        pickupGlow: false,
        laserCharging: false,
        vignetteColor: null,
    });

    return {
        cameraShake, setCameraShake,
        debugCameraShakeIntensity, setDebugCameraShakeIntensity,
        triggerCameraShake,
        cameraPosition, setCameraPosition,
        borderEffects, setBorderEffects
    };
}
