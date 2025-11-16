import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useFBX } from "@react-three/drei";
import {
  AIM_RAY_LENGTH,
  BOUNDARY_LIMIT,
  FIRE_RATE,
  PLAYER_SPEED,
  SPEED_BUFF_DURATION_MS,
  SPEED_DEBUFF_DURATION_MS,
  SPEED_DEBUFF_FACTOR,
  RUNNER_SPEED_MULTIPLIER,
} from "../game/constants.js";
import { HeroFromSpec, defaultHeroSpec } from "../heroes/factory/HeroFactory";
import FXOrbs from "../components/FXOrbs";
// Dr Dokta animation controller (HeroAnimTester) + mapped animation pack
import { HeroAnimTester } from "../heroes/factory/HeroAnimTester";
import { liteSwordShieldMap } from "../heroes/factory/animMaps/liteSwordShieldMap";

function Player({
  position,
  setPositionRef,
  onShoot,
  isPaused,
  autoFire,
  controlScheme = "dpad",
  moveInputRef,
  moveSourceRef,
  aimInputRef,
  onSlam,
  highContrast = false,
  portals = [],
  onDebuff,
  speedBoosts = [],
  onBoost,
  autoFollow,
  arcTriggerToken,
  resetToken = 0,
  basePlayerSpeed = PLAYER_SPEED,
  autoAimEnabled = false,
  onBoundaryJumpChange,
  onLanding,
  dashTriggerToken = 0,
  onDashStart,
  onDashEnd,
  primaryColor = 0x22c55e,
  invulnActive = false,
  bouncers = [],
  boundaryLimit = BOUNDARY_LIMIT,
  heroName = null,
  heroRenderMode = "model",
  heroQuality = "high",
  heroVisualScale = 2,
  powerActive = false,
  powerAmount = 0,
  shieldStackToken = 0,
  fireRateMs = null,
  fxOrbCount = null,
  pickupInvulnState = { invulnerable: false, movementMul: 1, movementLocked: false },
  lasersActive = false,
}) {
  const ref = useRef();
  const diamondRef = useRef();
  const invulnActiveRefLocal = useRef(invulnActive);
  useEffect(() => {
    invulnActiveRefLocal.current = !!invulnActive;
  }, [invulnActive]);
  const lastShot = useRef(0);
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    []
  );
  const aimPoint = useRef(new THREE.Vector3());
  const tmpDir = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3(0, 0, -1));
  const lastYaw = useRef(0);
  const rayRef = useRef();
  const baseRayThickness = 0.08;
  // Inputs and movement
  const keysRef = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const aimDirRef = useRef(new THREE.Vector3(0, 0, -1));
  // Live controller for factory hero
  const heroCtrlRef = useRef({ moveIntentX: 0, moveIntentZ: 0, aimYawDeg: 0 });
  // Jump/arc state
  const airVelY = useRef(0);
  const airFwdVel = useRef(0);
  const airFwdDir = useRef(new THREE.Vector3(0, 0, -1));
  const slamArmed = useRef(false);
  const launchCooldown = useRef(0);
  const GRAVITY = 24;
  const LAUNCH_UP_VEL = 14;
  const LAUNCH_TARGET_FRACTION = 0.5;
  const keyJumpDownAt = useRef(0);
  const isKeyJumpDown = useRef(false);
  const rmbDownAt = useRef(0);
  const isRmbDown = useRef(false);
  const chargeRingRef = useRef();
  const landingRingRef = useRef();
  const chargeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffcc00,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      }),
    []
  );
  const chargeGeom = useMemo(() => new THREE.RingGeometry(0.9, 1.1, 48), []);
  const landingMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      }),
    []
  );
  const landingGeom = useMemo(() => new THREE.RingGeometry(0.7, 0.8, 32), []);
  // Diamond indicator will be created via JSX geometry/material for R3F compatibility
  // Buff/debuff and dash
  const debuffTimer = useRef(0);
  const dashing = useRef(false);
  const dashTime = useRef(0);
  const dashDuration = 0.25;
  const dashVel = useRef(new THREE.Vector3());
  const portalHitCooldown = useRef(0);
  const bouncerHitCooldown = useRef(0);
  const boundaryGraceRef = useRef(0);
  const boostTimer = useRef(0);
  const boostHitCooldown = useRef(0);
  const boostMulRef = useRef(1);
  const lastArcToken = useRef(0);
  const boundaryJumpActive = useRef(false);
  // Health & regeneration
  const healthRef = useRef(100); // current HP
  const maxHealthRef = useRef(100); // base max HP (can be extended by pickups later)
  const regenDelayRef = useRef(0); // seconds remaining before regen resumes after damage
  const baseRegenRateRef = useRef(0.75); // HP per second (slow baseline)
  const regenMultiplierRef = useRef(1); // scalable by future pickups/effects
  const lastDamageAtRef = useRef(0);
  // Expose imperative API to parent via window for now (can be ref prop later)
  useEffect(() => {
    window.playerHealth = {
      get: () => ({ current: healthRef.current, max: maxHealthRef.current }),
      applyDamage: (amount = 0, regenDelaySec = 4) => {
        const v = Math.max(0, amount);
        if (v <= 0) return healthRef.current;
        // Prefer the centralized damage API when available so armor is considered.
        try {
          if (typeof window.damagePlayer === "function") {
            const res = window.damagePlayer(v);
            // If the global damagePlayer returned a result, sync local health for visual/regeneration logic
            if (
              res &&
              typeof res === "object" &&
              typeof res.health === "number"
            ) {
              healthRef.current = res.health;
            } else {
              // Fallback: apply locally
              healthRef.current = Math.max(0, healthRef.current - v);
            }
          } else {
            healthRef.current = Math.max(0, healthRef.current - v);
          }
        } catch (e) {
          healthRef.current = Math.max(0, healthRef.current - v);
        }
        regenDelayRef.current = regenDelaySec;
        lastDamageAtRef.current = performance.now();
        return healthRef.current;
      },
      healFlat: (amount = 0) => {
        const v = Math.max(0, amount);
        if (v <= 0) return healthRef.current;
        healthRef.current = Math.min(
          maxHealthRef.current,
          healthRef.current + v
        );
        return healthRef.current;
      },
      boostRegenMultiplier: (mul = 1, durationSec = 5) => {
        regenMultiplierRef.current = Math.max(0.1, mul);
        // schedule reset after duration
        const resetAt = performance.now() + durationSec * 1000;
        const id = setInterval(() => {
          if (performance.now() >= resetAt) {
            regenMultiplierRef.current = 1;
            clearInterval(id);
          }
        }, 250);
      },
      extendMax: (extra = 0) => {
        maxHealthRef.current += Math.max(0, extra);
        healthRef.current = Math.min(maxHealthRef.current, healthRef.current);
        return maxHealthRef.current;
      },
    };
    return () => {
      if (window.playerHealth) delete window.playerHealth;
    };
  }, []);
  // Animation bridge to FBX avatar (Dr Dokta)
  const doktaActionRef = useRef("idle");
  const [doktaAction, setDoktaAction] = useState("idle");
  const attackTimerRef = useRef(0);
  // FX orbs state
  const [fxMode, setFxMode] = useState("wave"); // 'wave' | 'atom' | 'push' | 'shield'
  const [fxShieldShape, setFxShieldShape] = useState("circle");
  const fxEventTimer = useRef(0);
  const shieldStackTimer = useRef(0);

  // React to life pickup (shield stack for 10s)
  useEffect(() => {
    if (!shieldStackToken) return;
    shieldStackTimer.current = 10.0;
    setFxMode("shield");
    setFxShieldShape("circle");
  }, [shieldStackToken]);

  // React to high-tier power effect (atom) while active
  useEffect(() => {
    if (powerActive && powerAmount >= 90) {
      setFxMode("atom");
      // Keep active while powerActive; fallback handled in frame loop
      fxEventTimer.current = 1.0;
    }
  }, [powerActive, powerAmount]);

  // Map lasers power-up to heavy attack animation while active
  useEffect(() => {
    if (lasersActive) {
      setDoktaAction("attackHeavy");
    } else {
      // revert to idle when lasers finish (do not override other higher-priority actions)
      setDoktaAction((prev) => (prev === "attackHeavy" ? "idle" : prev));
    }
  }, [lasersActive]);

  // Reset on respawn/restart
  useEffect(() => {
    if (!ref.current) return;
    ref.current.position.set(0, 0.5, 0);
    airVelY.current = 0;
    airFwdVel.current = 0;
    airFwdDir.current.set(0, 0, -1);
    slamArmed.current = false;
    launchCooldown.current = 0;
    portalHitCooldown.current = 0;
    bouncerHitCooldown.current = 0;
    keysRef.current = {
      w: false,
      a: false,
      s: false,
      d: false,
      up: false,
      down: false,
      left: false,
      right: false,
    };
    isKeyJumpDown.current = false;
    isRmbDown.current = false;
    boundaryGraceRef.current = 2.0;
  }, [resetToken]);

  // Input listeners
  useEffect(() => {
    if (isPaused) return;
    function down(e) {
      if (e.key === "ArrowUp") keysRef.current.up = true;
      else if (e.key === "ArrowDown") keysRef.current.down = true;
      else if (e.key === "ArrowLeft") keysRef.current.left = true;
      else if (e.key === "ArrowRight") keysRef.current.right = true;
      else {
        const k = e.key.toLowerCase();
        if (k in keysRef.current) keysRef.current[k] = true;
      }
    }
    function up(e) {
      if (e.key === "ArrowUp") keysRef.current.up = false;
      else if (e.key === "ArrowDown") keysRef.current.down = false;
      else if (e.key === "ArrowLeft") keysRef.current.left = false;
      else if (e.key === "ArrowRight") keysRef.current.right = false;
      else {
        const k = e.key.toLowerCase();
        if (k in keysRef.current) keysRef.current[k] = false;
      }
    }
    function handleMouseDown(e) {
      if (e.button === 0) {
        const now = performance.now();
        const rate = fireRateMs ?? FIRE_RATE;
        if (now - lastShot.current > rate) {
          lastShot.current = now;
          const dir = forward.current
            .set(0, 0, -1)
            .applyQuaternion(ref.current.quaternion);
          dir.y = 0;
          dir.normalize();
          onShoot(ref.current.position, [dir.x, 0, dir.z]);
          // Trigger a short attack animation window
          attackTimerRef.current = 0.25;
        }
      } else if (e.button === 2) {
        e.preventDefault();
        if (
          !isRmbDown.current &&
          ref.current &&
          ref.current.position.y <= 0.5
        ) {
          isRmbDown.current = true;
          rmbDownAt.current = performance.now();
        }
      }
    }
    function handleMouseUp(e) {
      if (e.button === 2 && isRmbDown.current && ref.current) {
        e.preventDefault();
        isRmbDown.current = false;
        if (ref.current.position.y <= 0.5) {
          airVelY.current = LAUNCH_UP_VEL;
          const BL = boundaryLimit ?? BOUNDARY_LIMIT;
          const totalLen = 2 * BL;
          const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen);
          // Jump direction: prefer movement input; fall back to aim direction
          const moveDirVec = getMoveDir();
          const launchDir = moveDirVec ? moveDirVec.clone() : aimDirRef.current.clone();
          const target = new THREE.Vector3()
            .copy(ref.current.position)
            .addScaledVector(launchDir, desired);
          const margin = 1.0;
          target.x = Math.max(Math.min(target.x, BL - margin), -BL + margin);
          target.z = Math.max(Math.min(target.z, BL - margin), -BL + margin);
          const disp = new THREE.Vector3().subVectors(
            target,
            ref.current.position
          );
          const dispLen = Math.max(0.001, Math.hypot(disp.x, disp.z));
          airFwdDir.current.set(disp.x / dispLen, 0, disp.z / dispLen);
          const tFlight = (2 * LAUNCH_UP_VEL) / GRAVITY;
          airFwdVel.current = dispLen / tFlight;
          slamArmed.current = true;
        }
        if (chargeRingRef.current)
          chargeRingRef.current.scale.set(0.001, 0.001, 0.001);
        if (landingRingRef.current)
          landingRingRef.current.scale.set(0.001, 0.001, 0.001);
      }
    }
    function handleContextMenu(e) {
      if (e.button === 2) e.preventDefault();
    }

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("contextmenu", handleContextMenu);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [setPositionRef, onShoot, isPaused]);

  // Helper: compute current movement direction (normalized Vector3) from moveInputRef or keyboard keys
  const getMoveDir = useCallback(() => {
    const k = keysRef.current;
    const keyMx = (k.d ? 1 : 0) - (k.a ? 1 : 0) + (k.right ? 1 : 0) - (k.left ? 1 : 0);
    const keyMz = (k.s ? 1 : 0) - (k.w ? 1 : 0) + (k.down ? 1 : 0) - (k.up ? 1 : 0);
    const extMx = moveInputRef ? moveInputRef.current.x : 0;
    const extMz = moveInputRef ? moveInputRef.current.z : 0;
    let mx = 0,
      mz = 0;
    let usedKeyboard = false;
    if (Math.abs(extMx) > 0.001 || Math.abs(extMz) > 0.001) {
      mx = extMx;
      mz = extMz;
      usedKeyboard = false;
    } else {
      mx = keyMx;
      mz = keyMz;
      usedKeyboard = true;
    }

    // Apply accessibility inversion only for keyboard-derived movement (avoid double-inverting controller input)
    try {
      if (usedKeyboard) {
        const acc = require("../utils/accessibility").getAccessibility();
        if (acc?.invertMoveX) mx = -mx;
        if (acc?.invertMoveY) mz = -mz;
      }
    } catch (e) {
      // ignore if accessibility module can't be loaded synchronously
    }

    const len = Math.hypot(mx, mz);
    if (len < 0.001) return null;
    return new THREE.Vector3(mx / len, 0, mz / len);
  }, [moveInputRef]);

  // Key jump (Ctrl/Enter)
  useEffect(() => {
    if (isPaused) return;
    const onKeyDown = (e) => {
      if (
        (e.code === "ControlLeft" ||
          e.code === "ControlRight" ||
          e.code === "Enter" ||
          e.code === "NumpadEnter") &&
        !isKeyJumpDown.current
      ) {
        e.preventDefault();
        isKeyJumpDown.current = true;
        keyJumpDownAt.current = performance.now();
      }
    };
    const onKeyUp = (e) => {
      if (
        (e.code === "ControlLeft" ||
          e.code === "ControlRight" ||
          e.code === "Enter" ||
          e.code === "NumpadEnter") &&
        isKeyJumpDown.current &&
        ref.current
      ) {
        e.preventDefault();
        isKeyJumpDown.current = false;
        if (ref.current.position.y <= 0.5) {
          airVelY.current = LAUNCH_UP_VEL;
          const BL = boundaryLimit ?? BOUNDARY_LIMIT;
          const totalLen = 2 * BL;
          const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen);
          const moveDirVec = getMoveDir();
          const launchDir = moveDirVec ? moveDirVec.clone() : aimDirRef.current.clone();
          const target = new THREE.Vector3()
            .copy(ref.current.position)
            .addScaledVector(launchDir, desired);
          const margin = 1.0;
          target.x = Math.max(Math.min(target.x, BL - margin), -BL + margin);
          target.z = Math.max(Math.min(target.z, BL - margin), -BL + margin);
          const disp = new THREE.Vector3().subVectors(
            target,
            ref.current.position
          );
          const dispLen = Math.max(0.001, Math.hypot(disp.x, disp.z));
          airFwdDir.current.set(disp.x / dispLen, 0, disp.z / dispLen);
          const tFlight = (2 * LAUNCH_UP_VEL) / GRAVITY;
          airFwdVel.current = dispLen / tFlight;
          slamArmed.current = true;
        }
        if (chargeRingRef.current)
          chargeRingRef.current.scale.set(0.001, 0.001, 0.001);
        if (landingRingRef.current)
          landingRingRef.current.scale.set(0.001, 0.001, 0.001);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isPaused]);

  // External arc trigger
  useEffect(() => {
    if (!ref.current) return;
    if (arcTriggerToken && arcTriggerToken !== lastArcToken.current) {
      lastArcToken.current = arcTriggerToken;
      airVelY.current = LAUNCH_UP_VEL;
      const BL = boundaryLimit ?? BOUNDARY_LIMIT;
      const totalLen = 2 * BL;
      const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen);
      const moveDirVec = getMoveDir();
      const launchDir = moveDirVec ? moveDirVec.clone() : aimDirRef.current.clone();
      const target = new THREE.Vector3()
        .copy(ref.current.position)
        .addScaledVector(launchDir, desired);
      const margin = 1.0;
      target.x = Math.max(Math.min(target.x, BL - margin), -BL + margin);
      target.z = Math.max(Math.min(target.z, BL - margin), -BL + margin);
      const disp = new THREE.Vector3().subVectors(target, ref.current.position);
      const dispLen = Math.max(0.001, Math.hypot(disp.x, disp.z));
      airFwdDir.current.set(disp.x / dispLen, 0, disp.z / dispLen);
      const tFlight = (2 * LAUNCH_UP_VEL) / GRAVITY;
      airFwdVel.current = dispLen / tFlight;
      slamArmed.current = true;
    }
  }, [arcTriggerToken]);

  // Auto-fire timer
  const autoFireTimerRef = useRef(0);

  useFrame((state, dt) => {
    if (!ref.current || isPaused) return;
    const BL = boundaryLimit ?? BOUNDARY_LIMIT;

    // Dash handling
    if (dashing.current) {
      dashTime.current += dt;
      ref.current.position.addScaledVector(dashVel.current, dt);
      ref.current.position.x = Math.max(
        Math.min(ref.current.position.x, BL - 0.5),
        -BL + 0.5
      );
      ref.current.position.z = Math.max(
        Math.min(ref.current.position.z, BL - 0.5),
        -BL + 0.5
      );
      if (dashTime.current >= dashDuration) {
        dashing.current = false;
        onDashEnd &&
          onDashEnd({ x: ref.current.position.x, z: ref.current.position.z });
      }
      setPositionRef && setPositionRef(ref.current.position);
      return;
    }

    // Auto-fire cadence
    if (autoFire) {
      autoFireTimerRef.current += dt * 1000;
      const rate = fireRateMs ?? FIRE_RATE;
      if (autoFireTimerRef.current >= rate) {
        autoFireTimerRef.current = 0;
        const dir = forward.current
          .set(0, 0, -1)
          .applyQuaternion(ref.current.quaternion);
        dir.y = 0;
        dir.normalize();
        lastShot.current = performance.now();
        onShoot(ref.current.position, [dir.x, 0, dir.z]);
      }
    } else {
      autoFireTimerRef.current = 0;
    }

    // Aim handling

    // Invulnerability diamond animation (hover & rotate)
    try {
      if (diamondRef.current) {
        const active = !!invulnActiveRefLocal.current;
        if (active) {
          // base height scaled to heroVisualScale (approx head height)
          const baseY = 1.6 * (heroVisualScale / 2 || 1);
          const t = state.clock.getElapsedTime();
          const bob = Math.sin(t * 3.0) * 0.12 + 0.06;
          diamondRef.current.position.set(0, baseY + bob, 0);
          diamondRef.current.rotation.y += dt * 2.2;
          diamondRef.current.visible = true;
        } else {
          diamondRef.current.visible = false;
        }
      }
    } catch (e) {
      // swallow animation errors
    }
    // If an external aim stick is provided (right-stick on touch), prefer that for free-aim
    if (
      aimInputRef &&
      (Math.abs(aimInputRef.current.x) > 0.001 || Math.abs(aimInputRef.current.z) > 0.001)
    ) {
      tmpDir.current.set(aimInputRef.current.x, 0, aimInputRef.current.z);
      if (tmpDir.current.lengthSq() > 1e-6) {
        aimDirRef.current.copy(tmpDir.current).normalize();
        const targetYaw = Math.atan2(tmpDir.current.x, tmpDir.current.z) + Math.PI;
        const diff = ((targetYaw - lastYaw.current + Math.PI) % (Math.PI * 2)) - Math.PI;
        lastYaw.current = lastYaw.current + diff * (1 - Math.exp(-30 * dt));
        ref.current.rotation.y = lastYaw.current;
        if (rayRef.current) {
          const dist = Math.min(tmpDir.current.length(), 18);
          const width = baseRayThickness + Math.min(dist / 12, 1) * 0.14;
          rayRef.current.scale.x = width;
        }
      }
    } else if (autoFollow && autoFollow.active) {
      const cx = autoFollow.center?.[0] ?? 0;
      const cz = autoFollow.center?.[2] ?? 0;
      tmpDir.current.set(
        cx - ref.current.position.x,
        0,
        cz - ref.current.position.z
      );
      if (tmpDir.current.lengthSq() > 1e-6) {
        aimDirRef.current.copy(tmpDir.current).normalize();
        const targetYaw =
          Math.atan2(tmpDir.current.x, tmpDir.current.z) + Math.PI;
        const diff =
          ((targetYaw - lastYaw.current + Math.PI) % (Math.PI * 2)) - Math.PI;
        lastYaw.current = lastYaw.current + diff * (1 - Math.exp(-30 * dt));
        ref.current.rotation.y = lastYaw.current;
      }
    } else if (autoAimEnabled) {
      const p = ref.current.position;
      let target = null;
      let cx = 0,
        cz = 0,
        ccount = 0;
      const SHORT_RANGE = 10;
      const MID_RANGE = 18;
      const LONG_RANGE = 36;
      if (window.gameEnemies && window.gameEnemies.length) {
        for (const ge of window.gameEnemies) {
          if (!ge?.ref?.current) continue;
          const ex = ge.ref.current.position.x;
          const ez = ge.ref.current.position.z;
          const dx = ex - p.x;
          const dz = ez - p.z;
          const d2 = dx * dx + dz * dz;
          if (d2 <= MID_RANGE * MID_RANGE) {
            cx += ex;
            cz += ez;
            ccount++;
          }
        }
        if (ccount >= 5) {
          target = { x: cx / ccount, z: cz / ccount };
        } else {
          let best = null;
          for (const ge of window.gameEnemies) {
            if (!ge?.ref?.current) continue;
            const ex = ge.ref.current.position.x;
            const ez = ge.ref.current.position.z;
            const dx = ex - p.x;
            const dz = ez - p.z;
            const d2 = dx * dx + dz * dz;
            if (d2 > LONG_RANGE * LONG_RANGE) continue;
            let pri = 1;
            if (ge.isCone) pri = 3;
            else if (ge.isBoss) pri = 2;
            const score = pri * 10000 - d2;
            if (!best || score > best.score) best = { score, x: ex, z: ez };
          }
          if (best) target = { x: best.x, z: best.z };
        }
      }
      if (target) {
        tmpDir.current.set(target.x - p.x, 0, target.z - p.z);
        if (tmpDir.current.lengthSq() > 1e-6) {
          aimDirRef.current.copy(tmpDir.current).normalize();
          const targetYaw =
            Math.atan2(tmpDir.current.x, tmpDir.current.z) + Math.PI;
          const diff =
            ((targetYaw - lastYaw.current + Math.PI) % (Math.PI * 2)) - Math.PI;
          lastYaw.current = lastYaw.current + diff * (1 - Math.exp(-30 * dt));
          ref.current.rotation.y = lastYaw.current;
          if (rayRef.current) {
            const dist = Math.min(tmpDir.current.length(), MID_RANGE);
            const width = baseRayThickness + Math.min(dist / 12, 1) * 0.14;
            rayRef.current.scale.x = width;
          }
        }
      } else {
        state.raycaster.setFromCamera(state.pointer, state.camera);
        const hit = state.raycaster.ray.intersectPlane(plane, aimPoint.current);
        if (hit) {
          tmpDir.current.subVectors(aimPoint.current, ref.current.position);
          tmpDir.current.y = 0;
          if (tmpDir.current.lengthSq() > 1e-6) {
            aimDirRef.current.copy(tmpDir.current).normalize();
            const targetYaw =
              Math.atan2(tmpDir.current.x, tmpDir.current.z) + Math.PI;
            const diff =
              ((targetYaw - lastYaw.current + Math.PI) % (Math.PI * 2)) -
              Math.PI;
            lastYaw.current = lastYaw.current + diff * (1 - Math.exp(-30 * dt));
            ref.current.rotation.y = lastYaw.current;
            const dist = tmpDir.current.length();
            if (rayRef.current) {
              const width = baseRayThickness + Math.min(dist / 12, 1) * 0.14;
              rayRef.current.scale.x = width;
            }
          }
        }
      }
    } else {
      state.raycaster.setFromCamera(state.pointer, state.camera);
      const hit = state.raycaster.ray.intersectPlane(plane, aimPoint.current);
      if (hit) {
        tmpDir.current.subVectors(aimPoint.current, ref.current.position);
        tmpDir.current.y = 0;
        if (tmpDir.current.lengthSq() > 1e-6) {
          aimDirRef.current.copy(tmpDir.current).normalize();
          const targetYaw =
            Math.atan2(tmpDir.current.x, tmpDir.current.z) + Math.PI;
          const diff =
            ((targetYaw - lastYaw.current + Math.PI) % (Math.PI * 2)) - Math.PI;
          lastYaw.current = lastYaw.current + diff * (1 - Math.exp(-30 * dt));
          ref.current.rotation.y = lastYaw.current;
          const dist = tmpDir.current.length();
          if (rayRef.current) {
            const width = baseRayThickness + Math.min(dist / 12, 1) * 0.14;
            rayRef.current.scale.x = width;
          }
        }
      }
    }

    // Movement vectors
    const k = keysRef.current;
    const keyMx =
      (k.d ? 1 : 0) - (k.a ? 1 : 0) + (k.right ? 1 : 0) - (k.left ? 1 : 0);
    const keyMz =
      (k.s ? 1 : 0) - (k.w ? 1 : 0) + (k.down ? 1 : 0) - (k.up ? 1 : 0);
    const extMx = moveInputRef ? moveInputRef.current.x : 0;
    const extMz = moveInputRef ? moveInputRef.current.z : 0;
    let mx = 0,
      mz = 0;
    let usedKeyboard = false;
    if (controlScheme === "wasd") {
      mx = keyMx;
      mz = keyMz;
      usedKeyboard = true;
    } else {
      if (Math.abs(extMx) > 0.001 || Math.abs(extMz) > 0.001) {
        mx = extMx;
        mz = extMz;
        usedKeyboard = false;
      } else {
        mx = keyMx;
        mz = keyMz;
        usedKeyboard = true;
      }
    }

    // movement inversion handled centrally in getMoveDir for keyboard inputs

    // Auto-follow override on shape perimeter
    if (autoFollow && autoFollow.active) {
      const cx = autoFollow.center?.[0] ?? 0;
      const cz = autoFollow.center?.[2] ?? 0;
      const px = ref.current.position.x;
      const pz = ref.current.position.z;
      const shape = autoFollow.shape || "circle";
      const r = Math.max(0.001, autoFollow.radius || 1);
      const dirSign = autoFollow.dirSign || 1;
      if (shape === "circle") {
        let dx = px - cx;
        let dz = pz - cz;
        const len = Math.hypot(dx, dz);
        if (len < 0.001) {
          dx = 1;
          dz = 0;
        }
        let tx = -dz * dirSign;
        let tz = dx * dirSign;
        const tlen = Math.hypot(tx, tz) || 1;
        mx = tx / tlen;
        mz = tz / tlen;
        const radialErr = r - len;
        if (Math.abs(radialErr) > 0.001) {
          const rx = dx / (len || 1);
          const rz = dz / (len || 1);
          const corrGain = 2.5;
          mx += rx * radialErr * corrGain * dt;
          mz += rz * radialErr * corrGain * dt;
        }
      } else {
        const segs = [];
        if (shape === "hexagon") {
          const verts = [];
          for (let i = 0; i < 6; i++) {
            const a = -Math.PI / 2 + i * ((2 * Math.PI) / 6);
            verts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
          }
          for (let i = 0; i < 6; i++) {
            const a0 = verts[i],
              a1 = verts[(i + 1) % 6];
            segs.push([a0[0], a0[1], a1[0], a1[1]]);
          }
        } else {
          const hx = r;
          const hz = r * 0.7;
          const v = [
            [cx + hx, cz + hz],
            [cx - hx, cz + hz],
            [cx - hx, cz - hz],
            [cx + hx, cz - hz],
          ];
          for (let i = 0; i < 4; i++) {
            const a0 = v[i],
              a1 = v[(i + 1) % 4];
            segs.push([a0[0], a0[1], a1[0], a1[1]]);
          }
        }
        let best = null;
        for (const s of segs) {
          const [x1, z1, x2, z2] = s;
          const vx = x2 - x1,
            vz = z2 - z1;
          const denom = vx * vx + vz * vz || 1;
          let t = ((px - x1) * vx + (pz - z1) * vz) / denom;
          t = Math.max(0, Math.min(1, t));
          const nx = x1 + t * vx;
          const nz = z1 + t * vz;
          const dx = px - nx;
          const dz = pz - nz;
          const d2 = dx * dx + dz * dz;
          if (!best || d2 < best.d2) best = { nx, nz, vx, vz, d2 };
        }
        if (best) {
          const elen = Math.hypot(best.vx, best.vz) || 1;
          mx = (best.vx / elen) * dirSign;
          mz = (best.vz / elen) * dirSign;
          const corrGain = 8.0;
          mx += (best.nx - px) * corrGain * dt;
          mz += (best.nz - pz) * corrGain * dt;
        }
      }
    }

    // Normalize and apply speed
    const mlen = Math.hypot(mx, mz) || 1;
    mx /= mlen;
    mz /= mlen;
    portalHitCooldown.current = Math.max(0, portalHitCooldown.current - dt);
    bouncerHitCooldown.current = Math.max(0, bouncerHitCooldown.current - dt);
    debuffTimer.current = Math.max(0, debuffTimer.current - dt);
    boostHitCooldown.current = Math.max(0, boostHitCooldown.current - dt);
    boostTimer.current = Math.max(0, boostTimer.current - dt);
    const debuffMul = debuffTimer.current > 0 ? SPEED_DEBUFF_FACTOR : 1;
    const baseSpeed =
      basePlayerSpeed * (boostTimer.current > 0 ? boostMulRef.current : 1);
    const speedMul =
      (moveSourceRef && moveSourceRef.current === "runner"
        ? RUNNER_SPEED_MULTIPLIER
        : 1) * debuffMul;
    // Apply pickup-driven movement modifiers (lock or slow)
    let effectiveMovementMul = speedMul;
    if (pickupInvulnState && typeof pickupInvulnState.movementMul === "number") {
      effectiveMovementMul = effectiveMovementMul * pickupInvulnState.movementMul;
    }
    if (pickupInvulnState && pickupInvulnState.movementLocked) {
      // fully lock horizontal movement
      mx = 0;
      mz = 0;
    }
    ref.current.position.x += mx * (baseSpeed * effectiveMovementMul) * dt;
    ref.current.position.z += mz * (baseSpeed * effectiveMovementMul) * dt;
    // Update hero factory controller live values
    heroCtrlRef.current.moveIntentX = mx;
    heroCtrlRef.current.moveIntentZ = mz;
    // Map aim vector to yaw degrees where 0deg faces -Z
    const ax = aimDirRef.current.x;
    const az = aimDirRef.current.z;
    const yaw = Math.atan2(ax, -az); // radians
    const yawDeg = (yaw * 180) / Math.PI;
    heroCtrlRef.current.aimYawDeg = yawDeg;

    // Boundary launch detection
    launchCooldown.current = Math.max(0, launchCooldown.current - dt);
    boundaryGraceRef.current = Math.max(0, boundaryGraceRef.current - dt);
    if (launchCooldown.current <= 0 && boundaryGraceRef.current <= 0) {
      if (
        ref.current.position.x > BL - 0.1 ||
        ref.current.position.x < -BL + 0.1 ||
        ref.current.position.z > BL - 0.1 ||
        ref.current.position.z < -BL + 0.1
      ) {
        ref.current.position.x = Math.max(
          Math.min(ref.current.position.x, BL),
          -BL
        );
        ref.current.position.z = Math.max(
          Math.min(ref.current.position.z, BL),
          -BL
        );
        airVelY.current = LAUNCH_UP_VEL;
        const totalLen = 2 * BL;
        const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen);
        const target = new THREE.Vector3()
          .copy(ref.current.position)
          .addScaledVector(aimDirRef.current, desired);
        const margin = 1.0;
        target.x = Math.max(Math.min(target.x, BL - margin), -BL + margin);
        target.z = Math.max(Math.min(target.z, BL - margin), -BL + margin);
        const disp = new THREE.Vector3().subVectors(
          target,
          ref.current.position
        );
        const dispLen = Math.max(0.001, Math.hypot(disp.x, disp.z));
        airFwdDir.current.set(disp.x / dispLen, 0, disp.z / dispLen);
        const tFlight = (2 * LAUNCH_UP_VEL) / GRAVITY;
        airFwdVel.current = dispLen / tFlight;
        slamArmed.current = true;
        launchCooldown.current = 1.0;
        boundaryJumpActive.current = true;
        onBoundaryJumpChange && onBoundaryJumpChange(true);
      }
    }

    // Airborne physics
    if (airVelY.current !== 0 || ref.current.position.y > 0.5) {
      ref.current.position.y += airVelY.current * dt;
      airVelY.current -= GRAVITY * dt;
      if (airFwdVel.current > 0) {
        ref.current.position.x += airFwdDir.current.x * airFwdVel.current * dt;
        ref.current.position.z += airFwdDir.current.z * airFwdVel.current * dt;
      }
      if (ref.current.position.y <= 0.5) {
        ref.current.position.y = 0.5;
        airVelY.current = 0;
        airFwdVel.current = 0;
        if (slamArmed.current) {
          slamArmed.current = false;
          onSlam &&
            onSlam({
              pos: [ref.current.position.x, 0.5, ref.current.position.z],
              radius: 9,
              power: 30,
            });
        }
        onLanding &&
          onLanding({ x: ref.current.position.x, z: ref.current.position.z });
        if (boundaryJumpActive.current) {
          boundaryJumpActive.current = false;
          onBoundaryJumpChange && onBoundaryJumpChange(false);
        }
      }
    }

    // Remove portal-applied slow debuff: portals no longer slow the player

    // Collide with launched bouncers to apply slow (blocked while invulnerable)
    if (
      !invulnActive &&
      bouncerHitCooldown.current <= 0 &&
      bouncers &&
      bouncers.length
    ) {
      const px = ref.current.position.x;
      const pz = ref.current.position.z;
      const R = 1.25;
      for (let i = 0; i < bouncers.length; i++) {
        const b = bouncers[i];
        const dx = px - b.pos[0];
        const dz = pz - b.pos[2];
        if (dx * dx + dz * dz <= R * R) {
          debuffTimer.current = SPEED_DEBUFF_DURATION_MS / 1000;
          bouncerHitCooldown.current = 0.9;
          onDebuff && onDebuff();
          break;
        }
      }
    }

    // Collide with speed boosts
    if (boostHitCooldown.current <= 0 && speedBoosts && speedBoosts.length) {
      const px = ref.current.position.x;
      const pz = ref.current.position.z;
      const R = 2.4;
      for (let i = 0; i < speedBoosts.length; i++) {
        const sb = speedBoosts[i];
        const dx = px - sb.pos[0];
        const dz = pz - sb.pos[2];
        if (dx * dx + dz * dz <= R * R) {
          boostTimer.current = SPEED_BUFF_DURATION_MS / 1000;
          boostMulRef.current = 1.1;
          boostHitCooldown.current = 1.0;
          onBoost && onBoost();
          break;
        }
      }
    }

    // Clamp & sync position
    ref.current.position.x = Math.max(
      Math.min(ref.current.position.x, BL),
      -BL
    );
    ref.current.position.z = Math.max(
      Math.min(ref.current.position.z, BL),
      -BL
    );
    setPositionRef && setPositionRef(ref.current.position);

    // Drive Dr Dokta animation state from current gameplay state
    attackTimerRef.current = Math.max(0, attackTimerRef.current - dt);
    const airborne = ref.current.position.y > 0.55;
    let nextAnim = "idle";
    if (airborne) {
      nextAnim = boundaryJumpActive.current ? "jumpWall" : "jump";
    } else {
      const mvLen = Math.hypot(mx, mz);
      if (attackTimerRef.current > 0 || dashing.current) {
        nextAnim = dashing.current ? "attackCharge" : "attackLight";
      } else if (mvLen > 0.1) {
        // Compare movement to aim direction to decide forward/back/strafe
        const fwd = new THREE.Vector3(
          aimDirRef.current.x,
          0,
          aimDirRef.current.z
        ).normalize();
        const move = new THREE.Vector3(mx, 0, mz).normalize();
        const dot = fwd.dot(move);
        const crossY = fwd.clone().cross(move).y;
        if (dot > 0.6) nextAnim = "runForward";
        else if (dot < -0.6) nextAnim = "runBackward";
        else nextAnim = crossY > 0 ? "strafeLeft" : "strafeRight";
      } else {
        nextAnim = "idle";
      }
    }
    if (nextAnim !== doktaActionRef.current) {
      doktaActionRef.current = nextAnim;
      setDoktaAction(nextAnim);
    }

    // Update FX modes precedence: Shield (if timer) > Atom (power 90+) > Push (shape runner active) > Wave
    // Countdown timers
    shieldStackTimer.current = Math.max(0, shieldStackTimer.current - dt);
    fxEventTimer.current = Math.max(0, fxEventTimer.current - dt);
    const pushActive = !!(autoFollow && autoFollow.active);
    if (shieldStackTimer.current > 0) {
      if (fxMode !== "shield" || fxShieldShape !== "circle") {
        setFxMode("shield");
        setFxShieldShape("circle");
      }
    } else if (powerActive && powerAmount >= 90) {
      if (fxMode !== "atom") setFxMode("atom");
    } else if (pushActive) {
      if (fxMode !== "push") setFxMode("push");
    } else {
      if (fxMode !== "wave") setFxMode("wave");
    }

    // Indicators
    const charging =
      (isKeyJumpDown.current || isRmbDown.current) &&
      ref.current.position.y <= 0.5;
    if (charging) {
      if (chargeRingRef.current) {
        const t = performance.now() * 0.003;
        const s = 0.8 + 0.15 * Math.sin(t);
        chargeRingRef.current.scale.set(s, s, s);
        chargeMat.color.set(0x99ffff);
        chargeMat.opacity = 0.75;
      }
      if (landingRingRef.current) {
        const totalLen = 2 * BL;
        const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen);
        const target = new THREE.Vector3()
          .copy(ref.current.position)
          .addScaledVector(aimDirRef.current, desired);
        const margin = 1.0;
        target.x = Math.max(Math.min(target.x, BL - margin), -BL + margin);
        target.z = Math.max(Math.min(target.z, BL - margin), -BL + margin);
        const offX = target.x - ref.current.position.x;
        const offZ = target.z - ref.current.position.z;
        landingRingRef.current.position.set(offX, 0.06, offZ);
        landingRingRef.current.scale.set(1, 1, 1);
      }
    } else {
      if (chargeRingRef.current)
        chargeRingRef.current.scale.set(0.001, 0.001, 0.001);
      if (landingRingRef.current)
        landingRingRef.current.scale.set(0.001, 0.001, 0.001);
    }

    // ===== Health Regeneration System =====
    // Countdown regen delay (e.g., 4s after last damage)
    regenDelayRef.current = Math.max(0, regenDelayRef.current - dt);
    if (
      regenDelayRef.current <= 0 &&
      healthRef.current < maxHealthRef.current
    ) {
      const gain = baseRegenRateRef.current * regenMultiplierRef.current * dt;
      healthRef.current = Math.min(
        maxHealthRef.current,
        healthRef.current + gain
      );
    }
  });

  // Dash trigger
  useEffect(() => {
    if (!ref.current) return;
    // Prefer dashing in movement direction when available; otherwise dash backward relative to aim
    const moveDirVec = getMoveDir();
    let dashDir;
    if (moveDirVec) {
      dashDir = moveDirVec.clone().normalize();
    } else {
      const dir = aimDirRef.current.clone();
      if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
      dashDir = dir.normalize().multiplyScalar(-1);
    }
    const distance = 0.4 * (boundaryLimit ?? BOUNDARY_LIMIT);
    const speed = distance / dashDuration;
    dashVel.current.set(dashDir.x * speed, 0, dashDir.z * speed);
    dashing.current = true;
    dashTime.current = 0;
    // Choose dash animation based on movement direction (left/right/forward). Reuse same anim file for now.
    let anim = "dashForward";
    if (moveDirVec) {
      const mx = moveDirVec.x;
      const mz = moveDirVec.z;
      if (Math.abs(mx) > Math.abs(mz)) {
        anim = mx > 0 ? "dashRight" : "dashLeft";
      } else {
        anim = mz < 0 ? "dashForward" : "dashForward";
      }
    } else {
      anim = "dashForward";
    }
    doktaActionRef.current = anim;
    setDoktaAction(anim);
    onDashStart &&
      onDashStart({
        dir: [dashDir.x, dashDir.z],
        distance,
        durationMs: dashDuration * 1000,
      });
  }, [dashTriggerToken]);

  return (
    <group ref={ref} position={position}>
      {/* Hero visual selection:
          - Dr Dokta: full FBX per-action animation controller (HeroAnimTester)
          - Other heroes with factory mode: procedural HeroFromSpec (with live movement/aim controller)
          - Named static hero variants (e.g., Sr Sesta) or fallback block */}
      {/dokta/i.test(heroName || "") ? (
        <group
          position={[0, 0, 0]}
          rotation={[0, Math.PI, 0]}
          scale={[heroVisualScale, heroVisualScale, heroVisualScale]}
        >
          <HeroAnimTester
            anims={liteSwordShieldMap}
            scale={0.01}
            debug={false}
            showDebugPanel={false}
            onlyCurrentMount={true}
            fade={0.2}
            easeTransitions={true}
            externalAction={doktaAction}
          />
        </group>
      ) : heroRenderMode === "factory" ? (
        <group scale={[heroVisualScale, heroVisualScale, heroVisualScale]}>
          <HeroFromSpec
            spec={{
              ...defaultHeroSpec(
                (heroName || "hero").toLowerCase().replace(/[^a-z0-9]+/g, "_")
              ),
              primaryColor:
                typeof primaryColor === "number"
                  ? "#" + primaryColor.toString(16).padStart(6, "0")
                  : primaryColor,
              secondaryColor:
                typeof primaryColor === "number"
                  ? "#" + primaryColor.toString(16).padStart(6, "0")
                  : primaryColor,
              accentColor:
                typeof primaryColor === "number"
                  ? "#" + primaryColor.toString(16).padStart(6, "0")
                  : primaryColor,
              quality: heroQuality,
              fxRing: heroQuality !== "low",
            }}
            controller={heroCtrlRef.current}
          />
        </group>
      ) : heroName === "Sr Sesta" ? (
        <group scale={[heroVisualScale, heroVisualScale, heroVisualScale]}>
          <HeroSesta />
        </group>
      ) : (
        <mesh castShadow scale={heroVisualScale}>
          <boxGeometry args={[1.8, 0.8, 1.2]} />
          <meshStandardMaterial
            color={primaryColor}
            metalness={0.2}
            roughness={0.6}
          />
        </mesh>
      )}
      {/* FX Orbs around hero (scaled with hero size) */}
      {/* FX Orbs moved out of player local space; now rendered at global player position in App */}
      {/* Aim ray */}
      <mesh ref={rayRef} position={[0, 0.5, -AIM_RAY_LENGTH / 2]}>
        <boxGeometry args={[1, 0.06, AIM_RAY_LENGTH]} />
        <meshBasicMaterial
          color={highContrast ? 0xffffff : 0x99ffcc}
          transparent
          opacity={highContrast ? 0.9 : 0.6}
        />
      </mesh>
      {/* Invulnerability diamond indicator */}
      <mesh ref={diamondRef} position={[0, 1.6, 0]} visible={false} renderOrder={999}>
        <octahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial
          color={0xffdd44}
          emissive={0xffee88}
          emissiveIntensity={1.2}
          metalness={0.6}
          roughness={0.2}
          transparent={true}
        />
      </mesh>
      {/* Jump charge ring */}
      <mesh
        ref={chargeRingRef}
        position={[0, 0.06, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={chargeMat}
      >
        <primitive object={chargeGeom} attach="geometry" />
      </mesh>
      {/* Landing marker ring */}
      <mesh
        ref={landingRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        material={landingMat}
      >
        <primitive object={landingGeom} attach="geometry" />
      </mesh>
      {/* Debug: simple health bar above player (optional, hidden by default) */}
      {false && (
        <group position={[0, 1.4, 0]}>
          <mesh position={[0, 0, 0]} scale={[1.6, 0.12, 0.12]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={0x222222} />
          </mesh>
          <mesh
            position={[
              -1.6 / 2 + (1.6 * (healthRef.current / maxHealthRef.current)) / 2,
              0,
              0,
            ]}
            scale={[
              1.6 * (healthRef.current / maxHealthRef.current),
              0.08,
              0.08,
            ]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={0x22c55e} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default React.memo(Player)

// Simple OrbitingFX removed; replaced with FXOrbs

import { assetUrl } from "../utils/assetPaths";

function HeroDokta() {
  // Prefer animated FBX if available; otherwise use static GLB
  let fbx = null,
    gltf = null
  const mixerRef = useRef(null)
  try {
    fbx = useFBX(assetUrl("models/dr_dokta_anim_poses/Standing Run Back.fbx"));
  } catch {}
  try {
    gltf = useGLTF(assetUrl("models/dr_dokta_glp_pbr/base_basic_pbr.glb"));
  } catch {}
  const obj = fbx?.clone
    ? fbx.clone()
    : gltf?.scene
    ? gltf.scene.clone()
    : null;
  const anim = fbx?.animations && fbx.animations[0];
  // Scale and face forward (-Z)
  if (obj) {
    obj.scale.setScalar(0.01);
    obj.rotation.y = Math.PI;
  }
  useEffect(() => {
    // Create and store mixer in a ref so the frame loop can update it
    if (!fbx || !anim) return
    try {
      const mixerLocal = new THREE.AnimationMixer(fbx)
      const action = mixerLocal.clipAction(anim)
      action.play()
      mixerRef.current = mixerLocal
    } catch (e) {
      mixerRef.current = null
    }
    return () => {
      try { mixerRef.current?.stopAllAction?.() } catch {}
      mixerRef.current = null
    }
  }, [fbx, anim])
  useFrame((_, dt) => {
    try { if (mixerRef.current) mixerRef.current.update(dt) } catch {}
  })
  return obj ? (
    <primitive object={obj} />
  ) : (
    <mesh>
      <capsuleGeometry args={[0.5, 1.2, 4, 12]} />
      <meshStandardMaterial color={0x66ccff} />
    </mesh>
  );
}

function HeroSesta() {
  let gltf = null;
  try {
    gltf = useGLTF(assetUrl("models/sesta_pose_textured_mesh.glb"));
  } catch {}
  const obj = gltf?.scene ? gltf.scene.clone() : null;
  if (obj) {
    obj.scale.setScalar(0.01);
    obj.rotation.y = Math.PI;
  }
  return obj ? (
    <primitive object={obj} />
  ) : (
    <mesh>
      <capsuleGeometry args={[0.5, 1.2, 4, 12]} />
      <meshStandardMaterial color={0xff99cc} />
    </mesh>
  );
}
