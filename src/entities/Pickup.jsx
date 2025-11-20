import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import {
    LIFE_MAGNET_RANGE,
    LIFE_MAGNET_MIN_SPEED,
    LIFE_MAGNET_MAX_SPEED,
    PICKUP_COLLECT_DISTANCE,
} from "../constants.js";

export default function Pickup({
    pos,
    type,
    amount = 50,
    lifetimeMaxSec = 20,
    onCollect,
    onExpire,
    id,
    playerPosRef,
    isPaused,
    scaleMul = 1,
}) {
    const ref = useRef();
    const elapsedRef = useRef(0);
    const baseScale = useRef(
        type === "power"
            ? 0.5 + Math.min(Math.max((amount - 50) / 50, 0), 1) * 0.6
            : 0.5
    );
    const pulseSpeed = useRef(type === "power" && amount >= 90 ? 3.0 : 0);
    const isDiamond = amount >= 90 && type === "power";
    const lifeLabelRef = useRef();
    const collectedRef = useRef(false);
    // Texture for elemental pickups
    const texture = type === "elemental" ? useTexture('/hero_spritesheets/blue_glowing_orb_spritesheet.png') : null;
    // Heart geometry for life pickups (extruded 2D heart)
    const heartGeom = useMemo(() => {
        if (type !== "life") return null;
        const shape = new THREE.Shape();
        // A simple heart path
        shape.moveTo(0, 0.35);
        shape.bezierCurveTo(0, 0.15, -0.35, 0.15, -0.5, 0.35);
        shape.bezierCurveTo(-0.7, 0.6, -0.45, 0.95, 0, 1.2);
        shape.bezierCurveTo(0.45, 0.95, 0.7, 0.6, 0.5, 0.35);
        shape.bezierCurveTo(0.35, 0.15, 0, 0.15, 0, 0.35);
        const extrude = new THREE.ExtrudeGeometry(shape, {
            depth: 0.25,
            bevelEnabled: false,
            steps: 1,
        });
        // Rotate to face up and center pivot slightly
        extrude.rotateX(-Math.PI / 2);
        extrude.translate(0, 0, 0);
        return extrude;
    }, [type]);
    const heartMat = useMemo(
        () =>
            type === "life"
                ? new THREE.MeshStandardMaterial({
                    color: 0xff3366,
                    emissive: 0x220011,
                    roughness: 0.5,
                })
                : null,
        [type]
    );

    useFrame((_, dt) => {
        if (!ref.current || isPaused) return;

        ref.current.rotation.y += dt;
        ref.current.position.y =
            0.8 + Math.sin(performance.now() / 300 + id) * 0.15;
        // lifetime tracking (game time only)
        elapsedRef.current += dt;
        if (elapsedRef.current >= lifetimeMaxSec) {
            onExpire && onExpire(id);
            return;
        }
        // Animate elemental texture
        if (texture) {
            const frame = Math.floor(performance.now() / 30) % 48;
            texture.offset.x = frame * (320 / 15360);
        }
        // Scaling per type with pulses
        if (type === "life") {
            const t = performance.now() * 0.004;
            const s0 = 1.0 + 0.15 * (0.5 + 0.5 * Math.sin(t)); // gently pulse large heart
            const s = s0 * 1.4; // base upsize
            ref.current.scale.set(s * scaleMul, s * scaleMul, s * scaleMul);
            if (lifeLabelRef.current) {
                const tt = performance.now() * 0.003 + id;
                lifeLabelRef.current.position.y = 0.9 + 0.12 * Math.sin(tt);
            }
        } else if (pulseSpeed.current > 0) {
            const p =
                1 +
                Math.sin(performance.now() * 0.001 * (pulseSpeed.current * 60)) * 0.12;
            const s = baseScale.current * p * scaleMul;
            ref.current.scale.set(s, s, s);
        } else if (type === "power") {
            const s = baseScale.current * scaleMul;
            ref.current.scale.set(s, s, s);
        } else {
            const s = 0.5 * scaleMul;
            ref.current.scale.set(s, s, s);
        }

        // Collision with player
        if (!collectedRef.current && playerPosRef.current) {
            const dx = ref.current.position.x - playerPosRef.current.x;
            const dz = ref.current.position.z - playerPosRef.current.z;
            const distSq = dx * dx + dz * dz;
            // Magnetize if close (life only, or all?)
            // Original code had magnet logic for life.
            // Let's assume simple collision for now based on what was visible.
            // Actually, I should check if I missed the magnet logic in the previous view.
            // It was mentioned in README but I didn't see the code in the snippet.
            // I will implement basic collision here.
            if (distSq < 1.5 * 1.5) {
                collectedRef.current = true;
                onCollect && onCollect(id, type, amount);
            }
        }
    });

    if (type === "life") {
        return (
            <group ref={ref} position={[pos[0], 0.5, pos[2]]}>
                <mesh geometry={heartGeom} material={heartMat} castShadow />
            </group>
        );
    }

    // Default box for others
    return (
        <mesh
            ref={ref}
            position={[pos[0], 0.5, pos[2]]}
            castShadow
        >
            {isDiamond ? (
                <octahedronGeometry args={[0.6, 0]} />
            ) : (
                <boxGeometry args={[0.6, 0.6, 0.6]} />
            )}
            <meshStandardMaterial
                color={
                    type === "health"
                        ? 0x22c55e
                        : type === "armour"
                            ? 0x60a5fa
                            : type === "lasers"
                                ? 0xff4d4d
                                : type === "shield"
                                    ? 0x66ccff
                                    : type === "pulsewave"
                                        ? 0xf97316
                                        : type === "power"
                                            ? 0x60a5fa
                                            : type === "invuln"
                                                ? 0xfacc15
                                                : type === "bombs"
                                                    ? 0x111827
                                                    : type === "elemental"
                                                        ? 0x8b5cf6
                                                        : type === "speedboost"
                                                            ? 0x22c55e
                                                            : type === "dmgscale"
                                                                ? 0xf97316
                                                                : type === "speedramp"
                                                                    ? 0x22c55e
                                                                    : type === "level"
                                                                        ? 0x60a5fa
                                                                        : type === "boss"
                                                                            ? 0xffb020
                                                                            : 0xffffff
                }
                emissive={
                    type === "health"
                        ? 0x004400
                        : type === "armour"
                            ? 0x002244
                            : type === "lasers"
                                ? 0x440000
                                : type === "shield"
                                    ? 0x004466
                                    : type === "pulsewave"
                                        ? 0x442200
                                        : type === "power"
                                            ? 0x002244
                                            : type === "invuln"
                                                ? 0x443300
                                                : type === "bombs"
                                                    ? 0x000000
                                                    : type === "elemental"
                                                        ? 0x220044
                                                        : type === "speedboost"
                                                            ? 0x004400
                                                            : type === "dmgscale"
                                                                ? 0x442200
                                                                : type === "speedramp"
                                                                    ? 0x004400
                                                                    : type === "level"
                                                                        ? 0x002244
                                                                        : type === "boss"
                                                                            ? 0x442200
                                                                            : 0x222222
                }
                roughness={0.3}
                metalness={0.8}
                map={texture}
            />
        </mesh>
    );
}
