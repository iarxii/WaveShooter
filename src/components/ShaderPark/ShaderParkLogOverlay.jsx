import React, { useEffect, useState } from 'react'

function copyText(s){ try { navigator.clipboard?.writeText(s); return true } catch { return false } }

export default function ShaderParkLogOverlay() {
  const [logs, setLogs] = useState(() => {
    try { return (window.__SP_LOGS || []).slice().reverse() } catch { return [] }
  })
  const [showInfo, setShowInfo] = useState(true)

  useEffect(() => {
    function onLog(e) {
      const entry = (e && e.detail) || { type: 'warn', msg: String(e && e.detail) }
      setLogs(l => [entry, ...l].slice(0, 200))
    }
    window.addEventListener('shaderpark-log', onLog)
    return () => window.removeEventListener('shaderpark-log', onLog)
  }, [])

  function clear() { try { window.__SP_LOGS = []; setLogs([]) } catch { setLogs([]) } }

  function setForce(mode){ try { if (typeof window !== 'undefined') { if(mode) window.__SP_FORCE_MODE = mode; else delete window.__SP_FORCE_MODE } setLogs(l=>[{type:'info',msg:'force-mode:'+String(mode||'none'),ts:new Date().toISOString()}, ...l].slice(0,200)) } catch {} }

  const shown = logs.filter(l => (showInfo ? true : l.type !== 'info'))
  if (!shown || shown.length === 0) return null

  return (
    <div style={{position:'absolute', right:8, top:8, zIndex:9999, background:'rgba(0,0,0,0.75)', color:'#fff', padding:10, borderRadius:8, maxWidth:640, fontSize:12, lineHeight:'14px', fontFamily:'monospace'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
        <div style={{fontWeight:700}}>ShaderPark Logs</div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <label style={{fontSize:11, opacity:0.8}}>Show infos<input type='checkbox' checked={showInfo} onChange={e=>setShowInfo(e.target.checked)} style={{marginLeft:6}} /></label>
          <button onClick={clear} style={{background:'#333', color:'#fff', border:'none', padding:'4px 8px', borderRadius:4, cursor:'pointer'}}>Clear</button>
        </div>
      </div>

      <div style={{display:'flex', gap:8, marginBottom:8}}>
        <button onClick={()=>setForce('fallback')} style={{padding:'6px 8px', borderRadius:6, border:'none', cursor:'pointer', background:'#662222', color:'#fff'}}>Force fallback</button>
        <button onClick={()=>setForce(null)} style={{padding:'6px 8px', borderRadius:6, border:'none', cursor:'pointer', background:'#226622', color:'#fff'}}>Allow ShaderPark</button>
        <div style={{alignSelf:'center', opacity:0.8,fontSize:12}}>Current: {(typeof window !== 'undefined' && window.__SP_FORCE_MODE) || 'none'}</div>
      </div>

      <div style={{maxHeight:320, overflow:'auto', paddingRight:6}}>
        {shown.map((l,i)=> (
          <div key={l.id || i} style={{padding:'6px', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', gap:8}}>
            <div style={{minWidth:56, color: l.type==='info' ? '#8fd3ff' : '#ffb38a', fontWeight:700}}>[{l.type.toUpperCase()}]</div>
            <div style={{flex:1}}>
              <div style={{fontSize:12, color:'#fff'}}>{l.msg}</div>
              {l.meta && (
                <pre style={{whiteSpace:'pre-wrap', fontSize:11, marginTop:6, color:'#ddd', background:'rgba(0,0,0,0.25)', padding:6, borderRadius:4}}>{typeof l.meta === 'string' ? l.meta : JSON.stringify(l.meta, null, 2)}</pre>
              )}
              <div style={{marginTop:6, display:'flex', gap:8}}>
                <button onClick={()=>{ copyText(JSON.stringify(l)); }} style={{padding:'4px 8px', borderRadius:4, border:'none', cursor:'pointer'}}>Copy</button>
                <button onClick={()=>{ copyText(l.msg) }} style={{padding:'4px 8px', borderRadius:4, border:'none', cursor:'pointer'}}>Copy Msg</button>
              </div>
            </div>
            <div style={{minWidth:90, textAlign:'right', opacity:0.7, fontSize:11}}>{new Date(l.ts).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
