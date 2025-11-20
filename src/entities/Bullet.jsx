import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import * as perf from "../perf";

// Constants needed for Bullet (assuming they are global or passed in, but for now we might need to import or redefine them if they were local to App.jsx)
// In App.jsx, these were constants. We should probably export them from a constants file or pass them as props.
// For now, I will assume they are passed or I'll duplicate the defaults if they are simple.
// Looking at App.jsx: BULLET_SPEED, BULLET_LIFETIME, BOUNDARY_LIMIT.
// I will define defaults here but they should ideally come from a config.

import { BULLET_SPEED, BULLET_LIFETIME, BOUNDARY_LIMIT } from "../constants.js";

export default function Bullet({ bullet, onExpire, isPaused, speed, bulletSpeed = BULLET_SPEED, bulletLifetime = BULLET_LIFETIME, boundaryLimit = BOUNDARY_LIMIT }) {
    const ref = useRef();
    const geom = useMemo(() => new THREE.SphereGeometry(0.25, 12, 12), []);
    const mat = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: 0x00ff66,
                emissive: 0x004422,
                roughness: 0.4,
                metalness: 0,
            }),
        []
    );
    // Initialize position on mount
    useEffect(() => {
        if (ref.current) {
            ref.current.position.set(
                bullet.pos[0],
                bullet.pos[1] || 0.5,
                bullet.pos[2]
            );
        }
    }, [bullet.id]);
    // Apply style on update
    useEffect(() => {
        if (!ref.current) return;
        const s = bullet?.style?.scale || 1;
        ref.current.scale.setScalar(s);
        if (bullet?.style?.color) {
            mat.color.set(bullet.style.color);
            mat.emissive.set(bullet.style.color);
        } else {
            mat.color.set(0x00ff66);
            mat.emissive.set(0x004422);
        }
    }, [bullet?.style, mat]);

    useFrame((_, dt) => {
        if (!ref.current || !bullet.active || isPaused) return;
        perf.start("bullet_update");
        // Move bullet using adjustable speed
        const v = typeof speed === "number" ? speed : bulletSpeed;
        ref.current.position.x += bullet.dir[0] * v * dt;
        ref.current.position.z += bullet.dir[2] * v * dt;
        // Update data
        bullet.pos[0] = ref.current.position.x;
        bullet.pos[2] = ref.current.position.z;
        bullet.timeAlive += dt * 1000;
        const outOfBounds =
            bullet.timeAlive > bulletLifetime ||
            Math.abs(ref.current.position.x) > boundaryLimit ||
            Math.abs(ref.current.position.z) > boundaryLimit;
        perf.end("bullet_update");
        if (outOfBounds) onExpire(bullet.id);
    });

    return <mesh ref={ref} geometry={geom} material={mat} castShadow />;
}
