import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SfxVolumeControl, GlobalSoundToggle } from '../contexts/SoundContext.jsx'

export default function NavBar() {
  const loc = useLocation()
  const isActive = (p) => loc.pathname === p
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,display:'flex',gap:12,alignItems:'center',padding:'8px 12px',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',zIndex:10}}>
      <div style={{fontWeight:700}}>Healthcare Heroes</div>
      <Link to="/" style={{color: isActive('/')?'#fff':'#ccc'}}>Landing</Link>
      <Link to="/game" style={{color: isActive('/game')?'#fff':'#ccc'}}>Game</Link>
      <Link to="/characters" style={{color: isActive('/characters')?'#fff':'#ccc'}}>Characters</Link>
      <div style={{marginLeft:'auto', display:'flex', alignItems:'center'}}>
        <SfxVolumeControl />
        <GlobalSoundToggle />
      </div>
    </div>
  )
}
