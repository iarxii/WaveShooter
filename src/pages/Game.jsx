import React from 'react'
import App from '../App.jsx'

// The Game page renders the existing App (game canvas + HUD).
// Keeping App.jsx as the core game runtime lets us evolve pages without
// rewriting the rendering/loop code right now.
export default function Game(){
  return <App />
}
