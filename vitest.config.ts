import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      setupFiles: ['./app/test/setup-env.ts'],
      include: ['app/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['app/**/*.{ts,tsx}'],
        exclude: ['app/**/*.test.{ts,tsx}', 'app/**/*.stories.tsx', 'app/mocks/**', 'app/test/**', 'app/**/+types/**'],
      },
    },
  }),
)
