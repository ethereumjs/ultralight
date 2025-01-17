import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    silent: true,
    exclude: [
      'test/integration',
      'test/networks/history/portalSpecTests.spec.ts',
      'test/networks/state/content.spec.ts',
      'test/networks/beacon/types.spec.ts',
    ],
    testTimeout: 180000,
    coverage: {
      provider: 'v8',
      enabled: true,
      all: true,
    },
    
  },
})
