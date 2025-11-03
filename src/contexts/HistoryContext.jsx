/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const HistoryContext = createContext(null)

const STORAGE_KEY = 'runsHistory'

export function HistoryProvider({ children }) {
  const [runs, setRuns] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setRuns(JSON.parse(raw))
    } catch { /* ignore read errors */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(runs)) } catch { /* ignore write errors */ }
  }, [runs])

  const addRun = (run) => {
    setRuns(prev => {
      const next = [...prev, { id: Date.now() + Math.random(), ...run }]
      return next.slice(-50) // keep last 50
    })
  }

  const clearHistory = () => setRuns([])

  const value = useMemo(() => ({ runs, addRun, clearHistory }), [runs])

  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  )
}

export function useHistoryLog() {
  const ctx = useContext(HistoryContext)
  if (!ctx) throw new Error('useHistoryLog must be used within HistoryProvider')
  return ctx
}
