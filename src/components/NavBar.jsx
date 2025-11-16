import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SoundDropdown } from '../contexts/SoundContext.jsx'
import { useEnvironment } from '../contexts/EnvironmentContext.tsx'
import { ENV_OPTIONS_ORDERED } from '../environments/environments'

import LOGO from '../assets/Healthcare_Heroes_3d_logo.png'

export default function NavBar({ hidden = false, navVisible, setNavVisible }) {
  const loc = useLocation()
  // global UI state for shader and world controls (persisted)
  const { envId, setEnvId, cycle } = useEnvironment()
  const [shader, setShader] = React.useState(() => { try { return localStorage.getItem('env_shader') || 'veins' } catch { return 'veins' } })
  const [proceduralSky, setProceduralSky] = React.useState(() => { try { return localStorage.getItem('use_procedural_sky') === '1' } catch { return false } })
  const [worldInfection, setWorldInfection] = React.useState(() => { try { return parseFloat(localStorage.getItem('world_infection') || '0') } catch { return 0 } })
  const [worldSunY, setWorldSunY] = React.useState(() => { try { return parseFloat(localStorage.getItem('world_sunY') || '0.5') } catch { return 0.5 } })
  // Perf mode state (hooks must be declared before any early returns)
  const [perfMode, setPerfMode] = React.useState(() => {
    try { return localStorage.getItem('perfMode') === '1' } catch { return false }
  })
  React.useEffect(()=>{ try { localStorage.setItem('perfMode', perfMode ? '1':'0') } catch {} }, [perfMode])
  // Broadcast perfMode so environment system can react (e.g., disable env map)
  React.useEffect(()=>{ window.dispatchEvent(new CustomEvent('perfModeChange', { detail: { perfMode } })) }, [perfMode])

  // Always show the navbar on the landing page regardless of the `hidden` prop
  // If hidden, we still want a compact toggle on 3D/game-tool pages so user can unhide the bar.
  // Do NOT show the toggle on Landing (`/`) or Character viewer (`/characters`).
  const NO_TOGGLE_PATHS = ['/', '/characters']
  const allowTogglePaths = [
    '/game',
    '/randomizer',
    '/hero-tuner',
    '/avatar-tuner',
    '/env-factory',
    '/scene-viewer',
    '/pathogen-demo',
    '/special-boss-viewer',
    '/modes',
  ]
  // Determine rendering mode instead of early-returning (avoids hook count changes)
  const showCompactToggle = hidden && allowTogglePaths.includes(loc.pathname) && typeof setNavVisible === 'function' && !NO_TOGGLE_PATHS.includes(loc.pathname)
  const hideCompletely = hidden && NO_TOGGLE_PATHS.includes(loc.pathname)
  const isActive = (p) => loc.pathname === p

  // Persist and broadcast shader/global world params
  React.useEffect(() => { try { localStorage.setItem('env_shader', shader) } catch {} ; window.dispatchEvent(new CustomEvent('env_shader_changed', { detail: shader })) }, [shader])
  React.useEffect(() => { try { localStorage.setItem('use_procedural_sky', proceduralSky ? '1' : '0') } catch {} ; window.dispatchEvent(new CustomEvent('use_procedural_sky_changed', { detail: proceduralSky })) }, [proceduralSky])
  React.useEffect(() => { try { localStorage.setItem('world_infection', String(worldInfection)) } catch {} ; window.dispatchEvent(new CustomEvent('env_infection_changed', { detail: worldInfection })) }, [worldInfection])
  React.useEffect(() => { try { localStorage.setItem('world_sunY', String(worldSunY)) } catch {} ; window.dispatchEvent(new CustomEvent('env_sun_changed', { detail: worldSunY })) }, [worldSunY])
  const options = ENV_OPTIONS_ORDERED
  if (hideCompletely) return <></>
  if (showCompactToggle) {
    return (
      <div style={{ position: 'fixed', top: 8, right: 12, zIndex: 1010 }}>
        <button
          onClick={() => setNavVisible(v => !v)}
          title={navVisible ? 'Hide Menu' : 'Show Menu'}
          className="button"
          style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <span aria-hidden style={{ fontSize: 14 }}>{navVisible ? '✕' : '☰'}</span>
        </button>
      </div>
    )
  }
  return (
    <div className="navbar" style={{position:'sticky',top:0,left:0,right:0,display:'flex',gap:12,alignItems:'center',padding:'8px 12px',background:'rgba(0, 85, 64, 0.6)',backdropFilter:'blur(4px)',zIndex:1010}}>
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

      {/* Shader selection (global) */}
      <div className="dropdown">
        <button className="dropdown-trigger">Shaders ▾</button>
        <div className="dropdown-menu" style={{minWidth:220}}>
          <div className="dropdown-row" style={{display:'flex',alignItems:'center',gap:8}}>
            <label style={{fontSize:12,opacity:0.9}}>Shader</label>
            <select className="themed-select" value={shader} onChange={(e)=> setShader(e.target.value)}>
              <option value='veins'>Veins (Three.js)</option>
              <option value='infection'>Infection Stain (Three.js)</option>
              <option value='grid'>Containment Grid (Three.js)</option>
              <option value='bioelectric'>Bioelectric Veins (Three.js)</option>
            </select>
          </div>
          <hr style={{margin:'8px 0',opacity:0.3}} />
          <div style={{padding:'6px 8px'}}>
            <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <input type='checkbox' checked={proceduralSky} onChange={(e)=> setProceduralSky(e.target.checked)} /> Use Procedural Sky
            </label>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <label style={{fontSize:12}}>Infection Influence: <span style={{fontWeight:600}}>{worldInfection.toFixed(2)}</span></label>
              <input type='range' min='0' max='1' step='0.01' value={String(worldInfection)} onChange={(e)=> setWorldInfection(parseFloat(e.target.value))} />
              <label style={{fontSize:12}}>Sun Elevation: <span style={{fontWeight:600}}>{worldSunY.toFixed(2)}</span></label>
              <input type='range' min='-1' max='1' step='0.01' value={String(worldSunY)} onChange={(e)=> setWorldSunY(parseFloat(e.target.value))} />
            </div>
          </div>
        </div>
      </div>

      <div style={{marginLeft:'auto', display:'flex', alignItems:'center'}}>
        <SoundDropdown />
      </div>

      {/* compact Nav toggle button (shows only when parent passed a setter) */}
      {typeof setNavVisible === 'function' && (
        <button
          onClick={() => setNavVisible(v => !v)}
          title={navVisible ? 'Hide Menu' : 'Show Menu'}
          className="button"
          style={{ marginLeft: 12, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          {/* simple hamburger / close icon */}
          <span aria-hidden style={{ fontSize: 14 }}>{navVisible ? '✕' : '☰'}</span>
        </button>
      )}
    </div>
  )
}
