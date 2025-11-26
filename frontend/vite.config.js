import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    // ← Estas 3 líneas salvan el build en Vercel con Vite 7+
    minify: false,           // evita que Terser se cuelgue
    cssMinify: false,        // evita que cssnano se cuelgue
    reportCompressedSize: false   // ← esta es la que mata el build en Vercel
  }
})