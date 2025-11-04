/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

// Import SFX assets
import sfxBomb from '../assets/sounds/mixkit-arcade-game-explosion-2759.wav'
import sfxLifeSpawn from '../assets/sounds/mixkit-game-success-alert-2039.wav'
import sfxLifePickup from '../assets/sounds/mixkit-game-success-alert-2039.wav'
import sfxPowerUp from '../assets/sounds/mixkit-game-treasure-coin-2038.wav'
import sfxDiamond from '../assets/sounds/mixkit-extra-bonus-in-a-video-game-2045.wav'
import sfxDash from '../assets/sounds/mixkit-cinematic-laser-swoosh-1467.wav'
import sfxHealthPickup from '../assets/sounds/mixkit-player-boost-recharging-2040.wav'
import sfxBoundaryJump from '../assets/sounds/mixkit-golf-shot-with-whistle-2118.wav'
import sfxLifeLost from '../assets/sounds/mixkit-troll-warrior-laugh-409.wav'
import sfxGameOver1 from '../assets/sounds/mixkit-boxer-punch-exhaling-2054.wav'
import sfxGameOver2 from '../assets/sounds/mixkit-arcade-retro-game-over-213.wav'
import sfxUiSelect from '../assets/sounds/mixkit-player-select-notification-2037.mp3'
import sfxUiHover from '../assets/sounds/mixkit-arcade-player-select-2036.wav'

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
  const volumeRef = useRef(volume)
  const musicVolumeRef = useRef(musicVolume)
  const enabledRef = useRef(enabled)
  useEffect(() => { volumeRef.current = volume; try { localStorage.setItem('sfxVolume', String(volume)) } catch { /* ignore quota */ } }, [volume])
  useEffect(() => { musicVolumeRef.current = musicVolume; try { localStorage.setItem('musicVolume', String(musicVolume)) } catch { /* ignore quota */ } }, [musicVolume])
  useEffect(() => { enabledRef.current = enabled; try { localStorage.setItem('soundEnabled', enabled ? '1' : '0') } catch { /* ignore quota */ } }, [enabled])

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
  }), [])

  const setVolume = useCallback((v) => setVolumeState(Math.max(0, Math.min(1, v))), [])
  const setMusicVolume = useCallback((v) => setMusicVolumeState(Math.max(0, Math.min(1, v))), [])
  const toggleEnabled = useCallback(() => setEnabled(e => !e), [])

  const play = useCallback((id, opts = {}) => {
  if (!enabledRef.current) return
  const p = pools[id]
    if (!p) return
    const a = p.get()
    try {
      a.currentTime = 0
    } catch { /* ignore if not seekable yet */ }
    a.volume = Math.max(0, Math.min(1, (opts.volume ?? 1) * volumeRef.current * (enabledRef.current ? 1 : 0)))
    if (opts.rate && a.playbackRate !== undefined) a.playbackRate = opts.rate
    // In case user's interaction wasn't yet made, play() may reject; ignore
    a.play()?.catch?.(() => {})
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
      new URL('../assets/sounds/music/mixkit-this-is-seeb-haus-631.mp3', import.meta.url).href,
      new URL('../assets/sounds/music/mixkit-karma-1183.mp3', import.meta.url).href,
      new URL('../assets/sounds/music/mixkit-to-the-next-round-1047.mp3', import.meta.url).href,
      new URL('../assets/sounds/music/mixkit-infected-vibes-157.mp3', import.meta.url).href,
    ],
    game: [
      new URL('../assets/sounds/music/mixkit-this-is-seeb-haus-631.mp3', import.meta.url).href,
      new URL('../assets/sounds/music/mixkit-deep-urban-623.mp3', import.meta.url).href,
      new URL('../assets/sounds/music/mixkit-infected-vibes-157.mp3', import.meta.url).href,
      new URL('../assets/sounds/music/mixkit-games-music-706.mp3', import.meta.url).href,
      new URL('../assets/sounds/music/mixkit-our-nights-627.mp3', import.meta.url).href,
    ],
    characters: [
      new URL('../assets/sounds/music/mixkit-this-is-seeb-haus-631.mp3', import.meta.url).href,
      new URL('../assets/sounds/music/mixkit-sweatin-it-103.mp3', import.meta.url).href,
      new URL('../assets/sounds/music/mixkit-manuela-626.mp3', import.meta.url).href,
    ],
  }), [])

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
    a.addEventListener('ended', onEnded)
    b.addEventListener('ended', onEnded)
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
    try { b && (b.onended = null) } catch {}
    a.src = url
    a.currentTime = 0
    a.volume = 0
    const target = enabledRef.current ? musicVolumeRef.current : 0
    a.play().catch(() => {})
    // simple fade-in, fade-out other
    const start = performance.now()
    const tick = () => {
      const t = performance.now()
      const x = Math.min(1, (t - start) / fadeMs)
      a.volume = target * x
      if (b) b.volume = Math.max(0, b.volume * (1 - x))
      if (x < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    activeDeck.current = (deck === deckA) ? 'A' : 'B'
    currentTrack.current = url
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
    const target = enabled ? musicVolumeRef.current : 0
    const a = deckA.current, b = deckB.current
    if (a) a.volume = (a.volume > target) ? target : target // snap to target to avoid long animations
    if (b) b.volume = (b.volume > target) ? target : target
  }, [enabled])

  useEffect(() => {
    const a = deckA.current, b = deckB.current
    if (a && activeDeck.current === 'A') a.volume = enabled ? musicVolume : 0
    if (b && activeDeck.current === 'B') b.volume = enabled ? musicVolume : 0
  }, [musicVolume, enabled])

  const value = useMemo(() => ({
    // sfx
    play, volume, setVolume,
    // music
    musicVolume, setMusicVolume, setMusicScene,
    // global
    enabled, toggleEnabled,
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
