// src/characters/factory/CampaignRoster.ts
// Helper to resolve campaign hazard names/ids to AvatarSpec definitions.
// For now, this bridges a few known examples to JSON specs and in-memory roster.

import type { AvatarSpec } from './AvatarSpec'
import { EnemyRoster } from './EnemyRoster'
import candidaAuris from '../../assets/avatars/candida_auris.json'

// Map human-friendly names to canonical ids in our roster/json files
const NAME_TO_ID: Record<string, string> = {
  'C. auris': 'candida_auris',
  'Candida auris': 'candida_auris',
}

// Merge imported JSONs into a local map (could be dynamic later)
const JsonAssets: Record<string, AvatarSpec> = {
  'candida_auris': candidaAuris as unknown as AvatarSpec,
}

export function getCampaignAvatarSpec(nameOrId: string): AvatarSpec | null {
  const id = (NAME_TO_ID[nameOrId] ?? nameOrId).toLowerCase()
  // prefer JSON assets if present
  if (JsonAssets[id]) return JsonAssets[id]
  if (EnemyRoster[id]) return EnemyRoster[id]
  return null
}
