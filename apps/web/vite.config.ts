import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: true // Shows detailed error overlay
    }
  },
  // Add this for more verbose logging
  logLevel: 'info'
});
