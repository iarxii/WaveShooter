// GAME CONSTANTS
export const PLAYER_SPEED = 24; // faster than minions to keep mobility advantage
export const PLAYER_SPEED_CAP = 50; // cap player base speed for control stability
export const SPEED_DEBUFF_FACTOR = 0.9;
export const SPEED_DEBUFF_DURATION_MS = 4000;
export const BOUNDARY_LIMIT = 100;
export const GROUND_SIZE = 300; // planeGeometry args
export const GROUND_HALF = GROUND_SIZE / 2;
// Decoupled shape path radius for invulnerability runner (independent of arena boundary)
export const SHAPE_PATH_RADIUS = 24;
export const ENEMY_SPEED = 18;
export const RUNNER_SPEED_MULTIPLIER = 1.6;
export const BOSS_SPEED = 6;
export const TRIANGLE_BOSS_SPEED_MULT = 2.3; // triangle boss moves slightly faster than ordinary boss
export const WAVE_INTERVAL = 2000; // ms between waves spawning
export const BULLET_SPEED = 38;
export const BULLET_LIFETIME = 3000; // ms
export const FIRE_RATE = 120; // ms between shots (faster)
// Player bullet damage per hit (before enemy-specific scaling)
export const PLAYER_BULLET_DAMAGE = 2;
export const BULLET_POOL_SIZE = 50;
export const PICKUP_COLLECT_DISTANCE = 3.8;
export const AIM_RAY_LENGTH = 8;
export const MAX_PICKUPS = 40; // increased economy: allow more concurrent pickups without choking FPS
// Life pickup magnetization
export const LIFE_MAGNET_RANGE = 16; // u: start attracting within this radius
export const LIFE_MAGNET_MIN_SPEED = 6; // u/s at far edge of magnet range
export const LIFE_MAGNET_MAX_SPEED = 28; // u/s when very close
// Global pickup visual scaling (now exposed via UI; see state `pickupScaleGlobal`)
// Bomb ability constants
export const BOMB_DAMAGE = 4;
export const BOMB_STUN_MS = 1400;
export const BOMB_CONTACT_RADIUS = 1.4;
export const BOMB_AOE_RADIUS = 6.2;
export const BOMB_UP_VEL = 12;
export const BOMB_GRAVITY = 24;
export const BOMB_SPAWN_INTERVAL_MS = 300; // 3.33 per second (reduced from 4)
export const BOMB_ABILITY_DURATION_MS = 6000; // extended: total 6s
// Bouncer constants
export const BOUNCER_TELEGRAPH_MS = 4000;
export const BOUNCER_UP_VEL = 16;
export const BOUNCER_LIFETIME_MS = 3000;
// Speed boost planes (green triangles) constants
export const SPEED_BUFF_DURATION_MS = 4000;
export const SPEED_BOOST_LIFETIME = 4500;
export const SPEED_BOOST_RADIUS_MIN = 10;
export const SPEED_BOOST_RADIUS_MAX = 18;
// Speed tuning helpers (normalize new high speeds against a baseline feel)
export const SPEED_TUNING_BASE = 14; // reference player speed used for original tuning
export const SPEED_SCALE = Math.max(0.5, PLAYER_SPEED / SPEED_TUNING_BASE);
// Caps and smoothing to avoid jitter/teleport at high speeds
export const MINION_MAX_SPEED = 12; // u/s hard cap for minion & ordinary boss chase
export const TRIANGLE_CHARGE_MAX = 18; // u/s hard cap for triangle charge
export const TRIANGLE_CIRCLE_MAX = 12; // u/s hard cap for triangle circling
// Enemy damage scaling
export const DAMAGE_SCALE_PER_WAVE = 0.04; // +4% per wave
export const DAMAGE_SCALE_MAX = 4.0; // cap at 4x (balanced)
// Enemy speed scaling and player compensation
export const ENEMY_SPEED_SCALE_PER_WAVE = 0.03; // +3% enemy speed per wave
export const ENEMY_SPEED_SCALE_MAX = 1.5; // cap at 1.5x (balanced)
export const APPROACH_SLOW_RADIUS = 2.5; // start slowing when near target
export const POST_LAND_SETTLE = 0.3; // s to ramp in after spawn landing
// Knockback tuning (exposed constants)
export const KNOCKBACK = {
    minion: 12.0,
    boss: 8.0,
    triangle: 7.0,
};
export const KNOCKBACK_DECAY = {
    minion: 8.0,
    boss: 6.0,
    triangle: 6.0,
};
export const KNOCKBACK_DISTANCE_MAX = 8.0; // full strength when very close, fades to 0 by this distance

// Portal / spawning constants
export const PORTAL_LIFETIME = 4500; // ms that a portal stays open
export const PORTALS_PER_WAVE_MIN = 2;
export const PORTALS_PER_WAVE_MAX = 4;
export const PORTAL_RADIUS_MIN = 12;
export const PORTAL_RADIUS_MAX = 20;
export const PORTAL_STAGGER_MS = 260; // ms between enemy drops per portal
// Rare small portals behind the player appear starting at this wave
export const BEHIND_SPAWN_MIN_WAVE = 8;
// Temporary feature flag to fully disable arena growth logic for performance
export const ARENA_GROWTH_DISABLED = true;
export const DROP_SPAWN_HEIGHT = 8; // y height enemies begin falling from
// Feature flags: control radial HUD vs. text labels independently
// NOTE: radial HUD can be toggled off if it causes visual issues; keep labels separate.
export const SHOW_PLAYER_RADIAL_HUD = false;
export const SHOW_PLAYER_LABELS = true;
export const DROP_SPEED = 10; // units/sec downward during spawn

// Contact damage by enemy type
export const CONTACT_DAMAGE = {
    minion: 2,
    boss: 20,
    triangle: 31,
    cone: 42,
};

// Leveling configuration (data-driven)
export const LEVEL_CONFIG = {
    levelIsWave: true,
    budget: { base: 4, perLevel: 1, over10: 2 },
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

export function getBudget(level) {
    if (level <= 10)
        return LEVEL_CONFIG.budget.base + LEVEL_CONFIG.budget.perLevel * level;
    return (
        LEVEL_CONFIG.budget.base +
        LEVEL_CONFIG.budget.perLevel * 10 +
        LEVEL_CONFIG.budget.over10 * (level - 10)
    );
}
