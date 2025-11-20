import { useState, useEffect, useRef, useCallback } from "react";
import {
    BULLET_SPEED,
    FIRE_RATE,
    PLAYER_SPEED,
} from "../constants.js";

export function useGameSettings({ selectedHero }) {
    // Global visual asset scale & camera view settings (persisted)
    const [assetScale, setAssetScale] = useState(() => {
        try {
            const raw = localStorage.getItem("assetScale") ?? "1.45";
            const val = parseFloat(raw);
            return Number.isFinite(val) ? val : 1.45;
        } catch {
            return 1.45;
        }
    });
    const [topDownZoom, setTopDownZoom] = useState(() => {
        try {
            const raw = localStorage.getItem("topDownZoom") ?? "0.85";
            const val = parseFloat(raw);
            return Number.isFinite(val) ? val : 0.85;
        } catch {
            return 0.85;
        }
    });
    const [staticCamMargin, setStaticCamMargin] = useState(() => {
        try {
            const raw = localStorage.getItem("staticCamMargin") ?? "0.95";
            const val = parseFloat(raw);
            return Number.isFinite(val) ? val : 0.95;
        } catch {
            return 0.95;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem("assetScale", String(assetScale));
        } catch { }
    }, [assetScale]);
    useEffect(() => {
        try {
            localStorage.setItem("topDownZoom", String(topDownZoom));
        } catch { }
    }, [topDownZoom]);
    useEffect(() => {
        try {
            localStorage.setItem("staticCamMargin", String(staticCamMargin));
        } catch { }
    }, [staticCamMargin]);
    const [showDebugUI, setShowDebugUI] = useState(() => {
        try {
            return localStorage.getItem("showDebugUI") !== "0";
        } catch {
            return true;
        }
    });
    // Perf overlay toggle (F9) — global scope
    const [showPerf, setShowPerf] = useState(false);
    useEffect(() => {
        const onKey = (e) => {
            if (e.code === "F9") {
                setShowPerf((v) => !v);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Debug: Disable enemy spawns (persists)
    const [disableEnemySpawns, setDisableEnemySpawns] = useState(() => {
        try {
            const v = localStorage.getItem("disableEnemySpawns");
            return v === "1" || v === "true";
        } catch {
            return false;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem(
                "disableEnemySpawns",
                disableEnemySpawns ? "1" : "0"
            );
        } catch { }
    }, [disableEnemySpawns]);
    // Debug: Spawn only hazards (allow hazards but prevent enemy spawns)
    const [spawnOnlyHazards, setSpawnOnlyHazards] = useState(() => {
        try {
            const v = localStorage.getItem("spawnOnlyHazards");
            return v === "1" || v === "true";
        } catch {
            return false;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem("spawnOnlyHazards", spawnOnlyHazards ? "1" : "0");
        } catch { }
    }, [spawnOnlyHazards]);
    const spawnOnlyHazardsRef = useRef(false);
    useEffect(() => {
        spawnOnlyHazardsRef.current = spawnOnlyHazards;
    }, [spawnOnlyHazards]);
    // Ref form to use inside timers/callbacks without re-subscribing
    const disableEnemySpawnsRef = useRef(false);
    useEffect(() => {
        disableEnemySpawnsRef.current = disableEnemySpawns;
    }, [disableEnemySpawns]);
    // Toggle to show/hide accessibility controls within the left debug panel
    const [showAccessibilityControls, setShowAccessibilityControls] = useState(
        () => {
            const v = localStorage.getItem("showAccessibilityControls");
            return v === null ? true : v !== "false";
        }
    );
    useEffect(() => {
        try {
            localStorage.setItem(
                "showAccessibilityControls",
                String(showAccessibilityControls)
            );
        } catch { }
    }, [showAccessibilityControls]);
    // Debug: Show enemy names above meshes
    const [showEnemyNames, setShowEnemyNames] = useState(() => {
        try {
            const v = localStorage.getItem("showEnemyNames");
            return !(v === "0" || v === "false");
        } catch {
            return true;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem("showEnemyNames", showEnemyNames ? "1" : "0");
        } catch { }
    }, [showEnemyNames]);
    // Debug: Show enemy thumbnails in labels
    const [showThumbnails, setShowThumbnails] = useState(() => {
        try {
            const v = localStorage.getItem("showThumbnails");
            return !(v === "0" || v === "false");
        } catch {
            return true;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem("showThumbnails", showThumbnails ? "1" : "0");
        } catch { }
    }, [showThumbnails]);
    // Enemy visuals render mode: 'factory' (default) or 'simple'
    const [enemyRenderMode, setEnemyRenderMode] = useState(() => {
        try {
            return localStorage.getItem("enemyRenderMode") || "factory";
        } catch { }
        return "factory";
    });
    const enemyRenderModeRef = useRef(enemyRenderMode);
    useEffect(() => {
        enemyRenderModeRef.current = enemyRenderMode;
        try {
            localStorage.setItem("enemyRenderMode", enemyRenderMode);
        } catch { }
    }, [enemyRenderMode]);

    // Hero visuals: Factory vs Model and quality
    const [heroRenderMode, setHeroRenderMode] = useState(() => {
        try {
            return localStorage.getItem("heroRenderMode") || "model";
        } catch { }
        return "model";
    });
    const [heroQuality, setHeroQuality] = useState(() => {
        try {
            return localStorage.getItem("heroQuality") || "medium";
        } catch { }
        return "medium";
    });
    useEffect(() => {
        try {
            localStorage.setItem("heroRenderMode", heroRenderMode);
        } catch { }
    }, [heroRenderMode]);
    // Auto-select render mode based on hero: use Factory controller for Dr Dokta, fallback for others
    useEffect(() => {
        // Only override when user hasn't explicitly forced a mode this session
        // Simple heuristic: if selected hero is Dr Dokta, prefer 'factory'; otherwise 'model'
        const isDokta = /dokta/i.test(String(selectedHero || ""));
        const desired = isDokta ? "factory" : "model";
        if (heroRenderMode !== desired) setHeroRenderMode(desired);
    }, [selectedHero]);
    useEffect(() => {
        try {
            localStorage.setItem("heroQuality", heroQuality);
        } catch { }
    }, [heroQuality]);

    // Debug tunables for projectile + FX systems (persisted)
    const [debugBulletSpeed, setDebugBulletSpeed] = useState(() => {
        const v = parseFloat(localStorage.getItem("dbgBulletSpeed"));
        return isFinite(v) ? v : BULLET_SPEED;
    });
    const [debugFireRateMs, setDebugFireRateMs] = useState(() => {
        const v = parseFloat(localStorage.getItem("dbgFireRateMs"));
        return isFinite(v) ? v : FIRE_RATE;
    });
    const [debugFxOrbCount, setDebugFxOrbCount] = useState(() => {
        const v = parseInt(localStorage.getItem("dbgFxOrbCount"), 10);
        return isFinite(v) ? v : 0;
    });
    // FX Orb debug controls (persisted)
    const [debugFxOrbRadius, setDebugFxOrbRadius] = useState(() => {
        const v = parseFloat(localStorage.getItem("dbgFxOrbRadius"));
        // Ring radius
        return isFinite(v) ? v : 1.10;
    });
    const [debugFxOrbSizeMul, setDebugFxOrbSizeMul] = useState(() => {
        const v = parseFloat(localStorage.getItem("dbgFxOrbSizeMul"));
        // Orb size multiplier
        return isFinite(v) ? v : 1.80;
    });
    const [debugFxOrbLerp, setDebugFxOrbLerp] = useState(() => {
        const v = parseFloat(localStorage.getItem("dbgFxOrbLerp"));
        // Follow smooth lerp (95%)
        return isFinite(v) ? v : 0.95;
    });
    // Tentacle animation debug (global window shim for shader uniforms)
    const [tentacleSpeed, setTentacleSpeed] = useState(() => {
        const v = parseFloat(localStorage.getItem("dbgTentacleSpeed"));
        return isFinite(v) ? v : 1.2;
    });
    const [tentacleStrength, setTentacleStrength] = useState(() => {
        const v = parseFloat(localStorage.getItem("dbgTentacleStrength"));
        return isFinite(v) ? v : 1.0;
    });
    const [tentacleAmpX, setTentacleAmpX] = useState(() => {
        const v = parseFloat(localStorage.getItem("dbgTentacleAmpX"));
        return isFinite(v) ? v : 1.0;
    });
    const [tentacleAmpZ, setTentacleAmpZ] = useState(() => {
        const v = parseFloat(localStorage.getItem("dbgTentacleAmpZ"));
        return isFinite(v) ? v : 1.0;
    });
    const [tentacleYWobble, setTentacleYWobble] = useState(() => {
        const v = parseFloat(localStorage.getItem("dbgTentacleYWobble"));
        return isFinite(v) ? v : 0.05;
    });
    const [tentacleBendPow, setTentacleBendPow] = useState(() => {
        const v = parseFloat(localStorage.getItem("dbgTentacleBendPow"));
        return isFinite(v) ? v : 2.0;
    });
    useEffect(() => {
        localStorage.setItem("dbgBulletSpeed", String(debugBulletSpeed));
    }, [debugBulletSpeed]);
    useEffect(() => {
        localStorage.setItem("dbgFireRateMs", String(debugFireRateMs));
    }, [debugFireRateMs]);
    useEffect(() => {
        localStorage.setItem("dbgFxOrbCount", String(debugFxOrbCount));
    }, [debugFxOrbCount]);
    useEffect(() => {
        localStorage.setItem("dbgFxOrbRadius", String(debugFxOrbRadius));
    }, [debugFxOrbRadius]);
    useEffect(() => {
        localStorage.setItem("dbgFxOrbSizeMul", String(debugFxOrbSizeMul));
    }, [debugFxOrbSizeMul]);
    useEffect(() => {
        localStorage.setItem("dbgFxOrbLerp", String(debugFxOrbLerp));
    }, [debugFxOrbLerp]);
    // Persist tentacle debug values
    useEffect(() => {
        localStorage.setItem("dbgTentacleSpeed", String(tentacleSpeed));
    }, [tentacleSpeed]);
    useEffect(() => {
        localStorage.setItem("dbgTentacleStrength", String(tentacleStrength));
    }, [tentacleStrength]);
    useEffect(() => {
        localStorage.setItem("dbgTentacleAmpX", String(tentacleAmpX));
    }, [tentacleAmpX]);
    useEffect(() => {
        localStorage.setItem("dbgTentacleAmpZ", String(tentacleAmpZ));
    }, [tentacleAmpZ]);
    useEffect(() => {
        localStorage.setItem("dbgTentacleYWobble", String(tentacleYWobble));
    }, [tentacleYWobble]);
    useEffect(() => {
        localStorage.setItem("dbgTentacleBendPow", String(tentacleBendPow));
    }, [tentacleBendPow]);

    // Bridge to shader (window.__tentacleFX consumed in Pathogen)
    useEffect(() => {
        if (typeof window !== "undefined") {
            window.__tentacleFX = {
                speed: tentacleSpeed,
                strength: tentacleStrength,
                ampX: tentacleAmpX,
                ampZ: tentacleAmpZ,
                yWobble: tentacleYWobble,
                bendPow: tentacleBendPow,
            };
        }
    }, [
        tentacleSpeed,
        tentacleStrength,
        tentacleAmpX,
        tentacleAmpZ,
        tentacleYWobble,
        tentacleBendPow,
    ]);

    const [controlScheme, setControlScheme] = useState("dpad"); // 'wasd' | 'dpad' (default to D-Buttons)
    const [performanceMode, setPerformanceMode] = useState(true);
    const [highContrast, setHighContrast] = useState(false);
    const [panelPosition, setPanelPosition] = useState({
        x: window.innerWidth - 320 - 10,
        y: 80,
    }); // initial position: top right
    const [waveScorePanelPosition, setWaveScorePanelPosition] = useState({
        x: 10,
        y: 80,
    }); // initial position: top left

    const [playerLabelSize, setPlayerLabelSize] = useState(() => {
        try {
            const v = parseInt(localStorage.getItem("playerLabelSize"), 10);
            return Number.isFinite(v) && v > 0 ? v : 18;
        } catch {
            return 18;
        }
    });
    const [showPlayerLabelPlaceholder, setShowPlayerLabelPlaceholder] = useState(
        () => {
            try {
                return localStorage.getItem("showPlayerLabelPlaceholder") === "1";
            } catch {
                return false;
            }
        }
    );

    useEffect(() => {
        try {
            localStorage.setItem("playerLabelSize", String(playerLabelSize));
        } catch { }
    }, [playerLabelSize]);
    useEffect(() => {
        try {
            localStorage.setItem(
                "showPlayerLabelPlaceholder",
                showPlayerLabelPlaceholder ? "1" : "0"
            );
        } catch { }
    }, [showPlayerLabelPlaceholder]);

    // Dragging state for the player stats panel
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const handlePanelMouseDown = useCallback(
        (e) => {
            isDraggingRef.current = true;
            dragStartRef.current = {
                x: e.clientX - panelPosition.x,
                y: e.clientY - panelPosition.y,
            };
            document.addEventListener("mousemove", handlePanelMouseMove);
            document.addEventListener("mouseup", handlePanelMouseUp);
            e.preventDefault();
        },
        [panelPosition]
    );

    const handlePanelMouseMove = useCallback((e) => {
        if (!isDraggingRef.current) return;
        const newX = e.clientX - dragStartRef.current.x;
        const newY = e.clientY - dragStartRef.current.y;
        // Constrain to viewport
        const constrainedX = Math.max(0, Math.min(window.innerWidth - 320, newX));
        const constrainedY = Math.max(0, Math.min(window.innerHeight - 200, newY));
        setPanelPosition({ x: constrainedX, y: constrainedY });
    }, []);

    const handlePanelMouseUp = useCallback(() => {
        isDraggingRef.current = false;
        document.removeEventListener("mousemove", handlePanelMouseMove);
        document.removeEventListener("mouseup", handlePanelMouseUp);
    }, []);

    // Dragging state for the wave/score panel
    const isWaveScoreDraggingRef = useRef(false);
    const waveScoreDragStartRef = useRef({ x: 0, y: 0 });

    const handleWaveScorePanelMouseDown = useCallback(
        (e) => {
            isWaveScoreDraggingRef.current = true;
            waveScoreDragStartRef.current = {
                x: e.clientX - waveScorePanelPosition.x,
                y: e.clientY - waveScorePanelPosition.y,
            };
            document.addEventListener("mousemove", handleWaveScorePanelMouseMove);
            document.addEventListener("mouseup", handleWaveScorePanelMouseUp);
            e.preventDefault();
        },
        [waveScorePanelPosition]
    );

    const handleWaveScorePanelMouseMove = useCallback((e) => {
        if (!isWaveScoreDraggingRef.current) return;
        const newX = e.clientX - waveScoreDragStartRef.current.x;
        const newY = e.clientY - waveScoreDragStartRef.current.y;
        // Constrain to viewport
        const constrainedX = Math.max(0, Math.min(window.innerWidth - 200, newX));
        const constrainedY = Math.max(0, Math.min(window.innerHeight - 100, newY));
        setWaveScorePanelPosition({ x: constrainedX, y: constrainedY });
    }, []);

    const handleWaveScorePanelMouseUp = useCallback(() => {
        isWaveScoreDraggingRef.current = false;
        document.removeEventListener("mousemove", handleWaveScorePanelMouseMove);
        document.removeEventListener("mouseup", handleWaveScorePanelMouseUp);
    }, []);

    return {
        assetScale, setAssetScale,
        topDownZoom, setTopDownZoom,
        staticCamMargin, setStaticCamMargin,
        showDebugUI, setShowDebugUI,
        showPerf, setShowPerf,
        disableEnemySpawns, setDisableEnemySpawns,
        spawnOnlyHazards, setSpawnOnlyHazards,
        spawnOnlyHazardsRef,
        disableEnemySpawnsRef,
        showAccessibilityControls, setShowAccessibilityControls,
        showEnemyNames, setShowEnemyNames,
        showThumbnails, setShowThumbnails,
        enemyRenderMode, setEnemyRenderMode,
        enemyRenderModeRef,
        heroRenderMode, setHeroRenderMode,
        heroQuality, setHeroQuality,
        debugBulletSpeed, setDebugBulletSpeed,
        debugFireRateMs, setDebugFireRateMs,
        debugFxOrbCount, setDebugFxOrbCount,
        debugFxOrbRadius, setDebugFxOrbRadius,
        debugFxOrbSizeMul, setDebugFxOrbSizeMul,
        debugFxOrbLerp, setDebugFxOrbLerp,
        tentacleSpeed, setTentacleSpeed,
        tentacleStrength, setTentacleStrength,
        tentacleAmpX, setTentacleAmpX,
        tentacleAmpZ, setTentacleAmpZ,
        tentacleYWobble, setTentacleYWobble,
        tentacleBendPow, setTentacleBendPow,
        controlScheme, setControlScheme,
        performanceMode, setPerformanceMode,
        highContrast, setHighContrast,
        panelPosition, setPanelPosition,
        waveScorePanelPosition, setWaveScorePanelPosition,
        playerLabelSize, setPlayerLabelSize,
        showPlayerLabelPlaceholder, setShowPlayerLabelPlaceholder,
        handlePanelMouseDown,
        handleWaveScorePanelMouseDown
    };
}
