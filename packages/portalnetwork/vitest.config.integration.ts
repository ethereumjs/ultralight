import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    silent: true,
    // TODO: Fix this test so we can run it again
    exclude: ['test/integration/stateGenesis.spec.ts'],
    testTimeout: 180000,
  },
})
