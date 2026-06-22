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

  if (!networkConfig.AUTH_SERVICE_URL) {
    throw new Error(
      `Missing AUTH_SERVICE_URL in configuration for network '${network}' in ${envJsonPath}`,
    );
  }

  if (!networkConfig.METRICS_PROXY_URL) {
    throw new Error(
      `Missing METRICS_PROXY_URL in configuration for network '${network}' in ${envJsonPath}`,
    );
  }

  if (!Array.isArray(networkConfig.ALTERNATIVE_ORIGINS)) {
    throw new Error(
      `Missing ALTERNATIVE_ORIGINS array in configuration for network '${network}' in ${envJsonPath}`,
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
    'import.meta.env.AUTH_SERVICE_URL': `"${networkConfig.AUTH_SERVICE_URL}"`,
    'import.meta.env.METRICS_PROXY_URL': `"${networkConfig.METRICS_PROXY_URL}"`,
  },
  server: {
    port: 4200,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4943',
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
    {
      // Emit the II alternative-origins file per network so a staging build
      // authorizes the staging canister origins and production authorizes
      // production. Served at /.well-known/ii-alternative-origins; II fetches
      // it from the derivationOrigin to authorize the requesting origin.
      name: 'ii-alternative-origins',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: '.well-known/ii-alternative-origins',
          source: JSON.stringify(
            { alternativeOrigins: networkConfig.ALTERNATIVE_ORIGINS },
            null,
            2,
          ),
        });
      },
    },
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
