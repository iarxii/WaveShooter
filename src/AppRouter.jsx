import React from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import GamePage from './pages/Game.jsx'
import CharacterViewer from './pages/CharacterViewer.jsx'
import AvatarTuner from './pages/AvatarTuner.tsx'
import PathogenDemo from './pages/PathogenDemo.jsx'
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
  return (
    <BrowserRouter>
      <HistoryProvider>
        <GameProvider>
          <EffectsProvider>
          <SoundProvider>
            <UISoundLayer />
            <RouteMusicSync />
            <NavBar />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/game" element={<GamePage />} />
              <Route path="/characters" element={<CharacterViewer />} />
              <Route path="/pathogen-demo" element={<PathogenDemo />} />
              <Route path="/avatar-tuner" element={<AvatarTuner />} />
              <Route path="*" element={<Landing />} />
            </Routes>
          </SoundProvider>
          </EffectsProvider>
        </GameProvider>
      </HistoryProvider>
    </BrowserRouter>
  )
}
