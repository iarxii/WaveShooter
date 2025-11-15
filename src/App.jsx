import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stats, Text, AdaptiveDpr, Html } from "@react-three/drei";
import { SceneEnvironment } from "./contexts/EnvironmentContext.tsx";
import * as THREE from "three";
import { useHistoryLog } from "./contexts/HistoryContext.jsx";
import { useGame } from "./contexts/GameContext.jsx";
import PlayerEntity from "./entities/Player.jsx";
import MinionEntity from "./entities/Minion.jsx";
import TriangleBossEntity from "./entities/TriangleBoss.jsx";
import PipeBossEntity from "./entities/PipeBoss.jsx";
import ClusterBossEntity from "./entities/ClusterBoss.jsx";
import ConeBossEntity from "./entities/ConeBoss.jsx";
import FlyingDroneEntity from "./entities/FlyingDrone.jsx";
import RosterEnemyEntity from "./entities/RosterEnemy.jsx";
import { heroColorFor, HEROES } from "./data/roster.js";
import { getHeroImageUrl } from "./data/heroImages.js";
import { EffectsRenderer, useEffects } from "./effects/EffectsContext.jsx";
import { ENEMIES as ROSTER } from "./data/roster.js";
import { useSound } from "./contexts/SoundContext.jsx";
import PerfCollector from "./components/PerfCollector.tsx";
import PerfOverlay from "./components/PerfOverlay.tsx";
import PerfLongTaskObserver from "./components/PerfLongTaskObserver.tsx";
import * as perf from "./perf.ts";
import FXOrbs from "./components/FXOrbs";
import applyDamageToHero from "./utils/damage.js";
import PlayerRadialHUD from "./components/PlayerRadialHUD.jsx";
import { verifyRegisteredAssets, assetUrl } from "./utils/assetPaths.ts";

const LOGO = assetUrl("Healthcare_Heroes_3d_logo.png");

// GAME CONSTANTS
const PLAYER_SPEED = 24; // faster than minions to keep mobility advantage
const PLAYER_SPEED_CAP = 50; // cap player base speed for control stability
const SPEED_DEBUFF_FACTOR = 0.9;
const SPEED_DEBUFF_DURATION_MS = 4000;
const BOUNDARY_LIMIT = 50;
const GROUND_SIZE = 200; // planeGeometry args
const GROUND_HALF = GROUND_SIZE / 2;
// Decoupled shape path radius for invulnerability runner (independent of arena boundary)
const SHAPE_PATH_RADIUS = 24;
const ENEMY_SPEED = 18;
const RUNNER_SPEED_MULTIPLIER = 1.6;
const BOSS_SPEED = 6;
const TRIANGLE_BOSS_SPEED_MULT = 2.3; // triangle boss moves slightly faster than ordinary boss
const WAVE_INTERVAL = 2000; // ms between waves spawning
const BULLET_SPEED = 38;
const BULLET_LIFETIME = 3000; // ms
const FIRE_RATE = 120; // ms between shots (faster)
// Player bullet damage per hit (before enemy-specific scaling)
const PLAYER_BULLET_DAMAGE = 2;
const BULLET_POOL_SIZE = 50;
const PICKUP_COLLECT_DISTANCE = 3.8;
const AIM_RAY_LENGTH = 8;
const MAX_PICKUPS = 40; // increased economy: allow more concurrent pickups without choking FPS
// Life pickup magnetization
const LIFE_MAGNET_RANGE = 16; // u: start attracting within this radius
const LIFE_MAGNET_MIN_SPEED = 6; // u/s at far edge of magnet range
const LIFE_MAGNET_MAX_SPEED = 28; // u/s when very close
// Global pickup visual scaling (now exposed via UI; see state `pickupScaleGlobal`)
// Bomb ability constants
const BOMB_DAMAGE = 4;
const BOMB_STUN_MS = 1400;
const BOMB_CONTACT_RADIUS = 1.4;
const BOMB_AOE_RADIUS = 6.2;
const BOMB_UP_VEL = 12;
const BOMB_GRAVITY = 24;
const BOMB_SPAWN_INTERVAL_MS = 250; // 4 per second
const BOMB_ABILITY_DURATION_MS = 6000; // extended: total 6s
// Bouncer constants
const BOUNCER_TELEGRAPH_MS = 4000;
const BOUNCER_UP_VEL = 16;
const BOUNCER_LIFETIME_MS = 3000;
// Speed boost planes (green triangles) constants
const SPEED_BUFF_DURATION_MS = 4000;
const SPEED_BOOST_LIFETIME = 4500;
const SPEED_BOOST_RADIUS_MIN = 10;
const SPEED_BOOST_RADIUS_MAX = 18;
// Speed tuning helpers (normalize new high speeds against a baseline feel)
const SPEED_TUNING_BASE = 14; // reference player speed used for original tuning
const SPEED_SCALE = Math.max(0.5, PLAYER_SPEED / SPEED_TUNING_BASE);
// Caps and smoothing to avoid jitter/teleport at high speeds
const MINION_MAX_SPEED = 12; // u/s hard cap for minion & ordinary boss chase
const TRIANGLE_CHARGE_MAX = 18; // u/s hard cap for triangle charge
const TRIANGLE_CIRCLE_MAX = 12; // u/s hard cap for triangle circling
// Enemy damage scaling
const DAMAGE_SCALE_PER_WAVE = 0.04; // +4% per wave
const DAMAGE_SCALE_MAX = 4.0; // cap at 4x (balanced)
// Enemy speed scaling and player compensation
const ENEMY_SPEED_SCALE_PER_WAVE = 0.03; // +3% enemy speed per wave
const ENEMY_SPEED_SCALE_MAX = 1.5; // cap at 1.5x (balanced)
const APPROACH_SLOW_RADIUS = 2.5; // start slowing when near target
const POST_LAND_SETTLE = 0.3; // s to ramp in after spawn landing
// Knockback tuning (exposed constants)
const KNOCKBACK = {
  minion: 12.0,
  boss: 8.0,
  triangle: 7.0,
};
const KNOCKBACK_DECAY = {
  minion: 8.0,
  boss: 6.0,
  triangle: 6.0,
};
const KNOCKBACK_DISTANCE_MAX = 8.0; // full strength when very close, fades to 0 by this distance

// Portal / spawning constants
const PORTAL_LIFETIME = 4500; // ms that a portal stays open
const PORTALS_PER_WAVE_MIN = 2;
const PORTALS_PER_WAVE_MAX = 4;
const PORTAL_RADIUS_MIN = 12;
const PORTAL_RADIUS_MAX = 20;
const PORTAL_STAGGER_MS = 260; // ms between enemy drops per portal
// Rare small portals behind the player appear starting at this wave
const BEHIND_SPAWN_MIN_WAVE = 8;
// Temporary feature flag to fully disable arena growth logic for performance
const ARENA_GROWTH_DISABLED = true;
const DROP_SPAWN_HEIGHT = 8; // y height enemies begin falling from
// Feature flags: control radial HUD vs. text labels independently
// NOTE: radial HUD can be toggled off if it causes visual issues; keep labels separate.
const SHOW_PLAYER_RADIAL_HUD = false;
const SHOW_PLAYER_LABELS = true;
const DROP_SPEED = 10; // units/sec downward during spawn

// Contact damage by enemy type
const CONTACT_DAMAGE = {
  minion: 2,
  boss: 20,
  triangle: 31,
  cone: 42,
};

// Leveling configuration (data-driven)
const LEVEL_CONFIG = {
  levelIsWave: true,
  budget: { base: 8, perLevel: 2, over10: 3 },
  caps: {
    activeBase: 16, // ActiveMax(L) = min(activeBase + floor(L/2), activeMax)
    activePer2Levels: 1,
    activeMax: 48,
    bossBands: [
      [1, 4, 1],
      [5, 8, 2],
      [9, 999, 3],
    ],
    drones: 16,
    conesMax: 6,
  },
  costs: {
    minion: 1,
    bossMinion: 3,
    cluster: 8,
    triangle: 10,
    pipe: 12,
    cone: 12,
  },
  unlocks: {
    minion: 1,
    bossMinion: 4,
    triangle: 3,
    cone: 6,
    pipe: 7,
    cluster: 8,
    drone: 7,
  },
  tierWeights: [
    { range: [1, 4], weights: { T1: 1.0 } },
    { range: [5, 7], weights: { T1: 0.8, T2: 0.2 } },
    { range: [8, 10], weights: { T1: 0.6, T2: 0.3, T3: 0.1 } },
    { range: [11, 12], weights: { T1: 0.4, T2: 0.35, T3: 0.2, T4: 0.05 } },
    { range: [13, 99], weights: { T1: 0.3, T2: 0.35, T3: 0.25, T4: 0.1 } },
  ],
  // Boss spawn chances when eligible
  chances: { cone: 0.8, pipe: 0.6 },
};

function getBudget(level) {
  if (level <= 10)
    return LEVEL_CONFIG.budget.base + LEVEL_CONFIG.budget.perLevel * level;
  return (
    LEVEL_CONFIG.budget.base +
    LEVEL_CONFIG.budget.perLevel * 10 +
    LEVEL_CONFIG.budget.over10 * (level - 10)
  );
}

// Analogue stick for touch controls
function AnalogStick({ onVectorChange, side = "left" }) {
  const baseRef = useRef();
  const knobRef = useRef();
  const pointerIdRef = useRef(null);
  const radius = 64; // px

  const toVec = useCallback((clientX, clientY) => {
    const r = baseRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // normalize to [-1,1]
    const nx = Math.max(-1, Math.min(1, dx / radius));
    const nz = Math.max(-1, Math.min(1, dy / radius));
    return { x: nx, z: nz };
  }, []);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (!baseRef.current) return;
      // Only accept pointers that start inside base
      const r = baseRef.current.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        return;
      pointerIdRef.current = e.pointerId;
      baseRef.current.setPointerCapture(pointerIdRef.current);
      const v = toVec(e.clientX, e.clientY);
      if (knobRef.current)
        knobRef.current.style.transform = `translate(${v.x * radius}px, ${v.z * radius}px)`;
      onVectorChange(v.x, v.z);
      e.preventDefault();
    };
    const onPointerMove = (e) => {
      if (pointerIdRef.current !== e.pointerId) return;
      const v = toVec(e.clientX, e.clientY);
      if (knobRef.current)
        knobRef.current.style.transform = `translate(${v.x * radius}px, ${v.z * radius}px)`;
      onVectorChange(v.x, v.z);
    };
    const onPointerUp = (e) => {
      if (pointerIdRef.current !== e.pointerId) return;
      try {
        baseRef.current.releasePointerCapture(pointerIdRef.current);
      } catch {}
      pointerIdRef.current = null;
      if (knobRef.current) knobRef.current.style.transform = `translate(0px, 0px)`;
      onVectorChange(0, 0);
    };
    const el = baseRef.current;
    if (el) {
      el.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    }
    return () => {
      if (el) el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onVectorChange, toVec]);

  const baseStyle = {
    position: "fixed",
    bottom: 18,
    // left or right stick positioning
    ...(side === "left" ? { left: 18 } : { right: 18 }),
    width: radius * 2 + "px",
    height: radius * 2 + "px",
    borderRadius: "50%",
    background: "rgba(0,0,0,0.18)",
    border: "2px solid var(--accent)",
    boxShadow: "0 6px 26px rgba(34,197,94,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    touchAction: "none",
  };
  const knobStyle = {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.12)",
    border: "2px solid var(--accent)",
    boxShadow: "0 6px 16px rgba(0,0,0,0.6)",
    transform: "translate(0px, 0px)",
    transition: "transform 60ms linear",
    willChange: "transform",
  };

  return (
    <div ref={baseRef} style={baseStyle} aria-hidden>
      <div ref={knobRef} style={knobStyle} />
    </div>
  );
}
function getActiveMax(level, perfMode) {
  const base =
    LEVEL_CONFIG.caps.activeBase +
    Math.floor(level / 2) * LEVEL_CONFIG.caps.activePer2Levels;
  const clamp = perfMode
    ? Math.min(LEVEL_CONFIG.caps.activeMax, 24)
    : LEVEL_CONFIG.caps.activeMax;
  return Math.min(base, clamp);
}
function getBossMax(level, perfMode) {
  const band =
    LEVEL_CONFIG.caps.bossBands.find(
      ([lo, hi]) => level >= lo && level <= hi
    ) || LEVEL_CONFIG.caps.bossBands[LEVEL_CONFIG.caps.bossBands.length - 1];
  const max = band[2];
  return perfMode ? Math.min(max, 2) : max;
}
function getTierWeights(level) {
  const band =
    LEVEL_CONFIG.tierWeights.find(
      (b) => level >= b.range[0] && level <= b.range[1]
    ) || LEVEL_CONFIG.tierWeights[LEVEL_CONFIG.tierWeights.length - 1];
  return band.weights;
}

// Map simple color names in roster to hex colors
function colorHex(name) {
  const map = {
    Red: "#ff4444",
    Orange: "#f97316",
    Blue: "#3b82f6",
    "Dark Blue": "#1e3a8a",
    Gray: "#9ca3af",
    Black: "#111827",
    Green: "#22c55e",
    "Dark Green": "#065f46",
    Cyan: "#06b6d4",
    "Dark Cyan": "#155e75",
    Pink: "#ec4899",
    "Dark Pink": "#9d174d",
    Purple: "#a855f7",
    Yellow: "#eab308",
    Violet: "#8b5cf6",
    White: "#e5e7eb",
    Brown: "#92400e",
    Oval: "#a855f7",
  };
  return map[name] || "#ff0055";
}

// Choose a roster enemy by tier and level unlock
function pickRosterByTier(level, tierNum) {
  const candidates = ROSTER.filter(
    (e) => (e.unlock || 1) <= level && (e.tier || 1) === tierNum
  );
  if (candidates.length === 0) {
    // fallback: nearest lower tier, else any
    const lower = ROSTER.filter((e) => (e.unlock || 1) <= level).sort(
      (a, b) => (a.tier || 1) - (b.tier || 1)
    );
    return lower[0] || ROSTER[0];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Lightweight color helpers for factory spec palettes
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}
function rgbToHex(r, g, b) {
  const to = (v) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
function lighten(hex, amt = 0.2) {
  const [r, g, b] = hexToRgb(hex);
  const L = (v) => v + (255 - v) * amt;
  return rgbToHex(L(r), L(g), L(b));
}
function darken(hex, amt = 0.2) {
  const [r, g, b] = hexToRgb(hex);
  const D = (v) => v * (1 - amt);
  return rgbToHex(D(r), D(g), D(b));
}
function rand(min, max) {
  return min + Math.random() * (max - min);
}
function randi(min, max) {
  return Math.floor(rand(min, max + 1));
}

// Curated harmonious palettes used to shuffle enemy colors by default
const PALETTES = [
  {
    base: "#B5764C",
    spike: "#B5764C",
    node: "#FFD24A",
    arc: "#FFE9A3",
    emissive: "#B0774F",
  },
  {
    base: "#6AB7FF",
    spike: "#6AB7FF",
    node: "#FFE08A",
    arc: "#FFEBCD",
    emissive: "#5AA7EF",
  },
  {
    base: "#FF7AB6",
    spike: "#FF7AB6",
    node: "#FFD1E8",
    arc: "#FFF0F6",
    emissive: "#F564A5",
  },
  {
    base: "#8BD17C",
    spike: "#8BD17C",
    node: "#EAF8D5",
    arc: "#FFF2C1",
    emissive: "#76C166",
  },
  {
    base: "#C9A6FF",
    spike: "#C9A6FF",
    node: "#FFE08A",
    arc: "#FFEBCD",
    emissive: "#B38BFA",
  },
  {
    base: "#FFB86B",
    spike: "#FFB86B",
    node: "#FFF0C2",
    arc: "#FFE5A0",
    emissive: "#F2A65A",
  },
];
function pickPalette() {
  const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  return {
    baseColor: p.base,
    spikeColor: p.spike,
    nodeColor: p.node,
    arcColor: p.arc,
    emissive: p.emissive,
  };
}

// Build a randomized Character Factory spec using roster hints
function randomFactorySpecFromRoster(
  picked,
  waveNumber,
  baseHex,
  scaleFactor = 1
) {
  const id = (picked?.name || "enemy")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
  const base = baseHex || colorHex(picked?.color || "Red");
  const seed = (Math.random() * 1e9) | 0;
  // Map roster shape loosely to base shapes; otherwise randomize
  const shapeName = (picked?.shape || "").toLowerCase();
  const baseShapes = [
    "icosahedron",
    "sphere",
    "triPrism",
    "hexPrism",
    "cylinder",
    "capsule",
  ];
  let baseShape = "icosahedron";
  if (shapeName.includes("triangle")) baseShape = "triPrism";
  else if (
    shapeName.includes("hex") ||
    shapeName.includes("octa") ||
    shapeName.includes("square")
  )
    baseShape = "hexPrism";
  else if (shapeName.includes("circle") || shapeName.includes("oval"))
    baseShape = Math.random() < 0.6 ? "sphere" : "icosahedron";
  else baseShape = baseShapes[randi(0, baseShapes.length - 1)];

  // Scale features slightly by wave for variety
  const waveT = Math.min(1, Math.max(0, (waveNumber - 1) / 20));
  // Apply scaleFactor to macro dimensions (radius/height) but keep subtle variation
  const radius = rand(0.9, 1.15) * scaleFactor;
  const detail = randi(0, 2);
  const scaleX = rand(0.85, 1.25);
  const scaleY = rand(0.8, 1.35);
  const height =
    baseShape === "cylinder" ||
    baseShape === "capsule" ||
    baseShape.includes("Prism")
      ? rand(1.2, 2.6) * scaleFactor
      : undefined;

  // Spike cluster scaling: length & radius scale directly; count scales sub-linearly for readability
  const spikeCountBase = Math.max(
    10,
    Math.floor(22 + waveT * 12 + Math.random() * 24)
  );
  const spikeCount = Math.round(
    spikeCountBase * (0.6 + 0.4 * Math.min(scaleFactor, 2))
  ); // damp growth
  const spikeLength = rand(0.34, 0.58) * (0.85 + 0.15 * scaleFactor);
  const spikeRadius = rand(0.09, 0.14) * (0.7 + 0.3 * scaleFactor);
  const spikeStyles = ["cone", "inverted", "disk", "block", "tentacle"];
  const spikeStyle = spikeStyles[randi(0, spikeStyles.length - 1)];
  const spikeBaseShift = rand(-0.12, 0.18);

  // Decorative nodes/arcs: scale count gently to avoid overdraw explosion
  const nodeCount = randi(3, 9) + Math.round((scaleFactor - 1) * 2);
  const arcCount = randi(2, 7) + Math.round((scaleFactor - 1) * 1);
  // Default to a shuffled curated palette for vivid variety (ignores baseHex)
  const pal = pickPalette();
  const baseColor = pal.baseColor;
  const spikeColor = pal.spikeColor;
  const nodeColor = pal.nodeColor;
  const arcColor = pal.arcColor;
  const emissive = pal.emissive;

  const nodeStrobeModes = ["off", "unified", "alternating"];
  const nodeStrobeMode = nodeStrobeModes[randi(0, nodeStrobeModes.length - 1)];
  const nodeStrobeColorA = nodeColor;
  const nodeStrobeColorB = arcColor;
  const nodeStrobeSpeed = rand(5, 12);

  const quality = Math.random() < 0.5 ? "med" : "high";

  return {
    id,
    seed,
    baseShape,
    radius,
    detail,
    height,
    scaleX,
    scaleY,
    spikeCount,
    spikeLength,
    spikeRadius,
    spikeStyle,
    spikeBaseShift,
    spikePulse: true,
    spikePulseIntensity: rand(0.12, 0.35),
    nodeCount,
    arcCount,
    baseColor,
    spikeColor,
    nodeColor,
    arcColor,
    emissive,
    emissiveIntensityCore: 0.35,
    spikeEmissive: spikeColor,
    emissiveIntensitySpikes: 0.12,
    metalnessCore: 0.25,
    roughnessCore: 0.85,
    metalnessSpikes: 0.15,
    roughnessSpikes: 0.9,
    metalnessNodes: 1.0,
    roughnessNodes: 0.25,
    nodeStrobeMode,
    nodeStrobeColorA,
    nodeStrobeColorB,
    nodeStrobeSpeed,
    spin: rand(0.12, 0.35),
    roll: rand(0.0, 0.15),
    breathe: rand(0.008, 0.02),
    flickerSpeed: rand(6, 10),
    hitboxEnabled: Math.random() < 0.15,
    hitboxVisible: false,
    hitboxScaleMin: 1.0,
    hitboxScaleMax: 1.0 + rand(0, 0.3),
    hitboxSpeed: rand(0.5, 2.0),
    hitboxMode: "sin",
    quality,
  };
}

// Pickup notification popup component
function PickupPopup({ pickup, onComplete }) {
  const [visible, setVisible] = useState(true);
  const hideTimerRef = useRef(null);
  const removeTimerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  // Keep latest onComplete without retriggering the timer
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      removeTimerRef.current = setTimeout(() => {
        onCompleteRef.current && onCompleteRef.current();
      }, 500); // Allow fade out
    }, 3000);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
    };
  }, []);

  // (Moved perf overlay toggle state to root App component for global scope)

  const info =
    pickup.type === "health"
      ? { name: "Health Pack", effect: "+25 Health", color: "#22c55e" }
      : pickup.type === "armour"
      ? {
          name: "Armour Pack",
          effect: `+${pickup.amount ?? 25} AP`,
          color: "#60a5fa",
        }
      : pickup.type === "lasers"
      ? { name: "Laser Array", effect: "High Damage (5s)", color: "#ff4d4d" }
      : pickup.type === "shield"
      ? {
          name: "Shield Bubble",
          effect: "Keeps enemies away (5s)",
          color: "#66ccff",
        }
      : pickup.type === "pulsewave"
      ? {
          name: "Pulse Wave",
          effect: "3 bursts launch enemies (5s)",
          color: "#f97316",
        }
      : pickup.type === "power"
      ? {
          name: "Power Up",
          effect: `+${pickup.amount ?? 50} Score`,
          color: "#60a5fa",
        }
      : pickup.type === "invuln"
      ? { name: "Invulnerability", effect: "Immune (5s)", color: "#facc15" }
      : pickup.type === "bombs"
      ? { name: "Bomb Kit", effect: "4/s bombs for 6s", color: "#111827" }
      : pickup.type === "speedboost"
      ? { name: "Speed Boost", effect: "Speed +10% (4s)", color: "#22c55e" }
      : pickup.type === "dmgscale"
      ? {
          name: "Enemy Fury",
          effect: `Damage x${(pickup.scale ?? 1).toFixed(2)}`,
          color: "#f97316",
        }
      : pickup.type === "speedramp"
      ? {
          name: "Speed Surge",
          effect: `Enemies x${(pickup.scale ?? 1).toFixed(2)} • Player +1`,
          color: "#22c55e",
        }
      : pickup.type === "level"
      ? {
          name: `Level ${pickup.level}`,
          effect: "Stay sharp!",
          color: "#60a5fa",
        }
      : pickup.type === "boss"
      ? {
          name: "Boss Incoming",
          effect: `${pickup.name || "Boss"} • Level ${
            pickup.level ?? ""
          }`.trim(),
          color: pickup.color || "#ffb020",
        }
      : { name: "Debuff", effect: "Speed Reduced -10% (4s)", color: "#f97316" };

  return (
    <div
      className={`pickup-popup ${visible ? "visible" : "hidden"}`}
      style={{ "--popup-color": info.color }}
    >
      <div className="pickup-name">{info.name}</div>
      <div className="pickup-effect">{info.effect}</div>
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
    } catch {}
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

// Utility: random position on plane
function randPos(range = 18) {
  const x = (Math.random() - 0.5) * range * 2;
  const z = (Math.random() - 0.5) * range * 2;
  return [x, 0.5, z];
}

// Bullet object pool for performance
class BulletPool {
  constructor(size) {
    this.bullets = [];
    this.activeBullets = new Map();
    this.nextId = 1;
    // Maintain a freelist of indices for O(1) allocation
    this.freeList = [];
    // Pre-create bullet objects
    for (let i = 0; i < size; i++) {
      this.bullets.push({
        id: 0,
        active: false,
        pos: [0, 0, 0],
        dir: [0, 0, 0],
        timeAlive: 0,
        style: null,
      });
      this.freeList.push(i);
    }
  }

  getBullet(pos, dir, style = null) {
    if (this.freeList.length === 0) return null;
    const idx = this.freeList.pop();
    const bullet = this.bullets[idx];
    bullet.id = this.nextId++;
    bullet.active = true;
    bullet.pos[0] = pos[0];
    bullet.pos[1] = pos[1];
    bullet.pos[2] = pos[2];
    bullet.dir[0] = dir[0];
    bullet.dir[1] = dir[1];
    bullet.dir[2] = dir[2];
    bullet.timeAlive = 0;
    bullet.style = style;
    this.activeBullets.set(bullet.id, bullet);
    return bullet;
  }

  returnBullet(id) {
    const bullet = this.activeBullets.get(id);
    if (bullet) {
      bullet.active = false;
      // Push its index back to freelist (index is its position in this.bullets)
      const idx = this.bullets.indexOf(bullet);
      if (idx >= 0) this.freeList.push(idx);
      this.activeBullets.delete(id);
    }
  }

  getActiveBullets() {
    return Array.from(this.activeBullets.values());
  }

  clear() {
    this.bullets.forEach((b) => (b.active = false));
    this.activeBullets.clear();
    this.freeList.length = 0;
    for (let i = 0; i < this.bullets.length; i++) this.freeList.push(i);
  }
}

// Bullet component
function Bullet({ bullet, onExpire, isPaused, speed }) {
  const ref = useRef();
  const geom = useMemo(() => new THREE.SphereGeometry(0.25, 12, 12), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x00ff66,
        emissive: 0x004422,
        roughness: 0.4,
        metalness: 0,
      }),
    []
  );
  // Initialize position on mount
  useEffect(() => {
    if (ref.current) {
      ref.current.position.set(
        bullet.pos[0],
        bullet.pos[1] || 0.5,
        bullet.pos[2]
      );
    }
  }, [bullet.id]);
  // Apply style on update
  useEffect(() => {
    if (!ref.current) return;
    const s = bullet?.style?.scale || 1;
    ref.current.scale.setScalar(s);
    if (bullet?.style?.color) {
      mat.color.set(bullet.style.color);
      mat.emissive.set(bullet.style.color);
    } else {
      mat.color.set(0x00ff66);
      mat.emissive.set(0x004422);
    }
  }, [bullet?.style, mat]);

  useFrame((_, dt) => {
    if (!ref.current || !bullet.active || isPaused) return;
    perf.start("bullet_update");
    // Move bullet using adjustable speed
    const v = typeof speed === "number" ? speed : BULLET_SPEED;
    ref.current.position.x += bullet.dir[0] * v * dt;
    ref.current.position.z += bullet.dir[2] * v * dt;
    // Update data
    bullet.pos[0] = ref.current.position.x;
    bullet.pos[2] = ref.current.position.z;
    bullet.timeAlive += dt * 1000;
    const outOfBounds =
      bullet.timeAlive > BULLET_LIFETIME ||
      Math.abs(ref.current.position.x) > 50 ||
      Math.abs(ref.current.position.z) > 50;
    perf.end("bullet_update");
    if (outOfBounds) onExpire(bullet.id);
  });

  return <mesh ref={ref} geometry={geom} material={mat} castShadow />;
}

// Laser beam visual & damage applicator
function LaserBeam({
  pos = [0, 0, 0],
  dir = [0, 0, -1],
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
    () => new THREE.CylinderGeometry(thinRadius, thinRadius, effectiveLength, 8, 1, true),
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
      const q = new THREE.Quaternion().setFromUnitVectors(axis, dirVec.clone().normalize());
      b.quaternion.copy(q);
    }
  }, [pos, dirVec, length]);

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
        pos[0] + dirVec.x * (effectiveLength / 2) + rightVec.x * (offset + jitter),
        pos[1] + dirVec.y * (effectiveLength / 2),
        pos[2] + dirVec.z * (effectiveLength / 2) + rightVec.z * (offset + jitter)
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
          if (perpDist2 <= (radius * 1.0) * (radius * 1.0)) {
            // apply damage scaled by dt
            const dmg = dmgPerSecond * dt; // fractional units
            onDamage && onDamage(ge.id, dmg);
          }
        } catch {}
      }
    }
  });

  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={beamRefs[i]} geometry={geomThin} material={mat} castShadow />
      ))}
    </group>
  );
}

// Full-screen loading overlay shown while Suspense children are resolving
function LoadingOverlay() {
  // simple local state for animated dots
  const [dots, setDots] = React.useState(0);
  React.useEffect(() => {
    const iid = setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => clearInterval(iid);
  }, []);

  const overlayStyle = {
    position: 'fixed',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    zIndex: 9999,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 100%)',
    color: '#fff',
    flexDirection: 'column',
  };
  const boxStyle = {
    padding: '18px 24px',
    borderRadius: 8,
    textAlign: 'center',
    background: 'rgba(0,0,0,0.35)',
    boxShadow: '0 6px 30px rgba(0,0,0,0.6)',
  };
  const spinnerStyle = {
    width: 56,
    height: 56,
    borderRadius: '50%',
    border: '4px solid rgba(255,255,255,0.08)',
    borderTopColor: '#ff4d4d',
    margin: '0 auto 10px',
  };
  const [angle, setAngle] = React.useState(0);
  // rotate spinner via JS to avoid injecting <style> tags inside Canvas tree
  React.useEffect(() => {
    const iid = setInterval(() => setAngle((a) => (a + 36) % 360), 80);
    return () => clearInterval(iid);
  }, []);
  const spinnerTransform = { transform: `rotate(${angle}deg)` };

  return (
    <div style={overlayStyle} aria-live="polite" role="status">
      <div style={boxStyle}>
        <div style={{ ...spinnerStyle, ...spinnerTransform }} />
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Loading assets</div>
        <div style={{ opacity: 0.9 }}>{'Please wait' + '.'.repeat(dots)}</div>
      </div>
    </div>
  );
}

// Pickup is a small box that floats with collision detection
function Pickup({
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

    // Life pickup magnet: when player within range, attract towards player
    if (type === "life" && playerPosRef?.current) {
      const p = playerPosRef.current;
      const dx = p.x - ref.current.position.x;
      const dz = p.z - ref.current.position.z;
      const d2 = dx * dx + dz * dz;
      const r = LIFE_MAGNET_RANGE;
      if (d2 <= r * r) {
        const d = Math.max(0.0001, Math.sqrt(d2));
        const nx = dx / d;
        const nz = dz / d;
        const t = Math.max(0, Math.min(1, 1 - d / r));
        const speed =
          LIFE_MAGNET_MIN_SPEED +
          t * (LIFE_MAGNET_MAX_SPEED - LIFE_MAGNET_MIN_SPEED);
        // Prevent overshoot; if close, snap to player to ensure collect
        const step = speed * dt;
        if (step >= d) {
          ref.current.position.x = p.x;
          ref.current.position.z = p.z;
        } else {
          ref.current.position.x += nx * step;
          ref.current.position.z += nz * step;
        }
      }
    }

    // Check collision with player (single-fire guard)
    if (!collectedRef.current) {
      const distance = ref.current.position.distanceTo(playerPosRef.current);
      if (distance < PICKUP_COLLECT_DISTANCE) {
        collectedRef.current = true;
        onCollect(id);
      }
    }
  });

  return (
    <mesh ref={ref} position={pos}>
      {type === "life" ? (
        <primitive object={heartGeom} attach="geometry" />
      ) : type === "health" ? (
        <boxGeometry args={[0.5, 0.5, 0.5]} />
      ) : type === "armour" ? (
        <capsuleGeometry args={[0.28, 0.5, 6, 12]} />
      ) : type === "lasers" ? (
        <cylinderGeometry args={[0.18, 0.18, 0.9, 10]} />
      ) : type === "shield" ? (
        <sphereGeometry args={[0.45, 16, 12]} />
      ) : type === "pulsewave" ? (
        <ringGeometry args={[0.4, 0.52, 32]} />
      ) : type === "invuln" ? (
        <capsuleGeometry args={[0.25, 0.6, 4, 8]} />
      ) : type === "bombs" ? (
        <sphereGeometry args={[0.32, 12, 12]} />
      ) : isDiamond ? (
        <octahedronGeometry args={[0.5, 0]} />
      ) : (
        <boxGeometry args={[0.5, 0.5, 0.5]} />
      )}
      {type === "life" && (
        <Text
          ref={lifeLabelRef}
          position={[0, 0.9, 0]}
          fontSize={0.45}
          color="#22c55e"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          1UP
        </Text>
      )}
      {type === "life" ? (
        <primitive object={heartMat} attach="material" />
      ) : (
        <meshStandardMaterial
          color={
            type === "health"
              ? 0x22c55e
              : type === "armour"
              ? 0x3b82f6
              : type === "lasers"
              ? 0xff1493
              : type === "shield"
              ? 0x66ccff
              : type === "pulsewave"
              ? 0xf97316
              : type === "invuln"
              ? 0xfacc15
              : type === "bombs"
              ? 0x000000
              : 0xa855f7 /* power (fallback) */
          }
          emissive={
            type === "power" && isDiamond
              ? 0x224466
              : type === "health"
              ? 0x001100
              : type === "invuln"
              ? 0x443300
              : type === "bombs"
              ? 0x000000
              : type === "lasers"
              ? 0x660022
              : type === "pulsewave"
              ? 0x331400
              : type === "armour"
              ? 0x001d40
              : 0x1d0033
          }
          emissiveIntensity={
            type === "power" && isDiamond
              ? 1.5
              : type === "invuln"
              ? 0.9
              : type === "lasers"
              ? 1.3
              : type === "pulsewave"
              ? 0.8
              : 0.45
          }
        />
      )}
    </mesh>
  );
}

// Portal visual (ground ring + beam), animates while active
function Portal({ pos, isPaused }) {
  const planeRef = useRef();
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x800000,
        emissive: 0x220000,
        roughness: 0.8,
      }),
    []
  );

  useFrame(() => {
    if (isPaused || !planeRef.current) return;
    // subtle pulse to indicate activity without allocations
    const s = 1 + Math.sin(performance.now() * 0.005) * 0.05;
    planeRef.current.scale.set(s, s, s);
  });

  return (
    <mesh
      ref={planeRef}
      position={[pos[0], 0.051, pos[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      material={mat}
    >
      <planeGeometry args={[4, 4]} />
    </mesh>
  );
}

// Speed boost visual: green triangular plane that pulses
function SpeedBoostPlane({ pos, isPaused }) {
  const ref = useRef();
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x002200,
        roughness: 0.7,
      }),
    []
  );
  const geom = useMemo(() => new THREE.CircleGeometry(2.2, 3), []); // triangle
  useFrame(() => {
    if (!ref.current || isPaused) return;
    const t = performance.now() * 0.005;
    const s = 1 + Math.sin(t) * 0.08;
    ref.current.scale.set(s, s, s);
    // subtle emissive pulse
    mat.emissiveIntensity = 0.4 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.3));
  });
  return (
    <mesh
      ref={ref}
      position={[pos[0], 0.052, pos[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      material={mat}
    >
      <primitive object={geom} attach="geometry" />
    </mesh>
  );
}

// Bouncer telegraph: pulsing ring on ground for 4s
function BouncerTelegraph({ pos }) {
  const ref = useRef();
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      }),
    []
  );
  const geom = useMemo(() => new THREE.RingGeometry(0.6, 1.0, 48), []);
  useFrame(() => {
    if (!ref.current) return;
    const t = performance.now() * 0.004;
    const s = 1 + 0.2 * Math.sin(t);
    ref.current.scale.set(s, s, s);
    mat.opacity = 0.25 + 0.15 * (0.5 + 0.5 * Math.sin(t * 1.6));
  });
  return (
    <mesh
      ref={ref}
      position={[pos[0], 0.055, pos[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      material={mat}
    >
      <primitive object={geom} attach="geometry" />
    </mesh>
  );
}

// Bouncer entity: launches upward and despawns
function Bouncer({ data, onExpire }) {
  const ref = useRef();
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x002233,
        roughness: 0.6,
        metalness: 0.1,
      }),
    []
  );
  const geom = useMemo(() => new THREE.CapsuleGeometry(0.3, 0.8, 6, 12), []);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const now = performance.now();
    const age = now - (data.bornAt || now);
    // Move upward with slight easing
    const vy = data.velY || BOUNCER_UP_VEL;
    const nx = data.pos[0];
    const nz = data.pos[2];
    const baseY = ref.current.position?.y ?? (data.pos[1] || 0.5);
    const ny = baseY + vy * dt;
    ref.current.position.set(nx, ny, nz);
    if (ny > 22 || age > BOUNCER_LIFETIME_MS) {
      onExpire && onExpire(data.id);
    }
  });
  return <mesh ref={ref} position={data.pos} geometry={geom} material={mat} />;
}

// Translucent shield bubble around the player; color/size can be customized per use
function ShieldBubble({
  playerPosRef,
  isPaused,
  color = 0x66ccff,
  radius = 1.4,
  baseOpacity = 0.25,
}) {
  const ref = useRef();
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: baseOpacity,
      }),
    [color, baseOpacity]
  );
  const geom = useMemo(
    () => new THREE.SphereGeometry(radius, 20, 20),
    [radius]
  );
  useFrame((_, dt) => {
    if (!ref.current) return;
    const p = playerPosRef.current;
    ref.current.position.set(p.x, 0.5, p.z);
    if (!isPaused) {
      const t = performance.now() * 0.004;
      // gentle pulse in scale and opacity
      const s = 1 + 0.06 * (0.5 + 0.5 * Math.sin(t));
      ref.current.scale.set(s, s, s);
      mat.opacity =
        baseOpacity * 0.7 + baseOpacity * 0.5 * (0.5 + 0.5 * Math.sin(t * 1.3));
    }
  });
  return <mesh ref={ref} geometry={geom} material={mat} />;
}

// One-shot shimmer pulse around the player; fades out quickly
function ShimmerPulse({
  playerPosRef,
  isPaused,
  color = 0x66ccff,
  durationMs = 500,
  maxScale = 1.9,
  onDone,
}) {
  const ref = useRef();
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 }),
    [color]
  );
  const geom = useMemo(() => new THREE.SphereGeometry(1.2, 20, 20), []);
  const startRef = useRef(performance.now());
  useFrame(() => {
    if (!ref.current) return;
    const p = playerPosRef.current;
    ref.current.position.set(p.x, 0.5, p.z);
    if (isPaused) return;
    const now = performance.now();
    const t = Math.max(0, Math.min(1, (now - startRef.current) / durationMs));
    // Ease-out opacity and scale up slightly with a soft pulse
    const scale = 1 + (maxScale - 1) * (0.6 * t + 0.4 * Math.sin(t * Math.PI));
    ref.current.scale.set(scale, scale, scale);
    mat.opacity = 0.6 * (1 - t);
    if (t >= 1) {
      onDone && onDone();
    }
  });
  return <mesh ref={ref} geometry={geom} material={mat} />;
}

// Black -> Orange strobing aura used for Bomb Kit (attention-grabbing)
function BombStrobe({ playerPosRef, isPaused, radius = 1.6 }) {
  const ref = useRef();
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x000000,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
      }),
    []
  );
  const geom = useMemo(() => new THREE.SphereGeometry(radius, 20, 20), [radius]);
  useFrame(() => {
    if (!ref.current) return;
    const p = playerPosRef.current;
    ref.current.position.set(p.x, 0.5, p.z);
    if (isPaused) return;
    const t = performance.now() * 0.006; // speed multiplier
    // fast strobe between black and orange
    const freq = 8.0; // strobes per second approx
    const mix = 0.5 * (1 + Math.sign(Math.sin(t * freq)) * 1); // hard on/off feel
    // softened via sine for smoother transition
    const smooth = 0.5 * (1 + Math.sin(t * freq * 1.0));
    const blend = mix * 0.9 + smooth * 0.1;
    // orange color
    const or = 1.0;
    const og = 0.4;
    const ob = 0.0;
    mat.emissive.setRGB(or * blend, og * blend, ob * blend);
    // opacity pulse a bit
    mat.opacity = 0.35 + 0.5 * blend;
    // scale pulse
    const s = 1 + 0.08 * Math.sin(t * freq * 2);
    ref.current.scale.set(s, s, s);
  });
  return <mesh ref={ref} geometry={geom} material={mat} />;
}

// Player (simple rectangle box) with WASD movement and mouse aiming
function Player({
  position,
  setPositionRef,
  onShoot,
  isPaused,
  autoFire,
  controlScheme = "dpad",
  moveInputRef,
  moveSourceRef,
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
  invulnActive = false,
}) {
  const ref = useRef();
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
  // Movement refs
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
  const aimDirRef = useRef(new THREE.Vector3(0, 0, -1)); // planar aim dir (x,z)
  const airVelY = useRef(0);
  const airFwdVel = useRef(0);
  const airFwdDir = useRef(new THREE.Vector3(0, 0, -1));
  const slamArmed = useRef(false);
  const launchCooldown = useRef(0);
  const GRAVITY = 24;
  const LAUNCH_UP_VEL = 14;
  const LAUNCH_TARGET_FRACTION = 0.5; // of total play length (2*BOUNDARY_LIMIT) from border
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
  const debuffTimer = useRef(0); // seconds remaining for speed debuff
  // Dash state
  const dashing = useRef(false);
  const dashTime = useRef(0);
  const dashDuration = 0.25; // seconds
  const dashVel = useRef(new THREE.Vector3());
  const portalHitCooldown = useRef(0);
  const boundaryGraceRef = useRef(0); // seconds of grace after respawn to ignore boundary launch
  const boostTimer = useRef(0); // seconds remaining for speed boost
  const boostHitCooldown = useRef(0);
  // Percentage-based speed boost multiplier (e.g., 1.1 for +10%)
  const boostMulRef = useRef(1);
  const lastArcToken = useRef(0);
  const boundaryJumpActive = useRef(false);
  // Reset position and motion after respawn/restart
  useEffect(() => {
    if (!ref.current) return;
    // Center player and clear motion
    ref.current.position.set(0, 0.5, 0);
    airVelY.current = 0;
    airFwdVel.current = 0;
    airFwdDir.current.set(0, 0, -1);
    slamArmed.current = false;
    launchCooldown.current = 0;
    portalHitCooldown.current = 0;
    // Clear inputs
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
    // Short grace: do not trigger boundary launch immediately after respawn
    boundaryGraceRef.current = 2.0;
  }, [resetToken]);

  useEffect(() => {
    if (isPaused) return;

    function down(e) {
      // Support WASD and Arrow keys regardless of scheme
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
        // Left click
        const now = performance.now();
        if (now - lastShot.current > FIRE_RATE) {
          lastShot.current = now;
          // Compute forward dir from current rotation to shoot towards aim
          const dir = forward.current
            .set(0, 0, -1)
            .applyQuaternion(ref.current.quaternion);
          dir.y = 0;
          dir.normalize();
          onShoot(ref.current.position, [dir.x, 0, dir.z]);
        }
      } else if (e.button === 2) {
        // Right click: start charge
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
          // Always perform a forward arc jump on release
          airVelY.current = LAUNCH_UP_VEL;
          const totalLen = 2 * (boundaryLimit ?? BOUNDARY_LIMIT);
          const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen);
          const target = new THREE.Vector3()
            .copy(ref.current.position)
            .addScaledVector(aimDirRef.current, desired);
          const margin = 1.0;
          target.x = Math.max(
            Math.min(target.x, (boundaryLimit ?? BOUNDARY_LIMIT) - margin),
            -(boundaryLimit ?? BOUNDARY_LIMIT) + margin
          );
          target.z = Math.max(
            Math.min(target.z, (boundaryLimit ?? BOUNDARY_LIMIT) - margin),
            -(boundaryLimit ?? BOUNDARY_LIMIT) + margin
          );
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
        // hide indicators
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
  // Global visual asset scale (does not affect gameplay math / collisions)
  // (moved to App scope)
  // Dedicated key jump (Ctrl/Enter): short press -> vertical slam, long press (>2s) -> arc jump towards aim
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
        // Only trigger if on ground
        if (ref.current.position.y <= 0.5) {
          // Always perform a forward arc jump on release
          airVelY.current = LAUNCH_UP_VEL;
          const totalLen = 2 * (boundaryLimit ?? BOUNDARY_LIMIT);
          const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen);
          const target = new THREE.Vector3()
            .copy(ref.current.position)
            .addScaledVector(aimDirRef.current, desired);
          const margin = 1.0;
          target.x = Math.max(
            Math.min(target.x, (boundaryLimit ?? BOUNDARY_LIMIT) - margin),
            -(boundaryLimit ?? BOUNDARY_LIMIT) + margin
          );
          target.z = Math.max(
            Math.min(target.z, (boundaryLimit ?? BOUNDARY_LIMIT) - margin),
            -(boundaryLimit ?? BOUNDARY_LIMIT) + margin
          );
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
        // hide indicators
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

  // Trigger an external arc jump when arcTriggerToken increments
  // Shape Runner -> HeroTuner bridge: map numeric keys to hero tuning commands
  useEffect(() => {
    if (isPaused) return;
    const onKey = (e) => {
      if (e.key === "1") {
        window.dispatchEvent(
          new CustomEvent("heroTunerCommand", {
            detail: { type: "shapeRunner", mode: "cw" },
          })
        );
      } else if (e.key === "2") {
        window.dispatchEvent(
          new CustomEvent("heroTunerCommand", {
            detail: { type: "shapeRunner", mode: "ccw" },
          })
        );
      } else if (e.key === "3") {
        window.dispatchEvent(
          new CustomEvent("heroTunerCommand", {
            detail: { type: "heroAction", action: "dashBackward" },
          })
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPaused]);
  useEffect(() => {
    if (!ref.current) return;
    if (arcTriggerToken && arcTriggerToken !== lastArcToken.current) {
      lastArcToken.current = arcTriggerToken;
      // Same arc jump used in boundary launch: hop forward along aim
      airVelY.current = LAUNCH_UP_VEL;
      const totalLen = 2 * (boundaryLimit ?? BOUNDARY_LIMIT);
      const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen);
      const target = new THREE.Vector3()
        .copy(ref.current.position)
        .addScaledVector(aimDirRef.current, desired);
      const margin = 1.0;
      target.x = Math.max(
        Math.min(target.x, (boundaryLimit ?? BOUNDARY_LIMIT) - margin),
        -(boundaryLimit ?? BOUNDARY_LIMIT) + margin
      );
      target.z = Math.max(
        Math.min(target.z, (boundaryLimit ?? BOUNDARY_LIMIT) - margin),
        -(boundaryLimit ?? BOUNDARY_LIMIT) + margin
      );
      const disp = new THREE.Vector3().subVectors(target, ref.current.position);
      const dispLen = Math.max(0.001, Math.hypot(disp.x, disp.z));
      airFwdDir.current.set(disp.x / dispLen, 0, disp.z / dispLen);
      const tFlight = (2 * LAUNCH_UP_VEL) / GRAVITY;
      airFwdVel.current = dispLen / tFlight;
      slamArmed.current = true;
    }
  }, [arcTriggerToken]);

  // Auto-fire using the render loop for reliability instead of setInterval
  const autoFireTimerRef = useRef(0);

  // Rotate player smoothly to face mouse (projected onto ground) or face shape origin when auto-following
  useFrame((state, dt) => {
    if (!ref.current || isPaused) return;

    // Dash movement override: while dashing, move along dashVel and skip normal handling
    if (dashing.current) {
      dashTime.current += dt;
      ref.current.position.addScaledVector(dashVel.current, dt);
      // Clamp to arena bounds
      ref.current.position.x = Math.max(
        Math.min(
          ref.current.position.x,
          (boundaryLimit ?? BOUNDARY_LIMIT) - 0.5
        ),
        -(boundaryLimit ?? BOUNDARY_LIMIT) + 0.5
      );
      ref.current.position.z = Math.max(
        Math.min(
          ref.current.position.z,
          (boundaryLimit ?? BOUNDARY_LIMIT) - 0.5
        ),
        -(boundaryLimit ?? BOUNDARY_LIMIT) + 0.5
      );
      if (dashTime.current >= dashDuration) {
        dashing.current = false;
        onDashEnd &&
          onDashEnd({ x: ref.current.position.x, z: ref.current.position.z });
      }
      return;
    }

    // Auto-fire cadence (FIRE_RATE) using accumulated dt
    if (autoFire) {
      autoFireTimerRef.current += dt * 1000;
      if (autoFireTimerRef.current >= FIRE_RATE) {
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
      // reset timer when disabled to avoid burst on re-enable
      autoFireTimerRef.current = 0;
    }

    if (autoFollow && autoFollow.active) {
      // Face toward the shape origin (center)
      const cx = autoFollow.center?.[0] ?? 0;
      const cz = autoFollow.center?.[2] ?? 0;
      tmpDir.current.set(
        cx - ref.current.position.x,
        0,
        cz - ref.current.position.z
      );
      if (tmpDir.current.lengthSq() > 1e-6) {
        aimDirRef.current.copy(tmpDir.current).normalize(); // also align arc launch direction
        const targetYaw =
          Math.atan2(tmpDir.current.x, tmpDir.current.z) + Math.PI;
        const diff =
          ((targetYaw - lastYaw.current + Math.PI) % (Math.PI * 2)) - Math.PI;
        lastYaw.current = lastYaw.current + diff * (1 - Math.exp(-30 * dt));
        ref.current.rotation.y = lastYaw.current;
      }
    } else if (autoAimEnabled) {
      // Auto-aim: prefer cluster center at short/mid range, else highest-priority enemy at long range
      const p = ref.current.position;
      let target = null;
      let targetIsCluster = false;
      const SHORT_RANGE = 10;
      const MID_RANGE = 18;
      const LONG_RANGE = 36;
      let cx = 0,
        cz = 0,
        ccount = 0;
      if (window.gameEnemies && window.gameEnemies.length) {
        // Enemy clustering analysis (enemy_ai)
        perf.start("enemy_ai");
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
        // Large pull near us -> aim at centroid
        if (ccount >= 5) {
          cx /= ccount;
          cz /= ccount;
          target = { x: cx, z: cz };
          targetIsCluster = true;
        } else {
          // Highest level at long range
          let best = null;
          for (const ge of window.gameEnemies) {
            if (!ge?.ref?.current) continue;
            const ex = ge.ref.current.position.x;
            const ez = ge.ref.current.position.z;
            const dx = ex - p.x;
            const dz = ez - p.z;
            const d2 = dx * dx + dz * dz;
            if (d2 > LONG_RANGE * LONG_RANGE) continue;
            // Priority: cone > boss (includes triangle boss) > minion
            let pri = 1;
            if (ge.isCone) pri = 3;
            else if (ge.isBoss) pri = 2;
            // Score prioritizes level first, distance second
            const score = pri * 10000 - d2;
            if (!best || score > best.score) best = { score, x: ex, z: ez };
          }
          if (best) target = { x: best.x, z: best.z };
        }
        perf.end("enemy_ai");
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
          // widen beam based on target distance
          if (rayRef.current) {
            const dist = Math.min(tmpDir.current.length(), MID_RANGE);
            const width = baseRayThickness + Math.min(dist / 12, 1) * 0.14;
            rayRef.current.scale.x = width;
          }
        }
      } else {
        // fallback to pointer if no auto-aim target
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
      // Update raycaster from pointer and find intersection on ground plane
      state.raycaster.setFromCamera(state.pointer, state.camera);
      const hit = state.raycaster.ray.intersectPlane(plane, aimPoint.current);
      if (hit) {
        // Direction from player to aim point
        tmpDir.current.subVectors(aimPoint.current, ref.current.position);
        tmpDir.current.y = 0;
        if (tmpDir.current.lengthSq() > 1e-6) {
          // planar aim dir for boundary launch
          aimDirRef.current.copy(tmpDir.current).normalize();
          // Add PI to face the pointer (fix inverted forward vs. -Z default)
          const targetYaw =
            Math.atan2(tmpDir.current.x, tmpDir.current.z) + Math.PI;
          // Exponential damping for smooth rotation
          const diff =
            ((targetYaw - lastYaw.current + Math.PI) % (Math.PI * 2)) - Math.PI;
          lastYaw.current = lastYaw.current + diff * (1 - Math.exp(-30 * dt));
          ref.current.rotation.y = lastYaw.current;

          // Dynamic width based on aim distance (clamped)
          const dist = tmpDir.current.length();
          if (rayRef.current) {
            const width = baseRayThickness + Math.min(dist / 12, 1) * 0.14; // ~0.08 to ~0.22
            rayRef.current.scale.x = width; // geometry is 1 unit wide by default
          }
        }
      }
    }

    // Movement (keyboard or external vector)
    // Keyboard vector (WASD + Arrow keys)
    const k = keysRef.current;
    const keyMx =
      (k.d ? 1 : 0) - (k.a ? 1 : 0) + (k.right ? 1 : 0) - (k.left ? 1 : 0);
    const keyMz =
      (k.s ? 1 : 0) - (k.w ? 1 : 0) + (k.down ? 1 : 0) - (k.up ? 1 : 0);

    // External vector (DPad / Runner)
    const extMx = moveInputRef ? moveInputRef.current.x : 0;
    const extMz = moveInputRef ? moveInputRef.current.z : 0;

    let mx = 0,
      mz = 0;
    if (controlScheme === "wasd") {
      mx = keyMx;
      mz = keyMz;
    } else {
      // dpad scheme prefers external vector, falls back to keyboard if zero
      if (Math.abs(extMx) > 0.001 || Math.abs(extMz) > 0.001) {
        mx = extMx;
        mz = extMz;
      } else {
        mx = keyMx;
        mz = keyMz;
      }
    }
    // Auto-follow path override: follow edges of selected shape (circle/triangle/rectangle)
    if (autoFollow && autoFollow.active) {
      const cx = autoFollow.center?.[0] ?? 0;
      const cz = autoFollow.center?.[2] ?? 0;
      const px = ref.current.position.x;
      const pz = ref.current.position.z;
      const shape = autoFollow.shape || "circle";
      const r = Math.max(0.001, autoFollow.radius || 1);
      const dirSign = autoFollow.dirSign || 1;

      const clampStep = (v, maxStep) =>
        Math.max(-maxStep, Math.min(maxStep, v));

      if (shape === "circle") {
        let dx = px - cx;
        let dz = pz - cz;
        const len = Math.hypot(dx, dz);
        if (len < 0.001) {
          dx = 1;
          dz = 0;
        }
        // tangent (CCW default); dirSign=-1 flips to clockwise
        let tx = -dz * dirSign;
        let tz = dx * dirSign;
        const tlen = Math.hypot(tx, tz) || 1;
        mx = tx / tlen;
        mz = tz / tlen;
        // smooth radial correction: add as velocity bias for smoothness
        const radialErr = r - len;
        if (Math.abs(radialErr) > 0.001) {
          const rx = dx / (len || 1);
          const rz = dz / (len || 1);
          const corrGain = 2.5; // lower gain for smoother glue to path
          mx += rx * radialErr * corrGain * dt;
          mz += rz * radialErr * corrGain * dt;
        }
      } else {
        // Polygon path (hexagon/rectangle): compute nearest point on perimeter and edge tangent
        const segs = [];
        if (shape === "hexagon") {
          const verts = [];
          for (let i = 0; i < 6; i++) {
            const a = -Math.PI / 2 + i * ((2 * Math.PI) / 6); // start at top, CCW order; dirSign flips for CW
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
          // tangent along segment; dirSign flips direction
          mx = (best.vx / elen) * dirSign;
          mz = (best.vz / elen) * dirSign;
          // smooth correction towards nearest point to stick to edge: add to velocity, not position
          const corrGain = 8.0;
          mx += (best.nx - px) * corrGain * dt;
          mz += (best.nz - pz) * corrGain * dt;
        }
      }
    }
    // normalize and compute speed multiplier (runner covers larger area)
    const mlen = Math.hypot(mx, mz) || 1;
    mx /= mlen;
    mz /= mlen;
    // debuff countdown and factor
    portalHitCooldown.current = Math.max(0, portalHitCooldown.current - dt);
    debuffTimer.current = Math.max(0, debuffTimer.current - dt);
    boostHitCooldown.current = Math.max(0, boostHitCooldown.current - dt);
    boostTimer.current = Math.max(0, boostTimer.current - dt);
    const debuffMul = invulnActive
      ? 1
      : debuffTimer.current > 0
      ? SPEED_DEBUFF_FACTOR
      : 1;
    const baseSpeed =
      basePlayerSpeed * (boostTimer.current > 0 ? boostMulRef.current : 1);
    const speedMul =
      (moveSourceRef && moveSourceRef.current === "runner"
        ? RUNNER_SPEED_MULTIPLIER
        : 1) * debuffMul;
    // base movement
    ref.current.position.x += mx * (baseSpeed * speedMul) * dt;
    ref.current.position.z += mz * (baseSpeed * speedMul) * dt;

    // Boundary detection -> launch
    launchCooldown.current = Math.max(0, launchCooldown.current - dt);
    // Skip boundary launch while grace is active
    boundaryGraceRef.current = Math.max(0, boundaryGraceRef.current - dt);
    if (launchCooldown.current <= 0 && boundaryGraceRef.current <= 0) {
      if (
        ref.current.position.x > (boundaryLimit ?? BOUNDARY_LIMIT) - 0.1 ||
        ref.current.position.x < -(boundaryLimit ?? BOUNDARY_LIMIT) + 0.1 ||
        ref.current.position.z > (boundaryLimit ?? BOUNDARY_LIMIT) - 0.1 ||
        ref.current.position.z < -(boundaryLimit ?? BOUNDARY_LIMIT) + 0.1
      ) {
        // clamp to bounds
        ref.current.position.x = Math.max(
          Math.min(ref.current.position.x, boundaryLimit ?? BOUNDARY_LIMIT),
          -(boundaryLimit ?? BOUNDARY_LIMIT)
        );
        ref.current.position.z = Math.max(
          Math.min(ref.current.position.z, boundaryLimit ?? BOUNDARY_LIMIT),
          -(boundaryLimit ?? BOUNDARY_LIMIT)
        );
        // launch upward and forward along an arc, landing inward at ~30% of play length from the border
        airVelY.current = LAUNCH_UP_VEL;
        const totalLen = 2 * (boundaryLimit ?? BOUNDARY_LIMIT);
        const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen); // minimum to have a meaningful hop
        const target = new THREE.Vector3()
          .copy(ref.current.position)
          .addScaledVector(aimDirRef.current, desired);
        // clamp target inside boundary with small margin
        const margin = 1.0;
        target.x = Math.max(
          Math.min(target.x, (boundaryLimit ?? BOUNDARY_LIMIT) - margin),
          -(boundaryLimit ?? BOUNDARY_LIMIT) + margin
        );
        target.z = Math.max(
          Math.min(target.z, (boundaryLimit ?? BOUNDARY_LIMIT) - margin),
          -(boundaryLimit ?? BOUNDARY_LIMIT) + margin
        );
        const disp = new THREE.Vector3().subVectors(
          target,
          ref.current.position
        );
        const dispLen = Math.max(0.001, Math.hypot(disp.x, disp.z));
        airFwdDir.current.set(disp.x / dispLen, 0, disp.z / dispLen);
        // ballistic time of flight (same start/end height): t = 2*v0/g
        const tFlight = (2 * LAUNCH_UP_VEL) / GRAVITY;
        airFwdVel.current = dispLen / tFlight;
        slamArmed.current = true;
        launchCooldown.current = 1.0; // cooldown to avoid repeated triggers at edge
        // Boundary-launched jump: grant temporary invulnerability and enable flying-enemy smash
        boundaryJumpActive.current = true;
        onBoundaryJumpChange && onBoundaryJumpChange(true);
      }
    }

    // Airborne physics and ground slam
    if (airVelY.current !== 0 || ref.current.position.y > 0.5) {
      // vertical
      ref.current.position.y += airVelY.current * dt;
      airVelY.current -= GRAVITY * dt;
      // forward carry
      if (airFwdVel.current > 0) {
        ref.current.position.x += airFwdDir.current.x * airFwdVel.current * dt;
        ref.current.position.z += airFwdDir.current.z * airFwdVel.current * dt;
      }
      // ground contact
      if (ref.current.position.y <= 0.5) {
        ref.current.position.y = 0.5;
        airVelY.current = 0;
        airFwdVel.current = 0;
        if (slamArmed.current) {
          slamArmed.current = false;
          // trigger AOE via callback
          onSlam &&
            onSlam({
              pos: [ref.current.position.x, 0.5, ref.current.position.z],
              radius: 9,
              power: 30,
            });
        }
        onLanding &&
          onLanding({ x: ref.current.position.x, z: ref.current.position.z });
        // End of airborne: disable boundary jump mode if it was from edge
        if (boundaryJumpActive.current) {
          boundaryJumpActive.current = false;
          onBoundaryJumpChange && onBoundaryJumpChange(false);
        }
      }
    }

    // Check collision with active portals to apply speed debuff (ignored while invulnerable)
    if (
      !invulnActive &&
      portalHitCooldown.current <= 0 &&
      portals &&
      portals.length
    ) {
      const px = ref.current.position.x;
      const pz = ref.current.position.z;
      const R = 2.2;
      for (let i = 0; i < portals.length; i++) {
        const pr = portals[i];
        const dx = px - pr.pos[0];
        const dz = pz - pr.pos[2];
        if (dx * dx + dz * dz <= R * R) {
          debuffTimer.current = SPEED_DEBUFF_DURATION_MS / 1000;
          portalHitCooldown.current = 1.0;
          onDebuff && onDebuff();
          break;
        }
      }
    }

    // Check collision with speed boost planes to apply temporary speed boost
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
          // Percentage-based boost: +10%
          boostMulRef.current = 1.1;
          boostHitCooldown.current = 1.0;
          onBoost && onBoost();
          break;
        }
      }
    }

    // Final bounds clamp to be safe
    ref.current.position.x = Math.max(
      Math.min(ref.current.position.x, boundaryLimit ?? BOUNDARY_LIMIT),
      -(boundaryLimit ?? BOUNDARY_LIMIT)
    );
    ref.current.position.z = Math.max(
      Math.min(ref.current.position.z, boundaryLimit ?? BOUNDARY_LIMIT),
      -(boundaryLimit ?? BOUNDARY_LIMIT)
    );
    setPositionRef(ref.current.position);

    // Charging visual indicators (no threshold; show landing marker immediately)
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
        // compute target relative offset for display
        const totalLen = 2 * (boundaryLimit ?? BOUNDARY_LIMIT);
        const desired = Math.max(4, LAUNCH_TARGET_FRACTION * totalLen);
        const target = new THREE.Vector3()
          .copy(ref.current.position)
          .addScaledVector(aimDirRef.current, desired);
        const margin = 1.0;
        target.x = Math.max(
          Math.min(target.x, (boundaryLimit ?? BOUNDARY_LIMIT) - margin),
          -(boundaryLimit ?? BOUNDARY_LIMIT) + margin
        );
        target.z = Math.max(
          Math.min(target.z, (boundaryLimit ?? BOUNDARY_LIMIT) - margin),
          -(boundaryLimit ?? BOUNDARY_LIMIT) + margin
        );
        // place ring relative to player group so it stays where shown during charge
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
  });

  // Trigger dash when token increments
  useEffect(() => {
    if (!ref.current) return;
    // Compute direction from current aim; fallback to forward if near zero
    const dir = aimDirRef.current.clone();
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
    dir.normalize();
    const distance = 0.4 * (boundaryLimit ?? BOUNDARY_LIMIT); // ~20% of play area diameter
    const speed = distance / dashDuration;
    dashVel.current.set(dir.x * speed, 0, dir.z * speed);
    dashing.current = true;
    dashTime.current = 0;
    onDashStart &&
      onDashStart({
        dir: [dir.x, dir.z],
        distance,
        durationMs: dashDuration * 1000,
      });
  }, [dashTriggerToken]);

  return (
    <group ref={ref} position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.8, 0.8, 1.2]} />
        <meshStandardMaterial
          color={0x22c55e}
          metalness={0.2}
          roughness={0.6}
        />
      </mesh>
      {/* Aim ray: dynamic-width forward beam */}
      <mesh ref={rayRef} position={[0, 0.5, -AIM_RAY_LENGTH / 2]}>
        <boxGeometry args={[1, 0.06, AIM_RAY_LENGTH]} />
        <meshBasicMaterial
          color={highContrast ? 0xffffff : 0x99ffcc}
          transparent
          opacity={highContrast ? 0.9 : 0.6}
        />
      </mesh>
      {/* Jump charge ring (scales with hold time) */}
      <mesh
        ref={chargeRingRef}
        position={[0, 0.06, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={chargeMat}
      >
        <primitive object={chargeGeom} attach="geometry" />
      </mesh>
      {/* Landing marker ring when fully charged */}
      <mesh
        ref={landingRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        material={landingMat}
      >
        <primitive object={landingGeom} attach="geometry" />
      </mesh>
    </group>
  );
}

// Minion component moved to src/entities/Minion.jsx

// TriangleBoss component moved to src/entities/TriangleBoss.jsx

// Pipe boss extracted to src/entities/PipeBoss.jsx

// Cluster boss extracted to src/entities/ClusterBoss.jsx

// Flying drone extracted to src/entities/FlyingDrone.jsx

// Cone boss extracted to src/entities/ConeBoss.jsx

export default function App({ navVisible, setNavVisible } = {}) {
  const { play, playSequence } = useSound();
  const { addRun } = useHistoryLog();
  const { selectedHero, setSelectedHero } = useGame();
  const navigate = useNavigate();
  // Dev-only: verify registered assets (via assetUrl/publicAsset) are reachable to catch 404s early
  useEffect(() => {
    if (import.meta?.env?.DEV) {
      const t = setTimeout(() => {
        verifyRegisteredAssets().catch(() => {});
      }, 1500);
      return () => clearTimeout(t);
    }
  }, []);
  // Global visual asset scale & camera view settings (persisted)
  const [assetScale, setAssetScale] = useState(() => {
    try {
      return parseFloat(localStorage.getItem("assetScale") || "1");
    } catch {
      return 1;
    }
  });
  const [topDownZoom, setTopDownZoom] = useState(() => {
    try {
      return parseFloat(localStorage.getItem("topDownZoom") || "0.85");
    } catch {
      return 0.85;
    }
  });
  const [staticCamMargin, setStaticCamMargin] = useState(() => {
    try {
      return parseFloat(localStorage.getItem("staticCamMargin") || "0.95");
    } catch {
      return 0.95;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("assetScale", String(assetScale));
    } catch {}
  }, [assetScale]);
  useEffect(() => {
    try {
      localStorage.setItem("topDownZoom", String(topDownZoom));
    } catch {}
  }, [topDownZoom]);
  useEffect(() => {
    try {
      localStorage.setItem("staticCamMargin", String(staticCamMargin));
    } catch {}
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
  useEffect(() => {
    try {
      localStorage.setItem("showDebugUI", showDebugUI ? "1" : "0");
    } catch {}
  }, [showDebugUI]);
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
    } catch {}
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
    } catch {}
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
    } catch {}
  }, [showAccessibilityControls]);
  // Enemy visuals render mode: 'factory' (default) or 'simple'
  const [enemyRenderMode, setEnemyRenderMode] = useState(() => {
    try {
      return localStorage.getItem("enemyRenderMode") || "factory";
    } catch {}
    return "factory";
  });
  const enemyRenderModeRef = useRef(enemyRenderMode);
  useEffect(() => {
    enemyRenderModeRef.current = enemyRenderMode;
    try {
      localStorage.setItem("enemyRenderMode", enemyRenderMode);
    } catch {}
  }, [enemyRenderMode]);

  // Hero visuals: Factory vs Model and quality
  const [heroRenderMode, setHeroRenderMode] = useState(() => {
    try {
      return localStorage.getItem("heroRenderMode") || "model";
    } catch {}
    return "model";
  });
  const [heroQuality, setHeroQuality] = useState(() => {
    try {
      return localStorage.getItem("heroQuality") || "medium";
    } catch {}
    return "medium";
  });
  useEffect(() => {
    try {
      localStorage.setItem("heroRenderMode", heroRenderMode);
    } catch {}
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
    } catch {}
  }, [heroQuality]);
  const { triggerEffect } = useEffects();
  // game state
  const playerPosRef = useRef(new THREE.Vector3(0, 0, 0));
  const setPositionRef = (pos) => {
    playerPosRef.current.copy(pos);
  };
  const [enemies, setEnemies] = useState([]); // {id, pos, isBoss, formationTarget, health}
  const [pickups, setPickups] = useState([]);
  const [bullets, setBullets] = useState([]);
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
    return isFinite(v) ? v : 8;
  });
  // FX Orb debug controls (persisted)
  const [debugFxOrbRadius, setDebugFxOrbRadius] = useState(() => {
    const v = parseFloat(localStorage.getItem("dbgFxOrbRadius"));
    // Closer to player than previous default (1.8)
    return isFinite(v) ? v : 0.6;
  });
  const [debugFxOrbSizeMul, setDebugFxOrbSizeMul] = useState(() => {
    const v = parseFloat(localStorage.getItem("dbgFxOrbSizeMul"));
    // Make orbs bigger by default (1.0 = previous base)
    return isFinite(v) ? v : 1.2;
  });
  const [debugFxOrbLerp, setDebugFxOrbLerp] = useState(() => {
    const v = parseFloat(localStorage.getItem("dbgFxOrbLerp"));
    // Lerp alpha for smoother follow; 0 = snap disabled, 1 = snap immediately
    return isFinite(v) ? v : 1.0;
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
  const [showStats, setShowStats] = useState(false);
  const [showDreiStats, setShowDreiStats] = useState(false);
  const [fps, setFps] = useState(0);
  useEffect(() => {
    if (!showStats) return;
    let frames = 0;
    let fid = 0;
    let last = performance.now();
    const loop = () => {
      frames++;
      fid = requestAnimationFrame(loop);
    };
    fid = requestAnimationFrame(loop);
    const iid = setInterval(() => {
      const now = performance.now();
      const dt = Math.max(0.001, (now - last) / 1000);
      last = now;
      const f = frames / dt;
      frames = 0;
      setFps(f);
    }, 500);
    return () => {
      cancelAnimationFrame(fid);
      clearInterval(iid);
    };
  }, [showStats]);
  // Feeds: pickups (top-right) and boss spawns (left-bottom)
  const [pickupFeed, setPickupFeed] = useState([]); // {id, text, color}
  const [bossFeed, setBossFeed] = useState([]); // {id, text, color}
  const pushBossFeedRef = useRef(null);
  const [spawnPressureMul, setSpawnPressureMul] = useState(() => {
    const v = parseFloat(localStorage.getItem("spawnPressureMul") || "");
    return Number.isFinite(v) && v > 0 ? v : 0.9;
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
  const [controlScheme, setControlScheme] = useState("dpad"); // 'wasd' | 'dpad' (default to D-Buttons)
  const [performanceMode, setPerformanceMode] = useState(true);
  const [playerResetToken, setPlayerResetToken] = useState(0);
  const [playerBaseSpeed, setPlayerBaseSpeed] = useState(PLAYER_SPEED);
  const [enemySpeedScale, setEnemySpeedScale] = useState(1);
  // Shape Runner feature is now a pickup-only visual; auto-move removed
  const [highContrast, setHighContrast] = useState(false);
  const [hpEvents, setHpEvents] = useState([]); // floating HP change indicators
  const [armorEvents, setArmorEvents] = useState([]);
  const [powerEffect, setPowerEffect] = useState({ active: false, amount: 0 });
  const powerRemainingRef = useRef(0); // ms remaining for effect
  // Player label notifications (above player)
  const [playerLabelEvents, setPlayerLabelEvents] = useState([]); // { id, text, start }
  const [playerLabelSize, setPlayerLabelSize] = useState(() => {
    try {
      const v = parseInt(localStorage.getItem("playerLabelSize"), 10);
      return Number.isFinite(v) && v > 0 ? v : 18;
    } catch {
      return 18;
    }
  });
  const [showPlayerLabelPlaceholder, setShowPlayerLabelPlaceholder] = useState(() => {
    try {
      return localStorage.getItem("showPlayerLabelPlaceholder") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("playerLabelSize", String(playerLabelSize));
    } catch {}
  }, [playerLabelSize]);
  useEffect(() => {
    try {
      localStorage.setItem(
        "showPlayerLabelPlaceholder",
        showPlayerLabelPlaceholder ? "1" : "0"
      );
    } catch {}
  }, [showPlayerLabelPlaceholder]);

  const pushPlayerLabel = useCallback((text, lifetimeMs = 2200) => {
    // Map known label keywords to emojis for better status awareness
    const t = (text || "").toString();
    const U = t.toUpperCase();
    let emoji = "";
    if (U.includes("INVULNERABLE") || U.includes("INVULN")) emoji = "🟨 ";
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
  useEffect(() => {
    lasersActiveRef.current = !!lasersEffect.active;
  }, [lasersEffect.active]);

  // Active laser beam state (single beam from player while firing)
  const [laserBeam, setLaserBeam] = useState(null); // { pos: [x,y,z], dir: [x,y,z], id }
  const laserExpireTimerRef = useRef(null);

  // Apply continuous damage from laser to an enemy (fractional accumulation like bullets)
  const applyLaserDamage = useCallback((enemyId, dmgUnits) => {
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
              } catch {}
            }, 0);
          }
        } catch {}
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
  // Track timeouts for clearing staged phases (so we can cancel if a new pickup arrives)
  const pickupInvulnTimeoutsRef = useRef([]);
  const clearPickupInvulnTimeouts = useCallback(() => {
    (pickupInvulnTimeoutsRef.current || []).forEach((id) => clearTimeout(id));
    pickupInvulnTimeoutsRef.current = [];
  }, []);
  const applyPickupInvulnState = useCallback((s) => {
    pickupInvulnRef.current = s;
    setPickupInvulnState(s);
    // Ensure global invuln marker includes pickup-driven invuln for damage checks
    invulnActiveRef.current = !!s.invulnerable || !!invulnEffect.active;
  }, [invulnEffect.active]);
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
    } catch {}
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
  useEffect(() => {
    if (powerEffect.active) pushPlayerLabel(`POWER +${powerEffect.amount || 0}`);
  }, [powerEffect.active, powerEffect.amount, pushPlayerLabel]);
  // Carcinogenic Field: reduces healing effectiveness temporarily
  const [regenDebuff, setRegenDebuff] = useState({ active: false });
  const regenDebuffRemainingRef = useRef(0);
  const [arcTriggerToken, setArcTriggerToken] = useState(0);
  const [autoFollowHeld, setAutoFollowHeld] = useState(false);
  const [autoFollowHeld2, setAutoFollowHeld2] = useState(false);
  const autoFollowHeldRef = useRef(false);
  const autoFollowHeld2Ref = useRef(false);
  useEffect(() => {
    autoFollowHeldRef.current = autoFollowHeld;
  }, [autoFollowHeld]);
  useEffect(() => {
    autoFollowHeld2Ref.current = autoFollowHeld2;
  }, [autoFollowHeld2]);
  const [cameraMode, setCameraMode] = useState("follow"); // 'follow' | 'static' | 'topdown'
  // Top-down camera speed multiplier (applies to player and enemies when in Top-Down mode)
  const [topDownSpeedMul, setTopDownSpeedMul] = useState(() => {
    const v = parseFloat(localStorage.getItem("topDownSpeedMul") || "");
    return Number.isFinite(v) && v > 0 ? v : 1.8;
  });
  const camSpeedMul = useMemo(() => (cameraMode === "topdown" ? topDownSpeedMul || 1 : 1), [cameraMode, topDownSpeedMul]);
  const cameraSpeedMulRef = useRef(1);
  useEffect(() => {
    localStorage.setItem("topDownSpeedMul", String(topDownSpeedMul));
  }, [topDownSpeedMul]);
  useEffect(() => {
    cameraSpeedMulRef.current =
      cameraMode === "topdown" ? topDownSpeedMul || 1 : 1;
  }, [cameraMode, topDownSpeedMul]);
  // Global pickup scale (UI-controlled)
  const [pickupScaleGlobal, setPickupScaleGlobal] = useState(1.5);
  // Pickup scale modifier derived from camera mode and global setting
  const pickupScaleMul = useMemo(() => {
    const camMul =
      cameraMode === "topdown" ? 2.0 : cameraMode === "static" ? 1.5 : 1.3;
    return camMul * (pickupScaleGlobal || 1);
  }, [cameraMode, pickupScaleGlobal]);
  // Dash/camera smoothing state
  const [isDashing, setIsDashing] = useState(false);
  const [cameraBoostUntilMs, setCameraBoostUntilMs] = useState(0);
  // Dash ability state
  const [dashCooldownMs, setDashCooldownMs] = useState(0);
  const dashCooldownRef = useRef(0);
  useEffect(() => {
    dashCooldownRef.current = dashCooldownMs;
  }, [dashCooldownMs]);
  const [dashTriggerToken, setDashTriggerToken] = useState(0);

  // Arena sizing & growth
  const [boundaryLimit, setBoundaryLimit] = useState(BOUNDARY_LIMIT);
  const [arenaGrowEnabled, setArenaGrowEnabled] = useState(false);
  const [arenaGrowthMode, setArenaGrowthMode] = useState(
    () => localStorage.getItem("arenaGrowthMode") || "milestone"
  );
  const [arenaGrowthRate, setArenaGrowthRate] = useState(0.01); // units per second (time mode)
  const [arenaGrowthPerMilestone, setArenaGrowthPerMilestone] = useState(() => {
    const v = parseFloat(localStorage.getItem("arenaGrowthPerMilestone") || "");
    return Number.isFinite(v) ? v : 5;
  });
  const [maxArenaLimit, setMaxArenaLimit] = useState(
    Math.min(BOUNDARY_LIMIT * 1.5, Math.floor(GROUND_HALF * 0.9))
  );
  const enemyId = useRef(1);
  const pickupId = useRef(1);
  const portalId = useRef(1);
  const speedBoostId = useRef(1);
  // Alternate diagonal for milestone life pickups so they spawn at opposite corners each milestone
  const lifeCornerToggleRef = useRef(false);
  // removed waveTimer (switched to pause-aware timeout loop)
  const bulletPool = useRef(new BulletPool(BULLET_POOL_SIZE));
  // Simple instanced confetti burst
  function ConfettiBurst({ start = 0, count = 48, onDone }) {
    const ref = useRef();
    const rng = useMemo(
      () => ({
        vx: Float32Array.from(
          { length: count },
          () => (Math.random() * 2 - 1) * 8
        ),
        vy: Float32Array.from({ length: count }, () => 8 + Math.random() * 6),
        vz: Float32Array.from(
          { length: count },
          () => (Math.random() * 2 - 1) * 8
        ),
        rx: Float32Array.from(
          { length: count },
          () => Math.random() * Math.PI * 2
        ),
        ry: Float32Array.from(
          { length: count },
          () => Math.random() * Math.PI * 2
        ),
        rz: Float32Array.from(
          { length: count },
          () => Math.random() * Math.PI * 2
        ),
        col: Array.from({ length: count }, () =>
          new THREE.Color().setHSL(Math.random(), 0.8, 0.6)
        ),
      }),
      [count]
    );
    const mat = useMemo(
      () =>
        new THREE.MeshBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
        }),
      []
    );
    const geom = useMemo(() => new THREE.PlaneGeometry(0.4, 0.4), []);
    const life = 2500;
    useFrame((_, dt) => {
      if (!ref.current) return;
      const t = performance.now() - start;
      const n = ref.current.count;
      for (let i = 0; i < n; i++) {
        const m = new THREE.Matrix4();
        // basic physics
        const age = t / life;
        const px = rng.vx[i] * (t / 1000);
        const py = rng.vy[i] * (t / 1000) - 9.8 * (t / 1000) * (t / 1000) * 2;
        const pz = rng.vz[i] * (t / 1000);
        const rx = rng.rx[i] + t * 0.004;
        const ry = rng.ry[i] + t * 0.006;
        const rz = rng.rz[i] + t * 0.005;
        m.makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
        m.setPosition(px, Math.max(0.3, py + 2), pz);
        ref.current.setMatrixAt(i, m);
        const color = rng.col[i];
        ref.current.setColorAt(i, color);
      }
      ref.current.instanceMatrix.needsUpdate = true;
      if (t > life) onDone && onDone();
    });
    return <instancedMesh ref={ref} args={[geom, mat, count]} />;
  }
  // Shared drone geometries/materials (to reduce allocations)
  const droneBodyGeom = useMemo(
    () => new THREE.CylinderGeometry(0.25, 0.25, 1.0, 12),
    []
  );
  const droneTipGeom = useMemo(
    () => new THREE.ConeGeometry(0.25, 0.35, 12),
    []
  );
  const droneTrailGeom = useMemo(
    () => new THREE.SphereGeometry(0.12, 8, 8),
    []
  );
  const droneBodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xff3333,
        emissive: 0x220000,
        roughness: 0.5,
      }),
    []
  );
  const droneTipMat = droneBodyMat;
  const droneTrailBaseMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xff6666,
        transparent: true,
        opacity: 0.5,
      }),
    []
  );
  const droneAssets = useMemo(
    () => ({
      bodyGeom: droneBodyGeom,
      tipGeom: droneTipGeom,
      trailGeom: droneTrailGeom,
      bodyMat: droneBodyMat,
      tipMat: droneTipMat,
    }),
    [droneBodyGeom, droneTipGeom, droneTrailGeom, droneBodyMat, droneTipMat]
  );
  const heroPrimaryColor = useMemo(
    () => parseInt(heroColorFor(selectedHero).replace("#", "0x")),
    [selectedHero]
  );
  const autoFollowSpec = useMemo(
    () => ({
      active: invulnEffect.active && (autoFollowHeld || autoFollowHeld2),
      radius: SHAPE_PATH_RADIUS,
      center: [0, 0, 0],
      shape: invulnEffect.shape || "circle",
      dirSign: autoFollowHeld2 ? -1 : 1,
    }),
    [invulnEffect.active, invulnEffect.shape, autoFollowHeld, autoFollowHeld2]
  );
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  const damageScaleRef = useRef(1);
  const enemySpeedScaleRef = useRef(1);
  const isGameOverRef = useRef(false);
  useEffect(() => {
    isGameOverRef.current = isGameOver;
  }, [isGameOver]);
  const respawnRef = useRef(0);
  useEffect(() => {
    respawnRef.current = respawnCountdown;
  }, [respawnCountdown]);
  const livesRef = useRef(lives);
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);
  const deathHandledRef = useRef(false);
  const portalTimersRef = useRef([]);
  const speedBoostTimersRef = useRef([]);
  const bouncerTimersRef = useRef([]);
  const portalsRef = useRef([]);
  useEffect(() => {
    portalsRef.current = portals.map((p) => p.pos);
  }, [portals]);
  // expose a damage function for special enemies (like ConeBoss)
  const damagePlayer = useCallback(
    (dmg) => {
      if (isPlayerInvulnerable()) {
        // When invulnerable and an enemy collides, stun the colliding enemy instead of despawning
        try {
          if (window.gameEnemies && window.gameEnemies.length) {
            const px = playerPosRef.current.x;
            const pz = playerPosRef.current.z;
            let best = null;
            for (const ge of window.gameEnemies) {
              if (!ge?.ref?.current) continue;
              const ex = ge.ref.current.position.x;
              const ez = ge.ref.current.position.z;
              const dx = ex - px;
              const dz = ez - pz;
              const d2 = dx * dx + dz * dz;
              // Use a generous radius to catch landing cones and close contacts
              if (d2 <= 4.8 * 4.8) {
                if (!best || d2 < best.d2) best = { ge, d2, dx, dz };
              }
            }
            if (best) {
              // Stun for 3s and push slightly away from player
              best.ge.stun?.(3000);
              const d = Math.sqrt(Math.max(best.d2, 1e-6));
              const nx = best.dx / d;
              const nz = best.dz / d;
              best.ge.impulse?.(nx, nz, 40);
            }
          }
        } catch {
          /* ignore */
        }
        return;
      }

      const scale = damageScaleRef.current || 1;
      const amount = Math.max(1, Math.ceil((dmg || 1) * scale));

      // Use the latest snapshot via refs to compute deterministic result
      const currentState = {
        health: healthRef.current || 0,
        armor: armorRef.current || 0,
      };
      const res = applyDamageToHero(currentState, { amount, source: "enemy" });

      // Emit events for UI floaters (preserve ordering: armor then hp)
      for (const ev of res.events) {
        const idEvt = Date.now() + Math.random();
        if (ev.type === "armor") {
          setArmorEvents((evts) => [
            ...evts,
            { id: idEvt, amount: ev.delta, start: performance.now() },
          ]);
          // Player label for armor change (e.g., -10 AP)
          try {
            const txt = `${ev.delta < 0 ? "-" : "+"}${Math.abs(
              ev.delta
            )} AP`;
            pushPlayerLabel(txt);
          } catch {}
        } else if (ev.type === "hp") {
          setHpEvents((evts) => [
            ...evts,
            { id: idEvt, amount: ev.delta, start: performance.now() },
          ]);
          // Player label for HP change (e.g., -12 HP)
          try {
            const txt = `${ev.delta < 0 ? "-" : "+"}${Math.abs(
              ev.delta
            )} HP`;
            pushPlayerLabel(txt);
          } catch {}
        }
      }

      // Apply state updates
      setArmor(res.armor);
      setHealth(res.health);

      // Return the computed result for imperative callers
      return res;
    },
    [isPlayerInvulnerable]
  );

  // Expose damagePlayer globally so legacy imperative callers can delegate to the
  // central armour-first logic (keeps backward compatibility with window APIs)
  useEffect(() => {
    try {
      window.damagePlayer = damagePlayer;
    } catch {
      /* ignore */
    }
    return () => {
      try {
        if (window.damagePlayer === damagePlayer) delete window.damagePlayer;
      } catch {}
    };
  }, [damagePlayer]);

  // Load persisted settings once
  useEffect(() => {
    try {
      const cs = localStorage.getItem("controlScheme");
      if (cs === "wasd" || cs === "dpad" || cs === "touch") {
        setControlScheme(cs);
      } else {
        // Auto-detect touch-capable devices when no persisted choice
        const isTouch =
          (typeof window !== "undefined" && "ontouchstart" in window) ||
          (navigator && navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
        setControlScheme(isTouch ? "touch" : "dpad");
      }
      // shapeRunner persisted flags no longer used
      const hc = localStorage.getItem("highContrast");
      if (hc != null) setHighContrast(hc === "1" || hc === "true");
      const pm = localStorage.getItem("perfMode");
      if (pm != null) setPerformanceMode(pm === "1" || pm === "true");
      const psg = parseFloat(localStorage.getItem("pickupScaleGlobal") || "3");
      if (!Number.isNaN(psg) && psg > 0)
        setPickupScaleGlobal(Math.max(0.5, Math.min(4.0, psg)));
      // Arena persisted settings
      const bls = parseFloat(
        localStorage.getItem("boundaryLimit") || String(BOUNDARY_LIMIT)
      );
      if (!Number.isNaN(bls))
        setBoundaryLimit(Math.max(20, Math.min(GROUND_HALF * 0.9, bls)));
      const aen = localStorage.getItem("arenaGrowEnabled");
      if (aen != null) setArenaGrowEnabled(aen === "true");
      const agr = parseFloat(localStorage.getItem("arenaGrowthRate") || "0.01");
      if (!Number.isNaN(agr))
        setArenaGrowthRate(Math.max(0, Math.min(0.2, agr)));
      const mal = parseFloat(
        localStorage.getItem("maxArenaLimit") ||
          String(Math.floor(GROUND_HALF * 0.9))
      );
      if (!Number.isNaN(mal))
        setMaxArenaLimit(Math.max(30, Math.min(GROUND_HALF * 0.9, mal)));
      const bs = parseInt(localStorage.getItem("bestScore") || "0", 10);
      const bw = parseInt(localStorage.getItem("bestWave") || "0", 10);
      if (!Number.isNaN(bs)) setBestScore(bs);
      if (!Number.isNaN(bw)) setBestWave(bw);
    } catch {
      /* ignore */
    }
  }, []);
  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem("controlScheme", controlScheme);
    } catch {
      /* ignore */
    }
  }, [controlScheme]);
  useEffect(() => {
    spawnPressureMulRef.current = spawnPressureMul;
    try {
      localStorage.setItem("spawnPressureMul", String(spawnPressureMul));
    } catch {}
  }, [spawnPressureMul]);
  // removed shapeRunner persistence
  useEffect(() => {
    try {
      localStorage.setItem("highContrast", highContrast ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [highContrast]);
  useEffect(() => {
    try {
      localStorage.setItem("perfMode", performanceMode ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [performanceMode]);
  useEffect(() => {
    try {
      localStorage.setItem("pickupScaleGlobal", String(pickupScaleGlobal));
    } catch {
      /* ignore */
    }
  }, [pickupScaleGlobal]);
  useEffect(() => {
    try {
      localStorage.setItem("boundaryLimit", String(boundaryLimit));
    } catch {
      /* ignore */
    }
  }, [boundaryLimit]);
  useEffect(() => {
    try {
      localStorage.setItem("arenaGrowEnabled", String(arenaGrowEnabled));
    } catch {
      /* ignore */
    }
  }, [arenaGrowEnabled]);
  useEffect(() => {
    try {
      localStorage.setItem("arenaGrowthRate", String(arenaGrowthRate));
    } catch {
      /* ignore */
    }
  }, [arenaGrowthRate]);
  useEffect(() => {
    try {
      localStorage.setItem("arenaGrowthMode", String(arenaGrowthMode));
    } catch {
      /* ignore */
    }
  }, [arenaGrowthMode]);
  useEffect(() => {
    try {
      localStorage.setItem(
        "arenaGrowthPerMilestone",
        String(arenaGrowthPerMilestone)
      );
    } catch {
      /* ignore */
    }
  }, [arenaGrowthPerMilestone]);
  useEffect(() => {
    try {
      localStorage.setItem("maxArenaLimit", String(maxArenaLimit));
    } catch {
      /* ignore */
    }
  }, [maxArenaLimit]);
  // Persist bests when they change
  useEffect(() => {
    try {
      localStorage.setItem("bestScore", String(bestScore));
    } catch {
      /* ignore write errors */
    }
  }, [bestScore]);
  useEffect(() => {
    try {
      localStorage.setItem("bestWave", String(bestWave));
    } catch {
      /* ignore write errors */
    }
  }, [bestWave]);

  // Arena growth tick: increase boundary size over time if enabled, pause-aware (time mode only)
  useEffect(() => {
    if (ARENA_GROWTH_DISABLED) return;
    if (!arenaGrowEnabled || arenaGrowthMode !== "time") return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (!isPausedRef.current) {
        const cap = Math.min(maxArenaLimit, Math.floor(GROUND_HALF * 0.9));
        setBoundaryLimit((prev) =>
          Math.min(cap, (prev ?? BOUNDARY_LIMIT) + arenaGrowthRate)
        );
      }
      setTimeout(tick, 1000);
    };
    const t = setTimeout(tick, 1000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [arenaGrowEnabled, arenaGrowthMode, arenaGrowthRate, maxArenaLimit]);
  // Milestone growth guard (to avoid double-apply on continues)
  const lastGrowthWaveAppliedRef = useRef(0);

  // Update bests live during a run and trigger confetti once per run when breaking prior best
  const bestScoreBaselineRef = useRef(0);
  const highScoreCelebratedRef = useRef(false);
  useEffect(() => {
    // establish baseline when run starts
    if (isStarted && !isPaused) {
      if (bestScoreBaselineRef.current === 0)
        bestScoreBaselineRef.current = bestScore;
    }
  }, [isStarted, isPaused, bestScore]);
  useEffect(() => {
    if (score > bestScore) setBestScore(score);
    if (
      score > bestScoreBaselineRef.current &&
      !highScoreCelebratedRef.current
    ) {
      highScoreCelebratedRef.current = true;
      // spawn confetti burst
      const id = Date.now() + Math.random();
      setConfetti((prev) => [...prev, { id, start: performance.now() }]);
    }
  }, [score, bestScore]);
  useEffect(() => {
    if (wave > bestWave) setBestWave(wave);
  }, [wave, bestWave]);
  useEffect(() => {
    isStartedRef.current = isStarted;
  }, [isStarted]);

  // Playtime tracking (persist across runs)
  const totalPlayMsRef = useRef(0);
  const lastPlayTickRef = useRef(0);
  const [totalPlayMsView, setTotalPlayMsView] = useState(0);
  useEffect(() => {
    try {
      totalPlayMsRef.current =
        parseInt(localStorage.getItem("totalPlayTimeMs") || "0", 10) || 0;
    } catch {
      /* ignore read errors */
    }
    // Initialize view state
    setTotalPlayMsView(totalPlayMsRef.current | 0);
  }, []);
  useEffect(() => {
    const int = setInterval(() => {
      if (
        isStartedRef.current &&
        !isPausedRef.current &&
        !isGameOverRef.current
      ) {
        const now = performance.now();
        const last = lastPlayTickRef.current || now;
        const delta = Math.min(2000, Math.max(0, now - last));
        totalPlayMsRef.current += delta;
        lastPlayTickRef.current = now;
        // Persist every second
        try {
          localStorage.setItem(
            "totalPlayTimeMs",
            String(totalPlayMsRef.current | 0)
          );
        } catch {
          /* ignore write errors */
        }
        // Reflect in UI
        setTotalPlayMsView(totalPlayMsRef.current | 0);
      } else {
        lastPlayTickRef.current = performance.now();
        // Still tick UI to reflect any external changes
        setTotalPlayMsView(totalPlayMsRef.current | 0);
      }
    }, 1000);
    return () => clearInterval(int);
  }, []);

  // Pause toggling
  useEffect(() => {
    const handleKeyDown = (e) => {
      const k = e.key;
      if (k === "Escape" || k === " ") {
        e.preventDefault();
        if (!isStartedRef.current) return;
        // Disable manual pause toggle during respawn countdown or game over
        if (
          isGameOverRef.current ||
          (respawnRef.current && respawnRef.current > 0)
        )
          return;
        setIsPaused((prev) => !prev);
      } else if (k === "f" || k === "F") {
        setAutoFire((prev) => !prev);
      } else if (k === "1" || e.code === "Digit1") {
        // handled in a dedicated key listener to support keyup as well
      } else if (k === "0" || e.code === "Digit0") {
        setCameraMode("static");
      } else if (k === "9" || e.code === "Digit9") {
        setCameraMode("follow");
      } else if (k === "8" || e.code === "Digit8") {
        setCameraMode("topdown");
      } else if (k === "3" || e.code === "Digit3") {
        // Dash ability
        if (
          !isStartedRef.current ||
          isPausedRef.current ||
          isGameOverRef.current
        )
          return;
        if (dashCooldownRef.current > 0) return;
        // Trigger dash: 250ms duration i-frames
        setDashTriggerToken((t) => t + 1);
        setDashCooldownMs(10000);
        dashInvulnUntilRef.current = performance.now() + 250;
        // Schedule brief enemy push bursts during the dash
        const burst = () => {
          const p = playerPosRef.current;
          if (!p || !window.gameEnemies) return;
          window.gameEnemies.forEach((ge) => {
            if (!ge?.ref?.current) return;
            const ex = ge.ref.current.position.x;
            const ez = ge.ref.current.position.z;
            const dx = ex - p.x;
            const dz = ez - p.z;
            const d2 = dx * dx + dz * dz;
            const R = 3.0;
            if (d2 <= R * R) {
              const dist = Math.max(Math.sqrt(d2), 0.0001);
              const nx = dx / dist;
              const nz = dz / dist;
              const base = 10; // moderate push strength
              ge.impulse?.(nx, nz, base * (1 - dist / R));
            }
          });
        };
        burst();
        setTimeout(burst, 80);
        setTimeout(burst, 160);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Format ms to H:MM:SS
  const formatHMS = useCallback((ms) => {
    const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const mm = m.toString().padStart(2, "0");
    const ss = s.toString().padStart(2, "0");
    return `${h}:${mm}:${ss}`;
  }, []);

  // Dash cooldown ticker (pause-aware)
  useEffect(() => {
    const int = setInterval(() => {
      if (isPausedRef.current) return;
      setDashCooldownMs((ms) => Math.max(0, ms - 100));
    }, 100);
    return () => clearInterval(int);
  }, []);

  // Auto-follow ring key handling (hold 1 to ride the ring while invulnerable)
  useEffect(() => {
    const onDown = (e) => {
      if (e.key === "1" || e.code === "Digit1") setAutoFollowHeld(true);
      if (e.key === "2" || e.code === "Digit2") setAutoFollowHeld2(true);
    };
    const onUp = (e) => {
      if (e.key === "1" || e.code === "Digit1") setAutoFollowHeld(false);
      if (e.key === "2" || e.code === "Digit2") setAutoFollowHeld2(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // Helpers: portal lifecycle and enemy scheduling
  const clearPortalTimers = useCallback(() => {
    portalTimersRef.current.forEach((t) => clearTimeout(t));
    portalTimersRef.current = [];
  }, []);

  const openPortalAt = useCallback((pos, duration = PORTAL_LIFETIME) => {
    const id = portalId.current++;
    setPortals((prev) => [...prev, { id, pos }]);
    const timer = setTimeout(() => {
      setPortals((prev) => prev.filter((p) => p.id !== id));
    }, duration);
    portalTimersRef.current.push(timer);
    return id;
  }, []);

  const openSpeedBoostAt = useCallback(
    (pos, duration = SPEED_BOOST_LIFETIME) => {
      const id = speedBoostId.current++;
      setSpeedBoosts((prev) => [...prev, { id, pos }]);
      const timer = setTimeout(() => {
        setSpeedBoosts((prev) => prev.filter((s) => s.id !== id));
      }, duration);
      speedBoostTimersRef.current.push(timer);
      return id;
    },
    []
  );

  // Clear timers on unmount to avoid stray spawns
  useEffect(() => {
    return () => clearPortalTimers();
  }, [clearPortalTimers]);

  const clearSpeedBoostTimers = useCallback(() => {
    speedBoostTimersRef.current.forEach((t) => clearTimeout(t));
    speedBoostTimersRef.current = [];
  }, []);

  // Bouncer helpers
  const openBouncerAt = useCallback((pos) => {
    if (disableEnemySpawnsRef.current) return;
    const id = Date.now() + Math.random();
    // Add telegraph now
    setBouncerTelegraphs((prev) => [...prev, { id, pos }]);
    const t = setTimeout(() => {
      if (disableEnemySpawnsRef.current) return;
      // Remove telegraph
      setBouncerTelegraphs((prev) => prev.filter((b) => b.id !== id));
      // Spawn launched bouncer
      const bid = id;
      setBouncers((prev) => [
        ...prev,
        {
          id: bid,
          pos: [pos[0], 0.5, pos[2]],
          velY: BOUNCER_UP_VEL,
          bornAt: performance.now(),
        },
      ]);
    }, BOUNCER_TELEGRAPH_MS);
    bouncerTimersRef.current.push(t);
  }, []);

  const clearBouncerTimers = useCallback(() => {
    bouncerTimersRef.current.forEach((t) => clearTimeout(t));
    bouncerTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearSpeedBoostTimers();
      clearBouncerTimers();
    };
  }, [clearSpeedBoostTimers, clearBouncerTimers]);

  const scheduleEnemyBatchAt = useCallback((pos, count, options = {}) => {
    const {
      isTriangle = false,
      isCone = false,
      waveNumber = 1,
      extraDelayMs = 0,
      kind = null,
    } = options;
    for (let i = 0; i < count; i++) {
      const handle = setTimeout(() => {
        if (isPausedRef.current) return;
        // If spawning is globally disabled or we're testing hazards-only, skip enemy spawn
        if (disableEnemySpawnsRef.current || spawnOnlyHazardsRef.current)
          return;
        const jitter = 1.2;
        const spawnPos = [
          pos[0] + (Math.random() - 0.5) * jitter,
          0.5,
          pos[2] + (Math.random() - 0.5) * jitter,
        ];
        const id = enemyId.current++;
        if (isTriangle) {
          setEnemies((prev) => [
            ...prev,
            {
              id,
              pos: spawnPos,
              isTriangle: true,
              tier: 5,
              waveNumber,
              health: 5,
              maxHealth: 5,
              spawnHeight: DROP_SPAWN_HEIGHT + Math.random() * 2,
            },
          ]);
          pushBossFeedRef.current &&
            pushBossFeedRef.current("Triangle boss spawned", "#8b5cf6");
          try {
            play("boss-spawn");
          } catch {}
        } else if (isCone) {
          // Respect max 6 cones at once
          setEnemies((prev) => {
            const cones = prev.filter((e) => e.isCone).length;
            const maxCones = LEVEL_CONFIG?.caps?.conesMax ?? 6;
            if (cones >= maxCones) return prev;
            return [
              ...prev,
              {
                id,
                pos: spawnPos,
                isCone: true,
                tier: 5,
                waveNumber,
                health: 10,
                maxHealth: 10,
                spawnHeight: DROP_SPAWN_HEIGHT + Math.random() * 2,
              },
            ];
          });
          pushBossFeedRef.current &&
            pushBossFeedRef.current("Cone boss spawned", "#f59e0b");
          try {
            play("boss-spawn");
          } catch {}
        } else {
          if (kind === "cluster") {
            setEnemies((prev) => [
              ...prev,
              {
                id,
                pos: spawnPos,
                isCluster: true,
                isBoss: true,
                tier: 5,
                waveNumber,
                health: 3,
                maxHealth: 3,
                spawnHeight: DROP_SPAWN_HEIGHT + Math.random() * 2,
              },
            ]);
            pushBossFeedRef.current &&
              pushBossFeedRef.current("Cluster boss spawned", "#ff3333");
            // Boss intro popup
            setPickupPopups((prev) => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                pickup: {
                  type: "boss",
                  name: "Cluster Boss",
                  level: waveNumber,
                  color: "#ff3333",
                },
              },
            ]);
            try {
              play("boss-spawn");
            } catch {}
          } else if (kind === "bossMinion") {
            setEnemies((prev) => [
              ...prev,
              {
                id,
                pos: spawnPos,
                isBoss: true,
                tier: 4,
                formationTarget: new THREE.Vector3(pos[0], 0.5, pos[2]),
                waveNumber,
                health: 3,
                maxHealth: 3,
                spawnHeight: DROP_SPAWN_HEIGHT + Math.random() * 2,
              },
            ]);
          } else if (kind === "minion") {
            setEnemies((prev) => [
              ...prev,
              {
                id,
                pos: spawnPos,
                isBoss: false,
                formationTarget: new THREE.Vector3(pos[0], 0.5, pos[2]),
                waveNumber,
                health: 1,
                maxHealth: 1,
                spawnHeight: DROP_SPAWN_HEIGHT + Math.random() * 2,
              },
            ]);
          } else {
            // Backward-compatible random behavior
            const makeCluster = Math.random() < 0.4;
            if (makeCluster) {
              setEnemies((prev) => [
                ...prev,
                {
                  id,
                  pos: spawnPos,
                  isCluster: true,
                  isBoss: true,
                  tier: 5,
                  waveNumber,
                  health: 3,
                  maxHealth: 3,
                  spawnHeight: DROP_SPAWN_HEIGHT + Math.random() * 2,
                },
              ]);
              pushBossFeedRef.current &&
                pushBossFeedRef.current("Cluster boss spawned", "#ff3333");
              try {
                play("boss-spawn");
              } catch {}
            } else {
              const boss = Math.random() < 0.12;
              setEnemies((prev) => [
                ...prev,
                {
                  id,
                  pos: spawnPos,
                  isBoss: boss,
                  tier: boss ? 4 : 1,
                  formationTarget: new THREE.Vector3(pos[0], 0.5, pos[2]),
                  waveNumber,
                  health: boss ? 3 : 1,
                  maxHealth: boss ? 3 : 1,
                  spawnHeight: DROP_SPAWN_HEIGHT + Math.random() * 2,
                },
              ]);
            }
          }
        }
      }, extraDelayMs + i * PORTAL_STAGGER_MS);
      portalTimersRef.current.push(handle);
    }
  }, []);

  // spawn a wave using latest state (no stale closures) and compute count by nextWave
  const spawnWave = useCallback(() => {
    if (isPausedRef.current) return;
    // When spawns are disabled, fully stop wave progression/leveling updates
    if (disableEnemySpawnsRef.current || spawnOnlyHazardsRef.current) return;
    perf.start("spawn_wave");
    // Establish per-level baseline: points at the start of this level
    levelScoreBaselineRef.current = scoreRef.current || 0;
    setWave((w) => {
      const nextWave = w + 1;
      const level = nextWave;
      // Level intro popup
      try {
        const popupId = Date.now() + Math.random();
        setPickupPopups((prev) => [
          ...prev,
          { id: popupId, pickup: { type: "level", level: nextWave } },
        ]);
      } catch {
        /* ignore */
      }
      // Update damage scale by wave and notify player
      const newScale = Math.min(
        DAMAGE_SCALE_MAX,
        1 + (Math.max(1, nextWave) - 1) * DAMAGE_SCALE_PER_WAVE
      );
      if (Math.abs(newScale - (damageScaleRef.current || 1)) > 1e-6) {
        damageScaleRef.current = newScale;
        const popupId = Date.now() + Math.random();
        setPickupPopups((prev) => [
          ...prev,
          { id: popupId, pickup: { type: "dmgscale", scale: newScale } },
        ]);
      }
      const center = playerPosRef.current.clone();
      // Wave-based speed ramp: enemies faster, player gets +1 base speed each wave
      const newEnemyScale = Math.min(
        ENEMY_SPEED_SCALE_MAX,
        1 + (Math.max(1, nextWave) - 1) * ENEMY_SPEED_SCALE_PER_WAVE
      );
      if (Math.abs(newEnemyScale - (enemySpeedScaleRef.current || 1)) > 1e-6) {
        enemySpeedScaleRef.current = newEnemyScale;
        setEnemySpeedScale(newEnemyScale);
        setPlayerBaseSpeed((s) => Math.min(PLAYER_SPEED_CAP, s + 1));
        const popupId = Date.now() + Math.random();
        setPickupPopups((prev) => [
          ...prev,
          {
            id: popupId,
            pickup: { type: "speedramp", scale: newEnemyScale, player: true },
          },
        ]);
      }
      // Milestone life pickup: every 10 waves, spawn exactly one life pickup at a corner.
      // Alternates opposing corners each milestone (diagonal toggles).
      if (nextWave % 10 === 0) {
        const lim = (boundaryLimit ?? BOUNDARY_LIMIT) - 1.5;
        const usePrimaryDiagonal = lifeCornerToggleRef.current;
        const pos = usePrimaryDiagonal ? [lim, 0.5, lim] : [-lim, 0.5, -lim];
        // Flip for next milestone so the next life appears at the opposite corner
        lifeCornerToggleRef.current = !lifeCornerToggleRef.current;
        spawnPickup("life", pos);
      }
      // Milestone arena growth: disabled when ARENA_GROWTH_DISABLED
      if (
        !ARENA_GROWTH_DISABLED &&
        arenaGrowEnabled &&
        arenaGrowthMode === "milestone" &&
        nextWave % 10 === 0 &&
        nextWave > (lastGrowthWaveAppliedRef.current || 0)
      ) {
        const cap = Math.min(maxArenaLimit, Math.floor(GROUND_HALF * 0.9));
        setBoundaryLimit((prev) =>
          Math.min(
            cap,
            (prev ?? BOUNDARY_LIMIT) + (arenaGrowthPerMilestone || 0)
          )
        );
        lastGrowthWaveAppliedRef.current = nextWave;
      }

      // If enemy spawns are disabled, stop here after progression updates
      if (disableEnemySpawnsRef.current) {
        return nextWave;
      }
      // Leveling system: compute caps, budget, and plan spawns
      const activeMax = getActiveMax(level, performanceMode);
      const bossMax = getBossMax(level, performanceMode);
      const currentEnemies = window.gameEnemies?.length || 0;
      const currentBosses =
        window.gameEnemies?.filter(
          (e) => e.isBoss || e.isTriangle || e.isCone || e.isPipe
        )?.length || 0;
      let bossSlotsRem = Math.max(0, bossMax - currentBosses);
      const remainingSlots = Math.max(0, activeMax - currentEnemies);
      const budget = getBudget(level);
      let budgetLeft = budget;

      const portalsCount = Math.min(
        PORTALS_PER_WAVE_MAX,
        Math.max(PORTALS_PER_WAVE_MIN, 2 + Math.floor(nextWave / 4))
      );
      const baseAngle = Math.random() * Math.PI * 2;

      // Helper to place a portal and schedule one enemy with kind and delay
      const scheduleOneAt = (p, idx, kind) => {
        const extraDelay = 2000 + Math.random() * 2000;
        openPortalAt(p, PORTAL_LIFETIME + extraDelay);
        scheduleEnemyBatchAt(p, 1, {
          waveNumber: nextWave,
          extraDelayMs: extraDelay + idx * PORTAL_STAGGER_MS,
          kind,
        });
      };

      // Plan bosses: Triangle (every 3), Cone (chance), Pipe (chance), respecting unlocks and bossSlots
      let expectedAdds = 0;
      // Triangle boss
      if (
        level >= LEVEL_CONFIG.unlocks.triangle &&
        level % 3 === 0 &&
        bossSlotsRem > 0 &&
        remainingSlots - expectedAdds > 0
      ) {
        const angle = baseAngle + Math.random() * Math.PI * 2;
        const radius = PORTAL_RADIUS_MAX + 4;
        const px = center.x + Math.cos(angle) * radius;
        const pz = center.z + Math.sin(angle) * radius;
        const p = [px, 0.5, pz];
        const extraDelay = 2000 + Math.random() * 2000;
        openPortalAt(p, PORTAL_LIFETIME + 1500 + extraDelay);
        scheduleEnemyBatchAt(p, 1, {
          isTriangle: true,
          waveNumber: nextWave,
          extraDelayMs: 500 + extraDelay,
        });
        // Boss intro popup
        setPickupPopups((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            pickup: {
              type: "boss",
              name: "Triangle Boss",
              level: nextWave,
              color: "#8b5cf6",
            },
          },
        ]);
        bossSlotsRem -= 1;
        expectedAdds += 1;
        budgetLeft = Math.max(0, budgetLeft - LEVEL_CONFIG.costs.triangle);
      }

      // Cone boss
      if (
        level >= LEVEL_CONFIG.unlocks.cone &&
        Math.random() < LEVEL_CONFIG.chances.cone &&
        bossSlotsRem > 0 &&
        remainingSlots - expectedAdds > 0
      ) {
        const angle = baseAngle + Math.random() * Math.PI * 2;
        const radius = PORTAL_RADIUS_MAX + 6;
        const px = center.x + Math.cos(angle) * radius;
        const pz = center.z + Math.sin(angle) * radius;
        const p = [px, 0.5, pz];
        const extraDelay = 2000 + Math.random() * 2000;
        openPortalAt(p, PORTAL_LIFETIME + 800 + extraDelay);
        scheduleEnemyBatchAt(p, 1, {
          isCone: true,
          waveNumber: nextWave,
          extraDelayMs: 300 + extraDelay,
        });
        // Boss intro popup
        setPickupPopups((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            pickup: {
              type: "boss",
              name: "Cone Boss",
              level: nextWave,
              color: "#f59e0b",
            },
          },
        ]);
        bossSlotsRem -= 1;
        expectedAdds += 1;
        budgetLeft = Math.max(0, budgetLeft - LEVEL_CONFIG.costs.cone);
      }

      // Pipe boss
      if (
        level >= LEVEL_CONFIG.unlocks.pipe &&
        Math.random() < LEVEL_CONFIG.chances.pipe &&
        bossSlotsRem > 0 &&
        remainingSlots - expectedAdds > 0
      ) {
        const cornerBias = Math.random() < 0.6;
        const lim = (boundaryLimit ?? BOUNDARY_LIMIT) - 2;
        let px = 0,
          pz = 0;
        if (cornerBias) {
          px = (Math.random() < 0.5 ? -1 : 1) * lim;
          pz = (Math.random() < 0.5 ? -1 : 1) * lim;
        } else {
          if (Math.random() < 0.5) {
            px = (Math.random() < 0.5 ? -1 : 1) * lim;
            pz = (Math.random() * 2 - 1) * lim;
          } else {
            px = (Math.random() * 2 - 1) * lim;
            pz = (Math.random() < 0.5 ? -1 : 1) * lim;
          }
        }
        const id = enemyId.current++;
        setEnemies((prev) => [
          ...prev,
          {
            id,
            pos: [px, 0.2, pz],
            isPipe: true,
            isBoss: true,
            tier: 5,
            health: 2,
            maxHealth: 2,
          },
        ]);
        pushBossFeedRef.current &&
          pushBossFeedRef.current("Pipe boss spawned", "#ff3333");
        try {
          play("boss-spawn");
        } catch {}
        // Boss intro popup
        setPickupPopups((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            pickup: {
              type: "boss",
              name: "Pipe Boss",
              level: nextWave,
              color: "#ff3333",
            },
          },
        ]);
        bossSlotsRem -= 1;
        expectedAdds += 1;
        budgetLeft = Math.max(0, budgetLeft - LEVEL_CONFIG.costs.pipe);
      }

      // Compute how many basic enemies we can add this wave
      const slotsForBasics = Math.max(0, remainingSlots - expectedAdds);
      // Apply spawn pressure scaling to reduce spawn counts while keeping pressure
      let basicsToSpawn = Math.min(
        slotsForBasics,
        Math.max(0, Math.floor(budgetLeft / LEVEL_CONFIG.costs.minion))
      );
      basicsToSpawn = Math.max(
        0,
        Math.floor(basicsToSpawn * (spawnPressureMulRef.current || 1))
      );

      // Distribute basics across portals with a 3:1:1 style bias for higher waves
      // We reserve a small fraction for flank and rare behind-player spawns so CPU load is controlled.
      let flankReserved = 0;
      let backReserved = 0;
      // Only enable behind-player / flank reservation at higher waves
      if (level >= BEHIND_SPAWN_MIN_WAVE && basicsToSpawn >= 3 && Math.random() < 0.9) {
        // split into 3:1:1 ratio across a total of 5 units
        const units = 5;
        // base per-unit (at least 1 unit)
        const perUnit = Math.max(1, Math.floor(basicsToSpawn / units));
        const mainUnits = 3 * perUnit;
        const flankUnits = 1 * perUnit;
        const backUnits = 1 * perUnit;
        flankReserved = Math.min(2, flankUnits);
        backReserved = Math.min(2, backUnits);
        // subtract reserved slots from fundamentals
        const reserved = flankReserved + backReserved;
        basicsToSpawn = Math.max(0, basicsToSpawn - reserved);
      }

      // distribute remaining basics to wave portals
      const perPortal = Math.max(1, Math.floor(basicsToSpawn / portalsCount));

      // Evenly spaced directions with slight jitter for main portals
      for (let i = 0; i < portalsCount; i++) {
        const angle =
          baseAngle +
          (i * (Math.PI * 2)) / portalsCount +
          (Math.random() - 0.5) * 0.25;
        const radius =
          PORTAL_RADIUS_MIN +
          Math.random() * (PORTAL_RADIUS_MAX - PORTAL_RADIUS_MIN);
        const px = center.x + Math.cos(angle) * radius;
        const pz = center.z + Math.sin(angle) * radius;
        const p = [px, 0.5, pz];
        const extraDelay = 2000 + Math.random() * 2000; // 2-4s warmup
        openPortalAt(p, PORTAL_LIFETIME + extraDelay);
        // Spawn per-portal enemies using tier weights and boss/budget caps
        const weights = getTierWeights(level);
        for (let k = 0; k < perPortal; k++) {
          if (basicsToSpawn <= 0) break;
          // Decide tier for this slot
          const r = Math.random();
          let pickTier = "T1";
          let acc = 0;
          for (const key of ["T1", "T2", "T3", "T4"]) {
            if (weights[key]) {
              acc += weights[key];
              if (r <= acc) {
                pickTier = key;
                break;
              }
            }
          }
          let kind = "minion";
          if (
            pickTier === "T2" &&
            level >= LEVEL_CONFIG.unlocks.bossMinion &&
            bossSlotsRem > 0
          ) {
            const clusterOK = level >= LEVEL_CONFIG.unlocks.cluster;
            if (clusterOK && Math.random() < 0.5) {
              kind = "cluster";
              bossSlotsRem = Math.max(0, bossSlotsRem - 1);
              budgetLeft = Math.max(0, budgetLeft - LEVEL_CONFIG.costs.cluster);
            } else {
              kind = "bossMinion";
              bossSlotsRem = Math.max(0, bossSlotsRem - 1);
              budgetLeft = Math.max(
                0,
                budgetLeft - LEVEL_CONFIG.costs.bossMinion
              );
            }
          } else {
            // Default to roster-based minion selection
            kind = "minion";
            budgetLeft = Math.max(0, budgetLeft - LEVEL_CONFIG.costs.minion);
          }
          basicsToSpawn -= 1;
          // For basic minions, pick a roster enemy with matching tier
          if (kind === "minion") {
            const tierNum =
              pickTier === "T1"
                ? 1
                : pickTier === "T2"
                ? 2
                : pickTier === "T3"
                ? 3
                : 4;
            const picked = pickRosterByTier(level, tierNum);
            const ecolor = colorHex(picked.color);
            const eid = enemyId.current++;
            const spawnPos = [p[0], 0.5, p[2]];
            const sp = Math.max(
              2.0,
              Math.min(3.2, picked?.stats?.speed || 2.5)
            );
            const moveSpeed =
              Math.min(12, 6 + (sp - 2.0) * 4) *
              (enemySpeedScaleRef.current || 1) *
              (cameraSpeedMulRef.current || 1);
            setEnemies((prev) => [
              ...prev,
              {
                id: eid,
                pos: spawnPos,
                isRoster: true,
                tier: tierNum,
                rosterName: picked.name,
                rosterColor: ecolor,
                rosterShape: picked.shape || "Circle",
                waveNumber: nextWave,
                health: Math.max(1, picked?.stats?.health || 2),
                maxHealth: Math.max(1, picked?.stats?.health || 2),
                spawnHeight: DROP_SPAWN_HEIGHT + Math.random() * 2,
                factorySpec:
                  enemyRenderModeRef.current === "factory"
                    ? (() => {
                        const base = randomFactorySpecFromRoster(
                          picked,
                          nextWave,
                          ecolor,
                          typeof assetScale !== "undefined" ? assetScale : 1
                        );
                        const spinMul = 0.5 + Math.random() * 1.5;
                        const rollAdd = Math.random() * 0.6 - 0.3;
                        const spin = Math.min(
                          0.8,
                          Math.max(0.06, base.spin * spinMul)
                        );
                        const roll = Math.min(
                          0.6,
                          Math.max(-0.4, base.roll + rollAdd)
                        );
                        return { ...base, spin, roll };
                      })()
                    : null,
                stunImmune: /CRE/.test(picked.name),
                cloneOnHalf: picked.name.includes("E. coli ESBL"),
                bulletDamageScale: picked.name.includes("MRSA")
                  ? 0.8
                  : picked.name.includes("VRE")
                  ? 0.5
                  : 1,
                moveSpeed,
              },
            ]);
          } else {
            scheduleEnemyBatchAt(p, 1, {
              waveNumber: nextWave,
              extraDelayMs: extraDelay + k * PORTAL_STAGGER_MS,
              kind,
            });
          }
        }
      }

      // If we reserved flank/back slots, schedule small portals for them.
      if (flankReserved > 0) {
        // Place flank portal(s) roughly to the side(s) of the player center
        const sides = Math.max(1, flankReserved);
        for (let si = 0; si < sides; si++) {
          const sideAngle = baseAngle + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + (Math.random() - 0.5) * 0.3);
          const radius = PORTAL_RADIUS_MIN + Math.random() * (PORTAL_RADIUS_MAX - PORTAL_RADIUS_MIN);
          const px = center.x + Math.cos(sideAngle) * radius;
          const pz = center.z + Math.sin(sideAngle) * radius;
          const p = [px, 0.5, pz];
          const extraDelay = 2000 + Math.random() * 1000;
          openPortalAt(p, PORTAL_LIFETIME + extraDelay);
          // spawn 1 per reserved slot
          scheduleEnemyBatchAt(p, 1, { waveNumber: nextWave, extraDelayMs: extraDelay });
        }
      }

      if (backReserved > 0) {
        // Place a small portal behind the player (prefer opposite of movement direction when available)
        try {
          const m = moveInputRef ? moveInputRef.current : { x: 0, z: -1 };
          const mvLen = Math.hypot(m.x || 0, m.z || 0);
          let backAngle = Math.random() * Math.PI * 2;
          if (mvLen > 0.15) backAngle = Math.atan2(m.z, m.x) + Math.PI; // opposite movement
          const radius = (PORTAL_RADIUS_MIN + PORTAL_RADIUS_MAX) * 0.5 * (0.6 + Math.random() * 0.6);
          const px = center.x + Math.cos(backAngle) * radius;
          const pz = center.z + Math.sin(backAngle) * radius;
          const p = [px, 0.5, pz];
          const extraDelay = 1600 + Math.random() * 1200;
          // open small behind portal and spawn 1-2 minions
          openPortalAt(p, PORTAL_LIFETIME + extraDelay);
          const count = Math.min(backReserved, 2);
          scheduleEnemyBatchAt(p, count, { waveNumber: nextWave, extraDelayMs: extraDelay });
        } catch {
          /* ignore */
        }
      }

      // Spawn 1-2 green speed boost planes per wave nearby, lifetime similar to portals
      const boostCount = Math.min(2, 1 + Math.floor(Math.random() * 2));
      for (let i = 0; i < boostCount; i++) {
        const angle = baseAngle + Math.random() * Math.PI * 2;
        const radius =
          SPEED_BOOST_RADIUS_MIN +
          Math.random() * (SPEED_BOOST_RADIUS_MAX - SPEED_BOOST_RADIUS_MIN);
        const px = center.x + Math.cos(angle) * radius;
        const pz = center.z + Math.sin(angle) * radius;
        const pos = [px, 0.5, pz];
        openSpeedBoostAt(pos);
      }

      // (Triangle/Cone/Pipe spawning moved into leveled plan above)

      // Also seed a few bouncers at wave start to ensure presence from level 1
      try {
        const waveForBouncers = nextWave;
        const lim = (boundaryLimit ?? BOUNDARY_LIMIT) - 2;
        const bc = Math.min(3, 1 + Math.floor((waveForBouncers - 1) / 6));
        for (let i = 0; i < bc; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 6 + Math.random() * (lim - 6);
          const bx = center.x + Math.cos(angle) * radius;
          const bz = center.z + Math.sin(angle) * radius;
          openBouncerAt([bx, 0.5, bz]);
        }
      } catch {
        /* no-op */
      }

      return nextWave;
    });
    perf.end("spawn_wave");
  }, [openPortalAt, scheduleEnemyBatchAt]);

  // Handle shooting
  const handleShoot = useCallback(
    (playerPosition, direction) => {
      if (!direction) return;
      // Determine bullet style based on power-up effect
      let style = null;
      const stunMode =
        invulnEffect.active && (autoFollowHeld || autoFollowHeld2);
      if (stunMode) {
        // Yellow stun bullets during invulnerability while following the shape
        style = { color: 0xfacc15, scale: 1.3, stun: true };
      } else if (powerEffect.active) {
        const amt = powerEffect.amount;
        const scale = 1 + (Math.max(0, amt - 50) / 50) * 0.5; // 1.0 .. 1.5
        style = { color: 0x66aaff, scale };
      }

      const px = playerPosition.x;
      const py = playerPosition.y + 0.5;
      const pz = playerPosition.z;

      // If lasers pickup is active, create/update a continuous laser beam instead of bullets
      if (lasersActiveRef.current) {
        try {
          // forward dir on XZ
          const fx = direction[0];
          const fz = direction[2];
          const dirVec = new THREE.Vector3(fx, 0, fz).normalize();
          lastLaserAimRef.current.copy(dirVec);
          const id = Date.now() + Math.random();
          setLaserBeam({
            id,
            pos: [px, py, pz],
            dir: [dirVec.x, dirVec.y, dirVec.z],
          });
          // reset expire timer so beam persists while firing; clears shortly after firing stops
          if (laserExpireTimerRef.current) {
            clearTimeout(laserExpireTimerRef.current);
            laserExpireTimerRef.current = null;
          }
          laserExpireTimerRef.current = setTimeout(() => {
            setLaserBeam(null);
            laserExpireTimerRef.current = null;
          }, 180);
        } catch {}
        return;
      }

      // While shape runner is active (stun mode), emit 4 forward streams
      if (stunMode) {
        const fx = direction[0];
        const fz = direction[2];
        // Right vector on XZ plane (perpendicular)
        let rx = fz;
        let rz = -fx;
        const rlen = Math.hypot(rx, rz) || 1;
        rx /= rlen;
        rz /= rlen;

        const ahead = 0.9;
        const side = 0.6;
        const offsetsDeg = [-12, -4, 4, 12];
        // Play single shot sound for this fire action
        try {
          if (!lasersActiveRef.current) {
            const shotId = powerEffect.active ? 'laser-shot' : 'bullet-normal';
            play && play(shotId, { volume: 0.6 });
          }
        } catch {}

        for (let i = 0; i < offsetsDeg.length; i++) {
          const deg = offsetsDeg[i];
          const rad = (deg * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          // rotated forward
          const dx = fx * cos - fz * sin;
          const dz = fx * sin + fz * cos;
          // lateral emitter offsets
          const s =
            i === 0
              ? -side
              : i === 1
              ? -side * 0.33
              : i === 2
              ? side * 0.33
              : side;
          const ex = px + fx * ahead + rx * s;
          const ez = pz + fz * ahead + rz * s;
          bulletPool.current.getBullet([ex, py, ez], [dx, 0, dz], style);
        }
        setBullets(bulletPool.current.getActiveBullets());
        return;
      }

      // Default fire: triple stream; Power-up: 5-stream fan
      {
        const fx = direction[0];
        const fz = direction[2];
        // Right vector on XZ plane (perpendicular)
        let rx = fz;
        let rz = -fx;
        const rlen = Math.hypot(rx, rz) || 1;
        rx /= rlen;
        rz /= rlen;

        const ahead = 0.85;
        const side = 0.45;
        // Diamond-power (high-tier power) => radial burst around player
        if (powerEffect.active && powerEffect.amount >= 90) {
          const count = 12; // radial bullets
          // Play single radial-shot sound for this fire action
          try {
            if (!lasersActiveRef.current) {
              const shotId = powerEffect.active ? 'laser-shot' : 'bullet-normal';
              play && play(shotId, { volume: 0.6 });
            }
          } catch {}

          for (let k = 0; k < count; k++) {
            const ang = (k / count) * Math.PI * 2;
            const dx = Math.cos(ang);
            const dz = Math.sin(ang);
            const ex = px + dx * 0.8;
            const ez = pz + dz * 0.8;
            bulletPool.current.getBullet([ex, py, ez], [dx, 0, dz], style);
          }
        } else {
          const offsetsDeg = powerEffect.active
            ? [-12, -6, 0, 6, 12]
            : [-8, 0, 8];
          // Play single shot sound for this fire action
          try {
            if (!lasersActiveRef.current) {
              const shotId = powerEffect.active ? 'laser-shot' : 'bullet-normal';
              play && play(shotId, { volume: 0.6 });
            }
          } catch {}

          for (let i = 0; i < offsetsDeg.length; i++) {
            const deg = offsetsDeg[i];
            const rad = (deg * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const dx = fx * cos - fz * sin;
            const dz = fx * sin + fz * cos;
            const sx =
              offsetsDeg.length === 3
                ? i === 0
                  ? -side
                  : i === 2
                  ? side
                  : 0
                : i === 0
                ? -side
                : i === 1
                ? -side * 0.5
                : i === 3
                ? side * 0.5
                : i === 4
                ? side
                : 0;
            const ex = px + fx * ahead + rx * sx;
            const ez = pz + fz * ahead + rz * sx;
            bulletPool.current.getBullet([ex, py, ez], [dx, 0, dz], style);
          }
        }
        setBullets(bulletPool.current.getActiveBullets());
        return;
      }
    },
    [powerEffect, invulnEffect.active, autoFollowHeld, autoFollowHeld2]
  );

  // Handle bullet expiration
  const handleBulletExpire = useCallback((bulletId) => {
    bulletPool.current.returnBullet(bulletId);
    setBullets(bulletPool.current.getActiveBullets());
  }, []);

  // Weighted sampler for power amounts to reduce 90–100 frequency
  function weightedPowerAmount() {
    const r = Math.random();
    if (r < 0.05) {
      // rare high tier ~5%
      return 90 + Math.floor(Math.random() * 11); // 90..100
    } else if (r < 0.3) {
      // mid tier ~25%
      return 81 + Math.floor(Math.random() * 9); // 81..89
    }
    // common low tier ~70%
    return 50 + Math.floor(Math.random() * 31); // 50..80
  }

  const spawnPickup = useCallback((type = "power", atPos = null) => {
    const id = pickupId.current++;
    if (type === "power") {
      const amount = weightedPowerAmount(); // biased 50..100
      const pos = atPos ?? randPos(30);
      setPickups((p) => {
        if (p.length >= MAX_PICKUPS) return p;
        return [...p, { id, pos, type: "power", amount, lifetimeMaxSec: 15 }];
      });
    } else {
      const pos = atPos ?? randPos(30);
      if (type === "armour") {
        const amount = randi(10, 50);
        setPickups((p) => {
          if (p.length >= MAX_PICKUPS) return p;
          return [
            ...p,
            { id, pos, type: "armour", amount, lifetimeMaxSec: 20 },
          ];
        });
        return;
      } else if (type === "lasers") {
        setPickups((p) => {
          if (p.length >= MAX_PICKUPS) return p;
          return [...p, { id, pos, type: "lasers", lifetimeMaxSec: 8 }];
        });
        return;
      } else if (type === "shield") {
        setPickups((p) => {
          if (p.length >= MAX_PICKUPS) return p;
          return [...p, { id, pos, type: "shield", lifetimeMaxSec: 12 }];
        });
        return;
      } else if (type === "pulsewave") {
        setPickups((p) => {
          if (p.length >= MAX_PICKUPS) return p;
          return [...p, { id, pos, type: "pulsewave", lifetimeMaxSec: 12 }];
        });
        return;
      }
      if (type === "health") {
        setPickups((p) => {
          if (p.length >= MAX_PICKUPS) return p;
          return [...p, { id, pos, type: "health", lifetimeMaxSec: 30 }];
        });
      } else if (type === "invuln") {
        setPickups((p) => {
          if (p.length >= MAX_PICKUPS) return p;
          return [...p, { id, pos, type: "invuln", lifetimeMaxSec: 20 }];
        });
      } else if (type === "bombs") {
        setPickups((p) => {
          if (p.length >= MAX_PICKUPS) return p;
          return [...p, { id, pos, type: "bombs", lifetimeMaxSec: 20 }];
        });
      } else if (type === "life") {
        setPickups((p) => {
          // Ensure only one life pickup exists concurrently
          if (p.some((x) => x.type === "life")) return p;
          if (p.length >= MAX_PICKUPS) return p;
          // play life spawn sfx
          try {
            play("life-spawn");
          } catch {}
          return [...p, { id, pos, type: "life", lifetimeMaxSec: 18 }];
        });
      }
    }
  }, []);

  // handle enemy death or collision - moved up to avoid initialization order issues
  const onEnemyDie = useCallback(
    (id, hitPlayer = false) => {
      setEnemies((prev) => {
        const enemy = prev.find((e) => e.id === id);
        if (!enemy) return prev.filter((e) => e.id !== id);
        // If enemy hit the player
        if (hitPlayer) {
          if (isPlayerInvulnerable()) {
            // Stun instead of despawn when invulnerable
            try {
              const ge = (window.gameEnemies || []).find((x) => x.id === id);
              if (ge) {
                ge.stun?.(3000);
                // Push away from player to prevent immediate retrigger
                const ex = ge.ref?.current?.position?.x ?? enemy.pos?.[0] ?? 0;
                const ez = ge.ref?.current?.position?.z ?? enemy.pos?.[2] ?? 0;
                const dx = ex - playerPosRef.current.x;
                const dz = ez - playerPosRef.current.z;
                const d = Math.hypot(dx, dz) || 1;
                ge.impulse?.(dx / d, dz / d, 40);
              }
            } catch {
              /* ignore */
            }
            // Keep enemy alive
            return prev;
          } else {
            // Apply contact damage and despawn
            const base = enemy?.isTriangle
              ? CONTACT_DAMAGE.triangle
              : enemy?.isBoss
              ? CONTACT_DAMAGE.boss
              : CONTACT_DAMAGE.minion;
            const scale = damageScaleRef.current || 1;
            const dmg = Math.max(1, Math.ceil((base || 1) * scale));
            damagePlayer(dmg);
            return prev.filter((e) => e.id !== id);
          }
        } else {
          // Enemy died from non-player collision or damage; award score and remove
          const points = enemy?.isTriangle ? 100 : enemy?.isBoss ? 50 : 10;
          setScore((s) => s + points);
          // SFX: enemy destroyed or major boss defeated
          try {
            if (
              enemy?.isTriangle ||
              enemy?.isCone ||
              enemy?.isCluster ||
              enemy?.isPipe
            ) {
              play("boss-kill");
            } else {
              play("enemy-destroy");
            }
          } catch {}
          // Increased drop economy with scaling at higher waves
          // Baseline gate and weights, scale up after wave 8
          const wv = wave || 0;
          const diff = Math.max(0, wv - 8);
          const scale = Math.min(1, diff / 10); // 0..1 over ~10 waves
          // Couple total drop chance with spawn pressure (fewer enemies → higher drop chance, and vice versa)
          const pressure = Math.max(
            0.5,
            Math.min(1.6, spawnPressureMulRef.current || 1)
          );
          const pickupFactor = Math.max(0.7, Math.min(1.5, 1 / pressure));
          const gateBase = 0.55 + 0.25 * scale;
          const gate = Math.max(0.1, Math.min(0.95, gateBase * pickupFactor));
          if (Math.random() < gate) {
            // Expanded drop table includes armour, lasers, shield, and pulsewave
            const r2 = Math.random();
            // Base weights that gently scale with wave difficulty
            const wInv = 0.1 + 0.15 * scale; // invulnerability
            const wBomb = 0.18 + 0.2 * scale; // bomb kit
            const wArmor = 0.22 + 0.18 * scale; // armour top-up
            const wLasers = 0.08 + 0.12 * scale; // laser array
            const wShield = 0.07 + 0.1 * scale; // shield bubble
            const wPulse = 0.06 + 0.08 * scale; // pulse wave
            const wCommon =
              1.0 - (wInv + wBomb + wArmor + wLasers + wShield + wPulse);
            // Cumulative thresholds
            const tInv = wInv;
            const tBomb = tInv + wBomb;
            const tArmor = tBomb + wArmor;
            const tLasers = tArmor + wLasers;
            const tShield = tLasers + wShield;
            const tPulse = tShield + wPulse;

            if (r2 < tInv) {
              spawnPickup("invuln");
            } else if (r2 < tBomb) {
              spawnPickup("bombs");
            } else if (r2 < tArmor) {
              spawnPickup("armour");
            } else if (r2 < tLasers) {
              spawnPickup("lasers");
            } else if (r2 < tShield) {
              spawnPickup("shield");
            } else if (r2 < tPulse) {
              spawnPickup("pulsewave");
            } else {
              // common pool
              spawnPickup(Math.random() < 0.7 ? "power" : "health");
            }
          }
          return prev.filter((e) => e.id !== id);
        }
      });
    },
    [spawnPickup, isPlayerInvulnerable, wave]
  );

  // (moved) spawnPickup and weightedPowerAmount are defined above onEnemyDie

  // Bullet-Enemy collision detection with proper health system
  const handleCollisionDetection = useCallback(() => {
    if (isPaused) return;

    const activeBullets = bulletPool.current.getActiveBullets();
    if (
      !activeBullets.length ||
      !window.gameEnemies ||
      !window.gameEnemies.length
    )
      return;

    const bulletPos = new THREE.Vector3();
    const enemyPos = new THREE.Vector3();
    const knockDir = new THREE.Vector3();

    for (const b of activeBullets) {
      bulletPos.set(b.pos[0], b.pos[1], b.pos[2]);

      let hitEnemy = null;
      let hitEnemyData = null;
      for (const ge of window.gameEnemies) {
        if (!ge.ref || !ge.ref.current) continue;
        const eData = enemies.find((e) => e.id === ge.id);
        if (!eData) continue;
        if (ge.isFlying) continue; // drones are immune to bullets
        enemyPos.copy(ge.ref.current.position);
        const hitRadius = eData.isBoss
          ? 1.8
          : eData.isTriangle
          ? 2.5
          : eData.isRoster
          ? 0.9
          : 0.8;
        const dist = bulletPos.distanceTo(enemyPos);
        if (dist < hitRadius) {
          hitEnemy = ge;
          hitEnemyData = { ...eData, dist };
          break;
        }
      }

      if (hitEnemy) {
        // Remove bullet
        bulletPool.current.returnBullet(b.id);
        setBullets(bulletPool.current.getActiveBullets());

        // Visual: bullet hit spark burst (match bullet color if available)
        try {
          const c = b?.style?.color != null ? b.style.color : 0x00ff66;
          triggerEffect &&
            triggerEffect("bulletHit", {
              position: [bulletPos.x, 0.5, bulletPos.z],
              color: c,
            });
        } catch {}

        // Knockback direction from bullet to enemy
        knockDir.subVectors(hitEnemy.ref.current.position, bulletPos);
        knockDir.y = 0;
        if (knockDir.lengthSq() > 0) {
          knockDir.normalize();
          const base = hitEnemyData.isTriangle
            ? KNOCKBACK.triangle
            : hitEnemyData.isBoss
            ? KNOCKBACK.boss
            : KNOCKBACK.minion;
          const factor =
            1 - Math.min(hitEnemyData.dist / KNOCKBACK_DISTANCE_MAX, 1);
          // Reduce knockback proportionally when global speeds are high to avoid excessive launches
          const strength = (base * factor) / SPEED_SCALE;
          hitEnemy.impulse?.(knockDir.x, knockDir.z, strength);
        }

        // Stun-only bullets (from invuln shape runner) do not deal damage
        if (b?.style?.stun) {
          hitEnemy.stun?.(3000);
          continue;
        }

        // Cone boss is immune to player bullets unless lasers pickup is active
        if (hitEnemy.isCone && !lasersActiveRef.current) {
          continue;
        }

        // Triangle boss should not lose HP during its forward dash (charging)
        if (hitEnemy.isCharging?.()) {
          continue;
        }

        // Apply damage (respect Enzyme Shield and resilience windows on certain roster enemies)
        const hitId = hitEnemy.id;
        // Determine tier for hit SFX
        let hitTier = 1;
        if (
          hitEnemyData?.isTriangle ||
          hitEnemyData?.isCone ||
          hitEnemyData?.isPipe ||
          hitEnemyData?.isCluster
        )
          hitTier = 5;
        else if (hitEnemyData?.isBoss) hitTier = 4;
        else if (hitEnemyData?.isRoster && Number.isFinite(hitEnemyData?.tier))
          hitTier = Math.max(1, Math.min(5, hitEnemyData.tier));
        let didDamage = false;
        setEnemies((prev) => {
          let died = false;
          const updated = prev
            .map((e) => {
              if (e.id !== hitId) return e;
              // Enzyme Shield: nullify bullet damage during active window
              if (e.isRoster && hitEnemy.enzymeShieldActive) {
                return e;
              }
              // A. baumannii XDR: temporary invulnerability after taking damage
              const now = performance.now();
              if (
                e.isRoster &&
                e.rosterName &&
                e.rosterName.includes("A. baumannii XDR")
              ) {
                if (
                  hitEnemy.resilienceInvulnUntil &&
                  now < hitEnemy.resilienceInvulnUntil
                ) {
                  return e; // ignore damage during resilience window
                }
              }

              // Compute scaled bullet damage and fraction accumulator
              let dmgUnits = PLAYER_BULLET_DAMAGE;
              // Lasers pickup: high damage bullets
              if (lasersActiveRef.current)
                dmgUnits = Math.max(PLAYER_BULLET_DAMAGE * 4, 8);
              let scale = e.bulletDamageScale || 1;
              // Enterobacter ESBL: Adaptive Shield — extra defense near allies
              if (
                e.isRoster &&
                e.rosterName &&
                e.rosterName.includes("Enterobacter ESBL") &&
                window.gameEnemies
              ) {
                try {
                  const self = hitEnemy.ref?.current?.position;
                  if (self) {
                    let allies = 0;
                    for (const ge of window.gameEnemies) {
                      if (!ge?.ref?.current || ge.id === hitEnemy.id) continue;
                      const d = ge.ref.current.position.distanceTo(self);
                      if (d <= 5) {
                        allies++;
                        if (allies >= 1) break;
                      }
                    }
                    if (allies >= 1) scale *= 0.7;
                  }
                } catch {}
              }
              const add = dmgUnits * scale;
              const store = (e._dmgStore || 0) + add;
              let takeHp = 0;
              let acc = store;
              while (acc >= 1 && e.health - takeHp > 0) {
                acc -= 1;
                takeHp += 1;
              }
              const newHealth = (e.health ?? 1) - takeHp;
              const newStore = acc;
              if (takeHp > 0) didDamage = true;

              // Mutation Surge: speed burst on damage for E. coli CRE
              if (
                takeHp > 0 &&
                e.isRoster &&
                e.rosterName &&
                e.rosterName.includes("E. coli CRE")
              ) {
                hitEnemy.mutSpeedUntil = now + 4000;
              }
              // Extreme Resilience: start resilience window after taking damage (A. baumannii XDR)
              if (
                takeHp > 0 &&
                e.isRoster &&
                e.rosterName &&
                e.rosterName.includes("A. baumannii XDR")
              ) {
                hitEnemy.resilienceInvulnUntil = now + 1500;
              }
              // Roster trait: Rapid Division (clone on crossing 50%)
              if (
                e.isRoster &&
                e.cloneOnHalf &&
                !e.cloned &&
                newHealth <= Math.floor((e.maxHealth || 1) / 2)
              ) {
                e.cloned = true;
                const nid = enemyId.current++;
                const jitter = 0.6;
                const nx =
                  (e.pos?.[0] ?? enemyPos.x) + (Math.random() - 0.5) * jitter;
                const nz =
                  (e.pos?.[2] ?? enemyPos.z) + (Math.random() - 0.5) * jitter;
                const nh = Math.max(1, Math.ceil((e.maxHealth || 2) / 2));
                setEnemies((pp) => [
                  ...pp,
                  {
                    id: nid,
                    pos: [nx, 0.5, nz],
                    isRoster: true,
                    rosterName: e.rosterName,
                    rosterColor: e.rosterColor,
                    health: nh,
                    maxHealth: nh,
                    spawnHeight: DROP_SPAWN_HEIGHT + Math.random() * 2,
                    stunImmune: e.stunImmune,
                    cloneOnHalf: false,
                    bulletDamageScale: e.bulletDamageScale,
                  },
                ]);
              }
              if (newHealth <= 0) {
                died = true;
                return null;
              }
              return { ...e, health: newHealth, _dmgStore: newStore };
            })
            .filter(Boolean);
          if (died) setTimeout(() => onEnemyDie(hitId, false), 0);
          return updated;
        });
        if (didDamage) {
          try {
            play(`hit-t${hitTier}`);
          } catch {}
        }
      }
    }
  }, [enemies, onEnemyDie, isPaused]);

  useEffect(() => {
    if (!isPaused) {
      handleCollisionDetection();
    }
  }, [bullets, handleCollisionDetection, isPaused]);

  // start waves loop (pause-aware, gated by isStarted, no stale closures)
  useEffect(() => {
    if (!isStarted) return;
    // initial wave
    spawnWave();
    let cancelled = false;
    let timer = null;
    const tick = () => {
      if (cancelled) return;
      if (!isPausedRef.current) {
        spawnWave();
        // Ambient pickup spawns after waves — couple with spawn pressure as well
        {
          const pressure = Math.max(
            0.5,
            Math.min(1.6, spawnPressureMulRef.current || 1)
          );
          const pickupFactor = Math.max(0.7, Math.min(1.5, 1 / pressure));
          // Power/health common drop
          const commonP = Math.max(0.3, Math.min(0.99, 0.9 * pickupFactor));
          if (Math.random() < commonP)
            spawnPickup(Math.random() < 0.3 ? "health" : "power");
          // Special pickups scale slightly with wave and pressure
          const wv = wave || 0;
          const s = Math.min(0.4, Math.max(0, (wv - 8) * 0.02));
          const pBomb = Math.max(
            0.02,
            Math.min(0.45, (0.14 + s) * pickupFactor)
          );
          const pInv = Math.max(0.01, Math.min(0.35, (0.1 + s) * pickupFactor));
          const pArmor = Math.max(
            0.03,
            Math.min(0.5, (0.16 + s) * pickupFactor)
          );
          const pLasers = Math.max(
            0.015,
            Math.min(0.3, (0.08 + s) * pickupFactor)
          );
          const pShield = Math.max(
            0.015,
            Math.min(0.28, (0.07 + s) * pickupFactor)
          );
          const pPulse = Math.max(
            0.01,
            Math.min(0.25, (0.06 + s) * pickupFactor)
          );
          if (Math.random() < pBomb) spawnPickup("bombs");
          if (Math.random() < pInv) spawnPickup("invuln");
          if (Math.random() < pArmor) spawnPickup("armour");
          if (Math.random() < pLasers) spawnPickup("lasers");
          if (Math.random() < pShield) spawnPickup("shield");
          if (Math.random() < pPulse) spawnPickup("pulsewave");
          // occasional second ambient pickup
          const secondP = Math.max(0.1, Math.min(0.9, 0.5 * pickupFactor));
          if (Math.random() < secondP)
            spawnPickup(Math.random() < 0.25 ? "health" : "power");
        }
        // Spawn multiple bouncers per cycle starting from wave 1; scale gently with wave
        if (!disableEnemySpawnsRef.current) {
          const wv = wave || 0;
          const extra = Math.min(3, Math.floor(wv / 4));
          const count = 2 + extra + (Math.random() < 0.4 ? 1 : 0);
          const lim = (boundaryLimit ?? BOUNDARY_LIMIT) - 2;
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 6 + Math.random() * (lim - 6);
            const px = Math.cos(angle) * radius;
            const pz = Math.sin(angle) * radius;
            openBouncerAt([px, 0.5, pz]);
          }
        }
      }
      timer = setTimeout(tick, 9000);
    };
    timer = setTimeout(tick, 9000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [spawnWave, spawnPickup, isStarted, openBouncerAt]);

  const pushPickupFeed = useCallback((pickup) => {
    const info =
      pickup.type === "health"
        ? { text: "+25 Health", color: "#22c55e" }
        : pickup.type === "power"
        ? { text: `Power +${pickup.amount ?? 50}`, color: "#60a5fa" }
        : pickup.type === "invuln"
        ? { text: "Invulnerability (5s)", color: "#facc15" }
        : pickup.type === "bombs"
        ? { text: "Bomb Kit (4/s for 6s)", color: "#111827" }
        : pickup.type === "life"
        ? { text: "1UP (+1 Life)", color: "#ff3366" }
        : pickup.type === "speedboost"
        ? { text: "Speed Boost (4s)", color: "#22c55e" }
        : pickup.type === "armour"
        ? { text: `Armour +${pickup.amount ?? 25} AP`, color: "#60a5fa" }
        : pickup.type === "lasers"
        ? { text: "Lasers (High Damage 5s)", color: "#ff4d4d" }
        : pickup.type === "shield"
        ? { text: "Shield Bubble (5s)", color: "#66ccff" }
        : pickup.type === "pulsewave"
        ? { text: "Pulse Wave (3x Bursts)", color: "#f97316" }
        : { text: "Pickup", color: "#ffffff" };
    setPickupFeed((prev) => {
      const next = [
        ...prev,
        { id: Date.now() + Math.random(), text: info.text, color: info.color },
      ];
      return next.slice(-5);
    });
  }, []);

  const pushBossFeed = useCallback((text, color = "#ffb020") => {
    setBossFeed((prev) => {
      const next = [...prev, { id: Date.now() + Math.random(), text, color }];
      return next.slice(-5);
    });
  }, []);

  // Keep a live ref pointer so earlier-declared callbacks can safely invoke it
  useEffect(() => {
    pushBossFeedRef.current = pushBossFeed;
  }, [pushBossFeed]);

  const onPickupCollect = useCallback(
    (id) => {
      const pickup = pickups.find((pk) => pk.id === id);
      if (!pickup) return;

      setPickups((prev) => prev.filter((pk) => pk.id !== id));
      // Stream the pickup feed (replaces popup)
      pushPickupFeed(pickup);

      // Apply pickup effect
      if (pickup.type === "health") {
        const base = 25;
        const eff =
          regenDebuffRemainingRef.current > 0 ? Math.round(base * 0.5) : base;
        setHealth((h) => Math.min(h + eff, 100));
        const idEvt = Date.now() + Math.random();
        setHpEvents((evts) => [
          ...evts,
          { id: idEvt, amount: +eff, start: performance.now() },
        ]);
        try {
          pushPlayerLabel(`+${eff} HP`);
        } catch {}
        try {
          play("health-pickup");
        } catch {}
        // brief green health aura
        try {
          setHealthEffect({ active: true });
          setTimeout(() => setHealthEffect({ active: false }), 2000);
          // small shimmer to highlight
          setShimmers((s) => [...s, { id: Date.now() + Math.random() }]);
        } catch {}
      } else {
        if (pickup.type === "power") {
          // power-up: add score by amount and enable bullet effect for duration
          const amt = Math.max(50, Math.min(100, pickup.amount || 50));
          setScore((s) => s + amt);
          // duration proportional to amount (5..10s)
          powerRemainingRef.current = (amt / 10) * 1000;
          setPowerEffect({ active: true, amount: amt });
          try {
            play(amt >= 90 ? "diamond" : "powerup");
          } catch {}
        } else if (pickup.type === "invuln") {
          invulnRemainingRef.current = 5000;
          const shapes = ["circle", "hexagon", "rectangle"];
          const shape = shapes[Math.floor(Math.random() * shapes.length)];
          // Activate ref immediately to avoid any frame where damage can sneak in
          invulnActiveRef.current = true;
          setInvulnEffect({ active: true, shape });
          try {
            pushPlayerLabel("INVULNERABLE!");
          } catch {}
          try {
            play("invuln-on");
          } catch {}
          // Clear any active slow debuff immediately; if one existed, trigger a blue shimmer cue
          const hadDebuff = debuffRemainingRef.current > 0;
          debuffRemainingRef.current = 0;
          setDebuffEffect({ active: false });
          if (hadDebuff) {
            const id = Date.now() + Math.random();
            setShimmers((prev) => [...prev, { id }]);
          }
        } else if (pickup.type === "bombs") {
          // Activate bomb kit effect: 4 bombs/sec for 4s (16 bombs total)
          bombEffectTimeRef.current = BOMB_ABILITY_DURATION_MS;
          bombSpawnTimerRef.current = 0;
          setBombEffect({ active: true });
          try {
            pushPlayerLabel("BOMB KIT");
          } catch {}
          // While bomb kit is active, make player invulnerable but nearly immobilized
          clearPickupInvulnTimeouts();
          applyPickupInvulnState({
            invulnerable: true,
            movementMul: 0.1,
            movementLocked: false,
            source: "bombs",
          });
          pickupInvulnTimeoutsRef.current.push(
            setTimeout(() => {
              applyPickupInvulnState({ invulnerable: false, movementMul: 1, movementLocked: false, source: null });
            }, BOMB_ABILITY_DURATION_MS)
          );
        } else if (pickup.type === "armour") {
          // Armour topup: randomized AP between 10-50
          const amt = Math.max(
            10,
            Math.min(
              50,
              Math.floor(pickup.amount || 10 + Math.floor(Math.random() * 41))
            )
          );
          setArmor((a) => {
            const next = a + amt;
            const idEvt = Date.now() + Math.random();
            setArmorEvents((evts) => [
              ...evts,
              { id: idEvt, amount: +amt, start: performance.now() },
            ]);
            try {
              pushPlayerLabel(`+${amt} AP`);
            } catch {}
            return next;
          });
          try {
            play("powerup");
          } catch {}
          // Grant brief invulnerability for armour top-up
          clearPickupInvulnTimeouts();
          applyPickupInvulnState({ invulnerable: true, movementMul: 1, movementLocked: false, source: "armour" });
          pickupInvulnTimeoutsRef.current.push(
            setTimeout(() => {
              applyPickupInvulnState({ invulnerable: false, movementMul: 1, movementLocked: false, source: null });
            }, 3000)
          );
        } else if (pickup.type === "lasers") {
          // Laser array: high damage bullets that also affect cone boss; 10s
          lasersRemainingRef.current = 10000;
          setLasersEffect({ active: true });
          try { lasersStartRef.current = performance.now(); } catch {}
          try {
            pushPlayerLabel("LASER ARRAY");
          } catch {}
          try {
            // Play the requested 5s charge then 5s explosion sequence
            playSequence && playSequence('laser-charge', 5000, 'laser-expl', 5000)
          } catch {}
          // Laser array: staged movement rules
          // First 5s: fully invulnerable and movement locked; next 5s: invulnerable + slow movement (10%)
          clearPickupInvulnTimeouts();
          applyPickupInvulnState({ invulnerable: true, movementMul: 0, movementLocked: true, source: 'lasers_phase1' });
          pickupInvulnTimeoutsRef.current.push(
            setTimeout(() => {
              applyPickupInvulnState({ invulnerable: true, movementMul: 0.1, movementLocked: false, source: 'lasers_phase2' });
              // final clear after remaining 5s
              pickupInvulnTimeoutsRef.current.push(
                setTimeout(() => {
                  applyPickupInvulnState({ invulnerable: false, movementMul: 1, movementLocked: false, source: null });
                }, 5000)
              );
            }, 5000)
          );
        } else if (pickup.type === "shield") {
          // Shield bubble: keep enemies at distance for 5s
          shieldRemainingRef.current = 5000;
          setShieldEffect({ active: true });
          try {
            pushPlayerLabel("SHIELD");
          } catch {}
          try {
            play("invuln-on");
          } catch {}
        } else if (pickup.type === "pulsewave") {
          // Pulse Wave: 3 bursts over ~5s that launch enemies and spawn air-bombs on them
          setPulseWaveEffect({ active: true });
          try {
            pushPlayerLabel("PULSE WAVE");
          } catch {}
          try {
            play("powerup");
          } catch {}
          // schedule 3 bursts (0ms, ~1700ms, ~3400ms)
          const scheduleBurst = (delayMs, idToken) => {
            setTimeout(() => {
              if (isPausedRef.current) return; // skip if paused (best-effort)
              // PulseWave: large blast radius pushing enemies away and spawning air-bombs
              const R = 16.0; // large radius
              const now = performance.now();
              const p = playerPosRef.current;
              if (!window.gameEnemies) return;
              const enemies = window.gameEnemies.slice();
              enemies.forEach((ge) => {
                try {
                  if (!ge?.ref?.current) return;
                  const ex = ge.ref.current.position.x;
                  const ez = ge.ref.current.position.z;
                  const dx = ex - p.x;
                  const dz = ez - p.z;
                  const d2 = dx * dx + dz * dz;
                  if (d2 <= R * R) {
                    const d = Math.sqrt(Math.max(d2, 1e-6));
                    const nx = dx / d;
                    const nz = dz / d;
                    // immediate outward impulse (strong)
                    ge.impulse?.(nx, nz, 48);
                    // spawn an air-bomb at enemy location that will land & explode like player bombs
                    const speed = 6 + Math.random() * 6;
                    const idb = Date.now() + Math.random();
                    setBombs((prev) => [
                      ...prev,
                      {
                        id: idb,
                        pos: [ex, 0.8, ez],
                        vel: [nx * speed, BOMB_UP_VEL, nz * speed],
                        state: "air",
                        landedAt: 0,
                        explodeAt: 0,
                        hits: {},
                      },
                    ]);
                    try {
                      // Visual AOE cue at player location for this burst
                      setAoes((prev) => {
                        const next = [
                          ...prev,
                          {
                            id: Date.now() + Math.random(),
                            pos: [p.x, 0.06, p.z],
                            start: performance.now(),
                            radius: R * 0.9,
                          },
                        ];
                        return next.length > 12 ? next.slice(next.length - 12) : next;
                      });
                      // one-shot shimmer on player
                      setShimmers((s) => [
                        ...s,
                        { id: Date.now() + Math.random() },
                      ]);
                      triggerEffect &&
                        triggerEffect("pulseWave", {
                          position: [p.x, 0.2, p.z],
                          power: 1.0,
                        });
                      play && play("pulsewave");
                    } catch {}
                  }
                } catch {}
              });
            }, delayMs);
          };
          scheduleBurst(0, pickup.id);
          scheduleBurst(1700, pickup.id);
          scheduleBurst(3400, pickup.id);
          // clear active flag after 5s
          setTimeout(() => setPulseWaveEffect({ active: false }), 5200);
          // Pulsewave: invulnerable and movement locked for the burst duration
          clearPickupInvulnTimeouts();
          applyPickupInvulnState({ invulnerable: true, movementMul: 0, movementLocked: true, source: 'pulsewave' });
          pickupInvulnTimeoutsRef.current.push(
            setTimeout(() => {
              applyPickupInvulnState({ invulnerable: false, movementMul: 1, movementLocked: false, source: null });
            }, 5200)
          );
        } else if (pickup.type === "life") {
          // If player already at max lives, restore to full health instead of wasting the 1UP
          const MAX_LIVES = 5;
          setLives((l) => {
            if (l >= MAX_LIVES) {
              try {
                // restore 100% health when at max lives
                setHealth(100);
              } catch {}
              try {
                pushPlayerLabel("Max Lives — Full Heal");
              } catch {}
              try {
                play("life-pickup");
              } catch {}
              // still grant the shield token effect to provide some immediate feedback
              setLifeShieldToken((t) => t + 1);
              return l; // do not increase lives beyond cap
            }
            // otherwise grant an extra life as normal
            try {
              pushPlayerLabel("1UP");
            } catch {}
            try {
              play("life-pickup");
            } catch {}
            setLifeShieldToken((t) => t + 1);
            return Math.min(l + 1, MAX_LIVES);
          });
        }
      }
    },
    [pickups, pushPickupFeed]
  );

  // Remove pickup popup
  const removePickupPopup = useCallback((popupId) => {
    setPickupPopups((prev) => prev.filter((p) => p.id !== popupId));
  }, []);

  // Power-up effect timer (pause-aware)
  useEffect(() => {
    if (!powerEffect.active) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (!isPausedRef.current) {
        powerRemainingRef.current = Math.max(
          0,
          powerRemainingRef.current - 100
        );
        if (powerRemainingRef.current <= 0) {
          setPowerEffect({ active: false, amount: 0 });
          return;
        }
      }
      setTimeout(tick, 100);
    };
    const t = setTimeout(tick, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [powerEffect.active]);

  // Lasers effect timer (pause-aware, 5s)
  useEffect(() => {
    if (!lasersEffect.active) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (!isPausedRef.current) {
        lasersRemainingRef.current = Math.max(
          0,
          lasersRemainingRef.current - 100
        );
        if (lasersRemainingRef.current <= 0) {
          setLasersEffect({ active: false });
          return;
        }
      }
      setTimeout(tick, 100);
    };
    const t = setTimeout(tick, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [lasersEffect.active]);

  // Clear beam when lasers effect ends
  useEffect(() => {
    if (!lasersEffect.active) {
      setLaserBeam(null);
    }
  }, [lasersEffect.active]);

  // Shield bubble timer + keep-away loop (pause-aware, 5s)
  useEffect(() => {
    if (!shieldEffect.active) return;
    let cancelled = false;
    shieldRemainingRef.current = shieldRemainingRef.current || 5000;
    const tick = () => {
      if (cancelled) return;
      if (!isPausedRef.current) {
        shieldRemainingRef.current = Math.max(
          0,
          shieldRemainingRef.current - 150
        );
        // Apply periodic impulse to nearby enemies to keep them away
        try {
          if (window.gameEnemies) {
            const p = playerPosRef.current;
            const R = 6.0;
            for (const ge of window.gameEnemies) {
              if (!ge?.ref?.current) continue;
              const dx = ge.ref.current.position.x - p.x;
              const dz = ge.ref.current.position.z - p.z;
              const d2 = dx * dx + dz * dz;
              if (d2 <= R * R) {
                const d = Math.sqrt(Math.max(d2, 1e-6));
                const nx = dx / d;
                const nz = dz / d;
                // stronger push when closer
                const strength = 30 * (1 - Math.min(1, d / R));
                ge.impulse?.(nx, nz, strength);
              }
            }
          }
        } catch {}
        if (shieldRemainingRef.current <= 0) {
          setShieldEffect({ active: false });
          return;
        }
      }
      setTimeout(tick, 150);
    };
    const t = setTimeout(tick, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [shieldEffect.active]);

  // Bomb kit effect: spawn 4 bombs/sec for 4s (pause-aware)
  useEffect(() => {
    if (!bombEffect.active) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (!isPausedRef.current) {
        const dt = 100; // ms tick granularity
        bombEffectTimeRef.current = Math.max(0, bombEffectTimeRef.current - dt);
        bombSpawnTimerRef.current += dt;
        // spawn bombs every 250ms while effect time remains
        while (
          bombSpawnTimerRef.current >= BOMB_SPAWN_INTERVAL_MS &&
          bombEffectTimeRef.current > 0
        ) {
          bombSpawnTimerRef.current -= BOMB_SPAWN_INTERVAL_MS;
          // launch a bomb from player position with upward velocity and slight horizontal spread
          const p = playerPosRef.current;
          const angle = Math.random() * Math.PI * 2;
          const speed = 5 + Math.random() * 4; // travel a bit farther
          const vx = Math.cos(angle) * speed;
          const vz = Math.sin(angle) * speed;
          const id = Date.now() + Math.random();
          setBombs((prev) => [
            ...prev,
            {
              id,
              pos: [p.x, p.y + 0.8, p.z],
              vel: [vx, BOMB_UP_VEL, vz],
              state: "air",
              landedAt: 0,
              explodeAt: 0,
              hits: {},
            },
          ]);
        }
        if (bombEffectTimeRef.current <= 0) {
          setBombEffect({ active: false });
          return;
        }
      }
      setTimeout(tick, 100);
    };
    const t = setTimeout(tick, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [bombEffect.active]);

  // Boost effect timer (pause-aware)
  useEffect(() => {
    if (!boostEffect.active) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (!isPausedRef.current) {
        boostRemainingRef.current = Math.max(
          0,
          (boostRemainingRef.current | 0) - 100
        );
        if (boostRemainingRef.current <= 0) {
          setBoostEffect({ active: false });
          return;
        }
      }
      setTimeout(tick, 100);
    };
    const t = setTimeout(tick, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [boostEffect.active]);

  // Debuff effect timer (pause-aware)
  useEffect(() => {
    if (!debuffEffect.active) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (!isPausedRef.current) {
        debuffRemainingRef.current = Math.max(
          0,
          (debuffRemainingRef.current | 0) - 100
        );
        if (debuffRemainingRef.current <= 0) {
          setDebuffEffect({ active: false });
          return;
        }
      }
      setTimeout(tick, 100);
    };
    const t = setTimeout(tick, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [debuffEffect.active]);

  // Regen debuff timer (pause-aware)
  useEffect(() => {
    if (!regenDebuff.active) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (!isPausedRef.current) {
        regenDebuffRemainingRef.current = Math.max(
          0,
          (regenDebuffRemainingRef.current | 0) - 100
        );
        if (regenDebuffRemainingRef.current <= 0) {
          setRegenDebuff({ active: false });
          return;
        }
      }
      setTimeout(tick, 100);
    };
    const t = setTimeout(tick, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [regenDebuff.active]);

  // Corrosion effect timer (pause-aware): damages armor over time
  useEffect(() => {
    if (!corrosionEffect.active) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (!isPausedRef.current) {
        const dt = 100;
        corrosionRemainingRef.current = Math.max(
          0,
          (corrosionRemainingRef.current | 0) - dt
        );
        corrosionTickTimerRef.current += dt;
        // apply 3 armor damage every 0.5s
        while (
          corrosionTickTimerRef.current >= 500 &&
          corrosionRemainingRef.current > 0
        ) {
          corrosionTickTimerRef.current -= 500;
          // damage armor-only by 3
          setArmor((a) => {
            if (a <= 0) return a;
            const take = Math.min(a, 3);
            const idEvt = Date.now() + Math.random();
            setArmorEvents((evts) => [
              ...evts,
              { id: idEvt, amount: -take, start: performance.now() },
            ]);
            return a - take;
          });
        }
        if (corrosionRemainingRef.current <= 0) {
          setCorrosionEffect({ active: false });
          corrosionTickTimerRef.current = 0;
          return;
        }
      }
      setTimeout(tick, 100);
    };
    const t = setTimeout(tick, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [corrosionEffect.active]);

  // Invulnerability effect timer (pause-aware, 5s)
  useEffect(() => {
    if (!invulnEffect.active) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (!isPausedRef.current) {
        invulnRemainingRef.current = Math.max(
          0,
          invulnRemainingRef.current - 100
        );
        if (invulnRemainingRef.current <= 0) {
          // Clear invulnerability synchronously
          invulnActiveRef.current = false;
          setInvulnEffect({ active: false });
          // trigger an arc jump at end of invulnerability only if holding 1 or 2
          if (autoFollowHeldRef.current || autoFollowHeld2Ref.current) {
            setArcTriggerToken((t) => t + 1);
            // mark to protect player 2s after landing from this auto-launch
            expectingPostInvulnLandingRef.current = true;
          }
          return;
        }
      }
      setTimeout(tick, 100);
    };
    const t = setTimeout(tick, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [invulnEffect.active]);

  // Damage enemies inside the shape area once per second during invulnerability
  useEffect(() => {
    if (!invulnEffect.active) return;
    let cancelled = false;
    const center = { x: 0, z: 0 };
    const radius = SHAPE_PATH_RADIUS;
    const shape = invulnEffect.shape || "circle";
    function pointInPolygon(px, pz, verts) {
      // Ray-casting algorithm for 2D point-in-polygon
      let inside = false;
      for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
        const xi = verts[i][0],
          zi = verts[i][1];
        const xj = verts[j][0],
          zj = verts[j][1];
        const intersect =
          zi > pz !== zj > pz &&
          px < ((xj - xi) * (pz - zi)) / (zj - zi || 1e-9) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    }

    const tick = () => {
      if (cancelled) return;
      if (!isPausedRef.current) {
        const idsToDamage = [];
        if (window.gameEnemies) {
          for (const ge of window.gameEnemies) {
            if (!ge?.ref?.current) continue;
            if (ge.isFlying) continue; // flying drones immune to invulnerability DoT
            const ex = ge.ref.current.position.x;
            const ez = ge.ref.current.position.z;
            let inside = false;
            if (shape === "circle") {
              const dx = ex - center.x;
              const dz = ez - center.z;
              inside = dx * dx + dz * dz <= radius * radius;
            } else if (shape === "rectangle") {
              const hx = radius;
              const hz = radius * 0.7;
              inside =
                ex >= center.x - hx &&
                ex <= center.x + hx &&
                ez >= center.z - hz &&
                ez <= center.z + hz;
            } else if (shape === "hexagon") {
              const verts = [];
              for (let i = 0; i < 6; i++) {
                const a = -Math.PI / 2 + i * ((2 * Math.PI) / 6);
                verts.push([
                  center.x + Math.cos(a) * radius,
                  center.z + Math.sin(a) * radius,
                ]);
              }
              inside = pointInPolygon(ex, ez, verts);
            } else {
              // fallback to circle behavior if unknown shape
              const dx = ex - center.x;
              const dz = ez - center.z;
              inside = dx * dx + dz * dz <= radius * radius;
            }
            // Do not damage triangle boss while it's charging; prevents despawn mid-dash
            if (inside && !ge.isCharging?.()) idsToDamage.push(ge.id);
          }
        }
        if (idsToDamage.length) {
          setEnemies((prev) => {
            const toDie = [];
            const updated = prev
              .map((e) => {
                if (!idsToDamage.includes(e.id)) return e;
                const nh = (e.health ?? 1) - 1;
                if (nh <= 0) {
                  toDie.push(e.id);
                  return null;
                }
                return { ...e, health: nh };
              })
              .filter(Boolean);
            // fire deaths after state update
            if (toDie.length)
              setTimeout(() => toDie.forEach((id) => onEnemyDie(id, false)), 0);
            return updated;
          });
        }
      }
      setTimeout(tick, 1000);
    };
    const t = setTimeout(tick, 1000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [invulnEffect.active, invulnEffect.shape, onEnemyDie]);

  // Hazard zone ticking: apply damage and slow/debuffs to player when inside zones
  useEffect(() => {
    if (!hazards.length) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      perf.start("hazard_tick");
      if (!isPausedRef.current) {
        const px = playerPosRef.current.x;
        const pz = playerPosRef.current.z;
        const now = performance.now();
        hazards.forEach((h) => {
          if (now > h.createdAt + (h.durationMs || 6000)) return;
          const dx = px - h.pos[0];
          const dz = pz - h.pos[2];
          const r = h.radius || 4;
          if (dx * dx + dz * dz <= r * r) {
            // Slow effect (reuse debuffEffect)
            if (
              h.slow &&
              (!debuffEffect.active || debuffRemainingRef.current < 200)
            ) {
              debuffRemainingRef.current = Math.max(
                debuffRemainingRef.current || 0,
                500
              );
                setDebuffEffect({ active: true });
                try { play && play('debuff') } catch {}
            }
            // Damage tick based on tickMs and track last tick per hazard
            if (!h._lastTickAt) h._lastTickAt = now;
            if (now - h._lastTickAt >= (h.tickMs || 1000)) {
              h._lastTickAt = now;
              const hasDps = typeof h.dps === "number" && h.dps > 0;
              if (h.type === "corrosive") {
                // armor-specific: apply corrosion debuff for 5s
                corrosionRemainingRef.current = Math.max(
                  corrosionRemainingRef.current || 0,
                  5000
                );
                setCorrosionEffect({ active: true });
              } else if (h.type === "carcinogen") {
                regenDebuffRemainingRef.current = Math.max(
                  regenDebuffRemainingRef.current || 0,
                  4000
                );
                setRegenDebuff({ active: true });
              } else if (h.type === "toxin") {
                if (hasDps) damagePlayer(h.dps);
              } else {
                if (hasDps) damagePlayer(h.dps);
              }
            }
          }
        });
      }
      perf.end("hazard_tick");
      setTimeout(tick, 100);
    };
    const t = setTimeout(tick, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [hazards, debuffEffect.active, damagePlayer]);

  // Biofilm Armor: A. baumannii MDR regenerates 10% max HP every 5s (pause-aware)
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (!isPausedRef.current) {
        setEnemies((prev) =>
          prev.map((e) => {
            if (
              !e?.isRoster ||
              !e.rosterName ||
              !e.rosterName.includes("A. baumannii MDR")
            )
              return e;
            const elapsed = (e._regenElapsed || 0) + 500;
            if (elapsed >= 5000) {
              const heal = Math.max(1, Math.ceil((e.maxHealth || 1) * 0.1));
              const nh = Math.min((e.health || 1) + heal, e.maxHealth || 1);
              return { ...e, health: nh, _regenElapsed: elapsed - 5000 };
            }
            return { ...e, _regenElapsed: elapsed };
          })
        );
      }
      setTimeout(tick, 500);
    };
    const t = setTimeout(tick, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  // High-value radial barrage (3 waves/sec) while effect active and amount>=90
  useEffect(() => {
    if (!powerEffect.active || powerEffect.amount < 90) return;
    let cancelled = false;
    const fireWave = () => {
      if (cancelled) return;
      if (!isPausedRef.current && powerRemainingRef.current > 0) {
        const N = 24;
        for (let i = 0; i < N; i++) {
          const a = (i / N) * Math.PI * 2;
          const dir = [Math.cos(a), 0, Math.sin(a)];
          handleShoot(playerPosRef.current, dir);
        }
      }
    };
    const interval = setInterval(fireWave, 333);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [powerEffect.active, powerEffect.amount, handleShoot]);

  // Death / lives / game over handling with single-fire guard
  useEffect(() => {
    if (health <= 0) {
      if (deathHandledRef.current) return;
      deathHandledRef.current = true;
      // Clear world state
      setEnemies([]);
      setPickups([]);
      setBullets([]);
      setPortals([]);
      setSpeedBoosts([]);
      setBouncerTelegraphs([]);
      setBouncers([]);
      clearPortalTimers();
      clearSpeedBoostTimers();
      clearBouncerTimers();
      bulletPool.current.clear();

      if (livesRef.current > 1) {
        // Lose a life and respawn after a short countdown
        try {
          play("life-lost");
        } catch {}
        setLives((l) => Math.max(l - 1, 0));
        setIsPaused(true);
        setRespawnCountdown(3);
        let count = 3;
        const interval = setInterval(() => {
          count -= 1;
          setRespawnCountdown(count);
          if (count <= 0) {
            clearInterval(interval);
            setRespawnCountdown(0);
            setHealth(100);
            setArmor(100);
            setPlayerResetToken((t) => t + 1);
            setIsPaused(false);
            try {
              play("player-spawn");
            } catch {}
            // Kick off next wave immediately
            spawnWave();
            // Auto-launch at level 21+ on life respawn to help avoid high-speed enemies
            try {
              if ((wave || 0) >= 20) {
                setArcTriggerToken((t) => t + 1);
              }
            } catch {
              /* ignore */
            }
          }
        }, 1000);
        return () => clearInterval(interval);
      } else {
        // Game Over
        setLives(0);
        setIsGameOver(true);
        setIsPaused(true);
        // SFX sequence: hit then jingle
        try {
          play("game-over-1");
          setTimeout(() => play("game-over-2"), 600);
        } catch {}
        // Log run history (score, wave, timestamp, perf mode)
        try {
          addRun &&
            addRun({
              score,
              wave,
              at: new Date().toISOString(),
              performanceMode,
            });
        } catch {
          /* ignore history add errors */
        }
      }
    } else {
      deathHandledRef.current = false;
    }
  }, [
    health,
    clearPortalTimers,
    clearSpeedBoostTimers,
    spawnWave,
    addRun,
    score,
    wave,
    performanceMode,
  ]);

  // Restart game function
  const restartGame = useCallback(() => {
    setEnemies([]);
    setPickups([]);
    setBullets([]);
    bulletPool.current.clear();
    setBouncerTelegraphs([]);
    setBouncers([]);
    setHealth(100);
    setScore(0);
    setWave(0);
    setPortals([]);
    setSpeedBoosts([]);
    // Reset speed ramps and caps
    enemySpeedScaleRef.current = 1;
    setEnemySpeedScale(1);
    setPlayerBaseSpeed(PLAYER_SPEED);
    // Clear global enemy references
    window.gameEnemies = [];
    clearPortalTimers();
    clearSpeedBoostTimers();
    clearBouncerTimers();
    setPlayerResetToken((t) => t + 1);
  }, [clearPortalTimers]);

  // Continue on same level with a 10% score penalty (from total score)
  const continueSameLevel = useCallback(() => {
    // Apply penalty: 10% of TOTAL current score
    const total = Math.max(0, scoreRef.current || 0);
    const penalty = Math.floor(total * 0.1);
    if (penalty > 0) {
      setScore((s) => Math.max(0, s - penalty));
    }
    // Clear world state
    setEnemies([]);
    setPickups([]);
    setBullets([]);
    bulletPool.current.clear();
    setBouncerTelegraphs([]);
    setBouncers([]);
    setPortals([]);
    setSpeedBoosts([]);
    clearPortalTimers();
    clearSpeedBoostTimers();
    clearBouncerTimers();
  // Restore player state
  setHealth(100);
  setArmor(100);
    setLives(1);
    setPlayerResetToken((t) => t + 1);
    // Unpause and clear game-over flag
    setIsGameOver(false);
    setIsPaused(false);
    // Spawn the same level: decrement once, then call spawnWave (which increments)
    setWave((w) => Math.max(0, w - 1));
    spawnWave();
  }, [spawnWave, clearPortalTimers, clearSpeedBoostTimers, clearBouncerTimers]);

  // ground plane grid material
  const grid = useMemo(
    () => new THREE.GridHelper(200, 40, 0xb8c2cc, 0xe2e8f0),
    []
  );
  // live enemy list ref for planners
  const enemiesRef = useRef([]);
  // World-space FX orbs anchor (follows player position each frame)
  const fxAnchorRef = useRef();

  // ForwardRef component to track player position without re-rendering FXOrbs
  const PlayerFXAnchor = useMemo(() => {
    return React.forwardRef(({ playerPosRef }, ref) => {
      useFrame(() => {
        if (!ref.current || !playerPosRef?.current) return;
        // Direct copy for tight follow; could lerp for smoothing if desired
        ref.current.position.copy(playerPosRef.current);
      });
      return <group ref={ref} />;
    });
  }, []);
  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);
  const crosshairRef = useRef(null);
  const rafRef = useRef(0);

  // External movement input vectors (refs to avoid per-frame allocations)
  const dpadVecRef = useRef({ x: 0, z: 0 });
  // runnerVecRef removed
  // Effective movement input for Player when using external controls
  const moveInputRef = useRef({ x: 0, z: 0 });
  // Source of movement for speed scaling/override semantics: 'dpad' | 'runner' | 'keyboard' | 'none'
  const moveSourceRef = useRef("none");

  // shape runner auto-move removed

  // External movement: only DPad input; keyboard handled directly in Player
  useEffect(() => {
    let raf = 0;
    const merge = () => {
      const mx = dpadVecRef.current.x;
      const mz = dpadVecRef.current.z;
      if (Math.abs(mx) > 0.001 || Math.abs(mz) > 0.001) {
        moveInputRef.current.x = mx;
        moveInputRef.current.z = mz;
        moveSourceRef.current = "dpad";
      } else {
        moveInputRef.current.x = 0;
        moveInputRef.current.z = 0;
        moveSourceRef.current = "none";
      }
      raf = requestAnimationFrame(merge);
    };
    raf = requestAnimationFrame(merge);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Right-stick aim input (normalized x/z). Updated directly by right AnalogStick when touch controls active.
  const aimInputRef = useRef({ x: 0, z: 0 });

  const handlePointerMove = useCallback((e) => {
    const x = e.clientX;
    const y = e.clientY;
    if (!crosshairRef.current) return;
    // throttle with rAF to avoid layout trashing
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!crosshairRef.current) return;
      crosshairRef.current.style.left = x + "px";
      crosshairRef.current.style.top = y + "px";
    });
  }, []);

  return (
    <div className="canvas-wrap">
      <Canvas
        shadows
        dpr={[0.8, Math.min(1.25, window.devicePixelRatio || 1)]}
        camera={{ position: [0, 35, 30], fov: 50 }}
        onPointerMove={handlePointerMove}
      >
  <React.Suspense fallback={<Html fullscreen><LoadingOverlay /></Html>}>
          {/* Dynamically reduce pixel ratio on slow frames */}
          <AdaptiveDpr pixelated />
          {/* HDRI-based lighting, fog, and exposure control */}
          <SceneEnvironment />
          {/* Performance collectors (no-op unless overlay or marks are read) */}
          <PerfCollector enabled={true} />
          <PerfLongTaskObserver enabled={true} />
          {/* Keep a gentle key light to complement IBL */}
          <directionalLight
            position={[10, 40, 10]}
            intensity={0.6}
            castShadow
          />
          {/* Legacy static ground removed; dynamic ShaderPark ground provided by ProceduralEnvironmentFactory */}
          {/* Boundary visual cue */}
          <BoundaryCue
            limit={boundaryLimit ?? BOUNDARY_LIMIT}
            isPaused={isPaused}
          />
          {/* Optional grid disabled to avoid z-fighting with ShaderPark ground */}
          {/* <primitive object={grid} position={[0, 0.001, 0]} /> */}

          {/* Active portals */}
          {!isPaused &&
            portals.map((pr) => (
              <Portal key={pr.id} pos={pr.pos} isPaused={isPaused} />
            ))}

          {/* Active speed boost planes */}
          {!isPaused &&
            speedBoosts.map((sb) => (
              <SpeedBoostPlane key={sb.id} pos={sb.pos} isPaused={isPaused} />
            ))}

          {/* Active laser beam(s): when lasers power-up active, render a rotating array
              that transitions at 6s to a forward beam; otherwise render the short-lived
              beam produced by firing. */}
          {!isPaused && (lasersEffect.active ? (
            (() => {
              const now = performance.now();
              const start = lasersStartRef.current || 0;
              const elapsed = Math.max(0, now - start);
              const phaseTransitionMs = 6000;
              // If we are before the 6s mark, render a spinning ring of beams
              if (elapsed < phaseTransitionMs) {
                const n = 12; // number of beams around the player
                const rotSpeed = 0.9; // radians per second
                const baseAngle = ((elapsed / 1000) * rotSpeed) % (Math.PI * 2);
                const px = playerPosRef.current.x;
                const py = playerPosRef.current.y + 0.6;
                const pz = playerPosRef.current.z;
                return (
                  <group>
                    {Array.from({ length: n }).map((_, i) => {
                      const a = baseAngle + (i * (Math.PI * 2)) / n;
                      const dx = Math.cos(a);
                      const dz = Math.sin(a);
                      return (
                        <LaserBeam
                          key={`spin-${i}-${Math.floor(baseAngle*100)}`}
                          pos={[px, py, pz]}
                          dir={[dx, 0, dz]}
                          isPaused={isPaused}
                          dmgPerSecond={36}
                          radius={0.6}
                          length={26}
                          onDamage={applyLaserDamage}
                        />
                      );
                    })}
                  </group>
                );
              }
              // After the 6s mark, transition to a forward-focused beam until lasersEffect clears
              const aim = lastLaserAimRef.current || new THREE.Vector3(0, 0, -1);
              const forwardPos = new THREE.Vector3().copy(playerPosRef.current).addScaledVector(aim, 1.0);
              return (
                <LaserBeam
                  key={`laser-forward-${Math.floor(elapsed)}`}
                  pos={[forwardPos.x, forwardPos.y + 0.2, forwardPos.z]}
                  dir={[aim.x, aim.y, aim.z]}
                  isPaused={isPaused}
                  dmgPerSecond={72}
                  radius={1.1}
                  length={40}
                  onDamage={applyLaserDamage}
                />
              );
            })()
          ) : (
            laserBeam && (
              <LaserBeam
                key={laserBeam.id}
                pos={laserBeam.pos}
                dir={laserBeam.dir}
                isPaused={isPaused}
                dmgPerSecond={48}
                radius={0.9}
                length={28}
                onDamage={applyLaserDamage}
              />
            )
          ))}

          {/* Bouncer telegraphs and launched bouncers */}
          {!isPaused &&
            bouncerTelegraphs.map((bt) => (
              <BouncerTelegraph key={bt.id} pos={bt.pos} />
            ))}
          {!isPaused &&
            bouncers.map((b) => (
              <Bouncer
                key={b.id}
                data={b}
                onExpire={(id) =>
                  setBouncers((prev) => prev.filter((x) => x.id !== id))
                }
              />
            ))}

          <PlayerEntity
            position={[0, 0.5, 0]}
            setPositionRef={setPositionRef}
            onShoot={handleShoot}
            isPaused={isPaused}
            autoFire={autoFire}
            fireRateMs={debugFireRateMs}
            resetToken={playerResetToken}
            basePlayerSpeed={
                playerBaseSpeed * camSpeedMul
            }
            autoAimEnabled={cameraMode === "follow" || cameraMode === "topdown"}
            controlScheme={controlScheme}
            moveInputRef={moveInputRef}
            moveSourceRef={moveSourceRef}
            aimInputRef={aimInputRef}
            highContrast={highContrast}
            portals={portals}
            speedBoosts={speedBoosts}
            bouncers={bouncers}
            boundaryLimit={boundaryLimit ?? BOUNDARY_LIMIT}
            invulnActive={invulnEffect.active || invulnTest || pickupInvulnState.invulnerable}
            pickupInvulnState={pickupInvulnState}
            primaryColor={heroPrimaryColor}
            heroName={selectedHero}
            heroRenderMode={heroRenderMode}
            heroQuality={heroQuality}
            heroVisualScale={(heroQuality === "low" ? 2 : 3) * assetScale}
            powerActive={powerEffect.active}
            powerAmount={powerEffect.amount}
            lasersActive={lasersEffect.active}
            shieldStackToken={lifeShieldToken}
            fxOrbCount={debugFxOrbCount}
            autoFollow={autoFollowSpec}
            arcTriggerToken={arcTriggerToken}
            dashTriggerToken={dashTriggerToken}
            onDashStart={() => {
              setIsDashing(true);
              try {
                play("dash");
              } catch {}
            }}
            onDashEnd={(endPos) => {
              setIsDashing(false);
              setCameraBoostUntilMs(performance.now() + 400);
              // End-of-dash impact: strong pushback + stun in radius
              const center = [endPos.x, 0.06, endPos.z];
              const radius = 6.5;
              const power = 90;
              const stunMs = 3000;
              if (window.gameEnemies) {
                const cpos = new THREE.Vector3(center[0], 0.5, center[2]);
                const epos = new THREE.Vector3();
                window.gameEnemies.forEach((ge) => {
                  if (!ge?.ref?.current) return;
                  epos.copy(ge.ref.current.position);
                  const dx = epos.x - cpos.x;
                  const dz = epos.z - cpos.z;
                  const d2 = dx * dx + dz * dz;
                  const r2 = radius * radius;
                  if (d2 <= r2) {
                    const d = Math.sqrt(Math.max(d2, 1e-6));
                    const nx = dx / d;
                    const nz = dz / d;
                    const strength = power * (1 - d / radius);
                    ge.impulse?.(nx, nz, strength);
                    ge.stun?.(stunMs);
                  }
                });
              }
              // Visualize the impact (cap AOEs to last 12)
              setAoes((prev) => {
                const next = [
                  ...prev,
                  {
                    id: Date.now() + Math.random(),
                    pos: center,
                    start: performance.now(),
                    radius,
                  },
                ];
                return next.length > 12 ? next.slice(next.length - 12) : next;
              });
            }}
            onSlam={(slam) => {
              // Create AOE visual and push back enemies
              const center = slam.pos;
              const radius = slam.radius;
              const power = slam.power;
              // Apply impulses to enemies (no allocations beyond few vectors)
              const epos = new THREE.Vector3();
              const cpos = new THREE.Vector3(center[0], center[1], center[2]);
              if (window.gameEnemies) {
                window.gameEnemies.forEach((ge) => {
                  if (!ge.ref || !ge.ref.current) return;
                  epos.copy(ge.ref.current.position);
                  const dx = epos.x - cpos.x;
                  const dz = epos.z - cpos.z;
                  const d2 = dx * dx + dz * dz;
                  const r2 = radius * radius;
                  if (d2 <= r2) {
                    const d = Math.sqrt(Math.max(d2, 1e-6));
                    const nx = dx / d;
                    const nz = dz / d;
                    const strength = power * (1 - d / radius);
                    ge.impulse?.(nx, nz, strength);
                    // Apply stun for 5 seconds
                    ge.stun?.(5000);
                    // Bosses drop a health pickup with ~15% chance upon being stunned (further reduced)
                    if (ge.isBoss) {
                      if (Math.random() < 0.15) {
                        spawnPickup("health", [epos.x, 0.5, epos.z]);
                      }
                    }
                  }
                });
              }
              // Add AOE visual (cap to last 12)
              setAoes((prev) => {
                const next = [
                  ...prev,
                  {
                    id: Date.now(),
                    pos: [center[0], 0.06, center[2]],
                    start: performance.now(),
                    radius,
                  },
                ];
                return next.length > 12 ? next.slice(next.length - 12) : next;
              });
            }}
            onDebuff={() => {
              const popupId = Date.now();
              setPickupPopups((prev) => [
                ...prev,
                { id: popupId, pickup: { type: "debuff" } },
              ]);
              // Start debuff visualization timer
              debuffRemainingRef.current = SPEED_DEBUFF_DURATION_MS;
              setDebuffEffect({ active: true });
              try { play && play('debuff') } catch {}
            }}
            onBoost={() => {
              const popupId = Date.now();
              setPickupPopups((prev) => [
                ...prev,
                { id: popupId, pickup: { type: "speedboost" } },
              ]);
              // Start boost visualization timer
              boostRemainingRef.current = SPEED_BUFF_DURATION_MS;
              setBoostEffect({ active: true });
            }}
            onBoundaryJumpChange={(active) => {
              const v = !!active;
              boundaryJumpActiveRef.current = v;
              setBoundaryJumpActive(v);
              if (v) {
                try {
                  const p = playerPosRef.current;
                  triggerEffect &&
                    triggerEffect("boundaryGlow", {
                      position: [p.x, 0.05, p.z],
                      radius: 2.4,
                    });
                  play("boundary-jump");
                } catch {}
              }
            }}
            onLanding={() => {
              if (expectingPostInvulnLandingRef.current) {
                expectingPostInvulnLandingRef.current = false;
                postInvulnShieldUntilRef.current = performance.now() + 2000;
              }
            }}
          />

          {/* Shield bubble visual when active */}
          {!isPaused && shieldEffect.active && (
            <ShieldBubble
              playerPosRef={playerPosRef}
              isPaused={isPaused}
              color={0x66ccff}
              radius={1.6}
              baseOpacity={0.22}
            />
          )}
          {/* Health pickup aura (green) */}
          {!isPaused && healthEffect.active && (
            <ShieldBubble
              playerPosRef={playerPosRef}
              isPaused={isPaused}
              color={0x22c55e}
              radius={1.6}
              baseOpacity={0.18}
            />
          )}
          {/* Bomb kit strobing aura (black -> orange) */}
          {!isPaused && bombEffect.active && (
            <BombStrobe playerPosRef={playerPosRef} isPaused={isPaused} radius={1.8} />
          )}

          {/* World-space FX Orbs follow player via anchor ref */}
          <PlayerFXAnchor ref={fxAnchorRef} playerPosRef={playerPosRef} />
          {/* Player radial armour+health HUD (world-space HTML) */}
          {/* Radial HUD and text labels are rendered separately so the radial can be disabled
              while keeping the accessibility text labels active. */}
          {SHOW_PLAYER_RADIAL_HUD && (
            <PlayerRadialHUD
              playerPosRef={playerPosRef}
              health={health}
              armor={armor}
              maxHealth={100}
              maxArmor={500}
              // render only the radial visuals when the flag is enabled
              showRadial={true}
              showLabels={false}
            />
          )}

          {SHOW_PLAYER_LABELS && (
            <PlayerRadialHUD
              playerPosRef={playerPosRef}
              // minimal data required for labels
              playerLabels={playerLabelEvents}
              labelSize={playerLabelSize}
              showPlaceholder={showPlayerLabelPlaceholder}
              enemiesCount={enemies.length}
              // render only labels in this instance
              showRadial={false}
              showLabels={true}
            />
          )}
          {!isPaused && heroQuality !== "low" && debugFxOrbCount > 0 && (
            <FXOrbs
              spec={{
                id: "player_fx_global",
                height: 1.7 * (heroQuality === "low" ? 2 : 3) * assetScale,
                fxRing: true,
                fxRingRadius:
                  debugFxOrbRadius *
                  (heroQuality === "low" ? 2 : 3) *
                  assetScale,
                fxRingIntensity: 0.65,
                fxCount: debugFxOrbCount,
                fxMode: "wave",
                fxAmplitude: 0.45,
                fxSpeed: 1.0,
                fxDirectionDeg: 0,
                fxShieldShape: "circle",
                accentColor: heroColorFor(selectedHero),
                // pass size multiplier via amplitude scaling fallback if component extended later
                fxOrbSizeMul: debugFxOrbSizeMul,
                fxFollowLerp: debugFxOrbLerp,
              }}
              quality={heroQuality}
              forceShow
              followTarget={fxAnchorRef.current}
            />
          )}

          {!isPaused &&
            enemies.map((e) =>
              e.isTriangle ? (
                <TriangleBossEntity
                  key={e.id}
                  id={e.id}
                  pos={e.pos}
                  playerPosRef={playerPosRef}
                  onDie={onEnemyDie}
                  health={e.health}
                  isPaused={isPaused}
                  spawnHeight={e.spawnHeight}
                  speedScale={enemySpeedScale * camSpeedMul}
                  visualScale={assetScale}
                />
              ) : e.isCone ? (
                <ConeBossEntity
                  key={e.id}
                  id={e.id}
                  pos={e.pos}
                  playerPosRef={playerPosRef}
                  onDamagePlayer={damagePlayer}
                  health={e.health}
                  isPaused={isPaused}
                  spawnHeight={e.spawnHeight}
                  speedScale={enemySpeedScale * camSpeedMul}
                  visualScale={assetScale}
                />
              ) : e.isPipe ? (
                <PipeBossEntity
                  key={e.id}
                  id={e.id}
                  pos={e.pos}
                  playerPosRef={playerPosRef}
                  onDie={onEnemyDie}
                  health={e.health}
                  isPaused={isPaused}
                  onLaunchDrones={(count, fromPos) => {
                    // Respect drone unlock and cap total active drones
                    const level = wave || 1;
                    if (level < (LEVEL_CONFIG?.unlocks?.drone ?? 1)) return;
                    const maxDrones = LEVEL_CONFIG?.caps?.drones ?? 16;
                    setEnemies((prev) => {
                      const activeDrones = prev.filter(
                        (x) => x.isFlying
                      ).length;
                      const allowed = Math.max(0, maxDrones - activeDrones);
                      const toSpawn = Math.min(count, allowed);
                      if (toSpawn <= 0) return prev;
                      const arr = [...prev];
                      for (let i = 0; i < toSpawn; i++) {
                        const id = enemyId.current++;
                        // small offset ring around the pipe
                        const a = Math.random() * Math.PI * 2;
                        const r = 1.2 + Math.random() * 0.8;
                        const px = fromPos[0] + Math.cos(a) * r;
                        const pz = fromPos[2] + Math.sin(a) * r;
                        arr.push({
                          id,
                          pos: [px, 4, pz],
                          isFlying: true,
                          health: 1,
                          maxHealth: 1,
                        });
                      }
                      return arr;
                    });
                  }}
                  visualScale={assetScale}
                />
              ) : e.isCluster ? (
                <ClusterBossEntity
                  key={e.id}
                  id={e.id}
                  pos={e.pos}
                  playerPosRef={playerPosRef}
                  onDie={onEnemyDie}
                  health={e.health}
                  isPaused={isPaused}
                  visualScale={assetScale}
                />
              ) : e.isFlying ? (
                <FlyingDroneEntity
                  key={e.id}
                  id={e.id}
                  pos={e.pos}
                  playerPosRef={playerPosRef}
                  onDie={onEnemyDie}
                  isPaused={isPaused}
                  boundaryJumpActiveRef={boundaryJumpActiveRef}
                  assets={droneAssets}
                  trailBaseMat={droneTrailBaseMat}
                  boundaryLimit={boundaryLimit ?? BOUNDARY_LIMIT}
                  speedScale={enemySpeedScale * camSpeedMul}
                  visualScale={assetScale}
                />
              ) : e.isRoster ? (
                <RosterEnemyEntity
                  key={e.id}
                  id={e.id}
                  pos={e.pos}
                  playerPosRef={playerPosRef}
                  onDie={onEnemyDie}
                  isPaused={isPaused}
                  health={e.health}
                  maxHealth={e.maxHealth}
                  color={parseInt(
                    (e.rosterColor || "#ff0055").replace("#", "0x")
                  )}
                  spawnHeight={e.spawnHeight}
                  label={e.rosterName}
                  stunImmune={!!e.stunImmune}
                  speedScale={enemySpeedScale * camSpeedMul}
                  moveSpeed={e.moveSpeed || 10}
                  shape={e.rosterShape || "Circle"}
                  factorySpec={e.factorySpec || null}
                  visualScale={assetScale}
                  onHazard={(hz) => {
                    // Add hazard zones managed by App
                    const id = Date.now() + Math.random();
                    setHazards((prev) => [
                      ...prev,
                      { id, ...hz, createdAt: performance.now() },
                    ]);
                  }}
                />
              ) : (
                <MinionEntity
                  key={e.id}
                  id={e.id}
                  pos={e.pos}
                  playerPosRef={playerPosRef}
                  onDie={onEnemyDie}
                  isBoss={e.isBoss}
                  formationTarget={e.formationTarget}
                  waveNumber={e.waveNumber || wave}
                  health={e.health}
                  isPaused={isPaused}
                  spawnHeight={e.spawnHeight}
                  speedScale={enemySpeedScale * camSpeedMul}
                  visualScale={assetScale}
                />
              )
            )}

          {!isPaused &&
            bullets.length > 0 &&
            bullets.map((bullet) => (
              <Bullet
                key={bullet.id}
                bullet={bullet}
                onExpire={handleBulletExpire}
                isPaused={isPaused}
                speed={debugBulletSpeed}
              />
            ))}

          {/* Bombs */}
          {bombs.map((b) => (
            <Bomb
              key={b.id}
              data={b}
              isPaused={isPaused}
              onUpdate={(id, patch) =>
                setBombs((prev) =>
                  prev.map((x) => (x.id === id ? { ...x, ...patch } : x))
                )
              }
              onExplode={(id, pos) => {
                // AOE stun+damage at detonation
                const cx = pos[0],
                  cz = pos[2];
                const r2 = BOMB_AOE_RADIUS * BOMB_AOE_RADIUS;
                const idsToHit = [];
                if (window.gameEnemies) {
                  window.gameEnemies.forEach((ge) => {
                    if (!ge?.ref?.current) return;
                    if (ge.isFlying) return; // flying drones are immune to bombs
                    const ex = ge.ref.current.position.x;
                    const ez = ge.ref.current.position.z;
                    const dx = ex - cx;
                    const dz = ez - cz;
                    if (dx * dx + dz * dz <= r2) {
                      ge.stun?.(BOMB_STUN_MS);
                      idsToHit.push(ge.id);
                    }
                  });
                }
                if (idsToHit.length) {
                  setEnemies((prev) => {
                    const died = [];
                    const updated = prev
                      .map((e) => {
                        if (!idsToHit.includes(e.id)) return e;
                        const dmg = e.isCone ? 5 : BOMB_DAMAGE;
                        const nh = (e.health ?? 1) - dmg;
                        if (nh <= 0) {
                          died.push(e.id);
                          return null;
                        }
                        return { ...e, health: nh };
                      })
                      .filter(Boolean);
                    if (died.length)
                      setTimeout(
                        () => died.forEach((id) => onEnemyDie(id, false)),
                        0
                      );
                    return updated;
                  });
                }
                // Visual explosion cue (cap to last 12)
                setAoes((prev) => {
                  const next = [
                    ...prev,
                    {
                      id: Date.now() + Math.random(),
                      pos: [cx, 0.06, cz],
                      start: performance.now(),
                      radius: BOMB_AOE_RADIUS,
                    },
                  ];
                  return next.length > 12 ? next.slice(next.length - 12) : next;
                });
                // VFX: scalable bomb explosion
                try {
                  triggerEffect &&
                    triggerEffect("bombExplosion", {
                      position: [cx, 0.2, cz],
                      power: 1.0,
                    });
                } catch {}
                // SFX: bomb explosion
                try {
                  play("bomb");
                } catch {}
                // remove bomb
                setBombs((prev) => prev.filter((x) => x.id !== id));
              }}
              onHitEnemy={(enemyId) => {
                setEnemies((prev) => {
                  let died = false;
                  const updated = prev
                    .map((e) => {
                      if (e.id !== enemyId) return e;
                      if (e.isFlying) return e; // flying drones ignore bomb contact
                      const dmg = e.isCone ? 5 : BOMB_DAMAGE;
                      const nh = (e.health ?? 1) - dmg;
                      if (nh <= 0) {
                        died = true;
                        return null;
                      }
                      return { ...e, health: nh };
                    })
                    .filter(Boolean);
                  if (died) setTimeout(() => onEnemyDie(enemyId, false), 0);
                  return updated;
                });
              }}
            />
          ))}

          {!isPaused &&
            pickups.map((p) => (
              <Pickup
                key={p.id}
                id={p.id}
                pos={p.pos}
                type={p.type}
                amount={p.amount}
                lifetimeMaxSec={p.lifetimeMaxSec}
                onCollect={onPickupCollect}
                onExpire={(pid) =>
                  setPickups((prev) => prev.filter((x) => x.id !== pid))
                }
                playerPosRef={playerPosRef}
                isPaused={isPaused}
                scaleMul={pickupScaleMul * assetScale}
              />
            ))}

          {cameraMode === "static" && (
            <OrbitControls
              enableRotate={false}
              enablePan={false}
              enableZoom
              maxPolarAngle={Math.PI / 2.2}
              minPolarAngle={Math.PI / 3}
            />
          )}
          {cameraMode === "follow" && (
            <CameraRig
              playerPosRef={playerPosRef}
              isPaused={isPaused}
              isDashing={isDashing}
              boostUntilMs={cameraBoostUntilMs}
            />
          )}
          {cameraMode === "static" && (
            <StaticCameraRig
              boundaryLimit={boundaryLimit ?? BOUNDARY_LIMIT}
              margin={staticCamMargin}
            />
          )}
          {cameraMode === "topdown" && (
            <TopDownRig
              playerPosRef={playerPosRef}
              boundaryLimit={boundaryLimit ?? BOUNDARY_LIMIT}
              zoom={topDownZoom}
            />
          )}
          {/* AOE visuals */}
          {aoes.map((a) => (
            <AOEBlast
              key={a.id}
              pos={a.pos}
              start={a.start}
              radius={a.radius}
              onDone={() =>
                setAoes((prev) => prev.filter((x) => x.id !== a.id))
              }
            />
          ))}
          {/* HP change floaters */}
          {hpEvents.map((evt) => (
            <HpFloater
              key={evt.id}
              amount={evt.amount}
              start={evt.start}
              playerPosRef={playerPosRef}
              onDone={() =>
                setHpEvents((e) => e.filter((x) => x.id !== evt.id))
              }
            />
          ))}
          {/* Armor change floaters */}
          {armorEvents.map((evt) => (
            <HpFloater
              key={evt.id}
              amount={evt.amount}
              start={evt.start}
              playerPosRef={playerPosRef}
              onDone={() =>
                setArmorEvents((e) => e.filter((x) => x.id !== evt.id))
              }
            />
          ))}

          {/* Buff/debuff indicators above player */}
          {(() => {
            const items = [];
            if (invulnEffect.active || invulnTest)
              items.push({ key: "inv", label: "INVULN", color: "#facc15" });
            if (powerEffect.active)
              items.push({
                key: "pow",
                label: `POWER ${powerEffect.amount}`,
                color: "#60a5fa",
              });
            if (bombEffect.active)
              items.push({ key: "bomb", label: "BOMBS", color: "#ffffff" });
            if (boostEffect.active)
              items.push({ key: "boost", label: "BOOST", color: "#22c55e" });
            if (debuffEffect.active)
              items.push({ key: "slow", label: "SLOW", color: "#f97316" });
            if (regenDebuff.active)
              items.push({ key: "regen", label: "REGEN-", color: "#10b981" });
            if (corrosionEffect.active)
              items.push({ key: "cor", label: "CORROSION", color: "#9ca3af" });
            return items.length ? (
              <BuffIndicators playerPosRef={playerPosRef} items={items} />
            ) : null;
          })()}

          {/* Invulnerability visuals */}
          {(invulnEffect.active || invulnTest) && (
            <>
              <InvulnRing
                radius={SHAPE_PATH_RADIUS}
                isPaused={isPaused}
                shape={invulnEffect.shape || "circle"}
              />
              {/* Yellow translucent orb while invulnerability is active */}
              <ShieldBubble
                playerPosRef={playerPosRef}
                isPaused={isPaused}
                color={0xfacc15}
                radius={1.5}
                baseOpacity={0.28}
              />
            </>
          )}
          {boundaryJumpActive && (
            <ShieldBubble
              playerPosRef={playerPosRef}
              isPaused={isPaused}
              color={0x66ccff}
              radius={1.4}
              baseOpacity={0.25}
            />
          )}
          {/* One-shot shimmer effects (e.g., when invulnerability cancels a debuff) */}
          {shimmers.map((s) => (
            <ShimmerPulse
              key={s.id}
              playerPosRef={playerPosRef}
              isPaused={isPaused}
              color={0x66ccff}
              durationMs={560}
              maxScale={1.9}
              onDone={() =>
                setShimmers((prev) => prev.filter((x) => x.id !== s.id))
              }
            />
          ))}
          {confetti.map((c) => (
            <ConfettiBurst
              key={c.id}
              start={c.start}
              onDone={() =>
                setConfetti((prev) => prev.filter((x) => x.id !== c.id))
              }
            />
          ))}
          {/* Hazard zones */}
          {hazards.map((h) => (
            <HazardZone
              key={h.id}
              data={h}
              isPaused={isPaused}
              onExpire={(id) =>
                setHazards((prev) => prev.filter((x) => x.id !== id))
              }
            />
          ))}

          {/* Global effects renderer */}
          <EffectsRenderer />
          {showDreiStats && <Stats />}
        </React.Suspense>
      </Canvas>
      {/* Toggle PerfOverlay with F9 */}
      <PerfOverlay enabled={showPerf} />

      <div
        ref={crosshairRef}
        className={`cursor-crosshair ${highContrast ? "high-contrast" : ""}`}
      />
      {/* Center popups: pickups, level intros, boss intros */}
      {pickupPopups.map((pp) => (
        <PickupPopup
          key={pp.id}
          pickup={pp.pickup}
          onComplete={() => removePickupPopup(pp.id)}
        />
      ))}
      {/* D-Buttons overlay */}
      {controlScheme === "dpad" && (
        <DPad
          onVectorChange={(x, z) => {
            dpadVecRef.current.x = x;
            dpadVecRef.current.z = z;
          }}
        />
      )}
      {controlScheme === "touch" && (
        <>
          <AnalogStick
            side="left"
            onVectorChange={(x, z) => {
              dpadVecRef.current.x = x;
              dpadVecRef.current.z = z;
              // mark immediate source so Player speed scaling knows it's from dpad
              moveSourceRef.current = "dpad";
            }}
          />
          <AnalogStick
            side="right"
            onVectorChange={(x, z) => {
              aimInputRef.current.x = x;
              aimInputRef.current.z = z;
            }}
          />
        </>
      )}

      {/* Left Panel: Player and Boss info always visible; Accessibility under Debug toggle */}
      {(() => {
        const HEALTH_MAX = 100;
        const ARMOR_MAX = 100;
        const dashTotalMs = 10000;
        const heroDef = HEROES.find((h) => h.name === selectedHero);

        const healthRatio = Math.max(0, Math.min(1, health / HEALTH_MAX));
        const armorRatio = Math.max(0, Math.min(1, armor / ARMOR_MAX));
        const dashRatio = Math.max(
          0,
          Math.min(1, 1 - (dashCooldownMs || 0) / dashTotalMs)
        );
        const abilityName = heroDef?.ability || "Ability";
        const abilityCooldown = heroDef?.cooldown ?? 20;

        return (
          <div
            style={{
              position: "fixed",
              left: 16,
              bottom: 10,
              zIndex: 900,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              width: 320,
              maxHeight: "calc(100vh - 100px)",
              overflowY: "auto",
            }}
          >
            {/* Player Statistics - fixed to bottom of viewport */}
            <div
              id="fixed-player-stats"
              style={{
                position: "fixed",
                top: 80,
                right: 10,
                // left: "50%",
                // transform: "translateX(-50%)",
                display: "grid",
                gap: 12,
                height: "auto",
                // minWidth: 300,
                maxWidth: "80vw",
                padding: 10,
                background: "rgba(0,0,0,0.25)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div className="small" style={{ marginBottom: 6 }}>
                Hero: <strong>{selectedHero}</strong>
                 {/* Lives */}
                <div className="small" style={{ marginBottom: 8 }}>
                  Lives: <strong>{lives}</strong>
                </div>
              </div>
              {/* Health */}
              <div
                style={{
                  background: "rgba(0,0,0,0.55)",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  marginBottom: 8,
                  width: 100,
                }}
              >
                <div
                  style={{ fontSize: 12, color: "#e5e7eb", marginBottom: 4 }}
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
                  width: 100,
                }}
              >
                <div
                  style={{ fontSize: 12, color: "#e5e7eb", marginBottom: 4 }}
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
             
              {/* Dash */}
              <div
                style={{
                  background: "rgba(0,0,0,0.55)",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  marginBottom: 8,
                  width: 100,
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
            </div>

            {/* Debug header and Accessibility controls (toggle) */}
            {showDebugUI && (
              <>
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
                    Best: <strong>{bestScore}</strong> /{" "}
                    <strong>{bestWave}</strong>
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
                  <button
                    className="button"
                    onClick={() => setAutoFire((a) => !a)}
                  >
                    Auto-Fire: {autoFire ? "On" : "Off"} (F)
                  </button>

                  <div style={{ height: 10 }} />
                </CollapsiblePanel>

                {/* Player properties: always visible */}
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
                    <div
                      style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}
                    >
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
                    <div
                      style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}
                    >
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
                      <div style={{ fontSize: 12, color: "#e5e7eb" }}>
                        Ability
                      </div>
                      <div style={{ fontSize: 11, color: "#cbd5e1" }}>
                        CD: {abilityCooldown}s
                      </div>
                    </div>
                    <div
                      style={{ fontSize: 13, color: "#f1f5f9", marginTop: 2 }}
                    >
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
                          const pct = Math.max(
                            0,
                            Math.min(1, 1 - dashCooldownMs / 10000)
                          );
                          return (
                            <>
                              <div
                                className="fill"
                                style={{ width: `${Math.round(pct * 100)}%` }}
                              />
                              <div className="cd-text">
                                {dashCooldownMs > 0
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

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>Debug Panel</div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
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
                          onChange={(e) => setEnemyRenderMode(e.target.value)}
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
                          onChange={(e) => setHeroRenderMode(e.target.value)}
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
                          style={{ fontSize: 10, opacity: 0.75, marginTop: 6 }}
                        >
                          Lower radius pulls ring closer. Increase size for
                          accessibility. Follow Smooth (%) controls lerp
                          aggressiveness (0 = snap, 95% = very damped).
                        </div>
                      </div>

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
                              setTentacleStrength(parseFloat(e.target.value))
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
                          style={{ fontSize: 10, opacity: 0.75, marginTop: 6 }}
                        >
                          Affects spikeStyle "tentacle" only. Strength
                          multiplies overall bend; Tip Emphasis pushes motion
                          towards the tip; Axis X/Z shape sideways sway;
                          Vertical Wobble adds gentle lengthwise flutter.
                        </div>
                      </div>

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
                    </div>
                  </CollapsiblePanel>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* Overlay: start screen */}
      {!isStarted && (
        <div className="pause-overlay">
          <div className="pause-content accent">
            <img src={LOGO} alt="Wave Battle Logo" style={{height: 100, width: 'auto'}} />
            <h2>Battle the forces of Hazard in <b>Wave Battle</b>!</h2>
            <p>Jump right in. Fight randomized enemy waves and climb the scoreboard. This will grow into a wave-based horde-shooter roguelite.</p>
            <p>
              Best — Score: <strong>{bestScore}</strong> • Wave:{" "}
              <strong>{bestWave}</strong>
            </p>
            {/* Hero selector */}
            <div style={{ margin: "12px 0" }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                Choose Your Hero
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  overflowX: "auto",
                  paddingBottom: 8,
                }}
              >
                {HEROES.map((h) => {
                  const imgSrc = getHeroImageUrl(h.name);
                  const active = selectedHero === h.name;
                  return (
                    <div
                      key={h.name}
                      onClick={() => setSelectedHero(h.name)}
                      title={`${h.name} — ${h.ability}`}
                      style={{
                        width: 140,
                        minWidth: 140,
                        height: "50%",
                        borderRadius: 12,
                        overflow: "hidden",
                        cursor: "pointer",
                        border: active
                          ? "2px solid #60a5fa"
                          : "1px solid rgba(255,255,255,0.15)",
                        boxShadow: active
                          ? "0 0 0 2px rgba(96,165,250,0.3)"
                          : "none",
                        transition:
                          "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                        transform: active ? "scale(1.03)" : "scale(1.0)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.03)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = active
                          ? "scale(1.03)"
                          : "scale(1.0)";
                      }}
                    >
                      <img
                        src={imgSrc}
                        alt={h.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "top",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                Selected: <strong>{selectedHero}</strong>
              </div>
            </div>
            <div style={{ height: 10 }} />
            <button
              className="button"
              onClick={() => {
                setIsStarted(true);
                setIsPaused(false);
                try {
                  play("player-spawn");
                } catch {}
              }}
            >
              Start Game
            </button>
          </div>
        </div>
      )}

      {/* Overlay: pause / life lost countdown / game over */}
      {isPaused && isStarted && (
        <div className="pause-overlay">
          <div className="pause-content">
            {isGameOver ? (
              <>
                <h2>Game Over</h2>
                <p>
                  Score: <strong>{score}</strong> • Wave:{" "}
                  <strong>{wave}</strong>
                </p>
                <p className="small">
                  Best — Score: <strong>{bestScore}</strong> • Wave:{" "}
                  <strong>{bestWave}</strong>
                </p>
                <div style={{ height: 10 }} />
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  <button
                    className="button"
                    onClick={() => {
                      setIsGameOver(false);
                      setLives(3);
                      setRespawnCountdown(0);
                      restartGame();
                      setIsPaused(false);
                      spawnWave();
                    }}
                  >
                    Restart (Fresh)
                  </button>
                  <button className="button" onClick={() => navigate("/")}>
                    Quit to Home
                  </button>
                  <button
                    className="button"
                    onClick={() => {
                      continueSameLevel();
                    }}
                    title="Continue with a 10% total score penalty"
                  >
                    Continue (-10% Total Score)
                  </button>
                </div>
                <div
                  style={{ marginTop: 10, color: "#e0e0e0ff", fontSize: 12 }}
                >
                  {(() => {
                    const total = Math.max(0, score);
                    const penalty = Math.floor(total * 0.1);
                    const after = Math.max(0, total - penalty);
                    return (
                      <div>
                        Penalty: 10% of {total} = <strong>-{penalty}</strong> ⇒
                        New Score: <strong>{after}</strong>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : respawnCountdown > 0 ? (
              <>
                <h2>Life Lost</h2>
                <p>
                  Next wave in <strong>{respawnCountdown}</strong>…
                </p>
              </>
            ) : (
              <>
                <h2>Game Paused</h2>
                <p>Press ESC or SPACE to resume</p>
                <div style={{ height: 10 }} />
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  <button
                    className="button"
                    onClick={() => {
                      setIsGameOver(false);
                      setLives(3);
                      setRespawnCountdown(0);
                      restartGame();
                      setIsPaused(false);
                      spawnWave();
                    }}
                  >
                    Restart Run
                  </button>
                  <button
                    className="button"
                    onClick={() => {
                      try {
                        localStorage.setItem("savedScore", String(score));
                        localStorage.setItem("savedWave", String(wave));
                        localStorage.setItem("savedHero", selectedHero);
                      } catch {}
                    }}
                  >
                    Save Progress
                  </button>
                  <button className="button" onClick={() => navigate("/")}>
                    Quit to Home
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Top-left: in-game menu toggle for NavBar visibility */}
      {typeof setNavVisible === "function" && (
        <div style={{ position: "fixed", top: 8, right: 12, zIndex: 1000 }}>
          <button
            className="button"
            onClick={() => setNavVisible((v) => !v)}
            title={navVisible ? "Hide Menu" : "Show Menu"}
          >
            {navVisible ? "Hide Menu" : "Show Menu"}
          </button>
        </div>
      )}

      {/* Feeds & overlays */}
      {/* Top-right stack: HUD + pickup feed (collapsible) */}
      {/* Debug UI toggle */}
      <div style={{ position: "fixed", top: 50, right: "12px", zIndex: 1000 }}>
        <label
          style={{
            background: "rgba(0,0,0,0.5)",
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showDebugUI}
            onChange={(e) => setShowDebugUI(e.target.checked)}
            style={{ marginRight: 6 }}
          />{" "}
          Show Debug UI
        </label>
      </div>

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
                    onChange={(e) => setPlayerLabelSize(parseInt(e.target.value, 10))}
                    style={{ width: "100%" }}
                  />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginTop: 6 }}>
                  <input type="checkbox" checked={showPlayerLabelPlaceholder} onChange={(e) => setShowPlayerLabelPlaceholder(e.target.checked)} />
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
      )}

      {/* Right-bottom stack removed; Boss info moved to left debug panel and tied to debug toggle */}
    </div>
  );
}

// D-Buttons component (mouse + touch). Emits a normalized (x, z) vector via callback.
function DPad({ onVectorChange }) {
  const active = useRef({ up: false, down: false, left: false, right: false });
  // mirror ref into state so UI updates when keys change
  const [activeState, setActiveState] = useState({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const update = useCallback(() => {
    const x = (active.current.right ? 1 : 0) - (active.current.left ? 1 : 0);
    const z = (active.current.down ? 1 : 0) - (active.current.up ? 1 : 0);
    const len = Math.hypot(x, z) || 1;
    onVectorChange(x / len, z / len);
  }, [onVectorChange]);

  const set = (key, val) => {
    active.current[key] = val;
    // update visible state (shallow copy)
    setActiveState({ ...active.current });
    update();
  };

  // Pointer handlers generator
  const bind = (key) => ({
    onMouseDown: (e) => {
      e.preventDefault();
      set(key, true);
    },
    onMouseUp: () => set(key, false),
    onMouseLeave: () => set(key, false),
    onTouchStart: (e) => {
      e.preventDefault();
      set(key, true);
    },
    onTouchEnd: () => set(key, false),
    onTouchCancel: () => set(key, false),
  });

  // Keyboard listeners: light up DPad when arrow keys or WASD are pressed
  useEffect(() => {
    const map = {
      ArrowUp: "up",
      ArrowLeft: "left",
      ArrowDown: "down",
      ArrowRight: "right",
      KeyW: "up",
      KeyA: "left",
      KeyS: "down",
      KeyD: "right",
    };
    const onKeyDown = (e) => {
      const k = map[e.code];
      if (k) {
        e.preventDefault();
        set(k, true);
      }
    };
    const onKeyUp = (e) => {
      const k = map[e.code];
      if (k) {
        e.preventDefault();
        set(k, false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <div className="dpad" aria-hidden>
      <div className="dpad-row up-row">
        <button
          className="dpad-btn up"
          {...bind("up")}
          aria-label="Move up"
          data-active={activeState.up}
        >
          <span className="dpad-icon">▲</span>
        </button>
      </div>
      <div className="dpad-row mid-row">
        <button
          className="dpad-btn left"
          {...bind("left")}
          aria-label="Move left"
          data-active={activeState.left}
        >
          <span className="dpad-icon">◀</span>
        </button>
        <button
          className="dpad-btn right"
          {...bind("right")}
          aria-label="Move right"
          data-active={activeState.right}
        >
          <span className="dpad-icon">▶</span>
        </button>
      </div>
      <div className="dpad-row down-row">
        <button
          className="dpad-btn down"
          {...bind("down")}
          aria-label="Move down"
          data-active={activeState.down}
        >
          <span className="dpad-icon">▼</span>
        </button>
      </div>
    </div>
  );
}

// AOE blast visual: expanding translucent ring for ~2s
function AOEBlast({ pos, start, radius = 9, onDone }) {
  const ref = useRef();
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x99ccff,
        transparent: true,
        opacity: 0.6,
      }),
    []
  );
  const geom = useMemo(() => new THREE.RingGeometry(0.5, 0.6, 32), []);
  const DURATION = 2000;
  useFrame(() => {
    if (!ref.current) return;
    const t = performance.now() - start;
    const k = Math.min(t / DURATION, 1);
    const scale = 0.5 + k * radius;
    ref.current.scale.set(scale, scale, scale);
    // fade out towards end
    mat.opacity = 0.6 * (1 - k);
    if (k >= 1) onDone && onDone();
  });
  return (
    <mesh
      ref={ref}
      position={pos}
      rotation={[-Math.PI / 2, 0, 0]}
      material={mat}
    >
      <primitive object={geom} attach="geometry" />
    </mesh>
  );
}

// Hazard zone visual and tick logic
function HazardZone({ data, isPaused, onExpire }) {
  const baseRef = useRef();
  const color = useMemo(
    () => new THREE.Color(data.color || "#eab308"),
    [data.color]
  );
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    [color]
  );
  const ringGeom = useMemo(
    () =>
      new THREE.RingGeometry(
        Math.max((data.radius || 4) * 0.85, 0.1),
        data.radius || 4,
        48
      ),
    [data.radius]
  );
  const lifeMs = data.durationMs || 6000;
  const createdAt = data.createdAt || performance.now();

  useFrame(() => {
    if (!baseRef.current) return;
    const t = performance.now();
    const k = Math.max(0, Math.min(1, (t - createdAt) / lifeMs));
    // subtle breathing
    ringMat.opacity = 0.22 * (0.9 + 0.1 * Math.sin(t * 0.005)) * (1 - 0.1 * k);
    if (!isPaused && t >= createdAt + lifeMs) {
      onExpire && onExpire(data.id);
    }
  });
  // Ensure hazards draw slightly above ground to prevent z-fighting
  const pos = useMemo(
    () => [data.pos?.[0] ?? 0, 0.06, data.pos?.[2] ?? 0],
    [data.pos]
  );

  return (
    <group position={pos}>
      {/* Neon base ring */}
      <mesh ref={baseRef} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
        <primitive object={ringGeom} attach="geometry" />
      </mesh>
      {/* Rich effect by hazard type */}
      {data.type === "toxin" && (
        <ToxinCloud
          radius={data.radius || 4}
          color={color}
          isPaused={isPaused}
        />
      )}
      {data.type === "corrosive" && (
        <CorrosivePool
          radius={data.radius || 4}
          color={color}
          isPaused={isPaused}
        />
      )}
      {data.type === "fog" && (
        <FogField radius={data.radius || 4} color={color} isPaused={isPaused} />
      )}
      {data.type === "carcinogen" && (
        <RayField
          radius={data.radius || 4}
          color={color}
          isPaused={isPaused}
          count={10}
        />
      )}
      {/* Treat short white toxin (X-rays pulse) as radiation */}
      {data.type === "toxin" &&
        (data.color === "#ffffff" || data.color === "#fff") && (
          <>
            <RadiationRing
              radius={data.radius || 4}
              color={new THREE.Color("#ffffff")}
            />
            <RayField
              radius={data.radius || 4}
              color={new THREE.Color("#ffffff")}
              isPaused={isPaused}
              count={12}
            />
          </>
        )}
    </group>
  );
}

function ToxinCloud({
  radius = 4,
  color = new THREE.Color("#22c55e"),
  isPaused,
}) {
  const geomRef = useRef();
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color,
        size: 0.24,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [color]
  );
  const stateRef = useRef({ angles: null, heights: null });
  const geom = useMemo(() => {
    const n = 90;
    const positions = new Float32Array(n * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useEffect(() => {
    const n = geom.getAttribute("position").count;
    const angles = new Float32Array(n);
    const heights = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      angles[i] = Math.random() * Math.PI * 2;
      heights[i] = Math.random() * 0.8 + 0.2;
    }
    stateRef.current.angles = angles;
    stateRef.current.heights = heights;
  }, [geom]);
  useFrame((_, dt) => {
    if (!geomRef.current || isPaused) return;
    const pos = geomRef.current.getAttribute("position");
    const { angles, heights } = stateRef.current;
    const speed = 0.7;
    for (let i = 0; i < pos.count; i++) {
      const a = (angles[i] += speed * dt * (0.5 + Math.random() * 0.5));
      const r =
        radius *
        (0.2 + (i / pos.count) * 0.8) *
        (0.85 + 0.15 * Math.sin(i * 13.37 + performance.now() * 0.002));
      pos.array[i * 3 + 0] = Math.cos(a) * r;
      pos.array[i * 3 + 1] = heights[i] * 1.4;
      pos.array[i * 3 + 2] = Math.sin(a) * r;
    }
    pos.needsUpdate = true;
  });
  return (
    <points position={[0, 0.2, 0]}>
      <primitive object={geom} ref={geomRef} />
      <primitive object={mat} attach="material" />
    </points>
  );
}

function CorrosivePool({
  radius = 4,
  color = new THREE.Color("#065f46"),
  isPaused,
}) {
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [color]
  );
  const ringGeom = useMemo(
    () =>
      new THREE.RingGeometry(Math.max(radius * 0.3, 0.1), radius * 0.32, 32),
    [radius]
  );
  const ringRef = useRef();
  const steamMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color,
        size: 0.2,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [color]
  );
  const steamGeom = useMemo(() => {
    const n = 60;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(n * 3), 3)
    );
    return g;
  }, []);
  useFrame(() => {
    if (ringRef.current) {
      const t = performance.now() * 0.003;
      ringRef.current.scale.setScalar(1 + 0.15 * Math.sin(t));
    }
    // bubble-like steam: randomize positions subtly each frame
    const pos = steamGeom.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.4;
      pos.array[i * 3 + 0] = Math.cos(a) * r;
      pos.array[i * 3 + 1] = 0.2 + Math.random() * 0.8;
      pos.array[i * 3 + 2] = Math.sin(a) * r;
    }
    pos.needsUpdate = true;
  });
  return (
    <group>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
        <primitive object={ringGeom} attach="geometry" />
      </mesh>
      <points position={[0, 0.15, 0]}>
        <primitive object={steamGeom} />
        <primitive object={steamMat} attach="material" />
      </points>
    </group>
  );
}

function FogField({
  radius = 4,
  color = new THREE.Color("#a855f7"),
  isPaused,
}) {
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color,
        size: 0.28,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [color]
  );
  const geomRef = useRef();
  const geom = useMemo(() => {
    const n = 70;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(n * 3), 3)
    );
    return g;
  }, []);
  useFrame(() => {
    if (!geomRef.current || isPaused) return;
    const pos = geomRef.current.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const a = i * 0.61 + performance.now() * 0.0008;
      const r = radius * (0.3 + 0.7 * ((i % 7) / 7));
      pos.array[i * 3 + 0] = Math.cos(a) * r;
      pos.array[i * 3 + 1] = 0.5 + 1.8 * ((i % 5) / 5);
      pos.array[i * 3 + 2] = Math.sin(a) * r;
    }
    pos.needsUpdate = true;
  });
  return (
    <points position={[0, 0.2, 0]}>
      <primitive object={geom} ref={geomRef} />
      <primitive object={mat} attach="material" />
    </points>
  );
}

function RadiationRing({ radius = 4, color = new THREE.Color("#ffffff") }) {
  const ref = useRef();
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [color]
  );
  const geom = useMemo(
    () => new THREE.RingGeometry(Math.max(radius * 0.2, 0.05), radius, 48),
    [radius]
  );
  useFrame(() => {
    if (!ref.current) return;
    const t = performance.now() * 0.006;
    ref.current.rotation.z = t;
    mat.opacity = 0.8 * (0.6 + 0.4 * Math.sin(t * 2));
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <primitive object={geom} attach="geometry" />
    </mesh>
  );
}

function RayField({
  radius = 4,
  color = new THREE.Color("#66ccff"),
  isPaused,
  count = 10,
}) {
  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      }),
    [color]
  );
  const geomRef = useRef();
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = count;
    const positions = new Float32Array(n * 2 * 3); // lines: start+end
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count]);
  // lightning bolt (occasional jagged spikes)
  const boltMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color("#ffffff"),
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      }),
    []
  );
  const boltGeomRef = useRef();
  const boltGeom = useMemo(() => {
    const segments = 5; // jagged polyline
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array((segments + 1) * 3), 3)
    );
    return g;
  }, []);
  const boltTimer = useRef(0);
  useFrame(() => {
    if (!geomRef.current) return;
    const pos = geomRef.current.getAttribute("position");
    for (let i = 0; i < count; i++) {
      const a =
        (i / count) * Math.PI * 2 +
        performance.now() * 0.0015 +
        Math.random() * 0.1;
      const r = radius * (0.2 + Math.random() * 0.8);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // start on ground, end upward
      pos.array[i * 6 + 0] = x;
      pos.array[i * 6 + 1] = 0.1;
      pos.array[i * 6 + 2] = z;
      pos.array[i * 6 + 3] = x;
      pos.array[i * 6 + 4] = 1.8 + Math.random() * 0.8;
      pos.array[i * 6 + 5] = z;
    }
    pos.needsUpdate = true;
    mat.opacity = 0.85 + 0.15 * Math.sin(performance.now() * 0.01);
    // update lightning occasionally
    if (boltGeomRef.current) {
      boltTimer.current -= 1 / 60;
      if (boltTimer.current <= 0) {
        // spawn new bolt roughly every 0.6-1.2s
        boltTimer.current = 0.6 + Math.random() * 0.6;
        const p = boltGeomRef.current.getAttribute("position");
        const baseAngle = Math.random() * Math.PI * 2;
        const baseR = radius * (0.2 + Math.random() * 0.8);
        const bx = Math.cos(baseAngle) * baseR;
        const bz = Math.sin(baseAngle) * baseR;
        let y = 0.2;
        p.array[0] = bx;
        p.array[1] = y;
        p.array[2] = bz;
        for (let s = 1; s < p.count; s++) {
          const jitter = (Math.random() - 0.5) * (radius * 0.2);
          const jx = bx + jitter;
          const jz = bz + (Math.random() - 0.5) * (radius * 0.2);
          y += 0.4 + Math.random() * 0.5;
          p.array[s * 3 + 0] = jx;
          p.array[s * 3 + 1] = y;
          p.array[s * 3 + 2] = jz;
        }
        p.needsUpdate = true;
        boltMat.opacity = 0.95;
      } else {
        // fade out
        boltMat.opacity = Math.max(0, boltMat.opacity - 0.08);
      }
    }
  });
  return (
    <group>
      <lineSegments>
        <primitive object={geom} ref={geomRef} />
        {/* @ts-ignore */}
        <primitive object={mat} attach="material" />
      </lineSegments>
      <line>
        <primitive object={boltGeom} ref={boltGeomRef} />
        {/* @ts-ignore */}
        <primitive object={boltMat} attach="material" />
      </line>
    </group>
  );
}

// Bomb entity: arcs up then down; on ground, stuns and damages enemies that collide; detonates 2s after landing
function Bomb({ data, isPaused, onUpdate, onExplode, onHitEnemy }) {
  const ref = useRef();
  const hitSet = useRef(new Set());
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x111111,
        roughness: 0.8,
      }),
    []
  );
  const geom = useMemo(() => new THREE.SphereGeometry(0.36, 12, 12), []);
  useFrame((_, dt) => {
    if (!ref.current || isPaused) return;
    const { id, state } = data;
    if (state === "air") {
      // integrate physics
      const vx = data.vel[0];
      const vy = data.vel[1] - BOMB_GRAVITY * dt;
      const vz = data.vel[2];
      const x = data.pos[0] + vx * dt;
      let y = data.pos[1] + vy * dt;
      const z = data.pos[2] + vz * dt;
      if (y <= 0.5) {
        y = 0.5;
        onUpdate(id, {
          pos: [x, y, z],
          vel: [vx, 0, vz],
          state: "ground",
          landedAt: performance.now(),
          explodeAt: performance.now() + 2000,
        });
      } else {
        onUpdate(id, { pos: [x, y, z], vel: [vx, vy, vz] });
      }
      if (ref.current) ref.current.position.set(x, y, z);
    } else if (state === "ground") {
      const now = performance.now();
      if (now >= (data.explodeAt || 0)) {
        onExplode(data.id, data.pos);
        return;
      }
      // contact stun+damage
      if (window.gameEnemies) {
        const cx = data.pos[0],
          cz = data.pos[2];
        const r2 = BOMB_CONTACT_RADIUS * BOMB_CONTACT_RADIUS;
        window.gameEnemies.forEach((ge) => {
          if (!ge?.ref?.current) return;
          const ex = ge.ref.current.position.x;
          const ez = ge.ref.current.position.z;
          const dx = ex - cx;
          const dz = ez - cz;
          if (dx * dx + dz * dz <= r2 && !hitSet.current.has(ge.id)) {
            hitSet.current.add(ge.id);
            ge.stun?.(BOMB_STUN_MS);
            onHitEnemy && onHitEnemy(ge.id);
          }
        });
      }
      if (ref.current)
        ref.current.position.set(data.pos[0], data.pos[1], data.pos[2]);
    }
  });
  return <mesh ref={ref} position={data.pos} geometry={geom} material={mat} />;
}

// Visual rim/fence around the play area to signal the boundary
function BoundaryCue({ limit = 40, isPaused }) {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x3366ff,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
      }),
    []
  );
  const height = 1.2;
  const geomX = useMemo(
    () => new THREE.PlaneGeometry(limit * 2, height),
    [limit]
  );
  const geomZ = useMemo(
    () => new THREE.PlaneGeometry(limit * 2, height),
    [limit]
  );
  useFrame(() => {
    if (isPaused) return;
    const t = performance.now() * 0.004;
    mat.opacity = 0.22 + 0.1 * (0.5 + 0.5 * Math.sin(t));
  });
  return (
    <group>
      {/* North & South walls (along X at z=±limit) */}
      <mesh
        position={[0, height / 2, -limit]}
        geometry={geomX}
        material={mat}
      />
      <mesh
        position={[0, height / 2, limit]}
        rotation={[0, Math.PI, 0]}
        geometry={geomX}
        material={mat}
      />
      {/* West & East walls (along Z at x=±limit) */}
      <mesh
        position={[-limit, height / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        geometry={geomZ}
        material={mat}
      />
      <mesh
        position={[limit, height / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        geometry={geomZ}
        material={mat}
      />
    </group>
  );
}

// Floating HP change text above the player
function HpFloater({ amount, start, playerPosRef, onDone }) {
  const ref = useRef();
  const color = amount >= 0 ? "#22c55e" : "#ef4444";
  const text = (amount > 0 ? "+" : "") + amount;
  const DURATION = 1200;
  useFrame(() => {
    if (!ref.current) return;
    const t = performance.now() - start;
    const k = Math.min(t / DURATION, 1);
    const pos = playerPosRef.current;
    // rise from y=2 to y≈3
    ref.current.position.set(pos.x, 2 + k * 1.0, pos.z);
    // fade out towards end
    if (ref.current.material) {
      ref.current.material.opacity = 1 - k;
      ref.current.material.transparent = true;
    }
    if (k >= 1) onDone && onDone();
  });
  return (
    <Text
      ref={ref}
      fontSize={0.6}
      color={color}
      anchorX="center"
      anchorY="middle"
    >
      {text}
    </Text>
  );
}

// Buff/debuff indicators stacked above the player
function BuffIndicators({ playerPosRef, items = [] }) {
  const baseY = 2.2;
  const gap = 0.36;
  const bgMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.45,
      }),
    []
  );
  const bgGeom = useMemo(() => new THREE.PlaneGeometry(1.2, 0.28), []);
  return (
    <group
      position={[0, 0, 0]}
      onUpdate={(self) => {
        const p = playerPosRef.current;
        if (p && self) self.position.set(p.x, baseY, p.z);
      }}
    >
      {items.map((it, i) => (
        <group key={it.key} position={[0, i * gap, 0]}>
          <mesh position={[0, 0, 0]} geometry={bgGeom} material={bgMat} />
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.22}
            color={it.color || "#ffffff"}
            anchorX="center"
            anchorY="middle"
          >
            {it.label}
          </Text>
        </group>
      ))}
    </group>
  );
}

// Visual ring indicating invulnerability around the player
function InvulnRing({ radius = 12, isPaused, shape = "circle" }) {
  const ref = useRef();
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      }),
    []
  );
  const circleGeom = useMemo(
    () => new THREE.RingGeometry(radius * 0.92, radius, 96),
    [radius]
  );
  const polyGeom = useMemo(() => {
    const mkShape = (verts) => {
      const s = new THREE.Shape();
      s.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) s.lineTo(verts[i].x, verts[i].y);
      s.lineTo(verts[0].x, verts[0].y);
      // hole slightly inset to form a band
      const hole = new THREE.Path();
      const inset = 0.92;
      hole.moveTo(verts[0].x * inset, verts[0].y * inset);
      for (let i = 1; i < verts.length; i++)
        hole.lineTo(verts[i].x * inset, verts[i].y * inset);
      hole.lineTo(verts[0].x * inset, verts[0].y * inset);
      s.holes.push(hole);
      return new THREE.ShapeGeometry(s);
    };
    if (shape === "hexagon") {
      const v = [];
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + i * ((2 * Math.PI) / 6);
        v.push(new THREE.Vector2(Math.cos(a) * radius, Math.sin(a) * radius));
      }
      return mkShape(v);
    } else if (shape === "rectangle") {
      const hx = radius;
      const hz = radius * 0.7;
      const v = [
        new THREE.Vector2(+hx, +hz),
        new THREE.Vector2(-hx, +hz),
        new THREE.Vector2(-hx, -hz),
        new THREE.Vector2(+hx, -hz),
      ];
      return mkShape(v);
    }
    return null;
  }, [shape, radius]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.position.set(0, 0.07, 0);
    if (!isPaused) {
      ref.current.rotation.z += dt * 0.5;
      const t = performance.now() * 0.003;
      mat.opacity = 0.35 + 0.15 * (0.5 + 0.5 * Math.sin(t));
    }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      {shape === "circle" ? (
        <primitive object={circleGeom} attach="geometry" />
      ) : polyGeom ? (
        <primitive object={polyGeom} attach="geometry" />
      ) : (
        <primitive object={circleGeom} attach="geometry" />
      )}
    </mesh>
  );
}

// Camera rig that follows the player with smoothing and always looks at them
function CameraRig({
  playerPosRef,
  isPaused,
  offset = new THREE.Vector3(0, 35, 30),
  isDashing = false,
  boostUntilMs = 0,
}) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const lastPos = useRef(new THREE.Vector3().copy(camera.position));
  useFrame((_, dt) => {
    const p = playerPosRef.current;
    if (!p) return;
    // desired camera position relative to player
    targetPos.current.set(p.x + offset.x, p.y + offset.y, p.z + offset.z);
    // dynamic catch-up: speed up when far
    const dist = lastPos.current.distanceTo(targetPos.current);
    const boostActive = isDashing || performance.now() < (boostUntilMs || 0);
    const baseK = Math.max(0.08, Math.min(0.3, dist * 0.02));
    const dashK = Math.max(0.25, Math.min(0.7, dist * 0.05));
    const lerpK = boostActive ? dashK : baseK;
    lastPos.current.lerp(targetPos.current, 1 - Math.exp(-lerpK * (dt * 60)));
    camera.position.copy(lastPos.current);
    camera.lookAt(p.x, p.y, p.z);
  });
  return null;
}

// Static camera positioned back and above, looking at the arena center. Zoom is enabled via controls.
function StaticCameraRig({
  position = [0, 40, 55],
  target = [0, 0, 0],
  boundaryLimit,
  margin = 1.02,
}) {
  const { camera } = useThree();
  useEffect(() => {
    // Compute distance along the specified direction so the arena fits entirely
    const fovRad = THREE.MathUtils.degToRad(camera.fov || 75);
    const BL = boundaryLimit ?? BOUNDARY_LIMIT;
    // Bring camera closer by reducing margin while ensuring edges stay visible
    const requiredHeight = ((Math.SQRT2 * BL) / Math.tan(fovRad / 2)) * margin;
    const dx = position[0] - target[0];
    const dy = position[1] - target[1];
    const dz = position[2] - target[2];
    const len = Math.max(1e-6, Math.hypot(dx, dy, dz));
    const ux = dx / len,
      uy = dy / len,
      uz = dz / len;
    const dist = requiredHeight / Math.max(1e-3, uy);
    const nx = target[0] + ux * dist;
    const ny = target[1] + uy * dist;
    const nz = target[2] + uz * dist;
    camera.position.set(nx, ny, nz);
    camera.lookAt(target[0], target[1], target[2]);
  }, [camera, position, target, boundaryLimit, margin]);
  return null;
}

// Top-down camera that stays above the player and looks straight down for a 2D-style view
function TopDownRig({ playerPosRef, boundaryLimit, zoom = 1.0 }) {
  const { camera, size } = useThree();
  const heightRef = useRef(120);
  const computeHeight = useCallback(() => {
    // Ensure the entire arena fits within the viewport.
    // For a perspective camera looking straight down, the ground coverage radius is h * tan(fov/2).
    // To fit a square of side 2*BOUNDARY_LIMIT, we need radius >= sqrt(2)*BOUNDARY_LIMIT.
    const fovRad = THREE.MathUtils.degToRad(camera.fov || 75);
    const BL = boundaryLimit ?? BOUNDARY_LIMIT;
    const required = (Math.SQRT2 * BL) / Math.tan(fovRad / 2);
    // Add a small margin so edges aren't clipped; apply zoom (<1 brings closer)
    return required * 1.02 * Math.max(0.5, Math.min(2.0, zoom));
  }, [camera, boundaryLimit, zoom]);
  useEffect(() => {
    heightRef.current = computeHeight();
  }, [computeHeight, size.width, size.height, boundaryLimit, zoom]);
  useFrame(() => {
    const p = playerPosRef.current;
    if (!p) return;
    const h = heightRef.current;
    camera.position.set(p.x, h, p.z + 0.0001);
    camera.lookAt(p.x, 0.5, p.z);
  });
  return null;
}
