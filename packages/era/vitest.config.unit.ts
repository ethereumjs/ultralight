import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    silent: true,
    testTimeout: 180000,
  },
})
