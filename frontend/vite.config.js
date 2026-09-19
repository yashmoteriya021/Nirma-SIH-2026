import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// Backend port defaults to 5000 (backend/src/config/env.js). On macOS port 5000
// is often taken by AirPlay Receiver — run the backend with PORT=5001 and set
// VITE_API_PROXY_TARGET=http://localhost:5001 in frontend/.env.local.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      tailwindcss(),
      react(),
    ],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:5001',
          changeOrigin: true,
        },
      },
    },
  }
})
