import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8888',
      '/wiki': 'http://localhost:8888',
      '/raw': 'http://localhost:8888',
    },
  },
});
