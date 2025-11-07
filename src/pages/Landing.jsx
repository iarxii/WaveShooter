import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../contexts/GameContext.jsx";
import { HEROES } from "../data/roster.js";
import { useHistoryLog } from "../contexts/HistoryContext.jsx";
// Key art background image
const KEY_ART = new URL(
  "../assets/character_imgs/Hero/heroes_painted_dynamic_pose.jpg",
  import.meta.url
).href;

const LOGO = new URL(
  "../assets/Healthcare_Heroes_3d_logo.png",
  import.meta.url
).href;

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
      style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}
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

      <div style={{height:'100vh', width: '100vw',display:'grid',justifyContent:'bottom',alignItems:'bottom',inset:0,zIndex:0}}>
        <div style={{width:'100%',display:'flex',justifyContent:'center'}}>
          <img src={LOGO} alt="Healthcare Heroes Logo" style={{margin:'10px auto',maxWidth:'50%'}} />
        </div>
      </div>

      {/* Foreground content */}
      <div style={{ position: "relative", zIndex: 1, paddingTop: 56 }}>
        <div
          style={{
            maxWidth: 900,
            margin: "32px auto",
            padding: "16px",
            backgroundColor: "#02020282",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <h1>Healthcare Heroes — Hazard Wave Battle</h1>
          <p>
            A fast top-down wave shooter with a data-driven leveling system and
            educational enemy roster.
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
            }}
          >
            <Link to="/game" className="button">
              Start Game
            </Link>
            <Link to="/characters" className="button">
              Character Viewer
            </Link>
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
          </div>
          <div style={{ marginTop: 24 }}>
            <h3>What’s New</h3>
            <ul>
              <li>Leveling system with unlocks, budgets, and caps.</li>
              <li>Performance Mode toggle for low-spec devices.</li>
              <li>Boss schedule HUD and improved spawns.</li>
            </ul>
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
