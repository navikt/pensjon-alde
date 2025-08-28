import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { reactRouterDevTools } from 'react-router-devtools'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    port: 3001
  },
  plugins: [
    reactRouterDevTools(),
    reactRouter(),
    tsconfigPaths(),
    tailwindcss()
  ],
  test: {
    exclude: [
      '**/node_modules/**',
      '**/playwright/**',
      '**/tests-examples/**',
      '**/build/**',
      '**/dist/**'
    ]
  }
})
