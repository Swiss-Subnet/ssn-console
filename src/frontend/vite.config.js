import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';
import path from 'node:path';
import viteCompressionPlugin from 'vite-plugin-compression';

dotenv.config({ path: '../../.env' });

export default defineConfig({
  build: {
    emptyOutDir: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
    environment('all', { prefix: 'CANISTER_', defineOn: 'import.meta.env' }),
    environment('all', { prefix: 'DFX_', defineOn: 'import.meta.env' }),
    viteCompressionPlugin({
      algorithm: 'gzip',
      ext: '.gz',
      deleteOriginFile: false,
      threshold: 0,
    }),
    viteCompressionPlugin({
      algorithm: 'brotliCompress',
      ext: '.br',
      deleteOriginFile: false,
      threshold: 0,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
