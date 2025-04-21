import { builtinModules } from 'module'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import tsconfigPaths from 'vite-tsconfig-paths'

// @ts-expect-error process is a Node.js global
const host = process.env.TAURI_DEV_HOST

export default defineConfig(async () => ({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      include: ['crypto', 'buffer', 'events', 'stream', 'os'],
      protocolImports: true,
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './__tests__/test-utils/vitest.setup.ts',
    include: ['__tests__/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      include: ['__tests__/**/*.{ts,tsx}'],
      exclude: ['**/integration/**', '**/e2e/**'],
    },
    testTimeout: 100000,
  },
  resolve: {
    alias: {
      process: resolve(__dirname, 'src/utils/polyfills/processBrowser.ts'),
      'bls-eth-wasm': resolve(__dirname, 'src/utils/polyfills/blsPatch.ts'),
      '@chainsafe/bls-keygen': resolve(__dirname, 'src/utils/polyfills/blsKeyGen.ts'),
      portalnetwork: resolve(__dirname, '../portalnetwork/src/index.ts'),
    },
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
    'process.browser': 'true',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
      // preserveEntrySignatures: 'strict',
      define: {
        global: 'globalThis',
      },
    },
    exclude: ['@chainsafe/bls', 'herumi-*', 'child_process', '@peculiar/webcrypto'],
    include: ['bls-eth-wasm'],
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      external: [
        ...builtinModules.filter((m) => m !== 'crypto' && m !== 'buffer' && m !== 'events'),
        /^node:(?!crypto|buffer|events).*/,
        'vite-plugin-node-polyfills/shims/process',
        'vite-plugin-node-polyfills/shims/buffer',
      ],
    },
    output: {
      manualChunks: {
        vendor: ['buffer', 'process'],
      },
    },
  },
  esbuild: {
    target: 'es2022',
  },
  // Vite options tailored for Tauri development
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host ?? false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'], // Ignore Tauri's Rust code
    },
  },
}))
