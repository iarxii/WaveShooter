/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const GameContext = createContext(null)

export function GameProvider({ children }) {
  const [bestScore, setBestScore] = useState(0)
  const [bestWave, setBestWave] = useState(0)
  const [performanceMode, setPerformanceMode] = useState(false)
  const [totalPlayTimeMs, setTotalPlayTimeMs] = useState(0)

  // Load initial from localStorage (kept in sync by the Game)
  useEffect(() => {
    try {
      const bs = parseInt(localStorage.getItem('bestScore') || '0', 10)
      const bw = parseInt(localStorage.getItem('bestWave') || '0', 10)
      const pm = localStorage.getItem('perfMode')
      const tp = parseInt(localStorage.getItem('totalPlayTimeMs') || '0', 10)
      if (!Number.isNaN(bs)) setBestScore(bs)
      if (!Number.isNaN(bw)) setBestWave(bw)
      if (!Number.isNaN(tp)) setTotalPlayTimeMs(tp)
      setPerformanceMode(pm === '1' || pm === 'true')
    } catch { /* ignore read errors */ }
  }, [])

  // Passive poll to reflect updates from the game without tight coupling
  useEffect(() => {
    const int = setInterval(() => {
      try {
        const bs = parseInt(localStorage.getItem('bestScore') || '0', 10)
        const bw = parseInt(localStorage.getItem('bestWave') || '0', 10)
        const tp = parseInt(localStorage.getItem('totalPlayTimeMs') || '0', 10)
        if (!Number.isNaN(bs)) setBestScore(bs)
        if (!Number.isNaN(bw)) setBestWave(bw)
        if (!Number.isNaN(tp)) setTotalPlayTimeMs(tp)
      } catch { /* ignore read errors */ }
    }, 1000)
    return () => clearInterval(int)
  }, [])

  const value = useMemo(() => ({
    bestScore, bestWave, performanceMode, setPerformanceMode, totalPlayTimeMs,
  }), [bestScore, bestWave, performanceMode, totalPlayTimeMs])

  return (
    <GameContext.Provider value={value}>{children}</GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
