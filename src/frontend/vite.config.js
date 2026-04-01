import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import viteCompressionPlugin from 'vite-plugin-compression';

dotenv.config({ path: '../../.env' });

let networkConfig = {};

try {
  const envJsonPath = path.resolve(__dirname, 'env.json');
  const parsed = JSON.parse(fs.readFileSync(envJsonPath, 'utf8'));

  let network = process.env.DFX_NETWORK || 'local';
  if (network === 'ic') {
    network = 'production';
  }

  networkConfig = parsed[network];
  if (!networkConfig) {
    throw new Error(
      `Missing configuration for network '${network}' in ${envJsonPath}`,
    );
  }

  if (!networkConfig.OFFCHAIN_SERVICE_URL) {
    throw new Error(
      `Missing OFFCHAIN_SERVICE_URL in configuration for network '${network}' in ${envJsonPath}`,
    );
  }
} catch (e) {
  console.error(e);
  throw e;
}

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
  define: {
    'import.meta.env.OFFCHAIN_SERVICE_URL': `"${networkConfig.OFFCHAIN_SERVICE_URL}"`,
  },
  server: {
    port: 4200,
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
