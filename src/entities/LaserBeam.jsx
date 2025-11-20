import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function LaserBeam({
    pos = [0, 0, 0],
    dir = [0, 0, -1],
    bendDir = null, // vector towards which to bend
    length = 28,
    radius = 0.9,
    dmgPerSecond = 36,
    isPaused,
    onDamage,
}) {
    const ref = useRef();
    const dirVec = useMemo(
        () => new THREE.Vector3(dir[0], dir[1], dir[2]).normalize(),
        [dir]
    );
    const tmpPos = useRef(new THREE.Vector3(...pos));
    // Use an expanded visual length and multiple thin beam instances for a laser-array look
    const effectiveLength = Math.round(length * 1.6);
    const thinRadius = Math.max(0.08, radius * 0.18);
    const geomThin = useMemo(
        () =>
            new THREE.CylinderGeometry(
                thinRadius,
                thinRadius,
                effectiveLength,
                8,
                1,
                true
            ),
        [thinRadius, effectiveLength]
    );
    const mat = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: 0xff2244,
                emissive: 0xff2244,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide,
            }),
        []
    );
    // refs for the 4 beam meshes
    const beamRefs = [useRef(), useRef(), useRef(), useRef()];

    useEffect(() => {
        // position each thin beam with a slight lateral offset along rightVec
        const rightVec = new THREE.Vector3(dirVec.z, 0, -dirVec.x).normalize();
        for (let i = 0; i < beamRefs.length; i++) {
            const b = beamRefs[i].current;
            if (!b) continue;
            const offset = (i - 1.5) * (thinRadius * 6.0);
            const center = new THREE.Vector3(
                pos[0] + dirVec.x * (effectiveLength / 2) + rightVec.x * offset,
                pos[1] + dirVec.y * (effectiveLength / 2),
                pos[2] + dirVec.z * (effectiveLength / 2) + rightVec.z * offset
            );
            b.position.copy(center);
            const axis = new THREE.Vector3(0, 1, 0);
            let q = new THREE.Quaternion().setFromUnitVectors(
                axis,
                dirVec.clone().normalize()
            );
            // Apply bend if bendDir is provided
            if (bendDir) {
                const bendAxis = dirVec.clone().cross(bendDir).normalize();
                const bendAngle = bendDir.length() * 0.3; // adjust factor for bend amount
                const bendQ = new THREE.Quaternion().setFromAxisAngle(bendAxis, bendAngle);
                q.multiply(bendQ);
            }
            b.quaternion.copy(q);
        }
    }, [pos, dirVec, length, bendDir]);

    useFrame((_, dt) => {
        if (isPaused) return;
        // update positions for each thin beam
        const rightVec = new THREE.Vector3(dirVec.z, 0, -dirVec.x).normalize();
        for (let i = 0; i < beamRefs.length; i++) {
            const b = beamRefs[i].current;
            if (!b) continue;
            const offset = (i - 1.5) * (thinRadius * 6.0);
            // jitter/pulse effect
            const t = performance.now() * (0.006 + i * 0.002);
            const jitter = 0.06 * Math.sin(t * 12 + i * 1.2);
            const center = new THREE.Vector3(
                pos[0] +
                dirVec.x * (effectiveLength / 2) +
                rightVec.x * (offset + jitter),
                pos[1] + dirVec.y * (effectiveLength / 2),
                pos[2] +
                dirVec.z * (effectiveLength / 2) +
                rightVec.z * (offset + jitter)
            );
            b.position.copy(center);
            const s = 1 + 0.05 * Math.sin(performance.now() * 0.015 + i);
            b.scale.set(s, s, s);
        }
        // Damage application: iterate enemies within beam
        if (window.gameEnemies && window.gameEnemies.length) {
            const origin = new THREE.Vector3(pos[0], pos[1], pos[2]);
            const d = dirVec;
            for (const ge of window.gameEnemies) {
                try {
                    if (!ge?.ref?.current) continue;
                    const ep = ge.ref.current.position.clone();
                    const rel = ep.clone().sub(origin);
                    const t = rel.dot(d);
                    if (t < 0 || t > effectiveLength) continue;
                    // perpendicular distance squared
                    const proj = d.clone().multiplyScalar(t).add(origin);
                    const perpDist2 = proj.distanceToSquared(ep);
                    // use a slightly larger hit radius so the multi-beam visually matches damage
                    if (perpDist2 <= radius * 1.0 * (radius * 1.0)) {
                        // apply damage scaled by dt
                        const dmg = dmgPerSecond * dt; // fractional units
                        onDamage && onDamage(ge.id, dmg);
                    }
                } catch { }
            }
        }
    });

    return (
        <group>
            {[0, 1, 2, 3].map((i) => (
                <mesh
                    key={i}
                    ref={beamRefs[i]}
                    geometry={geomThin}
                    material={mat}
                    castShadow
                />
            ))}
        </group>
    );
}
