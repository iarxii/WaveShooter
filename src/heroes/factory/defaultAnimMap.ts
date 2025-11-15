import { assetUrl } from '../../utils/assetPaths'

// Provide a minimal, stable default animation map to keep module exports stable
// for Fast Refresh. We avoid importing project-specific types to prevent
// circular imports; the return type is a simple Partial<Record<string,string>>.
const sampleRunBack = assetUrl('models/dr_dokta_anim_poses/Backflip.fbx')

export function defaultAnimMap(baseDir = 'src/assets/models/dr_dokta_anim_poses/Lite Sword and Shield Pack'): Partial<Record<string, string>> {
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
