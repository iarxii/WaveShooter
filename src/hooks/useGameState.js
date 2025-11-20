import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { PLAYER_SPEED } from "../constants.js";

export function useGameState() {
    const [wave, setWave] = useState(0);
    const [score, setScore] = useState(0);
    // Track score in a ref for baseline calculations without re-creating callbacks
    const scoreRef = useRef(0);
    useEffect(() => {
        scoreRef.current = score;
    }, [score]);
    const [bestScore, setBestScore] = useState(0);
    const [bestWave, setBestWave] = useState(0);
    const [health, setHealth] = useState(100);
    const [armor, setArmor] = useState(100);
    const healthRef = useRef(health);
    useEffect(() => {
        healthRef.current = health;
    }, [health]);
    const armorRef = useRef(armor);
    useEffect(() => {
        armorRef.current = armor;
    }, [armor]);
    const [lives, setLives] = useState(3);
    const [isGameOver, setIsGameOver] = useState(false);
    const [respawnCountdown, setRespawnCountdown] = useState(0);
    const [isPaused, setIsPaused] = useState(true);
    const [isStarted, setIsStarted] = useState(false);
    const isStartedRef = useRef(false);
    const [boundaryJumpActive, setBoundaryJumpActive] = useState(false);

    const [enemies, setEnemies] = useState([]); // {id, pos, isBoss, formationTarget, health}
    const [pickups, setPickups] = useState([]);
    const [placedHazards, setPlacedHazards] = useState([]); // Player-placed special hazards
    const [isPlacingHazard, setIsPlacingHazard] = useState(false);
    const [selectedItemSlot, setSelectedItemSlot] = useState(0);
    const [selectedHazardType, setSelectedHazardType] = useState(null);

    const [bullets, setBullets] = useState([]);

    // Feeds: pickups (top-right) and boss spawns (left-bottom)
    const [pickupFeed, setPickupFeed] = useState([]); // {id, text, color}
    const [bossFeed, setBossFeed] = useState([]); // {id, text, color}
    const pushBossFeedRef = useRef(null);
    const [spawnPressureMul, setSpawnPressureMul] = useState(() => {
        const v = parseFloat(localStorage.getItem("spawnPressureMul") || "");
        return Number.isFinite(v) && v > 0 ? v : 0.8;
    });
    const spawnPressureMulRef = useRef(0.9);
    const [autoFire, setAutoFire] = useState(true);
    const [pickupPopups, setPickupPopups] = useState([]);
    const [portals, setPortals] = useState([]);
    const [speedBoosts, setSpeedBoosts] = useState([]);
    const [aoes, setAoes] = useState([]); // ground slam visuals
    const [bombs, setBombs] = useState([]); // active bombs
    const [confetti, setConfetti] = useState([]);
    const [hazards, setHazards] = useState([]); // active hazard zones (toxin/corrosion)
    const [shimmers, setShimmers] = useState([]); // one-shot shimmer cues (e.g., debuff cancel)
    // Bouncers: ground telegraph that launches an object upward after delay
    const [bouncerTelegraphs, setBouncerTelegraphs] = useState([]);
    const [bouncers, setBouncers] = useState([]);

    const [playerResetToken, setPlayerResetToken] = useState(0);
    const [playerBaseSpeed, setPlayerBaseSpeed] = useState(PLAYER_SPEED);
    const [enemySpeedScale, setEnemySpeedScale] = useState(1);

    const [hpEvents, setHpEvents] = useState([]); // floating HP change indicators
    const [armorEvents, setArmorEvents] = useState([]);
    const [powerEffect, setPowerEffect] = useState({ active: false, amount: 0 });
    const powerRemainingRef = useRef(0); // ms remaining for effect
    // Player label notifications (above player)
    const [playerLabelEvents, setPlayerLabelEvents] = useState([]); // { id, text, start }

    const pushPlayerLabel = useCallback((text, lifetimeMs = 2200) => {
        // Map known label keywords to emojis for better status awareness
        const t = (text || "").toString();
        const U = t.toUpperCase();
        let emoji = "";
        if (U.includes("INVULNERABLE") || U.includes("INVULN")) emoji = "🟨 ";
        else if (U.includes("ARMOUR")) emoji = "🛡️ ";
        else if (U.includes("SLOWED")) emoji = "🐌 ";
        else if (U.includes("CORROSION")) emoji = "🔥 ";
        else if (U.includes("LASER")) emoji = "🔴 ";
        else if (U.includes("BOMB")) emoji = "💣 ";
        else if (U.includes("PULSE")) emoji = "⭕ ";
        else if (U.includes("BOOST") || U.includes("SPEED")) emoji = "⚡ ";
        else if (U.includes("1UP") || U.includes("LIFE")) emoji = "💖 ";
        else if (U.includes("HP") || U.includes("HEALTH")) emoji = "🟢 ";
        else if (U.includes("AP")) {
            // Armour/AP: positive AP gets blue square, negative AP (leading '-') gets swirl
            const trimmed = t.trim();
            if (trimmed.startsWith("-")) emoji = "🌀 ";
            else emoji = "🟦 ";
        } else if (U.includes("POWER")) {
            // POWER may include a numeric amount; treat high-power (>=90) as special
            const m = t.match(/(\d+)/);
            const num = m ? parseInt(m[1], 10) : 0;
            emoji = num >= 90 ? "💎 " : "🔷 ";
        }
        const id = Date.now() + Math.random();
        const evt = { id, text: `${emoji}${text}`, start: performance.now() };
        setPlayerLabelEvents((p) => [...p, evt]);
        // auto-remove after lifetime
        setTimeout(() => {
            setPlayerLabelEvents((p) => p.filter((x) => x.id !== id));
        }, lifetimeMs);
        return id;
    }, []);

    // New pickup effects: lasers, shield bubble, pulse wave
    const [lasersEffect, setLasersEffect] = useState({ active: false });
    const lasersRemainingRef = useRef(0);
    const lasersActiveRef = useRef(false);
    const lasersStartRef = useRef(0);
    const [healthEffect, setHealthEffect] = useState({ active: false });
    // Last known aim direction for laser beam visuals
    const lastLaserAimRef = useRef(new THREE.Vector3(0, 0, -1));
    const lerpedLaserAimRef = useRef(new THREE.Vector3(0, 0, -1));
    useEffect(() => {
        lasersActiveRef.current = !!lasersEffect.active;
        if (lasersEffect.active) {
            lerpedLaserAimRef.current.copy(lastLaserAimRef.current);
        }
    }, [lasersEffect.active]);

    // Active laser beam state (single beam from player while firing)
    const [laserBeam, setLaserBeam] = useState(null); // { pos: [x,y,z], dir: [x,y,z], id }
    const laserExpireTimerRef = useRef(null);

    // Apply continuous damage from laser to an enemy (fractional accumulation like bullets)
    const applyLaserDamage = useCallback((enemyId, dmgUnits, onEnemyDie) => {
        // dmgUnits: fractional damage units to add (can be >1 per call)
        setEnemies((prev) => {
            let diedId = null;
            const updated = prev.map((e) => {
                if (e.id !== enemyId) return e;
                // Respect enzyme shield / resilience similar to bullets
                const ge =
                    (window.gameEnemies || []).find((g) => g.id === enemyId) || {};
                if (e.isRoster && ge.enzymeShieldActive) return e;
                const now = performance.now();
                if (
                    e.isRoster &&
                    e.rosterName &&
                    e.rosterName.includes("A. baumannii XDR")
                ) {
                    if (ge.resilienceInvulnUntil && now < ge.resilienceInvulnUntil)
                        return e;
                }

                // Laser scales similarly to bullets but is a stronger source
                let scale = e.bulletDamageScale || 1;
                const add = dmgUnits * scale;
                const store = (e._dmgStore || 0) + add;
                let acc = store;
                let takeHp = 0;
                while (acc >= 1 && e.health - takeHp > 0) {
                    acc -= 1;
                    takeHp += 1;
                }
                const newHealth = (e.health ?? 1) - takeHp;
                const newStore = acc;
                const out = { ...e, health: newHealth, _dmgStore: newStore };
                if (takeHp > 0) {
                    // some roster traits react to damage
                    if (
                        e.isRoster &&
                        e.rosterName &&
                        e.rosterName.includes("E. coli CRE")
                    ) {
                        const geLocal = (window.gameEnemies || []).find(
                            (g) => g.id === enemyId
                        );
                        if (geLocal) geLocal.mutSpeedUntil = performance.now() + 4000;
                    }
                    if (
                        e.isRoster &&
                        e.rosterName &&
                        e.rosterName.includes("A. baumannii XDR")
                    ) {
                        const geLocal = (window.gameEnemies || []).find(
                            (g) => g.id === enemyId
                        );
                        if (geLocal)
                            geLocal.resilienceInvulnUntil = performance.now() + 1500;
                    }
                }
                if (newHealth <= 0) {
                    diedId = e.id;
                }
                return out;
            });
            // If someone died, run onEnemyDie side-effects (call later-safe)
            if (diedId != null) {
                try {
                    if (typeof onEnemyDie === "function") {
                        // call in next tick to avoid ordering issues
                        setTimeout(() => {
                            try {
                                onEnemyDie(diedId, false);
                            } catch { }
                        }, 0);
                    }
                } catch { }
                // filter them out from array (onEnemyDie will update state further too)
                return updated.filter((x) => x.id !== diedId);
            }
            return updated;
        });
    }, []);

    const [shieldEffect, setShieldEffect] = useState({ active: false });
    const shieldRemainingRef = useRef(0);
    const shieldActiveRef = useRef(false);
    useEffect(() => {
        shieldActiveRef.current = !!shieldEffect.active;
    }, [shieldEffect.active]);

    const [pulseWaveEffect, setPulseWaveEffect] = useState({ active: false });
    const pulseWaveActiveRef = useRef(false);
    useEffect(() => {
        pulseWaveActiveRef.current = !!pulseWaveEffect.active;
    }, [pulseWaveEffect.active]);
    // Token for life-pickup-driven shield stack FX
    const [lifeShieldToken, setLifeShieldToken] = useState(0);
    // Per-level score baseline to compute penalties on continue
    const levelScoreBaselineRef = useRef(0);
    const [invulnEffect, setInvulnEffect] = useState({ active: false });
    const invulnRemainingRef = useRef(0);
    const invulnActiveRef = useRef(false);
    useEffect(() => {
        invulnActiveRef.current = invulnEffect.active;
    }, [invulnEffect.active]);
    // Pickup-driven invulnerability / movement modifiers (derived state)
    const [pickupInvulnState, setPickupInvulnState] = useState({
        invulnerable: false,
        movementMul: 1,
        movementLocked: false,
        source: null,
    });
    const pickupInvulnRef = useRef({
        invulnerable: false,
        movementMul: 1,
        movementLocked: false,
        source: null,
    });
    useEffect(() => {
        pickupInvulnRef.current = pickupInvulnState;
    }, [pickupInvulnState]);

    // Track timeouts for clearing staged phases (so we can cancel if a new pickup arrives)
    const pickupInvulnTimeoutsRef = useRef([]);
    const clearPickupInvulnTimeouts = useCallback(() => {
        (pickupInvulnTimeoutsRef.current || []).forEach((id) => clearTimeout(id));
        pickupInvulnTimeoutsRef.current = [];
    }, []);
    const applyPickupInvulnState = useCallback(
        (s) => {
            pickupInvulnRef.current = s;
            setPickupInvulnState(s);
            // Ensure global invuln marker includes pickup-driven invuln for damage checks
            invulnActiveRef.current = !!s.invulnerable || !!invulnEffect.active;
        },
        [invulnEffect.active]
    );
    // Test flag to force invulnerability (debug)
    const [invulnTest, setInvulnTest] = useState(() => {
        try {
            return localStorage.getItem("invulnTest") === "1";
        } catch {
            return false;
        }
    });
    const invulnTestRef = useRef(false);
    useEffect(() => {
        invulnTestRef.current = !!invulnTest;
        try {
            localStorage.setItem("invulnTest", invulnTest ? "1" : "0");
        } catch { }
    }, [invulnTest]);
    // Boundary jump invulnerability (only during edge-launched jumps)
    const boundaryJumpActiveRef = useRef(false);
    // Dash invulnerability window
    const dashInvulnUntilRef = useRef(0);
    // 2s protection after landing from auto-arc at the end of invuln
    const expectingPostInvulnLandingRef = useRef(false);
    const postInvulnShieldUntilRef = useRef(0);
    const nowMs = () => performance.now();

    const isPlayerInvulnerable = useCallback(() => {
        const now = nowMs();
        return (
            invulnTestRef.current ||
            invulnActiveRef.current ||
            boundaryJumpActiveRef.current ||
            now < postInvulnShieldUntilRef.current ||
            now < dashInvulnUntilRef.current
        );
    }, []);
    // Bomb kit effect
    const [bombEffect, setBombEffect] = useState({ active: false });
    const bombEffectTimeRef = useRef(0);
    const bombSpawnTimerRef = useRef(0);
    // App-visible buff/debuff effects for UI visualization
    const [boostEffect, setBoostEffect] = useState({ active: false });
    const boostRemainingRef = useRef(0);
    const [debuffEffect, setDebuffEffect] = useState({ active: false });
    const debuffRemainingRef = useRef(0);
    const [corrosionEffect, setCorrosionEffect] = useState({ active: false });
    const corrosionRemainingRef = useRef(0);
    const corrosionTickTimerRef = useRef(0);

    // Push player label notifications when effects activate
    useEffect(() => {
        if (boostEffect.active) pushPlayerLabel("BOOST!");
    }, [boostEffect.active, pushPlayerLabel]);
    useEffect(() => {
        if (debuffEffect.active) pushPlayerLabel("SLOWED");
    }, [debuffEffect.active, pushPlayerLabel]);
    useEffect(() => {
        if (corrosionEffect.active) pushPlayerLabel("CORROSION");
    }, [corrosionEffect.active, pushPlayerLabel]);
    useEffect(() => {
        if (invulnEffect.active) pushPlayerLabel("INVULNERABLE!");
    }, [invulnEffect.active, pushPlayerLabel]);

    return {
        wave, setWave,
        score, setScore, scoreRef,
        bestScore, setBestScore,
        bestWave, setBestWave,
        health, setHealth, healthRef,
        armor, setArmor, armorRef,
        lives, setLives,
        isGameOver, setIsGameOver,
        respawnCountdown, setRespawnCountdown,
        isPaused, setIsPaused,
        isStarted, setIsStarted, isStartedRef,
        boundaryJumpActive, setBoundaryJumpActive,
        enemies, setEnemies,
        pickups, setPickups,
        placedHazards, setPlacedHazards,
        isPlacingHazard, setIsPlacingHazard,
        selectedItemSlot, setSelectedItemSlot,
        selectedHazardType, setSelectedHazardType,
        bullets, setBullets,
        pickupFeed, setPickupFeed,
        bossFeed, setBossFeed, pushBossFeedRef,
        spawnPressureMul, setSpawnPressureMul, spawnPressureMulRef,
        autoFire, setAutoFire,
        pickupPopups, setPickupPopups,
        portals, setPortals,
        speedBoosts, setSpeedBoosts,
        aoes, setAoes,
        bombs, setBombs,
        confetti, setConfetti,
        hazards, setHazards,
        shimmers, setShimmers,
        bouncerTelegraphs, setBouncerTelegraphs,
        bouncers, setBouncers,
        playerResetToken, setPlayerResetToken,
        playerBaseSpeed, setPlayerBaseSpeed,
        enemySpeedScale, setEnemySpeedScale,
        hpEvents, setHpEvents,
        armorEvents, setArmorEvents,
        powerEffect, setPowerEffect, powerRemainingRef,
        playerLabelEvents, setPlayerLabelEvents, pushPlayerLabel,
        lasersEffect, setLasersEffect, lasersRemainingRef, lasersActiveRef, lasersStartRef,
        healthEffect, setHealthEffect,
        lastLaserAimRef, lerpedLaserAimRef,
        laserBeam, setLaserBeam, laserExpireTimerRef,
        applyLaserDamage,
        shieldEffect, setShieldEffect, shieldRemainingRef, shieldActiveRef,
        pulseWaveEffect, setPulseWaveEffect, pulseWaveActiveRef,
        lifeShieldToken, setLifeShieldToken,
        levelScoreBaselineRef,
        invulnEffect, setInvulnEffect, invulnRemainingRef, invulnActiveRef,
        pickupInvulnState, setPickupInvulnState, pickupInvulnRef,
        pickupInvulnTimeoutsRef, clearPickupInvulnTimeouts, applyPickupInvulnState,
        invulnTest, setInvulnTest, invulnTestRef,
        boundaryJumpActiveRef, dashInvulnUntilRef, expectingPostInvulnLandingRef, postInvulnShieldUntilRef,
        nowMs, isPlayerInvulnerable,
        bombEffect, setBombEffect, bombEffectTimeRef, bombSpawnTimerRef,
        boostEffect, setBoostEffect, boostRemainingRef,
        debuffEffect, setDebuffEffect, debuffRemainingRef,
        corrosionEffect, setCorrosionEffect, corrosionRemainingRef, corrosionTickTimerRef
    };
}
