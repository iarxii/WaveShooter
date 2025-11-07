import type { HeroAnimMap } from '../HeroAnimTester'

// Updated mapping per user's provided file list
// Locomotion
import idle from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Sword And Shield Block Idle.fbx'
import runBackward from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Sword And Shield Run Backward.fbx'
import runForward from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Sword And Shield Run Forward.fbx'
import strafeLeft from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Left Strafe.fbx'
import strafeRight from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Right Strafe.fbx'

// Jumps
import jump from '../../../assets/models/dr_dokta_anim_poses/Jump Over.fbx'
import jumpWall from '../../../assets/models/dr_dokta_anim_poses/Flip Kick - Wall Jump.fbx'

// Attacks
import attackLight from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Standing 2H Magic Attack 03.fbx'
import attackHeavy from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Sword And Shield Attack (Heavy).fbx'
import attackJump1 from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Jump Attack.fbx'
import attackJump2 from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Sword And Shield Attack (Jump).fbx'
import attackSpecial from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Standing 2H Magic Area Attack 02 - High Level Pickup.fbx'
import attackCharge from '../../../assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack/Dual Weapon Combo.fbx'

// Death
import death from '../../../assets/models/dr_dokta_anim_poses/Defeated.fbx'

export const liteSwordShieldMap: HeroAnimMap = {
  idle,
  runForward,
  runBackward,
  strafeLeft,
  strafeRight,
  jump,
  jumpWall,
  attackLight,
  attackHeavy,
  attackJump: [attackJump1, attackJump2],
  attackSpecial,
  attackCharge,
  death,
}
