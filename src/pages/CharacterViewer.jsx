import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ENEMIES, HEROES } from '../data/roster.js'

const colorHex = {
  Red: '#ef4444', Orange: '#f97316', Blue: '#3b82f6', 'Dark Blue': '#1e3a8a',
  Gray: '#6b7280', Black: '#111827', Green: '#22c55e', 'Dark Green': '#065f46',
  Cyan: '#06b6d4', 'Dark Cyan': '#155e75', Pink: '#ec4899', 'Dark Pink': '#9d174d',
  Purple: '#a855f7', Yellow: '#f59e0b', Violet: '#7c3aed', White: '#e5e7eb', Brown: '#92400e',
}

export default function CharacterViewer(){
  const [minLevel, setMinLevel] = useState(1)
  const [tier, setTier] = useState('all')

  const filtered = useMemo(()=>{
    return ENEMIES
      .filter(e => e.unlock >= minLevel)
      .filter(e => tier==='all' ? true : e.tier===Number(tier))
      .sort((a,b)=> a.unlock - b.unlock || a.tier - b.tier)
  }, [minLevel, tier])

  return (
    <div style={{paddingTop:56}}>
      <div style={{maxWidth:1000,margin:'24px auto',padding:'16px'}}>
        <h1>Character Viewer</h1>
        <p>Browse heroes and enemies. Enemy unlocks reflect the Leveling System gates and tiers.</p>

        <div style={{display:'flex',gap:16,flexWrap:'wrap',alignItems:'center',margin:'12px 0 20px'}}>
          <label>Min Unlock Level: <input type="number" min={1} max={99} value={minLevel} onChange={e=>setMinLevel(Number(e.target.value)||1)} style={{width:64}} /></label>
          <label>Tier: 
            <select value={tier} onChange={e=>setTier(e.target.value)}>
              <option value="all">All</option>
              <option value="1">Tier 1</option>
              <option value="2">Tier 2</option>
              <option value="3">Tier 3</option>
              <option value="4">Tier 4</option>
              <option value="5">Tier 5</option>
            </select>
          </label>
          <Link to="/game" className="button">Play</Link>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:12}}>
          {filtered.map((e)=> (
            <div key={e.name} style={{border:'1px solid #333',borderRadius:8,padding:12,background:'#1118'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8}}>
                <h3 style={{margin:0}}>{e.name}</h3>
                <span style={{opacity:0.8}}>Tier {e.tier}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginTop:6,fontSize:13,opacity:0.9}}>
                <span>Unlock: {e.unlock}</span>
                <span>Shape: {e.shape}</span>
                <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
                  Color: <span style={{width:14,height:14,display:'inline-block',borderRadius:4,background: colorHex[e.color] || '#888', border:'1px solid #0003'}} title={e.color} />
                </span>
              </div>
              <div style={{marginTop:6,fontSize:12,opacity:0.9}}>{e.type}</div>
              {e.scientificName && (
                <div style={{marginTop:4,fontSize:12,opacity:0.9}}><strong><em>{e.scientificName}</em></strong></div>
              )}
              {e.realWorldEffect && (
                <div style={{marginTop:6,fontSize:13}}><strong>Real-world:</strong> {e.realWorldEffect}</div>
              )}
              {e.gameplayEffect && (
                <div style={{marginTop:4,fontSize:13}}><strong>Gameplay:</strong> {e.gameplayEffect}</div>
              )}
              {e.stats && (
                <div style={{marginTop:6,fontSize:12,opacity:0.95}}>
                  <span>HP: {e.stats.health}</span>
                  <span style={{marginLeft:10}}>Speed: {e.stats.speed}</span>
                  <span style={{marginLeft:10}}>Damage: {e.stats.damage}</span>
                  {e.maxConcurrent!=null && <span style={{marginLeft:10}}>Max: {e.maxConcurrent}</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        <h2 style={{marginTop:28}}>Heroes</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
          {HEROES.map(h => (
            <div key={h.name} style={{border:'1px solid #333',borderRadius:8,padding:12,background:'#1118'}}>
              <h3 style={{marginTop:0}}>{h.name}</h3>
              <div style={{fontSize:14,opacity:0.9}}>{h.role}</div>
              <p style={{marginTop:8,opacity:0.9}}>{h.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
