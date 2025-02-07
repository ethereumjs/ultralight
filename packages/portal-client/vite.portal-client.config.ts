
import { defineConfig } from 'vite'
import { resolve } from 'path'
import { builtinModules } from 'module'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/services/portalNetwork/client.ts'),
      formats: ['es'],
      fileName: () => 'portal-client.js'
    },
    outDir: 'src-tauri/binaries',
    target: 'node16',
    rollupOptions: {
      external: [
         ...builtinModules,
        'dgram',
        '@chainsafe/enr',
        '@libp2p/crypto',
        '@multiformats/multiaddr',
        'portalnetwork',
        'debug'
      ],
      output: {
        format: 'es',
        inlineDynamicImports: true
      }
    },
    commonjsOptions: {
      ignoreDynamicRequires: true
    }
  },
  resolve: {
    conditions: ['node']
  }
})