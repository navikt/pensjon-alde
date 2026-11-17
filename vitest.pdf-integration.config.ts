import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['pdf/**/*.integration.test.ts'],
    globalSetup: ['./pdf/integration/global-setup.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
})
