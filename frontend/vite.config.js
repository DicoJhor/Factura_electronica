import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    minify: false,
    cssMinify: false,
    reportCompressedSize: false,
    sourcemap: true,                  // ← esto hace que el error aparezca claro
    rollupOptions: {
      onwarn(warning, handler) {
        // Muestra TODOS los warnings (normalmente Vite los esconde)
        console.log('VITE WARNING →', warning.message)
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
        handler(warning)
      }
    }
  }
})