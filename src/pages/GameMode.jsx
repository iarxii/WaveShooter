import React from 'react'
import { assetUrl } from '../utils/assetPaths.ts'
import { Link, useNavigate } from 'react-router-dom'

// Corrected path: Dr Dokta avatar lives directly under character_imgs/Dr_Dokta
const CAMPAIGN_IMG = assetUrl('character_imgs/Hero/heroes_group.jpg')
const WAVE_IMG = assetUrl('character_imgs/Hero/Designer (4).png')

export default function GameMode(){
  const nav = useNavigate()
  return (
    <div style={{minHeight:'100vh', background: 'linear-gradient(135deg,#0b1220 0%, #12243e 50%, #0b1220 100%)', color:'#e6f0ff'}}>
      <div style={{maxWidth:1040, margin:'0 auto', padding:'32px 16px'}}>
        <h1 style={{marginTop:8}}>Choose Game Mode</h1>
        <p style={{opacity:0.85, maxWidth:800}}>Pick a way to play. Campaign mode will feature curated objectives and special Hazard Agent enemies. Wave Battle is the current arcade mode with randomized enemy spawns and score chasing—soon evolving into a wave-based roguelite.</p>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16, marginTop:16}}>
          <div style={{background:'#0e1a2e', border:'1px solid #2b3b55', borderRadius:12, overflow:'hidden', boxShadow:'0 8px 28px rgba(0,0,0,0.35)'}}>
            <div style={{position:'relative'}}>
              <img src={CAMPAIGN_IMG} alt="Campaign key art" style={{width:'100%', height:500, objectFit:'cover', objectPosition:'top center', filter:'saturate(0.9)'}} />
              <div style={{position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)'}} />
            </div>
            <div style={{padding:'14px 14px 16px'}}>
              <h2 style={{margin:'6px 0'}}>Campaign</h2>
              <p style={{opacity:0.85, margin:'6px 0'}}>Coming soon. Hand-crafted missions with curated objectives and special enemies.</p>
              <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:8}}>
                <Link to="/characters" className="button" style={{background:'#1d3b6b', borderColor:'#2b4f8d'}}>View Hazard Agents</Link>
                <button className="button" disabled style={{opacity:0.65, cursor:'not-allowed'}}>Start (Unavailable)</button>
              </div>
            </div>
          </div>

          <div style={{background:'#0e1a2e', border:'1px solid #2b3b55', borderRadius:12, overflow:'hidden', boxShadow:'0 8px 28px rgba(0,0,0,0.35)'}}>
            <div style={{position:'relative'}}>
              <img src={WAVE_IMG} alt="Wave battle key art" style={{width:'100%', height:500, objectFit:'cover', objectPosition:'top center'}} />
              <div style={{position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)'}} />
            </div>
            <div style={{padding:'14px 14px 16px'}}>
              <h2 style={{margin:'6px 0'}}>Wave Battle</h2>
              <p style={{opacity:0.85, margin:'6px 0'}}>Jump right in. Fight randomized enemy waves and climb the scoreboard. This will grow into a wave-based horde-shooter roguelite.</p>
              <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:8}}>
                <button className="button" onClick={()=> nav('/game')}>Start Wave Battle</button>
                <Link to="/randomizer" className="button" style={{background:'#244b81', borderColor:'#2c5ca0'}}>View models</Link>
              </div>
            </div>
          </div>
        </div>

        <div style={{opacity:0.75, fontSize:12, marginTop:24}}>Tip: Only Dr Dokta currently supports the full animation controller. Other heroes use the existing block controller visuals.</div>
      </div>
    </div>
  )
}
