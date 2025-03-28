import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    silent: true,
    testTimeout: 180000,
  },
  environments: {
    ssr: {
      resolve: {
        conditions: ['typescript'],
      },
    },
  },
})
