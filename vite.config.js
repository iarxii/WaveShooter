import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: [
    '**/*.gltf',
    '**/*.glb',
    '**/*.fbx',
    '**/*.hdr',
  ],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/chunks/[name]-[hash].js',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react/')) return 'vendor-react'
            if (id.includes('react-dom')) return 'vendor-react'
            if (id.includes('three')) return 'vendor-three'
            if (id.includes('@react-three/fiber')) return 'vendor-r3f'
            if (id.includes('@react-three/drei')) return 'vendor-drei'
            if (id.includes('shader-park-core')) return 'vendor-shaderpark'
          }
          // Page-level splits (keep only a few heavy screens)
          if (id.includes('/src/pages/CharacterViewer')) return 'page-character-viewer'
          if (id.includes('/src/pages/Game')) return 'page-game'
          if (id.includes('/src/pages/HeroTuner')) return 'page-hero-tuner'
          return undefined
        },
      },
    },
  },
})
