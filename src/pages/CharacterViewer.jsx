import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ENEMIES, HEROES } from "../data/roster.js";
import { getEnemyImageUrl } from "../data/enemyImages.js";
import { getHeroImageUrl } from "../data/heroImages.js";
import { assetUrl } from "../utils/assetPaths.ts";

const colorHex = {
  Red: "#ef4444",
  Orange: "#f97316",
  Blue: "#3b82f6",
  "Dark Blue": "#1e3a8a",
  Gray: "#6b7280",
  Black: "#111827",
  Green: "#22c55e",
  "Dark Green": "#065f46",
  Cyan: "#06b6d4",
  "Dark Cyan": "#155e75",
  Pink: "#ec4899",
  "Dark Pink": "#9d174d",
  Purple: "#a855f7",
  Yellow: "#f59e0b",
  Violet: "#7c3aed",
  White: "#e5e7eb",
  Brown: "#92400e",
};

// Placeholder image for enemies until dedicated avatars provided (bundled asset)
const ENEMY_IMG_PLACEHOLDER = assetUrl("character_imgs/jpeg (2).jpg");

function SelectCard({ title, subtitle, chip, selected, onClick, children }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      style={{
        border: selected ? "2px solid #60a5fa" : "1px solid #333",
        outline: "none",
        borderRadius: 8,
        padding: 12,
        background: selected ? "#1f2937" : "#1118",
        cursor: "pointer",
        boxShadow: selected ? "0 0 0 3px #60a5fa33 inset" : "none",
        userSelect: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        {chip && <span style={{ opacity: 0.8, fontSize: 12 }}>{chip}</span>}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
          {subtitle}
        </div>
      )}
      {children}
    </div>
  );
}

function ImageViewer({ src, alt = "Enemy avatar" }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{
        height: 420,
        border: "1px solid #333",
        borderRadius: 8,
        overflow: "hidden",
        background: "#0b0f14",
        display: "flex",
        cursor: "zoom-in",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "top center",
          display: "block",
          transform: hover ? "scale(1.06)" : "scale(1)",
          transition: "transform 240ms ease",
          willChange: "transform",
        }}
      />
    </div>
  );
}

export default function CharacterViewer() {
  const [minLevel, setMinLevel] = useState(1);
  const [tier, setTier] = useState("all");
  const [selected, setSelected] = useState(() => ({
    kind: "hero",
    item: HEROES[0],
  }));

  const enemies = useMemo(() => {
    return ENEMIES.filter((e) => e.unlock >= minLevel)
      .filter((e) => (tier === "all" ? true : e.tier === Number(tier)))
      .sort((a, b) => a.unlock - b.unlock || a.tier - b.tier);
  }, [minLevel, tier]);

  // Preload currently listed enemy images to reduce first-click flicker
  useEffect(() => {
    const urls = enemies.map((e) => getEnemyImageUrl(e.name)).filter(Boolean);
    urls.forEach((u) => {
      const img = new Image();
      img.src = u;
    });
  }, [enemies]);

  // Preload hero thumbnails once
  useEffect(() => {
    HEROES.forEach((h) => {
      const u = getHeroImageUrl(h.name);
      if (u) {
        const i = new Image();
        i.src = u;
      }
    });
  }, []);

  function selectHero(h) {
    const next = { kind: "hero", item: h };
    setSelected(next);
  }
  function selectEnemy(e) {
    const next = { kind: "enemy", item: e };
    setSelected(next);
    // For enemies we show an image viewer; clear any model loading/errors
    // no-op
  }

  return (
    <div style={{ height: "auto", width: "100vw" }}>
      <div
        style={{
          // width: "100%",
          height: "calc(100vh - 76px)",
          margin: "0 auto",
          padding: "80px 16px 16px 16px",
          display: "grid",
          gridTemplateColumns:
            "minmax(220px, 1fr) minmax(420px, 1.2fr) minmax(280px, 1fr)",
          gap: 16,
        }}
      >
        {/* Left: Heroes */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <h2 style={{ margin: "0" }}>Healthcare Heroes</h2>
            <Link to="/game" className="button">
              Play
            </Link>
          </div>
          <div
            className="accent rounded-8"
            style={{
              overflowY: "auto",
              display: "grid",
              gap: 10,
              gridAutoRows: "min-content",
              padding: 8,
            }}
          >
            {HEROES.map((h) => (
              <SelectCard
                key={h.name}
                title={h.name}
                subtitle={h.role}
                selected={
                  selected.kind === "hero" && selected.item.name === h.name
                }
                onClick={() => selectHero(h)}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    marginTop: 8,
                  }}
                >
                  <img
                    src={getHeroImageUrl(h.name)}
                    alt={`${h.name} portrait`}
                    style={{
                      width: 48,
                      height: 48,
                      objectFit: "cover",
                      objectPosition: "top center",
                      borderRadius: 6,
                      flex: "0 0 auto",
                    }}
                  />
                  <div style={{ fontSize: 12, opacity: 0.9 }}>
                    <div>
                      <strong>Ability:</strong> {h.ability}{" "}
                      {h.cooldown ? `(CD ${h.cooldown}s)` : ""}
                    </div>
                    {h.notes && (
                      <div style={{ marginTop: 6, opacity: 0.85 }}>
                        {h.notes}
                      </div>
                    )}
                  </div>
                </div>
              </SelectCard>
            ))}
          </div>
        </div>

        {/* Center: 3D Viewer + Details */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 0,
          }}
        >
          <div>
            <h1 style={{ margin: "0 0 8px" }}>Character Viewer</h1>
            <p style={{ margin: "0 0 12px", opacity: 0.85 }}>
              Heroes show a 3D model with orbit/pan/zoom. Enemies show avatar
              images.
            </p>
            {selected.kind === "hero" ? (
              <ImageViewer
                src={getHeroImageUrl(selected.item?.name)}
                alt={`${selected.item?.name} portrait`}
              />
            ) : (
              <ImageViewer
                src={
                  getEnemyImageUrl(selected.item?.name) || ENEMY_IMG_PLACEHOLDER
                }
                alt={`${selected.item?.name} avatar`}
              />
            )}
          </div>

          {/* Extended details */}
          <div
            style={{
              border: "1px solid #333",
              borderRadius: 8,
              padding: 12,
              background: "#1118",
              minHeight: 160,
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <h2 style={{ margin: 0 }}>{selected.item?.name}</h2>
              <span style={{ opacity: 0.8, fontSize: 13 }}>
                {selected.kind === "hero"
                  ? selected.item?.role
                  : `Tier ${selected.item?.tier}`}
              </span>
            </div>

            {selected.kind === "hero" ? (
              <div style={{ marginTop: 6, fontSize: 14, opacity: 0.95 }}>
                <div>
                  <strong>Ability:</strong> {selected.item.ability}{" "}
                  {selected.item.cooldown
                    ? `(CD ${selected.item.cooldown}s)`
                    : ""}
                </div>
                {selected.item.notes && (
                  <div style={{ marginTop: 6 }}>{selected.item.notes}</div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 6, fontSize: 14, opacity: 0.95 }}>
                <div>{selected.item.type}</div>
                {selected.item.scientificName && (
                  <div style={{ marginTop: 4 }}>
                    <strong>
                      <em>{selected.item.scientificName}</em>
                    </strong>
                  </div>
                )}
                {selected.item.realWorldEffect && (
                  <div style={{ marginTop: 8 }}>
                    <strong>Real-world:</strong> {selected.item.realWorldEffect}
                  </div>
                )}
                {selected.item.gameplayEffect && (
                  <div style={{ marginTop: 4 }}>
                    <strong>Gameplay:</strong> {selected.item.gameplayEffect}
                  </div>
                )}
                {selected.item.stats && (
                  <div style={{ marginTop: 8, fontSize: 13, opacity: 0.95 }}>
                    <span>HP: {selected.item.stats.health}</span>
                    <span style={{ marginLeft: 10 }}>
                      Speed: {selected.item.stats.speed}
                    </span>
                    <span style={{ marginLeft: 10 }}>
                      Damage: {selected.item.stats.damage}
                    </span>
                    {selected.item.maxConcurrent != null && (
                      <span style={{ marginLeft: 10 }}>
                        Max: {selected.item.maxConcurrent}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Enemies with filters */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              margin: "0 0 8px",
            }}
          >
            <h2 style={{ margin: "0" }}>Hazardous Agents</h2>
          </div>
          <div
            className="accent rounded-8"
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
              margin: "0 0 10px",
              padding: 8,
            }}
          >
            <label style={{ fontSize: 13 }}>
              Min Unlock:{" "}
              <input
                type="number"
                min={1}
                max={99}
                value={minLevel}
                onChange={(e) => setMinLevel(Number(e.target.value) || 1)}
                style={{ width: 64 }}
              />
            </label>
            <label style={{ fontSize: 13 }}>
              Tier:
              <select value={tier} onChange={(e) => setTier(e.target.value)}>
                <option value="all">All</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </label>
          </div>
          <div
            style={{
              overflowY: "auto",
              display: "grid",
              gap: 10,
              gridAutoRows: "min-content",
            }}
          >
            {enemies.map((e) => (
              <SelectCard
                key={e.name}
                title={e.name}
                subtitle={e.type}
                chip={`Tier ${e.tier}`}
                selected={
                  selected.kind === "enemy" && selected.item.name === e.name
                }
                onClick={() => selectEnemy(e)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 6,
                    fontSize: 12,
                    opacity: 0.9,
                  }}
                >
                  <span>Unlock: {e.unlock}</span>
                  <span>Shape: {e.shape}</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    Color:{" "}
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        display: "inline-block",
                        borderRadius: 4,
                        background: colorHex[e.color] || "#888",
                        border: "1px solid #0003",
                      }}
                      title={e.color}
                    />
                  </span>
                </div>
                {e.scientificName && (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                    <strong>
                      <em>{e.scientificName}</em>
                    </strong>
                  </div>
                )}
              </SelectCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
