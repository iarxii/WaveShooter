import type { HeroAnimMap } from '../HeroAnimTester'

// Lite sword & shield FBX animation mapping for Dr Dokta.
// NOTE: Paths with spaces are supported by Vite; ensure they exist under /src/assets/... at build time.
// Locomotion
import idle from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Sword And Shield Block Idle.fbx'
import runBackward from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Sword And Shield Run Backward.fbx'
import runForward from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Sword And Shield Run Forward.fbx'
import strafeLeft from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Left Strafe.fbx'
import strafeRight from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Right Strafe.fbx'
// Treat "Jump Backward" as a dash/backflip style move
import dashBackward from '../../../assets/models/dr_dokta_anim_poses/Jump Backward.fbx'

// Jumps (provide wall-jump fallback via jump if distinct asset not yet imported)
import jump from '../../../assets/models/dr_dokta_anim_poses/Jump.fbx'

// Shape pose / runner deterministic animation (fallback to random poses if omitted)
import shapePoseAsset from '../../../assets/models/dr_dokta_anim_poses/action_poses/Female Crouch Pose.fbx'

// Attacks
import attackLight from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Standing 2H Magic Attack 03.fbx'
import attackHeavy from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Sword And Shield Attack (Heavy).fbx'
import attackJump1 from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Jump Attack.fbx'
import attackJump2 from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Sword And Shield Attack (Jump).fbx'
import attackSpecial from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Standing 2H Magic Area Attack 02 - High Level Pickup.fbx'
import attackCharge from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Dual Weapon Combo.fbx'

// Death
import death from '../../../assets/models/dr_dokta_anim_poses/Defeated.fbx'

// Export partial map (HeroAnimTester handles missing entries gracefully)
export const liteSwordShieldMap: HeroAnimMap = {
  idle,
  runForward,
  runBackward,
  strafeLeft,
  strafeRight,
  jump,
  // Map wall jump to the same clip until a distinct asset is provided.
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
