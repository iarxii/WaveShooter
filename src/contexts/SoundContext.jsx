/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

// Import SFX assets
// All large audio files moved to public/assets/sounds; resolve via helper
import { assetUrl } from '../utils/assetPaths.ts'
const sfxBomb = assetUrl('sounds/mixkit-arcade-game-explosion-2759.wav')
const sfxLifeSpawn = assetUrl('sounds/mixkit-game-success-alert-2039.wav')
const sfxLifePickup = assetUrl('sounds/mixkit-game-success-alert-2039.wav')
const sfxPowerUp = assetUrl('sounds/mixkit-game-treasure-coin-2038.wav')
const sfxDiamond = assetUrl('sounds/mixkit-extra-bonus-in-a-video-game-2045.wav')
const sfxDash = assetUrl('sounds/mixkit-cinematic-laser-swoosh-1467.wav')
const sfxHealthPickup = assetUrl('sounds/mixkit-player-boost-recharging-2040.wav')
const sfxBoundaryJump = assetUrl('sounds/mixkit-golf-shot-with-whistle-2118.wav')
const sfxLifeLost = assetUrl('sounds/mixkit-troll-warrior-laugh-409.wav')
const sfxGameOver1 = assetUrl('sounds/mixkit-boxer-punch-exhaling-2054.wav')
const sfxGameOver2 = assetUrl('sounds/mixkit-arcade-retro-game-over-213.wav')
const sfxUiSelect = assetUrl('sounds/mixkit-player-select-notification-2037.mp3')
const sfxUiHover = assetUrl('sounds/mixkit-arcade-player-select-2036.wav')
// Gameplay event SFX
const sfxEnemyDestroy = assetUrl('sounds/mixkit-quick-knife-slice-cutting-2152.mp3')
// New mappings requested
const sfxLaserShot = assetUrl('sounds/attacks/Laser 1.wav')
const sfxDebuff = assetUrl('sounds/attacks/817520__metris__stage-failed.wav')
const sfxEnemyDestroyedNew = assetUrl('sounds/attacks/683180__neartheatmoshphere__iceball.wav')
const sfxLaserCharge = assetUrl('sounds/attacks/338067__gregorquendel__laser-charge.mp3')
const sfxLaserExpl = assetUrl('sounds/attacks/678901__skrecky__cinematic-synth-explosion-magic.wav')
const sfxBulletNormal = assetUrl('sounds/attacks/080884_bullet-hit-39872.mp3')
const sfxMusicNew = assetUrl('sounds/music/802140__kontraamusic__magical-hiphop-instrumental.mp3')
const sfxHitT1 = assetUrl('sounds/attacks/hit-tree-01-266310.mp3')
const sfxHitT2 = assetUrl('sounds/attacks/Widget_Flight.mp3')
const sfxHitT3 = assetUrl('sounds/attacks/Faerie_Chime.mp3')
const sfxHitT4 = assetUrl('sounds/attacks/Enchanting_Tune.mp3')
const sfxHitT5 = assetUrl('sounds/attacks/Arcane_Cadence.mp3')
const sfxPlayerSpawn = assetUrl('sounds/attacks/appear-magic-384915.mp3')
const sfxInvulnOn = assetUrl("sounds/attacks/Oracle's_Riddle.mp3")
const sfxBossSpawn = assetUrl('sounds/attacks/magic-ascend-2-259523.mp3')
const sfxBossKill = assetUrl('sounds/attacks/magic-ascend-1-259521.mp3')

const SoundContext = createContext(null)

// Small audio pool per sound so multiple can overlap
function createAudioPool(url, size = 4) {
  const pool = Array.from({ length: size }, () => new Audio(url))
  let idx = 0
  return {
    get() {
      const a = pool[idx]
      idx = (idx + 1) % pool.length
      return a
    },
  }
}

export function SoundProvider({ children }) {
  const [volume, setVolumeState] = useState(() => {
    const v = parseFloat(localStorage.getItem('sfxVolume') || '')
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8
  })
  const [musicVolume, setMusicVolumeState] = useState(() => {
    const v = parseFloat(localStorage.getItem('musicVolume') || '')
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8
  })
  const [enabled, setEnabled] = useState(() => {
    const v = localStorage.getItem('soundEnabled')
    return v == null ? true : v === '1'
  })
  // Separate toggles for SFX and Music (new)
  const [sfxEnabled, setSfxEnabled] = useState(() => {
    const v = localStorage.getItem('sfxEnabled')
    if (v != null) return v === '1'
    // fallback to legacy global enabled
    return enabled
  })
  const [musicEnabled, setMusicEnabled] = useState(() => {
    const v = localStorage.getItem('musicEnabled')
    if (v != null) return v === '1'
    return enabled
  })
  const volumeRef = useRef(volume)
  const musicVolumeRef = useRef(musicVolume)
  const enabledRef = useRef(enabled)
  const sfxEnabledRef = useRef(sfxEnabled)
  const musicEnabledRef = useRef(musicEnabled)
  useEffect(() => { volumeRef.current = volume; try { localStorage.setItem('sfxVolume', String(volume)) } catch { /* ignore quota */ } }, [volume])
  useEffect(() => { musicVolumeRef.current = musicVolume; try { localStorage.setItem('musicVolume', String(musicVolume)) } catch { /* ignore quota */ } }, [musicVolume])
  useEffect(() => { enabledRef.current = enabled; try { localStorage.setItem('soundEnabled', enabled ? '1' : '0') } catch { /* ignore quota */ } }, [enabled])
  useEffect(() => { sfxEnabledRef.current = sfxEnabled; try { localStorage.setItem('sfxEnabled', sfxEnabled ? '1' : '0') } catch { } }, [sfxEnabled])
  useEffect(() => { musicEnabledRef.current = musicEnabled; try { localStorage.setItem('musicEnabled', musicEnabled ? '1' : '0') } catch { } }, [musicEnabled])

  // Build pools once
  const pools = useMemo(() => ({
    bomb: createAudioPool(sfxBomb, 6),
    'life-spawn': createAudioPool(sfxLifeSpawn, 3),
    'life-pickup': createAudioPool(sfxLifePickup, 4),
    powerup: createAudioPool(sfxPowerUp, 4),
    diamond: createAudioPool(sfxDiamond, 3),
    dash: createAudioPool(sfxDash, 3),
    'health-pickup': createAudioPool(sfxHealthPickup, 3),
    'boundary-jump': createAudioPool(sfxBoundaryJump, 3),
    'life-lost': createAudioPool(sfxLifeLost, 2),
    'game-over-1': createAudioPool(sfxGameOver1, 2),
    'game-over-2': createAudioPool(sfxGameOver2, 2),
    'ui-select': createAudioPool(sfxUiSelect, 3),
    'ui-hover': createAudioPool(sfxUiHover, 3),
    // New event pools
    // 'enemy-destroy': createAudioPool(sfxEnemyDestroy, 6),
    // New event pools / overrides
    'laser-shot': createAudioPool(sfxLaserShot, 12),
    'debuff': createAudioPool(sfxDebuff, 4),
    'bullet-normal': createAudioPool(sfxBulletNormal, 10),
    // Override enemy-destroy with requested clip
    'enemy-destroy': createAudioPool(sfxEnemyDestroyedNew, 6),
    'laser-charge': createAudioPool(sfxLaserCharge, 2),
    'laser-expl': createAudioPool(sfxLaserExpl, 2),
    'hit-t1': createAudioPool(sfxHitT1, 6),
    'hit-t2': createAudioPool(sfxHitT2, 6),
    'hit-t3': createAudioPool(sfxHitT3, 6),
    'hit-t4': createAudioPool(sfxHitT4, 6),
    'hit-t5': createAudioPool(sfxHitT5, 6),
    'player-spawn': createAudioPool(sfxPlayerSpawn, 3),
    'invuln-on': createAudioPool(sfxInvulnOn, 2),
    'boss-spawn': createAudioPool(sfxBossSpawn, 2),
    'boss-kill': createAudioPool(sfxBossKill, 2),
  }), [])

  const setVolume = useCallback((v) => setVolumeState(Math.max(0, Math.min(1, v))), [])
  const setMusicVolume = useCallback((v) => setMusicVolumeState(Math.max(0, Math.min(1, v))), [])
  const toggleEnabled = useCallback(() => setEnabled(e => !e), [])
  const toggleSfxEnabled = useCallback(() => setSfxEnabled(v => !v), [])
  const toggleMusicEnabled = useCallback(() => setMusicEnabled(v => !v), [])

  const play = useCallback((id, opts = {}) => {
  if (!sfxEnabledRef.current) return
  const p = pools[id]
    if (!p) return
    const a = p.get()
    try {
      a.currentTime = 0
    } catch { /* ignore if not seekable yet */ }
    a.volume = Math.max(0, Math.min(1, (opts.volume ?? 1) * volumeRef.current * (sfxEnabledRef.current ? 1 : 0)))
    if (opts.rate && a.playbackRate !== undefined) a.playbackRate = opts.rate
    // In case user's interaction wasn't yet made, play() may reject; ignore
    a.play()?.catch?.(() => {})
  }, [pools])

  // Play two clips in sequence, each for a given duration (ms).
  const playSequence = useCallback((firstId, firstMs = 5000, secondId, secondMs = 5000) => {
    if (!sfxEnabledRef.current) return
    const start = performance.now()
    let timeoutId = null
    const cancels = []

    // helper to loop one clip until time window exhausted
    const loopClip = (pid, windowMs, onDone) => {
      const p = pools[pid]
      if (!p) { onDone && onDone(); return () => {} }
      let localCancelled = false
      const playOnce = () => {
        if (localCancelled) return
        const a = p.get()
        try { a.currentTime = 0 } catch {}
        a.volume = Math.max(0, Math.min(1, volumeRef.current))
        a.play().catch(() => {})
        const onEnded = () => {
          if (localCancelled) return
          if (performance.now() - start < windowMs) {
            playOnce()
          } else {
            onDone && onDone()
          }
        }
        try {
          a.removeEventListener('ended', onEnded)
          a.addEventListener('ended', onEnded)
        } catch {
          setTimeout(onEnded, windowMs)
        }
      }
      playOnce()
      const cancel = () => { localCancelled = true }
      cancels.push(cancel)
      return cancel
    }

    // start first, then schedule second after firstMs
    const cancelFirst = loopClip(firstId, firstMs, () => {})
    timeoutId = setTimeout(() => {
      cancelFirst && cancelFirst()
      loopClip(secondId, secondMs, () => {})
    }, firstMs)

    // return a cancel handle that cancels any running loops and the timeout
    return () => {
      cancels.forEach(c => c())
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [pools])

  // MUSIC: two-deck player with scene playlists and soft fade switches
  const deckA = useRef(null)
  const deckB = useRef(null)
  const activeDeck = useRef('A')
  const currentTrack = useRef(null)
  const pendingScene = useRef(null)
  const sceneRef = useRef('landing')
  const startedRef = useRef(false)

  // Import music tracks
  const music = useMemo(() => ({
    landing: [
      assetUrl('sounds/music/mixkit-this-is-seeb-haus-631.mp3'),
      assetUrl('sounds/music/mixkit-karma-1183.mp3'),
      assetUrl('sounds/music/mixkit-to-the-next-round-1047.mp3'),
      assetUrl('sounds/music/mixkit-infected-vibes-157.mp3'),
    ],
    game: [
      assetUrl('sounds/music/mixkit-this-is-seeb-haus-631.mp3'),
      assetUrl('sounds/music/mixkit-deep-urban-623.mp3'),
      assetUrl('sounds/music/mixkit-infected-vibes-157.mp3'),
      assetUrl('sounds/music/mixkit-games-music-706.mp3'),
      assetUrl('sounds/music/mixkit-our-nights-627.mp3'),
      // Added per request
      sfxMusicNew,
    ],
    characters: [
      assetUrl('sounds/music/mixkit-this-is-seeb-haus-631.mp3'),
      assetUrl('sounds/music/mixkit-sweatin-it-103.mp3'),
      assetUrl('sounds/music/mixkit-manuela-626.mp3'),
    ],
  }), [])

  // helper to bind 'ended' only on the currently active deck
  const bindEndedToActive = useCallback((handler) => {
    const a = deckA.current, b = deckB.current
    if (a) a.removeEventListener('ended', handler)
    if (b) b.removeEventListener('ended', handler)
    const active = activeDeck.current === 'A' ? a : b
    active?.addEventListener('ended', handler)
  }, [])

  // Initialize decks on mount
  useEffect(() => {
    const a = new Audio()
    const b = new Audio()
    a.preload = 'auto'
    b.preload = 'auto'
    a.loop = false
    b.loop = false
    a.volume = 0
    b.volume = 0
    deckA.current = a
    deckB.current = b

    // Start default track (landing first item) at 80%
    const def = music.landing[0]
    currentTrack.current = def
    a.src = def
    activeDeck.current = 'A'
    const tryPlay = () => {
      if (!enabledRef.current) return
      a.volume = musicVolumeRef.current
      a.play().then(() => { startedRef.current = true }).catch(() => {
        // Wait for first user interaction
        const onAny = () => {
          document.removeEventListener('pointerdown', onAny, true)
          document.removeEventListener('keydown', onAny, true)
          a.play().then(() => { startedRef.current = true }).catch(() => {})
        }
        document.addEventListener('pointerdown', onAny, true)
        document.addEventListener('keydown', onAny, true)
      })
    }
    tryPlay()

    const onEnded = () => {
      // If we were asked to switch to 'game' while default was playing, do it now
      if (pendingScene.current && pendingScene.current !== sceneRef.current) {
        sceneRef.current = pendingScene.current
        pendingScene.current = null
      }
      // Start next track based on current scene
      startNextFromScene()
    }
    // Only the active deck should drive rotation
    bindEndedToActive(onEnded)
    return () => {
      a.removeEventListener('ended', onEnded)
      b.removeEventListener('ended', onEnded)
      a.pause(); b.pause()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickNext = useCallback((list, last) => {
    if (!list?.length) return null
    const candidates = list.filter(u => u !== last)
    const pool = candidates.length ? candidates : list
    const i = Math.floor(Math.random() * pool.length)
    return pool[i]
  }, [])

  const startTrackOnDeck = useCallback((deck, url, fadeMs = 1200) => {
    if (!deck?.current) return
    const other = deck === deckA ? deckB : deckA
    const a = deck.current
    const b = other.current
    // ensure other deck doesn't trigger 'ended' rotation while fading out
    // we'll (re)bind 'ended' to the active deck after the switch
    a.src = url
    a.currentTime = 0
    a.volume = 0
    const target = enabledRef.current ? musicVolumeRef.current : 0
    a.play().catch(() => {})
    // simple fade-in, fade-out other
    const start = performance.now()
    let bStartVol
    const tick = () => {
      const t = performance.now()
      const x = Math.min(1, (t - start) / fadeMs)
      a.volume = target * x
      if (b) {
        // fade out linearly from its current volume to 0
        if (bStartVol === undefined) bStartVol = b.volume || 0
        b.volume = Math.max(0, bStartVol * (1 - x))
      }
      if (x < 1) {
        requestAnimationFrame(tick)
      } else {
        // fade complete: pause and zero the other deck to avoid stray 'ended'
        if (b) {
          try { b.pause() } catch {}
          b.volume = 0
        }
      }
    }
    requestAnimationFrame(tick)
    activeDeck.current = (deck === deckA) ? 'A' : 'B'
    currentTrack.current = url
    // ensure ended only on the new active deck
    bindEndedToActive(() => {
      // If we were asked to switch to 'game' while default was playing, do it now
      if (pendingScene.current && pendingScene.current !== sceneRef.current) {
        sceneRef.current = pendingScene.current
        pendingScene.current = null
      }
      startNextFromScene()
    })
  }, [])

  const startNextFromScene = useCallback(() => {
    const scene = sceneRef.current || 'landing'
    const list = music[scene]
    const next = pickNext(list, currentTrack.current)
    if (!next) return
    const deck = (activeDeck.current === 'A') ? deckB : deckA
    startTrackOnDeck(deck, next, 1200)
  }, [music, pickNext, startTrackOnDeck])

  const setMusicScene = useCallback((scene) => {
    if (!scene) return
    const prevScene = sceneRef.current
    if (scene === prevScene) return // no-op if no change
    // Special rule: if switching into 'game' while default track is the current one, defer until it ends
    const defaultUrl = music.landing[0]
    const isOnDefault = currentTrack.current === defaultUrl
    if (scene === 'game' && isOnDefault) {
      pendingScene.current = 'game'
      return
    }
    sceneRef.current = scene
    // Immediate crossfade into that scene's next track
    const list = music[scene]
    const next = pickNext(list, currentTrack.current)
    if (!next) return
    const deck = (activeDeck.current === 'A') ? deckB : deckA
    startTrackOnDeck(deck, next, prevScene === scene ? 800 : 1200)
  }, [music, pickNext, startTrackOnDeck])

  // react to enabled toggles for music
  useEffect(() => {
    const a = deckA.current, b = deckB.current
    if (!enabled) {
      // Pause both decks while disabled to prevent stray 'ended' events
      if (a) { try { a.pause() } catch {} ; a.volume = 0 }
      if (b) { try { b.pause() } catch {} ; b.volume = 0 }
      return
    }
    // Re-enable: ensure only the active deck is playing at musicVolume; keep the other at 0 and paused
    const active = activeDeck.current === 'A' ? a : b
    const other = activeDeck.current === 'A' ? b : a
    if (other) { try { other.pause() } catch {} ; other.volume = 0 }
    if (active) {
      active.volume = musicVolumeRef.current
      // resume if was paused
      active.play?.().catch(() => {})
    }
  }, [enabled])

  useEffect(() => {
    const a = deckA.current, b = deckB.current
    if (a && activeDeck.current === 'A') a.volume = enabled ? musicVolume : 0
    if (b && activeDeck.current === 'B') b.volume = enabled ? musicVolume : 0
  }, [musicVolume, enabled])

  const value = useMemo(() => ({
    // sfx
    play, playSequence, volume, setVolume,
    // music
    musicVolume, setMusicVolume, setMusicScene,
    // global
    enabled, toggleEnabled,
    // new controls
    sfxEnabled, toggleSfxEnabled, musicEnabled, toggleMusicEnabled,
  }), [play, volume, setVolume, musicVolume, setMusicVolume, setMusicScene, enabled, toggleEnabled])
  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() { return useContext(SoundContext) || { play: () => {}, volume: 1, setVolume: () => {} } }

// Global UI sound layer: attaches delegated listeners for hover/click
export function UISoundLayer() {
  const { play } = useSound()
  const hoverTimes = useRef(new WeakMap())

  useEffect(() => {
    const isInteractive = (el) => {
      if (!el || el.closest?.('[data-sfx-skip]')) return false
      const tag = (el.tagName || '').toLowerCase()
      if (tag === 'button' || tag === 'a' || tag === 'select' || tag === 'summary') return true
      if (tag === 'input') {
        const type = (el.getAttribute('type') || '').toLowerCase()
        return ['button','submit','checkbox','radio','range'].includes(type)
      }
      const role = el.getAttribute?.('role') || ''
      return ['button','link','menuitem','option','switch','tab'].includes(role)
    }
    const onClick = (e) => {
      const t = e.target
      if (isInteractive(t)) play('ui-select', { volume: 0.9 })
    }
    const onKey = (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && isInteractive(e.target)) play('ui-select', { volume: 0.9 })
    }
    const onOver = (e) => {
      const t = e.target
      if (!isInteractive(t)) return
      const now = performance.now()
      const last = hoverTimes.current.get(t) || 0
      if (now - last > 180) {
        hoverTimes.current.set(t, now)
        play('ui-hover', { volume: 0.7 })
      }
    }
    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('mouseover', onOver, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('mouseover', onOver, true)
    }
  }, [play])
  return null
}

// Small volume slider component for the NavBar
export function SfxVolumeControl({ width = 110 }) {
  const { volume, setVolume } = useSound()
  return (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, opacity: 0.85 }}>SFX</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => setVolume(parseFloat(e.target.value) || 0)}
        style={{ width }}
        aria-label="SFX volume"
      />
    </div>
  )
}

export function GlobalSoundToggle() {
  const { enabled, toggleEnabled } = useSound()
  return (
    <button onClick={toggleEnabled} style={{ marginLeft: 8 }} aria-label="Toggle sound">
      {enabled ? 'Sound: On' : 'Sound: Off'}
    </button>
  )
}

// Sound dropdown UI: controls for SFX and Music toggles and volumes
export function SoundDropdown() {
  const {
    play, volume, setVolume, musicVolume, setMusicVolume,
    sfxEnabled, toggleSfxEnabled, musicEnabled, toggleMusicEnabled
  } = useSound()
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', marginLeft: 12 }}>
      <button className="button" onClick={() => setOpen(o => !o)} aria-haspopup="true">Sound ▾</button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '40px', background: 'rgba(6,6,6,0.95)', padding: 12, borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.6)', zIndex: 2000, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ color: '#fff', fontSize: 13 }}><input type="checkbox" checked={sfxEnabled} onChange={toggleSfxEnabled} /> SFX</label>
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e)=> setVolume(parseFloat(e.target.value)||0)} style={{ flex: 1 }} />
          </div>
          <div style={{ height: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ color: '#fff', fontSize: 13 }}><input type="checkbox" checked={musicEnabled} onChange={toggleMusicEnabled} /> Music</label>
            <input type="range" min={0} max={1} step={0.01} value={musicVolume} onChange={(e)=> setMusicVolume(parseFloat(e.target.value)||0)} style={{ flex: 1 }} />
          </div>
        </div>
      )}
    </div>
  )
}
