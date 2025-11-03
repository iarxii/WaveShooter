import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

// Lightweight data adapters from docs. In a future pass, move to a shared data file.
// For now, we hardcode a concise roster reflecting Updated_Enemy_List.md and Hero_List.md.
const ENEMIES = [
  { name: 'Virus Swarm', tier: 1, unlock: 1, role: 'basic', notes: 'Common minion; cheap budget cost.' },
  { name: 'Bacteria Runner', tier: 1, unlock: 1, role: 'basic', notes: 'Fast melee.' },
  { name: 'Contaminant Blob', tier: 1, unlock: 2, role: 'basic', notes: 'Slow tank.' },
  { name: 'Toxin Spitter', tier: 2, unlock: 3, role: 'ranged', notes: 'Ranged attacker.' },
  { name: 'Mutant Leaper', tier: 2, unlock: 4, role: 'assassin', notes: 'Gap closer.' },
  { name: 'Hazmat Brute', tier: 2, unlock: 5, role: 'bruiser', notes: 'Armored.' },
  { name: 'Pathogen Elite', tier: 3, unlock: 7, role: 'elite', notes: 'High damage.' },
  { name: 'Bio-Engineered Tank', tier: 3, unlock: 8, role: 'tank', notes: 'Very high HP.' },
  { name: 'Airborne Spreader', tier: 3, unlock: 9, role: 'ranged', notes: 'Area denial.' },
  { name: 'Outbreak Captain', tier: 4, unlock: 11, role: 'boss-minion', notes: 'Mini-boss lieutenant.' },
  { name: 'Quarantine Breaker', tier: 4, unlock: 12, role: 'breaker', notes: 'Shield breaker.' },
  { name: 'Super Pathogen', tier: 4, unlock: 13, role: 'elite', notes: 'Deadly.' },
  { name: 'Pandemic Herald', tier: 5, unlock: 15, role: 'boss', notes: 'Boss class.' },
  { name: 'Omega Carrier', tier: 5, unlock: 17, role: 'boss', notes: 'Boss class.' },
  { name: 'Patient Zero', tier: 5, unlock: 19, role: 'boss', notes: 'Boss class.' },
]

const HEROES = [
  { name: 'Nurse', role: 'support', notes: 'Heals over time.' },
  { name: 'Doctor', role: 'balanced', notes: 'Generalist with steady DPS.' },
  { name: 'Epidemiologist', role: 'controller', notes: 'Slows and debuffs.' },
  { name: 'Paramedic', role: 'mobile', notes: 'Dashes and rescues.' },
]

export default function CharacterViewer(){
  const [minLevel, setMinLevel] = useState(1)
  const [tier, setTier] = useState('all')

  const filtered = useMemo(()=>{
    return ENEMIES.filter(e => e.unlock <= 1000) // keep all, then filter below
      .filter(e => e.unlock <= 1000 && e.unlock >= 1)
      .filter(e => e.unlock <= 1000)
      .filter(e => e.unlock <= 1000 && e.unlock >= minLevel)
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

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12}}>
          {filtered.map((e)=> (
            <div key={e.name} style={{border:'1px solid #333',borderRadius:8,padding:12,background:'#1118'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                <h3 style={{margin:0}}>{e.name}</h3>
                <span style={{opacity:0.8}}>Tier {e.tier}</span>
              </div>
              <div style={{fontSize:13,opacity:0.9}}>Unlock Level: {e.unlock}</div>
              <div style={{marginTop:6,fontSize:14}}>{e.role}</div>
              <p style={{marginTop:8,opacity:0.9}}>{e.notes}</p>
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
