import { assetUrl } from '../../utils/assetPaths'

// A small, stable fallback anim map used when no explicit pack is provided.
const sampleRunBack = assetUrl('models/dr_dokta_anim_poses/Backflip.fbx')

export function defaultAnimMap(baseDir = 'src/assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack') {
  const runBack = sampleRunBack
  return {
    idle: runBack,
    runForward: runBack,
    runBackward: runBack,
    strafeLeft: runBack,
    strafeRight: runBack,
    attackLight: runBack,
    attackHeavy: runBack,
    jump: runBack,
    death: runBack,
  }
}
