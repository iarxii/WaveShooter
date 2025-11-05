// Centralized roster data for Enemies and Heroes.
// Keep in sync with Updated_Enemy_List.md, Balancing_Table.md, and Hero_List.md.

// Tiers: T1=1 (Common), T2=2 (Uncommon), T3=3 (Rare), T4=4 (Apex/Hazard)

export const ENEMIES = [
  // Pathogens
  {
    name: 'MRSA', type: 'Pathogen', scientificName: 'Methicillin-resistant Staphylococcus aureus',
    realWorldEffect: 'Resistant to antibiotics; causes skin and bloodstream infections',
    gameplayEffect: 'Resistance Aura — reduces player damage by 20%',
    shape: 'Hexagon', color: 'Red', tier: 1, unlock: 5,
    stats: { health: 3, speed: 2.5, damage: 2 }, maxConcurrent: 10,
    vfx: { onHit: { type: 'bulletHit', color: '#ff4444' }, onAura: { type: 'aura', color: '#ff4444', pulse: true } },
  },
  {
    name: 'VRE', type: 'Pathogen', scientificName: 'Vancomycin-resistant Enterococcus',
    realWorldEffect: 'UTIs and bloodstream infections; highly drug-resistant',
    gameplayEffect: 'Fortified Shell — 50% less damage from ranged attacks',
    shape: 'Square', color: 'Orange', tier: 1, unlock: 5,
    stats: { health: 3, speed: 2.0, damage: 2 }, maxConcurrent: 8,
    vfx: { onHit: { type: 'bulletHit', color: '#f97316' }, onAura: { type: 'shell', color: '#f97316' } },
  },
  {
    name: 'K. pneumoniae ESBL', type: 'Pathogen', scientificName: 'Klebsiella pneumoniae (ESBL-producing)',
    realWorldEffect: 'Breaks down antibiotics; pneumonia and sepsis',
    gameplayEffect: 'Enzyme Shield — periodically nullifies bullets for 3s',
    shape: 'Pentagon', color: 'Blue', tier: 2, unlock: 6,
    stats: { health: 4, speed: 2.2, damage: 3 }, maxConcurrent: 8,
    vfx: { onHit: { type: 'bulletHit', color: '#3b82f6' }, onSpecial: { type: 'enzymeShieldGlow', color: '#facc15' } },
  },
  {
    name: 'K. pneumoniae CRE', type: 'Pathogen', scientificName: 'Klebsiella pneumoniae (Carbapenem-resistant)',
    realWorldEffect: 'Resistant to last-resort antibiotics; severe infections',
    gameplayEffect: 'Carbapenem Wall — immune to stun effects',
    shape: 'Hexagon', color: 'Dark Blue', tier: 3, unlock: 10,
    stats: { health: 5, speed: 2.0, damage: 4 }, maxConcurrent: 4,
    vfx: { onHit: { type: 'bulletHit', color: '#1e3a8a' }, onAura: { type: 'wall', color: '#1e3a8a' } },
  },
  {
    name: 'A. baumannii MDR', type: 'Pathogen', scientificName: 'Acinetobacter baumannii (Multidrug-resistant)',
    realWorldEffect: 'Ventilator-associated pneumonia and wound infections',
    gameplayEffect: 'Biofilm Armor — regenerates 10% health every 5s',
    shape: 'Octagon', color: 'Gray', tier: 2, unlock: 7,
    stats: { health: 4, speed: 2.3, damage: 3 }, maxConcurrent: 6,
    vfx: { onHit: { type: 'bulletHit', color: '#9ca3af' }, onAura: { type: 'regen', color: '#9ca3af' } },
  },
  {
    name: 'A. baumannii XDR', type: 'Pathogen', scientificName: 'Acinetobacter baumannii (Extensively drug-resistant)',
    realWorldEffect: 'Resistant to nearly all antibiotics',
    gameplayEffect: 'Extreme Resilience — temporary invulnerability after taking damage',
    shape: 'Octagon', color: 'Black', tier: 3, unlock: 12,
    stats: { health: 6, speed: 1.8, damage: 4 }, maxConcurrent: 3,
    vfx: { onHit: { type: 'bulletHit', color: '#111827' }, onSpecial: { type: 'resilienceFlash', color: '#ffffff' } },
  },
  {
    name: 'P. aeruginosa MDR', type: 'Pathogen', scientificName: 'Pseudomonas aeruginosa (Multidrug-resistant)',
    realWorldEffect: 'Infections in burns and wounds',
    gameplayEffect: 'Toxin Spray — creates a slowing zone',
    shape: 'Triangle', color: 'Green', tier: 1, unlock: 8,
    stats: { health: 3, speed: 2.5, damage: 2 }, maxConcurrent: 10,
    vfx: { onHit: { type: 'bulletHit', color: '#22c55e' }, onSpecial: { type: 'toxinSpray', color: '#22c55e' } },
  },
  {
    name: 'P. aeruginosa XDR', type: 'Pathogen', scientificName: 'Pseudomonas aeruginosa (Extensively drug-resistant)',
    realWorldEffect: 'Highly resistant; severe infections',
    gameplayEffect: 'Corrosive Burst — damages player armor over time',
    shape: 'Triangle', color: 'Dark Green', tier: 3, unlock: 12,
    stats: { health: 5, speed: 2.0, damage: 3 }, maxConcurrent: 3,
    vfx: { onHit: { type: 'bulletHit', color: '#065f46' }, onSpecial: { type: 'corrosiveBurst', color: '#065f46' } },
  },
  {
    name: 'Enterobacter ESBL', type: 'Pathogen', scientificName: 'Enterobacter spp (ESBL-producing)',
    realWorldEffect: 'Resistant to beta-lactam antibiotics',
    gameplayEffect: 'Adaptive Shield — defense boost near allies',
    shape: 'Diamond', color: 'Cyan', tier: 2, unlock: 7,
    stats: { health: 4, speed: 2.2, damage: 3 }, maxConcurrent: 8,
    vfx: { onHit: { type: 'bulletHit', color: '#06b6d4' }, onAura: { type: 'adaptiveShield', color: '#06b6d4' } },
  },
  {
    name: 'Enterobacter CRE', type: 'Pathogen', scientificName: 'Enterobacter spp (Carbapenem-resistant)',
    realWorldEffect: 'Severe infections; limited treatment options',
    gameplayEffect: 'Cluster Defense — buffs nearby allies’ speed',
    shape: 'Diamond', color: 'Dark Cyan', tier: 3, unlock: 11,
    stats: { health: 5, speed: 2.0, damage: 4 }, maxConcurrent: 4,
    vfx: { onHit: { type: 'bulletHit', color: '#155e75' }, onAura: { type: 'clusterSpeed', color: '#155e75' } },
  },
  {
    name: 'E. coli ESBL', type: 'Pathogen', scientificName: 'Escherichia coli (ESBL-producing)',
    realWorldEffect: 'Common cause of UTIs; antibiotic resistance',
    gameplayEffect: 'Rapid Division — spawns a clone at 50% health',
    shape: 'Circle', color: 'Pink', tier: 1, unlock: 5,
    stats: { health: 3, speed: 2.5, damage: 2 }, maxConcurrent: 12,
    vfx: { onHit: { type: 'bulletHit', color: '#ec4899' }, onSpecial: { type: 'cloneBurst', color: '#ec4899' } },
  },
  {
    name: 'E. coli CRE', type: 'Pathogen', scientificName: 'Escherichia coli (Carbapenem-resistant)',
    realWorldEffect: 'Severe infections; high mortality risk',
    gameplayEffect: 'Mutation Surge — gains speed when damaged',
    shape: 'Circle', color: 'Dark Pink', tier: 2, unlock: 9,
    stats: { health: 4, speed: 2.3, damage: 3 }, maxConcurrent: 6,
    vfx: { onHit: { type: 'bulletHit', color: '#9d174d' }, onSpecial: { type: 'mutationSurge', color: '#9d174d' } },
  },
  {
    name: 'Candida auris', type: 'Pathogen (Fungal)', scientificName: 'Candida auris',
    realWorldEffect: 'Bloodstream infections; multidrug-resistant',
    gameplayEffect: 'Spore Cloud — reduces visibility',
    shape: 'Oval', color: 'Purple', tier: 2, unlock: 8,
    stats: { health: 3, speed: 2.0, damage: 2 }, maxConcurrent: 5,
    vfx: { onHit: { type: 'bulletHit', color: '#a855f7' }, onSpecial: { type: 'sporeCloud', color: '#a855f7' } },
  },
  {
    name: 'C. difficile', type: 'Pathogen', scientificName: 'Clostridioides difficile',
    realWorldEffect: 'Severe diarrhea and colitis',
    gameplayEffect: 'Toxin Cloud — slows player by 40%',
    shape: 'Circle', color: 'Yellow', tier: 1, unlock: 6,
    stats: { health: 3, speed: 2.0, damage: 2 }, maxConcurrent: 12,
    vfx: { onHit: { type: 'bulletHit', color: '#eab308' }, onSpecial: { type: 'toxinCloud', color: '#eab308' } },
  },
  // Mutagens / Hazards
  {
    name: 'UV Radiation', type: 'Mutagen', scientificName: 'Ultraviolet Light',
    realWorldEffect: 'Causes DNA mutations; linked to skin cancer',
    gameplayEffect: 'Mutation Burst — increases enemy speed by 30%',
    shape: 'Triangle', color: 'Violet', tier: 3, unlock: 10,
    stats: { health: 2, speed: 3.0, damage: 3 }, maxConcurrent: 2,
    vfx: { onHit: { type: 'bulletHit', color: '#8b5cf6' }, onAura: { type: 'radiation', color: '#8b5cf6' }, onSpecial: { type: 'radiationPulse', color: '#ffffff' } },
  },
  {
    name: 'Benzene', type: 'Mutagen', scientificName: 'C₆H₆',
    realWorldEffect: 'Chemical mutagen linked to leukemia',
    gameplayEffect: 'Carcinogenic Field — reduces player health regen',
    shape: 'Rectangle', color: 'Green', tier: 3, unlock: 11,
    stats: { health: 2, speed: 2.8, damage: 3 }, maxConcurrent: 2,
    vfx: { onHit: { type: 'bulletHit', color: '#22c55e' }, onSpecial: { type: 'carcinogenicField', color: '#22c55e' } },
  },
  {
    name: 'X-rays', type: 'Mutagen', scientificName: 'Ionizing Radiation',
    realWorldEffect: 'Chromosomal damage; cancer risk',
    gameplayEffect: 'Radiation Pulse — periodic AoE damage',
    shape: 'Star', color: 'White', tier: 4, unlock: 12,
    stats: { health: 2, speed: 3.2, damage: 4 }, maxConcurrent: 1,
    vfx: { onHit: { type: 'bulletHit', color: '#ffffff' }, onSpecial: { type: 'radiationPulse', color: '#ffffff' } },
  },
  {
    name: 'Nitrosamines', type: 'Mutagen', scientificName: 'N‑Nitroso compounds',
    realWorldEffect: 'Potent carcinogens found in processed foods',
    gameplayEffect: 'Toxic Mist — slowly drains player health',
    shape: 'Crescent', color: 'Brown', tier: 4, unlock: 13,
    stats: { health: 2, speed: 2.9, damage: 3 }, maxConcurrent: 1,
    vfx: { onHit: { type: 'bulletHit', color: '#92400e' }, onSpecial: { type: 'toxicMist', color: '#92400e' } },
  },
  // Viruses / Major Bosses
  {
    name: 'Influenza', type: 'Virus (Major Boss)', scientificName: 'Influenza virus',
    realWorldEffect: 'Causes seasonal flu; high mutation rates',
    gameplayEffect: 'Antigenic Drift — periodically changes resistances',
    shape: 'Star', color: 'Cyan', tier: 4, unlock: 14,
    stats: { health: 12, speed: 2.2, damage: 5 }, maxConcurrent: 1,
    vfx: { onHit: { type: 'bulletHit', color: '#06b6d4' }, onSpecial: { type: 'resistanceShift', color: '#06b6d4' } },
  },
  {
    name: 'Hepatitis C', type: 'Virus (Major Boss)', scientificName: 'Hepatitis C virus (HCV)',
    realWorldEffect: 'Chronic liver infection; long-term complications',
    gameplayEffect: 'Viral Persistence — regenerates shields over time',
    shape: 'Hexagon', color: 'Dark Cyan', tier: 4, unlock: 15,
    stats: { health: 13, speed: 2.0, damage: 5 }, maxConcurrent: 1,
    vfx: { onHit: { type: 'bulletHit', color: '#155e75' }, onSpecial: { type: 'regenShield', color: '#155e75' } },
  },
  {
    name: 'Rotavirus', type: 'Virus (Major Boss)', scientificName: 'Rotavirus',
    realWorldEffect: 'Causes severe diarrhea in children',
    gameplayEffect: 'Spike Wheel — radial projectile bursts',
    shape: 'Circle', color: 'Yellow', tier: 4, unlock: 16,
    stats: { health: 12, speed: 2.1, damage: 5 }, maxConcurrent: 1,
    vfx: { onHit: { type: 'bulletHit', color: '#eab308' }, onSpecial: { type: 'radialBurst', color: '#eab308' } },
  },
  {
    name: 'Bacteriophage', type: 'Virus (Major Boss)', scientificName: 'Bacteriophage',
    realWorldEffect: 'Infects bacteria; potential therapeutic uses',
    gameplayEffect: 'Host Hijack — buffs nearby pathogens',
    shape: 'Triangle', color: 'Dark Green', tier: 4, unlock: 17,
    stats: { health: 14, speed: 2.0, damage: 5 }, maxConcurrent: 1,
    vfx: { onHit: { type: 'bulletHit', color: '#065f46' }, onAura: { type: 'allyBuff', color: '#065f46' } },
  },
  {
    name: 'Papillomavirus', type: 'Virus (Major Boss)', scientificName: 'Human papillomavirus (HPV)',
    realWorldEffect: 'Causes warts; associated with several cancers',
    gameplayEffect: 'Capsid Shield — reduced damage except weak spot',
    shape: 'Pentagon', color: 'Pink', tier: 4, unlock: 18,
    stats: { health: 13, speed: 2.0, damage: 5 }, maxConcurrent: 1,
    vfx: { onHit: { type: 'bulletHit', color: '#ec4899' }, onSpecial: { type: 'capsidShield', color: '#ec4899' } },
  },
  {
    name: 'Ebolavirus', type: 'Virus (Major Boss)', scientificName: 'Ebolavirus',
    realWorldEffect: 'Severe hemorrhagic fever; high mortality risk',
    gameplayEffect: 'Hemorrhagic Wave — high-damage sweeping attacks',
    shape: 'Crescent', color: 'Red', tier: 4, unlock: 19,
    stats: { health: 15, speed: 1.9, damage: 7 }, maxConcurrent: 1,
    vfx: { onHit: { type: 'bulletHit', color: '#ef4444' }, onSpecial: { type: 'sweepingWave', color: '#ef4444' } },
  },
  {
    name: 'Adenovirus', type: 'Virus (Major Boss)', scientificName: 'Adenovirus',
    realWorldEffect: 'Respiratory and gastrointestinal illnesses',
    gameplayEffect: 'Vector Swarm — periodically spawns drone minions',
    shape: 'Diamond', color: 'Blue', tier: 4, unlock: 20,
    stats: { health: 12, speed: 2.2, damage: 5 }, maxConcurrent: 1,
    vfx: { onHit: { type: 'bulletHit', color: '#3b82f6' }, onSpecial: { type: 'spawnDrones', color: '#3b82f6' } },
  },
  {
    name: 'HIV', type: 'Virus (Major Boss)', scientificName: 'Human immunodeficiency virus (HIV)',
    realWorldEffect: 'Targets immune cells (CD4 T-cells); leads to AIDS if untreated',
    gameplayEffect: 'Immune Suppression — reduces player defenses and regen',
    shape: 'Oval', color: 'Violet', tier: 4, unlock: 21,
    stats: { health: 14, speed: 2.0, damage: 6 }, maxConcurrent: 1,
    vfx: { onHit: { type: 'bulletHit', color: '#7c3aed' }, onAura: { type: 'debuffField', color: '#7c3aed' } },
  },
]

export const HEROES = [
  { name: 'Dr. Dokta', role: 'Hero', ability: 'Healing Pulse', cooldown: 20, notes: 'Restores area health', vfx: { abilityEffect: 'fireball', color: '#22c55e' } },
  { name: 'Sr. Sesta', role: 'Hero', ability: 'Sterile Field', cooldown: 18, notes: 'Creates safe zone', vfx: { abilityEffect: 'purpleAura', color: '#a855f7' } },
  { name: 'Nurse Temba', role: 'Hero', ability: 'Rapid Response', cooldown: 18, notes: 'Emergency heals/dash', vfx: { abilityEffect: 'energyRod', color: '#eab308' } },
  { name: 'Jenita', role: 'Hero', ability: 'Clean Sweep', cooldown: 16, notes: 'Cleanses hazards', vfx: { abilityEffect: 'soapStream', color: '#60a5fa' } },
  { name: 'Mr. Hanz', role: 'Hero', ability: 'Sanitizer Blast', cooldown: 15, notes: 'Burst damage cone', vfx: { abilityEffect: 'soapStream', color: '#f59e0b' } },
  { name: 'Nthabiseng', role: 'Hero', ability: 'ARV Shield', cooldown: 16, notes: 'Protective barrier', vfx: { abilityEffect: 'greenShieldAura', color: '#22c55e' } },
  { name: 'Dina', role: 'Hero', ability: 'Nutrition Boost', cooldown: 17, notes: 'Short regen buff', vfx: { abilityEffect: 'greenShieldAura', color: '#10b981' } },
  { name: 'Ray', role: 'Hero', ability: 'Radiation Block', cooldown: 18, notes: 'Hazard resistance', vfx: { abilityEffect: 'lightningBolt', color: '#60a5fa' } },
]

// Helpers for filtering/sorting in UIs
export function filterEnemies({ minLevel = 1, tier = 'all' } = {}){
  return ENEMIES.filter(e => e.unlock >= minLevel)
    .filter(e => tier === 'all' ? true : e.tier === Number(tier))
    .sort((a,b)=> a.unlock - b.unlock || a.tier - b.tier)
}

// Simple color mapping for heroes (placeholder visuals)
export const HERO_COLORS = {
  'Dr. Dokta': '#22c55e',
  'Sr. Sesta': '#60a5fa',
  'Nurse Temba': '#f97316',
  'Jenita': '#eab308',
  'Mr. Hanz': '#ef4444',
  'Nthabiseng': '#a855f7',
  'Dina': '#06b6d4',
  'Ray': '#f43f5e',
}
export function heroColorFor(name) {
  return HERO_COLORS[name] || '#22c55e'
}
