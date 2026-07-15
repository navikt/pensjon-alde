import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      setupFiles: ['./app/test/setup-env.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['app/**/*.{ts,tsx}'],
        exclude: ['app/**/*.test.{ts,tsx}', 'app/**/*.stories.tsx', 'app/mocks/**', 'app/test/**', 'app/**/+types/**'],
      },
    },
  }),
)
