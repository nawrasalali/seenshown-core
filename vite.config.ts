import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Proxy /api/* → local API server during development
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep PixiJS separate — it's large but rarely changes
          'vendor-pixi':  ['pixi.js'],
          // React ecosystem
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // State
          'vendor-state': ['zustand', 'immer'],
          // Supabase
          'vendor-supa':  ['@supabase/supabase-js'],
          // Stripe
          'vendor-stripe': ['@stripe/stripe-js'],
        },
      },
    },
  },

  optimizeDeps: {
    include: ['pixi.js', 'zustand', 'immer'],
  },

  // Ensure JSON files in /public/templates are served correctly
  assetsInclude: ['**/*.json'],
});
