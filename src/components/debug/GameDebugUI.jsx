import React from "react";
import {
  updateAccessibility,
  onAccessibilityChange,
} from "../../utils/accessibility";
import AccessibilitySettings from "../../AccessibilitySettings.jsx";

// Axis preview component (module-level) shows current refs for debugging accessibility adjustments
function AxisPreview({ moveRef, aimRef }) {
  const [vals, setVals] = React.useState({ mx: 0, mz: 0, ax: 0, az: 0 });
  React.useEffect(() => {
    let r = 0;
    const loop = () => {
      const m = moveRef.current || { x: 0, z: 0 };
      const a = aimRef.current || { x: 0, z: 0 };
      setVals((v) => {
        const mx = Number(m.x.toFixed(2));
        const mz = Number(m.z.toFixed(2));
        const ax = Number(a.x.toFixed(2));
        const az = Number(a.z.toFixed(2));
        if (v.mx === mx && v.mz === mz && v.ax === ax && v.az === az) return v;
        return { mx, mz, ax, az };
      });
      r = requestAnimationFrame(loop);
    };
    r = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(r);
  }, [moveRef, aimRef]);
  return (
    <div
      style={{
        fontSize: 11,
        lineHeight: "14px",
        marginTop: 4,
        color: "#cbd5e1",
      }}
    >
      <div>
        Move: x {vals.mx} z {vals.mz}
      </div>
      <div>
        Aim: x {vals.ax} z {vals.az}
      </div>
    </div>
  );
}

// Small on-screen debug overlay that mirrors accessibility changes
function AccessibilityDebugOverlay() {
  const [logs, setLogs] = React.useState([]);
  const [fixed, setFixed] = React.useState(() => {
    try {
      return localStorage.getItem("accessibilityDebug:fixed") === "1";
    } catch {
      return true;
    }
  });
  React.useEffect(() => {
    try {
      localStorage.setItem("accessibilityDebug:fixed", fixed ? "1" : "0");
    } catch {} // eslint-disable-line no-empty
  }, [fixed]);
  React.useEffect(() => {
    const unsub = onAccessibilityChange((s) => {
      const ts = new Date().toLocaleTimeString();
      setLogs((prev) => [{ ts, msg: JSON.stringify(s) }, ...prev].slice(0, 20));
    });
    return () => {
      try {
        unsub && unsub();
      } catch {} // eslint-disable-line no-empty
    };
  }, []);
  if (!logs || logs.length === 0) return null;
  const baseStyle = {
    background: "rgba(0,0,0,0.66)",
    padding: 8,
    borderRadius: 6,
    zIndex: 9999,
    fontSize: 12,
    color: "#e5e7eb",
    maxWidth: 360,
  };
  const fixedStyle = { position: "fixed", left: 350, bottom: 8 };
  const inlineStyle = { position: "relative", marginTop: 8 };
  return (
    <div
      className={`access-overlay ${fixed ? "fixed" : "inline"}`}
      style={{ ...(fixed ? fixedStyle : inlineStyle), ...baseStyle }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <strong style={{ fontSize: 12 }}>Accessibility Log</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="button"
            style={{ fontSize: 11, padding: "4px 6px" }}
            onClick={() => setLogs([])}
          >
            Clear
          </button>
          <button
            className="button"
            style={{ fontSize: 11, padding: "4px 6px" }}
            onClick={() => setFixed((f) => !f)}
            title={
              fixed
                ? "Unfix overlay (place inside parent)"
                : "Fix overlay (viewport)"
            }
          >
            {fixed ? "Unfix" : "Fix"}
          </button>
        </div>
      </div>
      <div style={{ maxHeight: 220, overflow: "auto" }}>
        {logs.map((l, i) => (
          <div key={i} style={{ opacity: 0.95, marginBottom: 6 }}>
            <div style={{ color: "#9ca3af", fontSize: 11 }}>{l.ts}</div>
            <div style={{ fontFamily: "monospace", fontSize: 11 }}>{l.msg}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Small reusable collapsible panel for debug UI sections
function CollapsiblePanel({ id, title, children, defaultOpen = true }) {
  const [open, setOpen] = React.useState(() => {
    try {
      const v = localStorage.getItem(`panel:${id}:open`);
      return v == null ? defaultOpen : v === "1";
    } catch {
      return defaultOpen;
    }
  });
  React.useEffect(() => {
    try {
      localStorage.setItem(`panel:${id}:open`, open ? "1" : "0");
    } catch {} // eslint-disable-line no-empty
  }, [id, open]);
  return (
    <div className={`panel ${open ? "" : "collapsed"}`}>
      <div className="panel-header" onClick={() => setOpen((o) => !o)}>
        <div className="panel-title">{title}</div>
        <div className="chev">{open ? "▾" : "▸"}</div>
      </div>
      <div className="panel-content">{children}</div>
    </div>
  );
}

export default function GameDebugUI({
  showDebugUI,
  setShowDebugUI,
  // Game state
  wave,
  score,
  bestScore,
  bestWave,
  lives,
  health,
  HEALTH_MAX,
  armor,
  ARMOR_MAX,
  dashRatio,
  abilityName,
  abilityCooldown,
  dashCount,
  dashCooldownMs,
  selectedHero,
  healthRatio,
  armorRatio,
  // Controls
  restartGame,
  autoFire,
  setAutoFire,
  showEnemyNames,
  setShowEnemyNames,
  showThumbnails,
  setShowThumbnails,
  // Accessibility
  acc,
  dpadVecRef,
  aimInputRef,
  showGizmo,
  setShowGizmo,
  showAccessibilityControls,
  setShowAccessibilityControls,
  // Debug HUD
  enemies,
  pickups,
  bullets,
  debugBulletSpeed,
  setDebugBulletSpeed,
  debugFireRateMs,
  setDebugFireRateMs,
  debugFxOrbCount,
  setDebugFxOrbCount,
  playerLabelSize,
  setPlayerLabelSize,
  enemyRenderMode,
  setEnemyRenderMode,
  heroRenderMode,
  setHeroRenderMode,
  heroQuality,
  setHeroQuality,
  debugFxOrbRadius,
  setDebugFxOrbRadius,
  debugFxOrbSizeMul,
  setDebugFxOrbSizeMul,
  debugFxOrbLerp,
  setDebugFxOrbLerp,
  tentacleStrength,
  setTentacleStrength,
  tentacleSpeed,
  setTentacleSpeed,
  tentacleAmpX,
  setTentacleAmpX,
  tentacleAmpZ,
  setTentacleAmpZ,
  tentacleYWobble,
  setTentacleYWobble,
  tentacleBendPow,
  setTentacleBendPow,
  highContrast,
  setHighContrast,
  showStats,
  setShowStats,
  debugLaserChargingBorder,
  setDebugLaserChargingBorder,
  debugLaserFiringBorder,
  setDebugLaserFiringBorder,
  debugLaserCooldownBorder,
  setDebugLaserCooldownBorder,
  debugLaserReadyBorder,
  setDebugLaserReadyBorder,
  debugBombChargingBorder,
  setDebugBombChargingBorder,
  debugBombCooldownBorder,
  setDebugBombCooldownBorder,
  debugBombReadyBorder,
  setDebugBombReadyBorder,
  debugDashChargingBorder,
  setDebugDashChargingBorder,
  debugDashCooldownBorder,
  setDebugDashCooldownBorder,
  debugDashReadyBorder,
  setDebugDashReadyBorder,
  debugHeavyChargingBorder,
  setDebugHeavyChargingBorder,
  debugHeavyCooldownBorder,
  setDebugHeavyCooldownBorder,
  debugHeavyReadyBorder,
  setDebugHeavyReadyBorder,
  debugSpecialChargingBorder,
  setDebugSpecialChargingBorder,
  debugSpecialCooldownBorder,
  setDebugSpecialCooldownBorder,
  debugSpecialReadyBorder,
  setDebugSpecialReadyBorder,
  debugBorderEffectsEnabled,
  setDebugBorderEffectsEnabled,
  debugLowHealthBorder,
  setDebugLowHealthBorder,
  debugPickupGlowBorder,
  setDebugPickupGlowBorder,
  showDreiStats,
  setShowDreiStats,
  fps,
  cameraMode,
  topDownSpeedMul,
  setTopDownSpeedMul,
  spawnPressureMul,
  setSpawnPressureMul,
  debugCameraShakeIntensity,
  setDebugCameraShakeIntensity,
  performanceMode,
  setPerformanceMode,
  disableEnemySpawns,
  setDisableEnemySpawns,
  spawnOnlyHazards,
  setSpawnOnlyHazards,
  controlScheme,
  setControlScheme,
  invulnTest,
  setInvulnTest,
  getActiveMax,
  getBossMax,
  pickupScaleGlobal,
  setPickupScaleGlobal,
  assetScale,
  setAssetScale,
  topDownZoom,
  setTopDownZoom,
  staticCamMargin,
  setStaticCamMargin,
  arenaGrowEnabled,
  setArenaGrowEnabled,
  boundaryLimit,
  setBoundaryLimit,
  maxArenaLimit,
  setMaxArenaLimit,
  arenaGrowthMode,
  setArenaGrowthMode,
  arenaGrowthRate,
  setArenaGrowthRate,
  arenaGrowthPerMilestone,
  setArenaGrowthPerMilestone,
  BOUNDARY_LIMIT,
  GROUND_HALF,
  showPlayerLabelPlaceholder,
  setShowPlayerLabelPlaceholder,
  isPaused,
  enemySpeedScale,
  playerBaseSpeed,
  formatHMS,
  totalPlayMsView,
  pickupFeed,
  LEVEL_CONFIG,
  bossFeed,
}) {
  if (!showDebugUI) return null;

  return (
    <>
      {/* Debug header and Accessibility controls (toggle) */}
      {showDebugUI && (
        <>
          <div className="hud-stack" style={{ bottom: 10, left: 10 }}>
            {/* game controls */}
            <CollapsiblePanel
              id="advanced-controls"
              title="Game Controls"
              defaultOpen={false}
            >
              <div className="small">
                Wave: <strong>{wave}</strong>
              </div>
              <div className="small">
                Score: <strong>{score}</strong>
              </div>
              <div className="small">
                Best: <strong>{bestScore}</strong> / <strong>{bestWave}</strong>
              </div>
              <div className="small">
                Lives: <strong>{lives}</strong>
              </div>
              <div className="small">
                Health: <strong>{health}</strong>
              </div>
              <div style={{ height: 8 }} />
              <button className="button" onClick={restartGame}>
                Restart
              </button>
              <div style={{ height: 6 }} />
              <button className="button" onClick={() => setAutoFire((a) => !a)}>
                Auto-Fire: {autoFire ? "On" : "Off"} (F)
              </button>
              <div style={{ height: 6 }} />
              <label style={{ display: "block", fontSize: 11 }}>
                <input
                  type="checkbox"
                  checked={showEnemyNames}
                  onChange={(e) => setShowEnemyNames(e.target.checked)}
                />
                Show Enemy Names
              </label>
              <div style={{ height: 6 }} />
              <label style={{ display: "block", fontSize: 11 }}>
                <input
                  type="checkbox"
                  checked={showThumbnails}
                  onChange={(e) => setShowThumbnails(e.target.checked)}
                />
                Show Enemy Thumbnails
              </label>

              {/* Accessibility: invert movement & aim axes */}
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 10px",
                  background: "rgba(0,0,0,0.35)",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#e5e7eb",
                    marginBottom: 6,
                  }}
                >
                  Accessibility (Axes)
                </div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!acc?.invertMoveX}
                    onChange={(e) =>
                      updateAccessibility({
                        invertMoveX: e.currentTarget.checked,
                      })
                    }
                  />{" "}
                  Invert Move X (Left/Right)
                </label>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!acc?.invertMoveY}
                    onChange={(e) =>
                      updateAccessibility({
                        invertMoveY: e.currentTarget.checked,
                      })
                    }
                  />{" "}
                  Invert Move Y (Forward/Back)
                </label>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!acc?.invertAimX}
                    onChange={(e) =>
                      updateAccessibility({
                        invertAimX: e.currentTarget.checked,
                      })
                    }
                  />{" "}
                  Invert Aim X
                </label>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    marginBottom: 6,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!acc?.invertAimY}
                    onChange={(e) =>
                      updateAccessibility({
                        invertAimY: e.currentTarget.checked,
                      })
                    }
                  />{" "}
                  Invert Aim Y
                </label>
                {/* Live axis preview */}
                <AxisPreview moveRef={dpadVecRef} aimRef={aimInputRef} />
                <AccessibilityDebugOverlay />
                <div style={{ marginTop: 8 }}>
                  <label style={{ display: "block", fontSize: 11 }}>
                    <input
                      type="checkbox"
                      checked={showGizmo}
                      onChange={(e) => setShowGizmo(e.currentTarget.checked)}
                    />{" "}
                    Show 3D Gizmo (axes + arrows)
                  </label>
                  <label
                    style={{ display: "block", fontSize: 11, marginTop: 6 }}
                  >
                    <input
                      type="checkbox"
                      checked={!!acc?.flipControllerY}
                      onChange={(e) =>
                        updateAccessibility({
                          flipControllerY: e.currentTarget.checked,
                        })
                      }
                    />{" "}
                    Flip Controller Y axes (invert forward/back for both sticks)
                  </label>
                </div>
              </div>

              <div style={{ height: 10 }} />
            </CollapsiblePanel>

            {/* Player properties */}
            <CollapsiblePanel
              id="player-props"
              title="Player"
              defaultOpen={true}
            >
              <div className="small" style={{ marginBottom: 6 }}>
                Hero: <strong>{selectedHero}</strong>
              </div>
              {/* Health */}
              <div
                style={{
                  background: "rgba(0,0,0,0.55)",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#e5e7eb",
                    marginBottom: 4,
                  }}
                >
                  Health
                </div>
                <div
                  style={{
                    height: 10,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(healthRatio * 100).toFixed(1)}%`,
                      height: "100%",
                      background: "linear-gradient(90deg,#22c55e,#16a34a)",
                      boxShadow: "0 0 8px rgba(34,197,94,0.5) inset",
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}>
                  {Math.max(0, Math.floor(health))} / {HEALTH_MAX}
                </div>
              </div>
              {/* Armor */}
              <div
                style={{
                  background: "rgba(0,0,0,0.55)",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#e5e7eb",
                    marginBottom: 4,
                  }}
                >
                  Armor
                </div>
                <div
                  style={{
                    height: 10,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(armorRatio * 100).toFixed(1)}%`,
                      height: "100%",
                      background: "linear-gradient(90deg,#60a5fa,#3b82f6)",
                      boxShadow: "0 0 8px rgba(96,165,250,0.45) inset",
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}>
                  {Math.max(0, Math.floor(armor))} / {ARMOR_MAX}
                </div>
              </div>
              {/* Lives */}
              <div className="small" style={{ marginBottom: 8 }}>
                Lives: <strong>{lives}</strong>
              </div>
              {/* Dash */}
              <div
                style={{
                  background: "rgba(0,0,0,0.55)",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ fontSize: 12, color: "#e5e7eb" }}>Dash</div>
                  <div style={{ fontSize: 11, color: "#cbd5e1" }}>
                    {Math.round(dashRatio * 100)}%
                  </div>
                </div>
                <div
                  style={{
                    height: 8,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(dashRatio * 100).toFixed(1)}%`,
                      height: "100%",
                      background: "linear-gradient(90deg,#f59e0b,#f97316)",
                      boxShadow: "0 0 8px rgba(245,158,11,0.45) inset",
                    }}
                  />
                </div>
              </div>
              {/* Ability */}
              <div
                style={{
                  background: "rgba(0,0,0,0.55)",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#e5e7eb" }}>Ability</div>
                  <div style={{ fontSize: 11, color: "#cbd5e1" }}>
                    CD: {abilityCooldown}s
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#f1f5f9", marginTop: 2 }}>
                  {abilityName}
                </div>
              </div>
              <div
                className="abilities-panel small"
                style={{ marginBottom: 8 }}
              >
                <div className="ability">
                  <div className="label">
                    Dash <span className="hint">[3]</span>
                  </div>
                  <div className="cooldown">
                    {(() => {
                      const pct = dashCount > 0 ? (dashCount / 3) * 100 : 0;
                      return (
                        <>
                          <div
                            className="fill"
                            style={{ width: `${Math.round(pct)}%` }}
                          />
                          <div className="cd-text">
                            {dashCount > 0
                              ? `${dashCount}/3`
                              : dashCooldownMs > 0
                              ? `${(dashCooldownMs / 1000).toFixed(1)}s`
                              : "Ready"}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </CollapsiblePanel>

            {/* accessibility controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 600 }}>Debug Panel</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label
                  style={{
                    fontSize: 12,
                    opacity: 0.9,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showAccessibilityControls}
                    onChange={(e) =>
                      setShowAccessibilityControls(e.target.checked)
                    }
                  />
                  Show Accessibility
                </label>
                <button
                  className="button"
                  onClick={() => setShowDebugUI(false)}
                  style={{ padding: "4px 8px" }}
                >
                  Hide Panel
                </button>
              </div>
            </div>

            {showAccessibilityControls && (
              <AccessibilitySettings
                enemyRenderMode={enemyRenderMode}
                setEnemyRenderMode={setEnemyRenderMode}
                tentacleStrength={tentacleStrength}
                setTentacleStrength={setTentacleStrength}
                tentacleSpeed={tentacleSpeed}
                setTentacleSpeed={setTentacleSpeed}
                tentacleAmpX={tentacleAmpX}
                setTentacleAmpX={setTentacleAmpX}
                tentacleAmpZ={tentacleAmpZ}
                setTentacleAmpZ={setTentacleAmpZ}
                tentacleYWobble={tentacleYWobble}
                setTentacleYWobble={setTentacleYWobble}
                tentacleBendPow={tentacleBendPow}
                setTentacleBendPow={setTentacleBendPow}
                heroRenderMode={heroRenderMode}
                setHeroRenderMode={setHeroRenderMode}
                heroQuality={heroQuality}
                setHeroQuality={setHeroQuality}
                debugFxOrbCount={debugFxOrbCount}
                setDebugFxOrbCount={setDebugFxOrbCount}
                debugFxOrbRadius={debugFxOrbRadius}
                setDebugFxOrbRadius={setDebugFxOrbRadius}
                debugFxOrbSizeMul={debugFxOrbSizeMul}
                setDebugFxOrbSizeMul={setDebugFxOrbSizeMul}
                debugFxOrbLerp={debugFxOrbLerp}
                setDebugFxOrbLerp={setDebugFxOrbLerp}
                highContrast={highContrast}
                setHighContrast={setHighContrast}
                showStats={showStats}
                setShowStats={setShowStats}
                debugLaserChargingBorder={debugLaserChargingBorder}
                setDebugLaserChargingBorder={setDebugLaserChargingBorder}
                debugLaserFiringBorder={debugLaserFiringBorder}
                setDebugLaserFiringBorder={setDebugLaserFiringBorder}
                debugLaserCooldownBorder={debugLaserCooldownBorder}
                setDebugLaserCooldownBorder={setDebugLaserCooldownBorder}
                debugLaserReadyBorder={debugLaserReadyBorder}
                setDebugLaserReadyBorder={setDebugLaserReadyBorder}
                debugBombChargingBorder={debugBombChargingBorder}
                setDebugBombChargingBorder={setDebugBombChargingBorder}
                debugBombCooldownBorder={debugBombCooldownBorder}
                setDebugBombCooldownBorder={setDebugBombCooldownBorder}
                debugBombReadyBorder={debugBombReadyBorder}
                setDebugBombReadyBorder={setDebugBombReadyBorder}
                debugDashChargingBorder={debugDashChargingBorder}
                setDebugDashChargingBorder={setDebugDashChargingBorder}
                debugDashCooldownBorder={debugDashCooldownBorder}
                setDebugDashCooldownBorder={setDebugDashCooldownBorder}
                debugDashReadyBorder={debugDashReadyBorder}
                setDebugDashReadyBorder={setDebugDashReadyBorder}
                debugHeavyChargingBorder={debugHeavyChargingBorder}
                setDebugHeavyChargingBorder={setDebugHeavyChargingBorder}
                debugHeavyCooldownBorder={debugHeavyCooldownBorder}
                setDebugHeavyCooldownBorder={setDebugHeavyCooldownBorder}
                debugHeavyReadyBorder={debugHeavyReadyBorder}
                setDebugHeavyReadyBorder={setDebugHeavyReadyBorder}
                debugSpecialChargingBorder={debugSpecialChargingBorder}
                setDebugSpecialChargingBorder={setDebugSpecialChargingBorder}
                debugSpecialCooldownBorder={debugSpecialCooldownBorder}
                setDebugSpecialCooldownBorder={setDebugSpecialCooldownBorder}
                debugSpecialReadyBorder={debugSpecialReadyBorder}
                setDebugSpecialReadyBorder={setDebugSpecialReadyBorder}
                debugBorderEffectsEnabled={debugBorderEffectsEnabled}
                setDebugBorderEffectsEnabled={setDebugBorderEffectsEnabled}
                debugLowHealthBorder={debugLowHealthBorder}
                setDebugLowHealthBorder={setDebugLowHealthBorder}
                debugPickupGlowBorder={debugPickupGlowBorder}
                setDebugPickupGlowBorder={setDebugPickupGlowBorder}
                showDreiStats={showDreiStats}
                setShowDreiStats={setShowDreiStats}
                fps={fps}
                cameraMode={cameraMode}
                topDownSpeedMul={topDownSpeedMul}
                setTopDownSpeedMul={setTopDownSpeedMul}
                spawnPressureMul={spawnPressureMul}
                setSpawnPressureMul={setSpawnPressureMul}
                debugCameraShakeIntensity={debugCameraShakeIntensity}
                setDebugCameraShakeIntensity={setDebugCameraShakeIntensity}
                performanceMode={performanceMode}
                setPerformanceMode={setPerformanceMode}
                disableEnemySpawns={disableEnemySpawns}
                setDisableEnemySpawns={setDisableEnemySpawns}
                spawnOnlyHazards={spawnOnlyHazards}
                setSpawnOnlyHazards={setSpawnOnlyHazards}
                controlScheme={controlScheme}
                setControlScheme={setControlScheme}
                invulnTest={invulnTest}
                setInvulnTest={setInvulnTest}
                wave={wave}
                getActiveMax={getActiveMax}
                getBossMax={getBossMax}
                pickupScaleGlobal={pickupScaleGlobal}
                setPickupScaleGlobal={setPickupScaleGlobal}
                assetScale={assetScale}
                setAssetScale={setAssetScale}
                topDownZoom={topDownZoom}
                setTopDownZoom={setTopDownZoom}
                staticCamMargin={staticCamMargin}
                setStaticCamMargin={setStaticCamMargin}
                arenaGrowEnabled={arenaGrowEnabled}
                setArenaGrowEnabled={setArenaGrowEnabled}
                boundaryLimit={boundaryLimit}
                setBoundaryLimit={setBoundaryLimit}
                maxArenaLimit={maxArenaLimit}
                setMaxArenaLimit={setMaxArenaLimit}
                arenaGrowthMode={arenaGrowthMode}
                setArenaGrowthMode={setArenaGrowthMode}
                arenaGrowthRate={arenaGrowthRate}
                setArenaGrowthRate={setArenaGrowthRate}
                arenaGrowthPerMilestone={arenaGrowthPerMilestone}
                setArenaGrowthPerMilestone={setArenaGrowthPerMilestone}
                BOUNDARY_LIMIT={BOUNDARY_LIMIT}
                GROUND_HALF={GROUND_HALF}
              />
            )}
          </div>

          {/* right debug panel */}
          <div className="hud-stack" style={{ top: 80, right: 10 }}>
            <CollapsiblePanel
              id="debug-hud"
              title="Debug HUD"
              defaultOpen={true}
            >
              <div className="hud small">
                <div>Enemies: {enemies.length}</div>
                <div>Flying: {enemies.filter((e) => e.isFlying).length}</div>
                <div>Pickups: {pickups.length}</div>
                <div>Bullets: {bullets.length}</div>
                <div style={{ marginTop: 6 }}>
                  <label style={{ display: "block", fontSize: 11 }}>
                    Bullet Speed {debugBulletSpeed.toFixed(1)}
                    <input
                      type="range"
                      min={4}
                      max={60}
                      step={0.5}
                      value={debugBulletSpeed}
                      onChange={(e) =>
                        setDebugBulletSpeed(parseFloat(e.target.value))
                      }
                      style={{ width: "100%" }}
                    />
                  </label>
                  <label style={{ display: "block", fontSize: 11 }}>
                    Fire Rate (ms) {Math.round(debugFireRateMs)}
                    <input
                      type="range"
                      min={50}
                      max={800}
                      step={10}
                      value={debugFireRateMs}
                      onChange={(e) =>
                        setDebugFireRateMs(parseFloat(e.target.value))
                      }
                      style={{ width: "100%" }}
                    />
                  </label>
                  <label style={{ display: "block", fontSize: 11 }}>
                    FX Orb Count {debugFxOrbCount}
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={1}
                      value={debugFxOrbCount}
                      onChange={(e) =>
                        setDebugFxOrbCount(parseInt(e.target.value, 10))
                      }
                      style={{ width: "100%" }}
                    />
                  </label>
                  <label
                    style={{ display: "block", fontSize: 11, marginTop: 8 }}
                  >
                    Player Label Size {playerLabelSize}px
                    <input
                      type="range"
                      min={12}
                      max={36}
                      step={1}
                      value={playerLabelSize}
                      onChange={(e) =>
                        setPlayerLabelSize(parseInt(e.target.value, 10))
                      }
                      style={{ width: "100%" }}
                    />
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 11,
                      marginTop: 6,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={showPlayerLabelPlaceholder}
                      onChange={(e) =>
                        setShowPlayerLabelPlaceholder(e.target.checked)
                      }
                    />
                    <span>Show label placeholder when no enemies</span>
                  </label>
                </div>
                <div>Status: {isPaused ? "PAUSED" : "PLAYING"}</div>
                <div>Scheme: {controlScheme.toUpperCase()}</div>
                <div>
                  Speed: Enemies x
                  {(
                    enemySpeedScale *
                    (cameraMode === "topdown" ? topDownSpeedMul || 1 : 1)
                  ).toFixed(2)}{" "}
                  • Player{" "}
                  {(
                    playerBaseSpeed *
                    (cameraMode === "topdown" ? topDownSpeedMul || 1 : 1)
                  ).toFixed(1)}
                </div>
                <div>Play time: {formatHMS(totalPlayMsView)}</div>
                <div>Wave Level: {wave}</div>
                {(() => {
                  const bossUsed = enemies.filter(
                    (e) => e.isBoss || e.isTriangle || e.isCone || e.isPipe
                  ).length;
                  const bossCap = getBossMax(wave, performanceMode);
                  return (
                    <div>
                      Bosses: {bossUsed}/{bossCap}
                    </div>
                  );
                })()}
              </div>
            </CollapsiblePanel>
            <CollapsiblePanel
              id="pickup-feed"
              title="Pickup Feed"
              defaultOpen={true}
            >
              <div className="feed feed-pickups small">
                {pickupFeed.map((msg) => (
                  <div
                    key={msg.id}
                    className="feed-item"
                    style={{ "--dot": msg.color }}
                  >
                    <div className="feed-dot" />
                    <div style={{ color: msg.color }}>{msg.text}</div>
                  </div>
                ))}
              </div>
            </CollapsiblePanel>
            {/* Boss sections always visible */}
            <CollapsiblePanel
              id="boss-schedule"
              title="Boss Schedule"
              defaultOpen={true}
            >
              <div className="hudz small" style={{ margin: 0 }}>
                {(() => {
                  const triIn = wave % 3 === 0 ? 0 : 3 - (wave % 3);
                  return (
                    <>
                      <div>
                        <strong>Level:</strong> {wave}
                      </div>
                      <div>Triangle boss: every 3 levels • next in {triIn}</div>
                      <div>
                        Cone boss: L{LEVEL_CONFIG.unlocks.cone}+ •{" "}
                        {Math.round(LEVEL_CONFIG.chances.cone * 100)}% chance
                      </div>
                      <div>
                        Pipe boss: L{LEVEL_CONFIG.unlocks.pipe}+ •{" "}
                        {Math.round(LEVEL_CONFIG.chances.pipe * 100)}% chance
                      </div>
                    </>
                  );
                })()}
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel
              id="boss-feed"
              title="Boss Spawns"
              defaultOpen={true}
            >
              <div className="feed feed-bosses small">
                {bossFeed.map((msg) => (
                  <div
                    key={msg.id}
                    className="feed-item"
                    style={{ "--dot": msg.color }}
                  >
                    <div className="feed-dot" />
                    <div style={{ color: msg.color }}>{msg.text}</div>
                  </div>
                ))}
              </div>
            </CollapsiblePanel>
          </div>
        </>
      )}

      {showDebugUI && (
        <div className="hud-stack" style={{ top: 80 }}>
          <CollapsiblePanel id="debug-hud" title="Debug HUD" defaultOpen={true}>
            <div className="hud small">
              <div>Enemies: {enemies.length}</div>
              <div>Flying: {enemies.filter((e) => e.isFlying).length}</div>
              <div>Pickups: {pickups.length}</div>
              <div>Bullets: {bullets.length}</div>
              <div style={{ marginTop: 6 }}>
                <label style={{ display: "block", fontSize: 11 }}>
                  Bullet Speed {debugBulletSpeed.toFixed(1)}
                  <input
                    type="range"
                    min={4}
                    max={60}
                    step={0.5}
                    value={debugBulletSpeed}
                    onChange={(e) =>
                      setDebugBulletSpeed(parseFloat(e.target.value))
                    }
                    style={{ width: "100%" }}
                  />
                </label>
                <label style={{ display: "block", fontSize: 11 }}>
                  Fire Rate (ms) {Math.round(debugFireRateMs)}
                  <input
                    type="range"
                    min={50}
                    max={800}
                    step={10}
                    value={debugFireRateMs}
                    onChange={(e) =>
                      setDebugFireRateMs(parseFloat(e.target.value))
                    }
                    style={{ width: "100%" }}
                  />
                </label>
                <label style={{ display: "block", fontSize: 11 }}>
                  FX Orb Count {debugFxOrbCount}
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={debugFxOrbCount}
                    onChange={(e) =>
                      setDebugFxOrbCount(parseInt(e.target.value, 10))
                    }
                    style={{ width: "100%" }}
                  />
                </label>
                <label style={{ display: "block", fontSize: 11, marginTop: 8 }}>
                  Player Label Size {playerLabelSize}px
                  <input
                    type="range"
                    min={12}
                    max={36}
                    step={1}
                    value={playerLabelSize}
                    onChange={(e) =>
                      setPlayerLabelSize(parseInt(e.target.value, 10))
                    }
                    style={{ width: "100%" }}
                  />
                </label>
                {/* Add more debug controls as needed */}
              </div>
            </div>
          </CollapsiblePanel>
        </div>
      )}
    </>
  );
}
