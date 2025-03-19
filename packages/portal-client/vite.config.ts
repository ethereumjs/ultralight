  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  import { nodePolyfills } from 'vite-plugin-node-polyfills'
  import polyfillNode from 'rollup-plugin-polyfill-node'
  import tsconfigPaths from 'vite-tsconfig-paths'
  import { builtinModules } from 'module'
  import { resolve } from 'path'
  import tailwindcss from '@tailwindcss/vite'

  // @ts-expect-error process is a Node.js global
  const host = process.env.TAURI_DEV_HOST

  export default defineConfig(async () => ({
    plugins: [
      react(),
      tailwindcss(),
      nodePolyfills({
        include: ['child_process'],
        protocolImports: true,
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
      polyfillNode(),
      tsconfigPaths(),
    ],
    resolve: {
      alias: {
        fs: resolve(__dirname, 'src/utils/polyfills/fsBrowser.ts'),
        child_process: resolve(__dirname, 'src/utils/polyfills/childProcessBrowser.ts'),
        process: resolve(__dirname, 'src/utils/polyfills/processBrowser.ts'),
        'bls-eth-wasm': resolve(__dirname, 'src/utils/polyfills/blsPatch.ts'),
        '@chainsafe/bls-keygen': resolve(__dirname, 'src/utils/polyfills/blsKeyGen.ts'), 
        'node:crypto': resolve(__dirname, 'src/utils/polyfills/localCrypto.ts'),
        crypto: resolve(__dirname, 'src/utils/polyfills/localCrypto.ts'), 
        // 'dgram': resolve(__dirname, 'src/utils/polyfills/dgram.ts'),
        // 'node:dgram': resolve(__dirname, 'src/utils/polyfills/dgram.ts'),
      },
    },
    define: {
      global: 'globalThis',
      'process.env': '{}',
      'process.browser': 'true',
      __dirname: JSON.stringify(process.cwd()),
      __filename: JSON.stringify(import.meta.url),
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2022',
        // preserveEntrySignatures: 'strict',
        define: {
          global: 'globalThis',
        },
      },
      exclude: ['@chainsafe/bls', 'herumi-*'],
      include: ['bls-eth-wasm'],
      // include: ['@chainsafe/bls/switchable', 'bls-eth-wasm'],
    },
    assetsInclude: ['**/*.wasm'],
    build: {
      target: 'es2022',
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input:{
          main: resolve(__dirname, 'index.html'),
        },
        external: [
          ...builtinModules, 
          /^node:.*/,
          'fs', 
          'child_process',
          // 'dgram',
        ], // Automatically exclude built-in Node.js modules

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
      host: host || false,
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
