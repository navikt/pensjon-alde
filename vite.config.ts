import { reactRouter } from '@react-router/dev/vite'
import { reactRouterDevTools } from 'react-router-devtools'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const isStorybook = !!process.env.STORYBOOK

export default defineConfig({
  server: {
    port: 3001,
  },
  plugins: [
    ...(!isStorybook ? [reactRouterDevTools(), reactRouter()] : []),
    tsconfigPaths(),
  ],
})
