import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    cors: true,
  },
  optimizeDeps: {
    include: ['pixi.js', 'pixi-live2d-display/cubism4'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pixi': ['pixi.js'],
          'live2d': ['pixi-live2d-display/cubism4'],
        },
      },
    },
  },
  assetsInclude: ['**/*.moc3', '**/*.model3.json', '**/*.motion3.json'],
})
