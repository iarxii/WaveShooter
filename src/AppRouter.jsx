import React from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
const Landing = React.lazy(() => import('./pages/Landing.jsx'))
const GameMode = React.lazy(() => import('./pages/GameMode.jsx'))
const GamePage = React.lazy(() => import('./pages/Game.jsx'))
const SceneViewer = React.lazy(() => import('./pages/SceneViewer.jsx'))
const CharacterViewer = React.lazy(() => import('./pages/CharacterViewer.jsx'))
const AvatarTuner = React.lazy(() => import('./pages/AvatarTuner.tsx'))
const SpecialBossViewer = React.lazy(() => import('./pages/SpecialBossViewer.jsx'))
const HeroTuner = React.lazy(() => import('./pages/HeroTuner.tsx'))
const PathogenDemo = React.lazy(() => import('./pages/PathogenDemo.jsx'))
const RandomizerMode = React.lazy(() => import('./pages/RandomizerMode.jsx'))
const EnvironmentFactoryPage = React.lazy(() => import('./pages/EnvironmentFactory.tsx'))
import { GameProvider } from './contexts/GameContext.jsx'
import { HistoryProvider } from './contexts/HistoryContext.jsx'
import NavBar from './components/NavBar.jsx'
import { EffectsProvider } from './effects/EffectsContext.jsx'
import { SoundProvider, UISoundLayer, useSound } from './contexts/SoundContext.jsx'
import { EnvironmentProvider } from './contexts/EnvironmentContext.tsx'
import { EnvironmentBuilderProvider } from './contexts/EnvironmentBuilderContext'

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
  const initialPath = typeof window !== 'undefined' ? window.location?.pathname : '/'
  const [navVisible, setNavVisible] = React.useState(initialPath === '/game' ? false : true)
  const loc = window.location // useLocation inside component below for music sync
  return (
    <BrowserRouter>
      <HistoryProvider>
        <GameProvider>
          <EffectsProvider>
          <SoundProvider>
          <EnvironmentBuilderProvider>
          <EnvironmentProvider>
            <UISoundLayer />
            <RouteMusicSync />
            {/* Nav visibility: allow in-game toggle; Randomizer also toggleable via page controls */}
            <NavBar
              hidden={
                (window.location?.pathname === '/game' && !navVisible) ||
                (window.location?.pathname === '/randomizer' && !navVisible)
              }
              navVisible={navVisible}
              setNavVisible={setNavVisible}
            />
            <React.Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/game" element={<GamePage navVisible={navVisible} setNavVisible={setNavVisible} />} />
                <Route path="/modes" element={<GameMode />} />
                <Route path="/characters" element={<CharacterViewer />} />
                <Route path="/pathogen-demo" element={<PathogenDemo />} />
                <Route path="/avatar-tuner" element={<AvatarTuner />} />
                <Route path="/special-boss-viewer" element={<SpecialBossViewer />} />
                <Route path="/hero-tuner" element={<HeroTuner />} />
                <Route path="/randomizer" element={<RandomizerMode navVisible={navVisible} setNavVisible={setNavVisible} />} />
                <Route path="/env-factory" element={<EnvironmentFactoryPage />} />
                <Route path="/scene-viewer" element={<SceneViewer />} />
                <Route path="*" element={<Landing />} />
              </Routes>
            </React.Suspense>
          </EnvironmentProvider>
          </EnvironmentBuilderProvider>
          </SoundProvider>
          </EffectsProvider>
        </GameProvider>
      </HistoryProvider>
    </BrowserRouter>
  )
}
