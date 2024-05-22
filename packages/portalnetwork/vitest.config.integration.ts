import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    silent: true,
    exclude: ['test/integration/stateGenesis.spec.ts'],
    testTimeout: 180000,
  },
})
