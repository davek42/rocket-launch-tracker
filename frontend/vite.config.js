import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT || '5176'),
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      }
    }
  }
});
