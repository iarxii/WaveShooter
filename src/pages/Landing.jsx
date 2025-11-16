import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../contexts/GameContext.jsx";
import { HEROES } from "../data/roster.js";
import { useHistoryLog } from "../contexts/HistoryContext.jsx";
import { assetUrl } from "../utils/assetPaths.ts";
import { getHeroImageUrl } from "../data/heroImages.js";
// Key art background image
const KEY_ART = assetUrl("character_imgs/Hero/heroes_painted_dynamic_pose.jpg");
const LOGO = assetUrl("Healthcare_Heroes_3d_logo.png");

function formatHMS(ms) {
  const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return `${h}:${mm}:${ss}`;
}

export default function Landing() {
  const {
    bestScore,
    bestWave,
    totalPlayTimeMs,
    selectedHero,
    setSelectedHero,
  } = useGame();
  const { runs, clearHistory } = useHistoryLog();
  const recent = useMemo(() => runs.slice(-5).reverse(), [runs]);
  const fmtDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };
  return (
    <div
      style={{ position: "relative", minHeight: "80vh", overflow: "hidden" }}
    >
      {/* Full-screen key art layer */}
      <img
        src={KEY_ART}
        alt="Game key art"
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          objectPosition: "center",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          height: "calc(100vh - 76px - 32px)",
          width: "100vw",
          display: "grid",
          justifyContent: "bottom",
          alignItems: "bottom",
          inset: 0,
          zIndex: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            display: "grid",
            justifyContent: "center",
            alignItems: "end",
          }}
        >
          <img
            src={LOGO}
            className="logo-anim"
            alt="Healthcare Heroes Logo"
            style={{ margin: "10px auto", width: "50%", height: "auto" }}
          />
        </div>
      </div>

      {/* Foreground content */}
      <div style={{ position: "relative", zIndex: 1, paddingTop: 56 }}>
        <div
          style={{
            maxWidth: "80%",
            margin: "32px auto",
            padding: "16px",
            backgroundColor: "rgba(0, 85, 64, 0.6)" /*#02020282*/,
            borderRadius: 16,
            boxShadow: "0 4px 12px #005540" /*#0000004d #*/,
          }}
        >
          <h1>Become a Healthcare Hero Today!</h1>
          <p>
            <b>Healthcare Heroes: Hazard Wave Battle</b> is a fast top-down wave
            shooter with a data-driven leveling system and educational enemy
            roster.
          </p>
          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              margin: "16px 0",
            }}
          >
            <div>
              <strong>Best Score:</strong> {bestScore}
            </div>
            <div>
              <strong>Best Wave/Level:</strong> {bestWave}
            </div>
            <div>
              <strong>Total Play Time:</strong> {formatHMS(totalPlayTimeMs)}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <label
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              Hero:
              <select
                value={selectedHero}
                onChange={(e) => setSelectedHero(e.target.value)}
              >
                {HEROES.map((h) => (
                  <option key={h.name} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
            <Link to="/modes" className="button">
              Start Playing
            </Link>
            <Link to="/characters" className="button">
              Explore Character
            </Link>
          </div>

          {/* Two column layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 32,
              marginBottom: 28,
            }}
          >
            {/* Left column - Selected Character Card */}
            <div>
              <h3>Selected Hero</h3>
              {HEROES.find((h) => h.name === selectedHero) && (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    backgroundColor: "#ffffff10",
                    borderRadius: 8,
                    padding: 16,
                    border: "1px solid #ffffff20",
                  }}
                >
                  <img
                    src={getHeroImageUrl(selectedHero)}
                    alt={selectedHero}
                    style={{
                      width: "100%",
                      maxWidth: 200,
                      height: "auto",
                      borderRadius: 4,
                      marginBottom: 12,
                      display: "block",
                    }}
                  />
                  <div>
                    <h4 style={{marginTop:'0px'}}>{HEROES.find((h) => h.name === selectedHero).name}</h4>
                    <p style={{ opacity: 0.8 }}>
                      Role: {HEROES.find((h) => h.name === selectedHero).role}
                    </p>
                    <div style={{ marginTop: 12 }}>
                      <strong>Ability:</strong> {HEROES.find((h) => h.name === selectedHero).ability} ({HEROES.find((h) => h.name === selectedHero).cooldown}s cooldown)
                    </div>
                    <div style={{ marginTop: 4, opacity: 0.8 }}>
                      {HEROES.find((h) => h.name === selectedHero).notes}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right column - What's New */}
            <div>
              <h3>What's New</h3>
              <ul>
                <li>Leveling system with unlocks, budgets, and caps.</li>
                <li>Performance Mode toggle for low-spec devices.</li>
                <li>Boss schedule HUD and improved spawns.</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <h3 style={{ margin: 0 }}>Recent Runs</h3>
              <button onClick={clearHistory}>Clear</button>
            </div>
            {recent.length === 0 ? (
              <div style={{ opacity: 0.8, marginTop: 8 }}>
                No runs yet. Play a game to see history.
              </div>
            ) : (
              <div
                style={{
                  marginTop: 8,
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  gap: "6px 12px",
                }}
              >
                <div style={{ opacity: 0.7 }}>Date</div>
                <div style={{ opacity: 0.7, textAlign: "right" }}>Score</div>
                <div style={{ opacity: 0.7, textAlign: "right" }}>Wave</div>
                <div style={{ opacity: 0.7, textAlign: "right" }}>Mode</div>
                {recent.map((r) => (
                  <React.Fragment key={r.id}>
                    <div>{fmtDate(r.at)}</div>
                    <div style={{ textAlign: "right" }}>{r.score}</div>
                    <div style={{ textAlign: "right" }}>{r.wave}</div>
                    <div style={{ textAlign: "right" }}>
                      {r.performanceMode ? "Perf" : "Normal"}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
