import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Use port 5174 as primary; fall back automatically if occupied.
    port: 5174,
    strictPort: false,
    proxy: {
      // Proxy /auth/* and /health requests to the backend.
      // This makes the browser treat them as same-origin, so:
      //   - httpOnly cookies (SameSite=Lax) are sent & received correctly
      //   - No CORS preflight is needed
      //   - credentials: 'include' works as expected
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
