import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    silent: true,
    exclude: ['test/integration'],
    testTimeout: 180000,
    coverage: {
      provider: 'v8',
      enabled: true,
      all: true,
    },
    
  },
})
