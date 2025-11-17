import React from 'react';

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

export default function AccessibilitySettings({
  enemyRenderMode,
  setEnemyRenderMode,
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
  heroRenderMode,
  setHeroRenderMode,
  heroQuality,
  setHeroQuality,
  debugFxOrbCount,
  setDebugFxOrbCount,
  debugFxOrbRadius,
  setDebugFxOrbRadius,
  debugFxOrbSizeMul,
  setDebugFxOrbSizeMul,
  debugFxOrbLerp,
  setDebugFxOrbLerp,
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
  wave,
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
  GROUND_HALF
}) {
  return (
    <CollapsiblePanel
      id="accessibility"
      title="Accessibility Controls"
      defaultOpen={true}
    >
          <div
            className="small"
            style={{
              display: "grid",
              gap: 8,
              height: "50vh",
              overflowY: "auto",
            }}
          >
                      {/* Renderer modes */}
                      <div>
                        {/* enemy attributes */}
                        <div
                          style={{
                            background: "rgba(0,0,0,0.55)",
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          {/* Enemy renderer mode */}
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span>Enemy Visuals</span>
                            <select
                              value={enemyRenderMode}
                              onChange={(e) =>
                                setEnemyRenderMode(e.target.value)
                              }
                              style={{
                                marginLeft: "auto",
                                background: "#111",
                                color: "#fff",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 6,
                                padding: 2,
                              }}
                            >
                              <option value="factory">Factory (default)</option>
                              <option value="simple">Simple Shapes</option>
                            </select>
                          </label>
                          {/* Tentacle Animation Controls */}
                          <div
                            style={{
                              background: "rgba(0,0,0,0.55)",
                              padding: "8px 10px",
                              borderRadius: 8,
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
                              Tentacle Animation
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                                marginBottom: 6,
                              }}
                            >
                              <button
                                className="button"
                                style={{ padding: "4px 6px" }}
                                onClick={() => {
                                  setTentacleStrength(0.6);
                                  setTentacleSpeed(0.8);
                                  setTentacleAmpX(0.6);
                                  setTentacleAmpZ(0.6);
                                  setTentacleYWobble(0.02);
                                  setTentacleBendPow(2.2);
                                }}
                              >
                                Calm
                              </button>
                              <button
                                className="button"
                                style={{ padding: "4px 6px" }}
                                onClick={() => {
                                  setTentacleStrength(1.0);
                                  setTentacleSpeed(1.2);
                                  setTentacleAmpX(1.0);
                                  setTentacleAmpZ(1.0);
                                  setTentacleYWobble(0.06);
                                  setTentacleBendPow(2.0);
                                }}
                              >
                                Pulsing
                              </button>
                              <button
                                className="button"
                                style={{ padding: "4px 6px" }}
                                onClick={() => {
                                  setTentacleStrength(1.6);
                                  setTentacleSpeed(2.0);
                                  setTentacleAmpX(1.3);
                                  setTentacleAmpZ(1.3);
                                  setTentacleYWobble(0.12);
                                  setTentacleBendPow(1.6);
                                }}
                              >
                                Chaotic
                              </button>
                              <button
                                className="button"
                                style={{ padding: "4px 6px" }}
                                onClick={() => {
                                  setTentacleStrength(1.0);
                                  setTentacleSpeed(1.2);
                                  setTentacleAmpX(1.0);
                                  setTentacleAmpZ(1.0);
                                  setTentacleYWobble(0.05);
                                  setTentacleBendPow(2.0);
                                }}
                              >
                                Reset
                              </button>
                            </div>
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 11,
                              }}
                            >
                              <span style={{ flex: 1 }}>Strength</span>
                              <input
                                type="range"
                                min={0}
                                max={2.0}
                                step={0.01}
                                value={tentacleStrength}
                                onChange={(e) =>
                                  setTentacleStrength(
                                    parseFloat(e.target.value)
                                  )
                                }
                                style={{ flex: 3 }}
                                aria-label="Tentacle Strength"
                              />
                              <span style={{ width: 48, textAlign: "right" }}>
                                {tentacleStrength.toFixed(2)}
                              </span>
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
                              <span style={{ flex: 1 }}>Speed</span>
                              <input
                                type="range"
                                min={0.2}
                                max={3.0}
                                step={0.01}
                                value={tentacleSpeed}
                                onChange={(e) =>
                                  setTentacleSpeed(parseFloat(e.target.value))
                                }
                                style={{ flex: 3 }}
                                aria-label="Tentacle Speed"
                              />
                              <span style={{ width: 48, textAlign: "right" }}>
                                {tentacleSpeed.toFixed(2)}x
                              </span>
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
                              <span style={{ flex: 1 }}>Tip Emphasis</span>
                              <input
                                type="range"
                                min={1.0}
                                max={3.0}
                                step={0.05}
                                value={tentacleBendPow}
                                onChange={(e) =>
                                  setTentacleBendPow(parseFloat(e.target.value))
                                }
                                style={{ flex: 3 }}
                                aria-label="Tentacle Bend Exponent"
                              />
                              <span style={{ width: 48, textAlign: "right" }}>
                                {tentacleBendPow.toFixed(2)}
                              </span>
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
                              <span style={{ flex: 1 }}>Axis X</span>
                              <input
                                type="range"
                                min={0}
                                max={2.0}
                                step={0.01}
                                value={tentacleAmpX}
                                onChange={(e) =>
                                  setTentacleAmpX(parseFloat(e.target.value))
                                }
                                style={{ flex: 3 }}
                                aria-label="Tentacle X Amplitude"
                              />
                              <span style={{ width: 48, textAlign: "right" }}>
                                {tentacleAmpX.toFixed(2)}
                              </span>
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
                              <span style={{ flex: 1 }}>Axis Z</span>
                              <input
                                type="range"
                                min={0}
                                max={2.0}
                                step={0.01}
                                value={tentacleAmpZ}
                                onChange={(e) =>
                                  setTentacleAmpZ(parseFloat(e.target.value))
                                }
                                style={{ flex: 3 }}
                                aria-label="Tentacle Z Amplitude"
                              />
                              <span style={{ width: 48, textAlign: "right" }}>
                                {tentacleAmpZ.toFixed(2)}
                              </span>
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
                              <span style={{ flex: 1 }}>Vertical Wobble</span>
                              <input
                                type="range"
                                min={0.0}
                                max={0.25}
                                step={0.005}
                                value={tentacleYWobble}
                                onChange={(e) =>
                                  setTentacleYWobble(parseFloat(e.target.value))
                                }
                                style={{ flex: 3 }}
                                aria-label="Tentacle Vertical Wobble"
                              />
                              <span style={{ width: 48, textAlign: "right" }}>
                                {tentacleYWobble.toFixed(3)}
                              </span>
                            </label>
                            <div
                              style={{
                                fontSize: 10,
                                opacity: 0.75,
                                marginTop: 6,
                              }}
                            >
                              Affects spikeStyle "tentacle" only. Strength
                              multiplies overall bend; Tip Emphasis pushes
                              motion towards the tip; Axis X/Z shape sideways
                              sway; Vertical Wobble adds gentle lengthwise
                              flutter.
                            </div>
                          </div>
                        </div>

                        {/* hero attributes */}
                        <div
                          style={{
                            background: "rgba(0,0,0,0.55)",
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          {/* Hero renderer mode */}
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span>Hero Visuals</span>
                            <select
                              value={heroRenderMode}
                              onChange={(e) =>
                                setHeroRenderMode(e.target.value)
                              }
                              style={{
                                marginLeft: "auto",
                                background: "#111",
                                color: "#fff",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 6,
                                padding: 2,
                              }}
                            >
                              <option value="factory">Factory</option>
                              <option value="model">Model (default)</option>
                            </select>
                          </label>
                          {/* Hero quality */}
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span>Hero Quality</span>
                            <select
                              value={heroQuality}
                              onChange={(e) => setHeroQuality(e.target.value)}
                              style={{
                                marginLeft: "auto",
                                background: "#111",
                                color: "#fff",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 6,
                                padding: 2,
                              }}
                            >
                              <option value="low">Low</option>
                              <option value="med">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </label>
                        </div>
                        {/* add FX Orb controls here */}
                        {/* FX Orb Accessibility / Debug Controls */}
                        <div
                          style={{
                            background: "rgba(0,0,0,0.55)",
                            padding: "8px 10px",
                            borderRadius: 8,
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
                            FX Orbs
                          </div>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 11,
                            }}
                          >
                            <span style={{ flex: 1 }}>Count</span>
                            <input
                              type="range"
                              min={0}
                              max={40}
                              step={1}
                              value={debugFxOrbCount}
                              onChange={(e) =>
                                setDebugFxOrbCount(parseInt(e.target.value, 10))
                              }
                              style={{ flex: 3 }}
                              aria-label="FX Orb Count"
                            />
                            <span style={{ width: 36, textAlign: "right" }}>
                              {debugFxOrbCount}
                            </span>
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
                            <span style={{ flex: 1 }}>Ring Radius</span>
                            <input
                              type="range"
                              min={0.4}
                              max={3.0}
                              step={0.05}
                              value={debugFxOrbRadius}
                              onChange={(e) =>
                                setDebugFxOrbRadius(parseFloat(e.target.value))
                              }
                              style={{ flex: 3 }}
                              aria-label="FX Orb Ring Radius"
                            />
                            <span style={{ width: 48, textAlign: "right" }}>
                              {debugFxOrbRadius.toFixed(2)}
                            </span>
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
                            <span style={{ flex: 1 }}>Size</span>
                            <input
                              type="range"
                              min={0.5}
                              max={3.0}
                              step={0.05}
                              value={debugFxOrbSizeMul}
                              onChange={(e) =>
                                setDebugFxOrbSizeMul(parseFloat(e.target.value))
                              }
                              style={{ flex: 3 }}
                              aria-label="FX Orb Size Multiplier"
                            />
                            <span style={{ width: 48, textAlign: "right" }}>
                              {debugFxOrbSizeMul.toFixed(2)}x
                            </span>
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
                            <span style={{ flex: 1 }}>Follow Smooth</span>
                            <input
                              type="range"
                              min={0}
                              max={0.95}
                              step={0.01}
                              value={debugFxOrbLerp}
                              onChange={(e) =>
                                setDebugFxOrbLerp(parseFloat(e.target.value))
                              }
                              style={{ flex: 3 }}
                              aria-label="FX Orb Follow Lerp"
                            />
                            <span style={{ width: 48, textAlign: "right" }}>
                              {(debugFxOrbLerp * 100).toFixed(0)}%
                            </span>
                          </label>
                          <div
                            style={{
                              fontSize: 10,
                              opacity: 0.75,
                              marginTop: 6,
                            }}
                          >
                            Lower radius pulls ring closer. Increase size for
                            accessibility. Follow Smooth (%) controls lerp
                            aggressiveness (0 = snap, 95% = very damped).
                          </div>
                        </div>
                      </div>

                      <hr />

                      {/* High contrast aiming */}
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={highContrast}
                          onChange={(e) => setHighContrast(e.target.checked)}
                        />{" "}
                        High Contrast Aiming
                      </label>

                      {/* Performance controls: Show FPS and Drei Overlay */}
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={showStats}
                          onChange={(e) => setShowStats(e.target.checked)}
                        />{" "}
                        Show FPS Overlay
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={showDreiStats}
                          onChange={(e) => setShowDreiStats(e.target.checked)}
                        />{" "}
                        Drei Stats (dev)
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={performanceMode}
                          onChange={(e) => setPerformanceMode(e.target.checked)}
                        />{" "}
                        Performance Mode
                      </label>
                      {/* add an option to disable enemy spawns */}
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={disableEnemySpawns}
                          onChange={(e) =>
                            setDisableEnemySpawns(e.target.checked)
                          }
                        />{" "}
                        Disable Enemy Spawns
                      </label>
                      {/* add an option to spawn only hazards for testing here */}
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={spawnOnlyHazards}
                          onChange={(e) =>
                            setSpawnOnlyHazards(e.target.checked)
                          }
                        />{" "}
                        Spawn Only Hazards (debug)
                      </label>

                      <hr />
                      <div style={{ height: 10 }} />
                      <div className="small">
                        <strong>Controls (Accessibility)</strong>
                      </div>
                      <div className="small" style={{ marginTop: 4 }}>
                        Control Scheme:
                      </div>
                      <select
                        value={controlScheme}
                        onChange={(e) => setControlScheme(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "4px",
                          borderRadius: 6,
                          background: "#111",
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <option value="wasd">WASD Control</option>
                        <option value="dpad">D-Buttons Control</option>
                        <option value="touch">Touch (Analogue)</option>
                        <option value="gamepad">Gamepad</option>
                      </select>
                      <div style={{ height: 6 }} />
                      {/* Shape runner repurposed into a pickup-driven invulnerability effect (no manual toggle) */}
                      <div style={{ height: 6 }} />
                      <label
                        className="small"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={highContrast}
                          onChange={(e) => setHighContrast(e.target.checked)}
                        />
                        High-contrast aim & crosshair
                      </label>
                      <div style={{ height: 6 }} />
                      <label
                        className="small"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={performanceMode}
                          onChange={(e) => setPerformanceMode(e.target.checked)}
                        />
                        Performance Mode (lower caps)
                      </label>
                      <label
                        className="small"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 4,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={invulnTest}
                          onChange={(e) => setInvulnTest(e.target.checked)}
                        />
                        Invulnerability (Test)
                      </label>
                      <div className="tiny" style={{ opacity: 0.8 }}>
                        Active cap: {getActiveMax(wave || 1, performanceMode)} •
                        Boss cap: {getBossMax(wave || 1, performanceMode)}
                      </div>
                      <div style={{ height: 6 }} />
                      <div className="small" style={{ marginTop: 4 }}>
                        Pickup Scale:{" "}
                        <strong>{pickupScaleGlobal.toFixed(1)}x</strong>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={4.0}
                        step={0.1}
                        value={pickupScaleGlobal}
                        onChange={(e) =>
                          setPickupScaleGlobal(parseFloat(e.target.value))
                        }
                        style={{ width: "100%" }}
                        aria-label="Pickup scale multiplier"
                      />
                      <div style={{ height: 10 }} />
                      <div className="small" style={{ marginTop: 4 }}>
                        Asset Scale: <strong>{assetScale.toFixed(2)}x</strong>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={2.0}
                        step={0.05}
                        value={assetScale}
                        onChange={(e) =>
                          setAssetScale(parseFloat(e.target.value))
                        }
                        style={{ width: "100%" }}
                        aria-label="Global asset visual scale"
                      />
                      <div style={{ height: 6 }} />
                      <div className="tiny" style={{ opacity: 0.8 }}>
                        Scales hero, minions, roster enemies & pickups visually
                        only.
                      </div>
                      <div style={{ height: 14 }} />
                      <div className="small" style={{ marginTop: 4 }}>
                        Top-Down Zoom (Camera):{" "}
                        <strong>{topDownZoom.toFixed(2)}x</strong>
                      </div>
                      <input
                        type="range"
                        min={0.6}
                        max={1.4}
                        step={0.02}
                        value={topDownZoom}
                        onChange={(e) =>
                          setTopDownZoom(parseFloat(e.target.value))
                        }
                        style={{ width: "100%" }}
                        aria-label="Top-down camera zoom (lower = closer)"
                      />
                      <div style={{ height: 6 }} />
                      <div className="small" style={{ marginTop: 4 }}>
                        Static Cam Margin:{" "}
                        <strong>{staticCamMargin.toFixed(2)}</strong>
                      </div>
                      <input
                        type="range"
                        min={0.9}
                        max={1.2}
                        step={0.01}
                        value={staticCamMargin}
                        onChange={(e) =>
                          setStaticCamMargin(parseFloat(e.target.value))
                        }
                        style={{ width: "100%" }}
                        aria-label="Static camera fit margin"
                      />
                      <div style={{ height: 6 }} />
                      <div className="tiny" style={{ opacity: 0.8 }}>
                        Lower margin brings static cam closer; may clip extreme
                        arena growth.
                      </div>
                      <div style={{ height: 12 }} />
                      <button
                        className="button"
                        onClick={() => {
                          setAssetScale(1);
                          setTopDownZoom(0.85);
                          setStaticCamMargin(0.95);
                        }}
                      >
                        Reset Camera/View Settings
                      </button>
                      <div style={{ height: 10 }} />
                      <div className="small">
                        <strong>Arena</strong>
                      </div>
                      <label
                        className="small"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={arenaGrowEnabled}
                          onChange={(e) =>
                            setArenaGrowEnabled(e.target.checked)
                          }
                        />
                        Enable arena growth over time
                      </label>
                      <div className="tiny" style={{ opacity: 0.8 }}>
                        Current size: ±
                        {Number(boundaryLimit ?? BOUNDARY_LIMIT).toFixed(1)} •
                        Max cap: ±
                        {Math.min(maxArenaLimit, Math.floor(GROUND_HALF * 0.9))}
                      </div>
                      <div className="small" style={{ marginTop: 6 }}>
                        Growth mode
                      </div>
                      <select
                        value={arenaGrowthMode}
                        onChange={(e) => setArenaGrowthMode(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "4px",
                          borderRadius: 6,
                          background: "#111",
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                        disabled={!arenaGrowEnabled}
                      >
                        <option value="milestone">Every 10 levels</option>
                        <option value="time">Over time (per second)</option>
                      </select>
                      {arenaGrowthMode === "time" ? (
                        <>
                          <div className="small" style={{ marginTop: 4 }}>
                            Growth rate:{" "}
                            <strong>+{arenaGrowthRate.toFixed(2)}/s</strong>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.2}
                            step={0.01}
                            value={arenaGrowthRate}
                            onChange={(e) =>
                              setArenaGrowthRate(parseFloat(e.target.value))
                            }
                            style={{ width: "100%" }}
                            aria-label="Arena growth rate per second"
                            disabled={!arenaGrowEnabled}
                          />
                        </>
                      ) : (
                        <>
                          <div className="small" style={{ marginTop: 4 }}>
                            Growth per 10 levels:{" "}
                            <strong>
                              +{arenaGrowthPerMilestone.toFixed(1)}
                            </strong>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={20}
                            step={0.5}
                            value={arenaGrowthPerMilestone}
                            onChange={(e) =>
                              setArenaGrowthPerMilestone(
                                parseFloat(e.target.value)
                              )
                            }
                            style={{ width: "100%" }}
                            aria-label="Arena growth per 10 levels"
                            disabled={!arenaGrowEnabled}
                          />
                        </>
                      )}
                      <div className="small" style={{ marginTop: 4 }}>
                        Max arena size (±limit)
                      </div>
                      <input
                        type="range"
                        min={30}
                        max={Math.floor(GROUND_HALF * 0.9)}
                        step={1}
                        value={maxArenaLimit}
                        onChange={(e) =>
                          setMaxArenaLimit(parseFloat(e.target.value))
                        }
                        style={{ width: "100%" }}
                        aria-label="Max arena half-size limit"
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <button
                          className="button"
                          onClick={() => setBoundaryLimit(BOUNDARY_LIMIT)}
                        >
                          Reset Size
                        </button>
                        <button
                          className="button"
                          onClick={() =>
                            setBoundaryLimit(
                              Math.min(
                                maxArenaLimit,
                                Math.floor(GROUND_HALF * 0.9)
                              )
                            )
                          }
                        >
                          Snap to Max
                        </button>
                      </div>
                      <div style={{ height: 6 }} />
                      <div className="small">
                        <strong>Camera & Speed</strong>
                      </div>
                      <label
                        className="small"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={showStats}
                          onChange={(e) => setShowStats(e.target.checked)}
                        />
                        Performance stats (FPS)
                      </label>
                      <label
                        className="small"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={showDreiStats}
                          onChange={(e) => setShowDreiStats(e.target.checked)}
                        />
                        Dev resource overlay (drei Stats)
                      </label>
                      {showStats && (
                        <div className="tiny" style={{ opacity: 0.8 }}>
                          FPS: {fps.toFixed(1)}
                        </div>
                      )}
                      <div className="small">
                        Camera Mode: <strong>{cameraMode.toUpperCase()}</strong>
                      </div>
                      <div className="small" style={{ marginTop: 4 }}>
                        Top-down speed multiplier:{" "}
                        <strong>{topDownSpeedMul.toFixed(2)}x</strong>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={3.0}
                        step={0.1}
                        value={topDownSpeedMul}
                        onChange={(e) =>
                          setTopDownSpeedMul(parseFloat(e.target.value))
                        }
                        style={{ width: "100%" }}
                        aria-label="Top-down camera speed multiplier"
                      />
                      <div className="tiny" style={{ opacity: 0.8 }}>
                        Applies when camera is in Top-Down (8). Enemies and
                        player move faster.
                      </div>
                      <div style={{ height: 6 }} />
                      <div className="small" style={{ marginTop: 8 }}>
                        Spawn pressure:{" "}
                        <strong>{(spawnPressureMul * 100).toFixed(0)}%</strong>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={1.2}
                        step={0.01}
                        value={spawnPressureMul}
                        onChange={(e) =>
                          setSpawnPressureMul(parseFloat(e.target.value))
                        }
                        style={{ width: "100%" }}
                        aria-label="Spawn pressure multiplier"
                      />
                      <div className="tiny" style={{ opacity: 0.8 }}>
                        Lower values spawn fewer basic enemies per wave while
                        keeping overall pacing.
                      </div>
                      <div style={{ height: 6 }} />
                      <div className="small">
                        Controls: D-Buttons (default) or WASD • Mouse aim &
                        click to shoot
                      </div>
                      <div className="small">
                        F to toggle Auto-Fire • ESC/SPACE to pause
                      </div>
                      <div style={{ height: 10 }} />
                      <div className="small">
                        <strong>Visual Effects</strong>
                      </div>
                      <div className="small" style={{ marginTop: 4 }}>
                        Camera Shake Intensity:{" "}
                        <strong>{debugCameraShakeIntensity.toFixed(1)}x</strong>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={3.0}
                        step={0.1}
                        value={debugCameraShakeIntensity}
                        onChange={(e) =>
                          setDebugCameraShakeIntensity(
                            parseFloat(e.target.value)
                          )
                        }
                        style={{ width: "100%" }}
                        aria-label="Camera shake intensity multiplier"
                      />
                      <div className="tiny" style={{ opacity: 0.8 }}>
                        Multiplies camera shake intensity for damage,
                        explosions, and laser charging.
                      </div>
                      <div style={{ height: 6 }} />
                      <label
                        className="small"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={debugBorderEffectsEnabled}
                          onChange={(e) =>
                            setDebugBorderEffectsEnabled(e.target.checked)
                          }
                        />
                        Enable Border Effects
                      </label>
                      <label
                        className="small"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={debugLowHealthBorder}
                          onChange={(e) =>
                            setDebugLowHealthBorder(e.target.checked)
                          }
                        />
                        Low Health Border (Red)
                      </label>
                      <label
                        className="small"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={debugPickupGlowBorder}
                          onChange={(e) =>
                            setDebugPickupGlowBorder(e.target.checked)
                          }
                        />
                        Pickup Proximity Border (Green)
                      </label>
                      <label
                        className="small"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={debugLaserChargingBorder}
                          onChange={(e) =>
                            setDebugLaserChargingBorder(e.target.checked)
                          }
                        />
                        Laser Charging Border (Purple)
                      </label>
                      <div className="tiny" style={{ opacity: 0.8 }}>
                        Individual toggles for screen border visual effects.
                      </div>
                      <div style={{ height: 10 }} />
                    </div>
                  </CollapsiblePanel>
  );
}