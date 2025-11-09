import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SfxVolumeControl, GlobalSoundToggle } from '../contexts/SoundContext.jsx'
import { useEnvironment } from '../contexts/EnvironmentContext.tsx'
import { ENV_OPTIONS_ORDERED } from '../environments/environments'

import LOGO from '../assets/Healthcare_Heroes_3d_logo.png'

export default function NavBar({ hidden = false }) {
  if (hidden) return null
  const loc = useLocation()
  const isActive = (p) => loc.pathname === p
  const { envId, setEnvId, cycle } = useEnvironment()
  const [perfMode, setPerfMode] = React.useState(() => {
    try { return localStorage.getItem('perfMode') === '1' } catch { return false }
  })
  React.useEffect(()=>{ try { localStorage.setItem('perfMode', perfMode ? '1':'0') } catch {} }, [perfMode])
  // Broadcast perfMode so environment system can react (e.g., disable env map)
  React.useEffect(()=>{ window.dispatchEvent(new CustomEvent('perfModeChange', { detail: { perfMode } })) }, [perfMode])
  const options = ENV_OPTIONS_ORDERED
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,display:'flex',gap:12,alignItems:'center',padding:'8px 12px',background:'rgba(0, 85, 64, 0.6)',backdropFilter:'blur(4px)',zIndex:10}}>
      <div style={{height:'60px'}}>
        <img src={LOGO} alt="Logo" style={{height:'100%',width:'auto',objectFit:'contain'}} />
      </div>
      <div style={{fontWeight:700}}>Healthcare Heroes</div>
      <Link to="/" style={{color: isActive('/')?'#fff':'#ccc'}}>Landing</Link>
      <Link to="/game" style={{color: isActive('/game')?'#fff':'#ccc'}}>Game</Link>
      <Link to="/characters" style={{color: isActive('/characters')?'#fff':'#ccc'}}>Characters</Link>
      <Link to="/avatar-tuner" style={{color: isActive('/avatar-tuner')?'#fff':'#ccc'}}>Avatar Tuner</Link>
      <Link to="/hero-tuner" style={{color: isActive('/hero-tuner')?'#fff':'#ccc'}}>Hero Tuner</Link>
      <Link to="/randomizer" style={{color: isActive('/randomizer')?'#fff':'#ccc'}}>Randomizer</Link>
      <div style={{display:'flex',alignItems:'center',gap:6,marginLeft:8}}>
        <label style={{fontSize:12,opacity:0.85}}>Env:</label>
        <select value={envId} onChange={(e)=>setEnvId(e.target.value)} style={{background:'rgba(255,255,255,0.15)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',padding:'2px 6px',borderRadius:4}}>
          {options.map(o=> <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <button onClick={cycle} style={{background:'rgba(255,255,255,0.15)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',padding:'2px 8px',borderRadius:4,cursor:'pointer'}}>Cycle</button>
        <label style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:12,marginLeft:8}}>
          <input type="checkbox" checked={perfMode} onChange={e=> setPerfMode(e.target.checked)} /> Perf
        </label>
      </div>
      <div style={{marginLeft:'auto', display:'flex', alignItems:'center'}}>
        <SfxVolumeControl />
        <GlobalSoundToggle />
      </div>
    </div>
  )
}
