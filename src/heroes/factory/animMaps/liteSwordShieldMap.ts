import type { HeroAnimMap } from '../HeroAnimTester'

/**
 * Refactored animation map loader:
 *  - Removes per-file static FBX imports that caused Netlify build failures when Git LFS
 *    had not pulled large binary assets yet.
 *  - Uses import.meta.glob to (optionally) include any FBX actually present at build time.
 *  - Missing files no longer make the build fail; they simply produce console warnings
 *    and the consuming animation system can fall back gracefully.
 *
 * IMPORTANT: Ensure your Netlify build pulls LFS (git lfs pull) so the glob can find assets.
 * This change makes the build tolerant, not a substitute for fetching required animations.
 */

// Eagerly glob any FBX under the Dr Dokta poses tree. Keys are full relative paths.
// When a file is missing (e.g. due to LFS not fetched) it simply won't appear here.
// We type the module default as string (Vite asset URL) or any (fallback) for safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fbxModules = import.meta.glob('../../../assets/models/dr_dokta_anim_poses/**/*.fbx', { eager: true }) as Record<string, any>

function findFbxFile(ending: string): string | undefined {
  // Match path suffix in a case-sensitive manner (asset names have consistent casing)
  const entry = Object.entries(fbxModules).find(([k]) => k.endsWith(ending))
  const url = entry?.[1]?.default || entry?.[1]
  if (!url) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[liteSwordShieldMap] FBX asset missing at build/runtime:', ending)
    }
  }
  return url
}

// Helper to reduce repetition for pack files
const PACK = 'Lite Sword and Shield Pack'

// Resolve (or leave undefined) individual animations
const idle = findFbxFile(`${PACK}/Sword And Shield Block Idle.fbx`)
const runBackward = findFbxFile(`${PACK}/Sword And Shield Run Backward.fbx`)
const runForward = findFbxFile(`${PACK}/Sword And Shield Run Forward.fbx`)
const strafeLeft = findFbxFile(`${PACK}/Left Strafe.fbx`)
const strafeRight = findFbxFile(`${PACK}/Right Strafe.fbx`)
const dashBackward = findFbxFile('Jump Backward.fbx')
const jump = findFbxFile('Jump.fbx')
const shapePoseAsset = findFbxFile('action_poses/Female Crouch Pose.fbx')
const attackLight = findFbxFile(`${PACK}/Standing 2H Magic Attack 03.fbx`)
const attackHeavy = findFbxFile(`${PACK}/Sword And Shield Attack (Heavy).fbx`)
const attackJump1 = findFbxFile(`${PACK}/Jump Attack.fbx`)
const attackJump2 = findFbxFile(`${PACK}/Sword And Shield Attack (Jump).fbx`)
const attackSpecial = findFbxFile(`${PACK}/Standing 2H Magic Area Attack 02 - High Level Pickup.fbx`)
const attackCharge = findFbxFile(`${PACK}/Dual Weapon Combo.fbx`)
const death = findFbxFile('Defeated.fbx')

// Export partial map (HeroAnimTester handles missing entries gracefully). Undefined clips are ignored downstream.
export const liteSwordShieldMap: HeroAnimMap = {
  ...(idle && { idle }),
  ...(runForward && { runForward }),
  ...(runBackward && { runBackward }),
  ...(strafeLeft && { strafeLeft }),
  ...(strafeRight && { strafeRight }),
  ...(jump && { jump, jumpWall: jump }),
  ...(dashBackward && { dashBackward }),
  ...(attackLight && { attackLight }),
  ...(attackHeavy && { attackHeavy }),
  ...(attackJump1 && attackJump2 && { attackJump: [attackJump1, attackJump2] }),
  ...(attackSpecial && { attackSpecial }),
  ...(attackCharge && { attackCharge }),
  ...(death && { death }),
  ...(shapePoseAsset && { shapePose: shapePoseAsset }),
}

// Optional diagnostic summary in dev
if (import.meta.env.DEV) {
  const missing: string[] = []
  const required = [
    'Sword And Shield Block Idle.fbx',
    'Sword And Shield Run Backward.fbx',
    'Sword And Shield Run Forward.fbx',
    'Left Strafe.fbx',
    'Right Strafe.fbx',
    'Jump Backward.fbx',
    'Jump.fbx',
    'Female Crouch Pose.fbx',
    'Standing 2H Magic Attack 03.fbx',
    'Sword And Shield Attack (Heavy).fbx',
    'Jump Attack.fbx',
    'Sword And Shield Attack (Jump).fbx',
    'Standing 2H Magic Area Attack 02 - High Level Pickup.fbx',
    'Dual Weapon Combo.fbx',
    'Defeated.fbx',
  ]
  required.forEach(r => {
    if (!Object.keys(fbxModules).some(k => k.endsWith(r))) missing.push(r)
  })
  // eslint-disable-next-line no-console
  console.info('[liteSwordShieldMap] Loaded FBX clips:', Object.keys(liteSwordShieldMap))
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.info('[liteSwordShieldMap] Missing (not fatal):', missing)
  }
}
