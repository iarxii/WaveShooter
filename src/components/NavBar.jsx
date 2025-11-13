import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SfxVolumeControl, GlobalSoundToggle } from '../contexts/SoundContext.jsx'
import { useEnvironment } from '../contexts/EnvironmentContext.tsx'
import { ENV_OPTIONS_ORDERED } from '../environments/environments'

import LOGO from '../assets/Healthcare_Heroes_3d_logo.png'

export default function NavBar({ hidden = false }) {
  const loc = useLocation()
  // Always show the navbar on the landing page regardless of the `hidden` prop
  if (hidden && loc.pathname !== '/') return null
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
    <div className="navbar" style={{position:'fixed',top:0,left:0,right:0,display:'flex',gap:12,alignItems:'center',padding:'8px 12px',background:'rgba(0, 85, 64, 0.6)',backdropFilter:'blur(4px)',zIndex:10}}>
      <div style={{height:'60px'}}>
        <img src={LOGO} alt="Logo" style={{height:'100%',width:'auto',objectFit:'contain'}} />
      </div>
      <Link to="/" style={{color: isActive('/')?'#fff':'#ccc'}}>Home</Link>
      <Link to="/modes" style={{color: isActive('/modes')?'#fff':'#ccc'}}>Game</Link>
      <Link to="/characters" style={{color: isActive('/characters')?'#fff':'#ccc'}}>Characters</Link>

      {/* Game Tools dropdown */}
      <div className="dropdown">
        <button className="dropdown-trigger">Game Tools ▾</button>
        <div className="dropdown-menu">
          <Link to="/hero-tuner" className="dropdown-item">Hero Tuner</Link>
          <Link to="/avatar-tuner" className="dropdown-item">Harzard Agent Tuner</Link>
          <Link to="/randomizer" className="dropdown-item">Model Viewer</Link>
          <Link to="/env-factory" className="dropdown-item">Environment Factory</Link>
          <Link to="/scene-viewer" className="dropdown-item">Scene Viewer</Link>
        </div>
      </div>

      {/* Environments dropdown */}
      <div className="dropdown">
        <button className="dropdown-trigger">Environments ▾</button>
        <div className="dropdown-menu" style={{minWidth:260}}>
          <div className="dropdown-row">
            <label style={{fontSize:12,opacity:0.9, marginRight:6}}>Select</label>
            <select className="themed-select" value={envId} onChange={(e)=>setEnvId(e.target.value)}>
              {options.map(o=> <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div className="dropdown-row" style={{marginTop:6, display:'flex', gap:6, alignItems:'center'}}>
            <button onClick={cycle} className="button" style={{padding:'4px 8px'}}>Cycle</button>
          </div>
          <div className="dropdown-row" style={{marginTop:6}}>
            <label style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12}}>
              <input type="checkbox" checked={perfMode} onChange={e=> setPerfMode(e.target.checked)} /> Perf Mode
            </label>
          </div>
        </div>
      </div>

      <div style={{marginLeft:'auto', display:'flex', alignItems:'center'}}>
        <SfxVolumeControl />
        <GlobalSoundToggle />
      </div>
    </div>
  )
}
