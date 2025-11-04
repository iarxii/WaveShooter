import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import GamePage from './pages/Game.jsx'
import CharacterViewer from './pages/CharacterViewer.jsx'
import { GameProvider } from './contexts/GameContext.jsx'
import { HistoryProvider } from './contexts/HistoryContext.jsx'
import NavBar from './components/NavBar.jsx'
import { EffectsProvider } from './effects/EffectsContext.jsx'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <HistoryProvider>
        <GameProvider>
          <EffectsProvider>
          <NavBar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/characters" element={<CharacterViewer />} />
            <Route path="*" element={<Landing />} />
          </Routes>
          </EffectsProvider>
        </GameProvider>
      </HistoryProvider>
    </BrowserRouter>
  )
}
