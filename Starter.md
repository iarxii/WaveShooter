Done — I created a preview canvas named "Wave Shooter - React + Vite + Three" with a complete starter scaffold (project instructions, package.json example, src/main.jsx, src/styles.css, and a single-file src/App.jsx React + @react-three/fiber game).

What I included

Top-down wave shooter gameplay: player rectangle, orb minions, hexagon minion-bosses, and triangle bosses every 3 waves.

Enemy chasing AI, wave spawner, pickups (health + power-ups), and simple HUD with restart.

WASD movement, grid ground, and minimal physics/interaction.

Clear comments and notes in the file explaining where to extend (bullets, pooling, sounds, particles, etc.)

How to run it locally

Create the Vite React project:

npm create vite@latest wave-shooter -- --template react

cd wave-shooter

Install deps:

npm install three @react-three/fiber @react-three/drei

Replace src/main.jsx, src/App.jsx, and add src/styles.css with the files from the canvas document.

npm run dev and open the provided URL.

Next steps I can help with (pick any):

Add shooting (mouse click to fire projectiles), with object pooling for performance.

Improve enemy behavior (pathfinding, formations, ranged enemies).

Add animated power-ups and timed effects (speed boost, shield).

Add persistent high-score storage (localStorage or backend).

Polish visuals: particle systems, textures, post-processing (bloom), sound effects.

Convert to mobile-friendly controls and UI.

Tell me which of the above you'd like next (or say “add shooting” and I’ll extend the project to include bullets, collision, and pooling).