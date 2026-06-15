import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: '0.0.0.0', // Permite conexiones desde otras PCs
    port: 3000,

    proxy: {
      '/api': {
        target: 'http://localhost:5000', // ✅ Cambiado de IP a localhost
        changeOrigin: true,
      },
    },
  },
});