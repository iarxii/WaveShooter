import type { HeroAnimMap } from '../HeroAnimTester'
import { assetUrl } from '../../../utils/assetPaths'

// Build URLs directly to public/assets/models after migration.
// Character images remain in src/assets; models/animations now served from /assets/models.
const PACK = 'Lite Sword and Shield Pack'
const base = 'models/dr_dokta_anim_poses'

const idle = assetUrl(`${base}/${PACK}/Sword And Shield Block Idle.fbx`)
const runBackward = assetUrl(`${base}/${PACK}/Sword And Shield Run Backward.fbx`)
const runForward = assetUrl(`${base}/${PACK}/Sword And Shield Run Forward.fbx`)
const strafeLeft = assetUrl(`${base}/${PACK}/Left Strafe.fbx`)
const strafeRight = assetUrl(`${base}/${PACK}/Right Strafe.fbx`)
const dashBackward = assetUrl(`${base}/Jump Backward.fbx`)
const jump = assetUrl(`${base}/Jump.fbx`)
const shapePoseAsset = assetUrl(`${base}/action_poses/Female Crouch Pose.fbx`)
const attackLight = assetUrl(`${base}/${PACK}/Standing 2H Magic Attack 03.fbx`)
const attackHeavy = assetUrl(`${base}/${PACK}/Sword And Shield Attack (Heavy).fbx`)
const attackJump1 = assetUrl(`${base}/${PACK}/Jump Attack.fbx`)
const attackJump2 = assetUrl(`${base}/${PACK}/Sword And Shield Attack (Jump).fbx`)
const attackSpecial = assetUrl(`${base}/${PACK}/Standing 2H Magic Area Attack 02 - High Level Pickup.fbx`)
const attackCharge = assetUrl(`${base}/${PACK}/Dual Weapon Combo.fbx`)
const death = assetUrl(`${base}/Defeated.fbx`)

export const liteSwordShieldMap: HeroAnimMap = {
  idle,
  runForward,
  runBackward,
  strafeLeft,
  strafeRight,
  jump,
  jumpWall: jump,
  dashBackward,
  attackLight,
  attackHeavy,
  attackJump: [attackJump1, attackJump2],
  attackSpecial,
  attackCharge,
  death,
  shapePose: shapePoseAsset,
}
