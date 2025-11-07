import React from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import GameMode from './pages/GameMode.jsx'
import GamePage from './pages/Game.jsx'
import CharacterViewer from './pages/CharacterViewer.jsx'
import AvatarTuner from './pages/AvatarTuner.tsx'
import HeroTuner from './pages/HeroTuner.tsx'
import PathogenDemo from './pages/PathogenDemo.jsx'
import RandomizerMode from './pages/RandomizerMode.jsx'
import { GameProvider } from './contexts/GameContext.jsx'
import { HistoryProvider } from './contexts/HistoryContext.jsx'
import NavBar from './components/NavBar.jsx'
import { EffectsProvider } from './effects/EffectsContext.jsx'
import { SoundProvider, UISoundLayer, useSound } from './contexts/SoundContext.jsx'

function RouteMusicSync() {
  const loc = useLocation()
  const sound = useSound()
  React.useEffect(() => {
    const p = loc.pathname
    if (p === '/game') sound.setMusicScene?.('game')
    else if (p === '/characters') sound.setMusicScene?.('characters')
    else sound.setMusicScene?.('landing')
  }, [loc.pathname])
  return null
}

export default function AppRouter() {
  const [navVisible, setNavVisible] = React.useState(true)
  const loc = window.location // useLocation inside component below for music sync
  return (
    <BrowserRouter>
      <HistoryProvider>
        <GameProvider>
          <EffectsProvider>
          <SoundProvider>
            <UISoundLayer />
            <RouteMusicSync />
            {/* Hide nav during gameplay; default hidden on Randomizer (toggleable from the page) */}
            <NavBar hidden={window.location?.pathname === '/game' || (window.location?.pathname === '/randomizer' && !navVisible)} />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/game" element={<GamePage />} />
              <Route path="/modes" element={<GameMode />} />
              <Route path="/characters" element={<CharacterViewer />} />
              <Route path="/pathogen-demo" element={<PathogenDemo />} />
              <Route path="/avatar-tuner" element={<AvatarTuner />} />
              <Route path="/hero-tuner" element={<HeroTuner />} />
              <Route path="/randomizer" element={<RandomizerMode navVisible={navVisible} setNavVisible={setNavVisible} />} />
              <Route path="*" element={<Landing />} />
            </Routes>
          </SoundProvider>
          </EffectsProvider>
        </GameProvider>
      </HistoryProvider>
    </BrowserRouter>
  )
}
