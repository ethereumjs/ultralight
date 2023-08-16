import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    silent: true,
    exclude: ['test/integration', 'test/client/provider.spec.ts', 'test/subprotocols/history/types.spec.ts'],
    testTimeout: 180000,
  },
})
