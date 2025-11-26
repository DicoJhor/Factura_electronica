import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',                    // ← ESTA LÍNEA ES LA QUE TE FALTABA
  build: {
    outDir: 'dist'
  }
})