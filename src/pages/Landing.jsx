import React from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../contexts/GameContext.jsx'

function formatHMS(ms){
  const totalSec = Math.max(0, Math.floor((ms||0)/1000))
  const h = Math.floor(totalSec/3600)
  const m = Math.floor((totalSec%3600)/60)
  const s = totalSec%60
  const mm = m.toString().padStart(2,'0')
  const ss = s.toString().padStart(2,'0')
  return `${h}:${mm}:${ss}`
}

export default function Landing(){
  const { bestScore, bestWave, totalPlayTimeMs } = useGame()
  return (
    <div style={{paddingTop:56}}>
      <div style={{maxWidth:900,margin:'32px auto',padding:'16px'}}>
        <h1>Healthcare Heroes — Hazard Wave Battle</h1>
        <p>A fast top-down wave shooter with a data-driven leveling system and educational enemy roster.</p>
        <div style={{display:'flex',gap:24,flexWrap:'wrap',margin:'16px 0'}}>
          <div><strong>Best Score:</strong> {bestScore}</div>
          <div><strong>Best Wave/Level:</strong> {bestWave}</div>
          <div><strong>Total Play Time:</strong> {formatHMS(totalPlayTimeMs)}</div>
        </div>
        <div style={{display:'flex',gap:12}}>
          <Link to="/game" className="button">Start Game</Link>
          <Link to="/characters" className="button">Character Viewer</Link>
        </div>
        <div style={{marginTop:24}}>
          <h3>What’s New</h3>
          <ul>
            <li>Leveling system with unlocks, budgets, and caps.</li>
            <li>Performance Mode toggle for low-spec devices.</li>
            <li>Boss schedule HUD and improved spawns.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
