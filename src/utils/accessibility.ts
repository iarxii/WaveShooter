type AccessibilitySettings = {
  invertMoveX: boolean
  invertMoveY: boolean
  invertAimX: boolean
  invertAimY: boolean
  // Runtime helper to flip controller Y axes (left+right stick). Persisted so UI toggle affects all consumers.
  flipControllerY?: boolean
}

const LS_KEY = 'accessibilitySettings'

let settings: AccessibilitySettings = load()
const listeners = new Set<(s: AccessibilitySettings) => void>()

function load(): AccessibilitySettings {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return sanitize(JSON.parse(raw))
  } catch {}
  // Migration: legacy key used by HeroAnimTester to invert both axes
  try {
    const legacy = localStorage.getItem('invertDirections')
    if (legacy === '1' || legacy === 'true') return { invertMoveX: true, invertMoveY: true, invertAimX: false, invertAimY: false }
  } catch {}
  // New default: invert vertical movement & aim (user requested)
  return { invertMoveX: false, invertMoveY: false, invertAimX: false, invertAimY: false, flipControllerY: false }
}

function sanitize(obj: any): AccessibilitySettings {
  return {
    invertMoveX: !!obj?.invertMoveX,
    invertMoveY: !!obj?.invertMoveY,
    invertAimX: !!obj?.invertAimX,
    invertAimY: !!obj?.invertAimY,
    flipControllerY: !!obj?.flipControllerY,
  }
}

function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(settings)) } catch {}
}

export function getAccessibility(): AccessibilitySettings {
  return { ...settings }
}

export function updateAccessibility(partial: Partial<AccessibilitySettings>) {
  settings = sanitize({ ...settings, ...partial })
  persist()
  listeners.forEach((fn) => {
    try { fn({ ...settings }) } catch {}
  })
}

export function onAccessibilityChange(fn: (s: AccessibilitySettings) => void): () => void {
  listeners.add(fn)
  // emit current on subscribe for convenience
  try { fn({ ...settings }) } catch {}
  return () => { listeners.delete(fn) }
}
