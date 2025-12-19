import compression from 'compression'
import express from 'express'
import { startUnleash } from './app/utils/unleash.server.ts'
import {createRequestHandler} from '@react-router/express'
import type { ServerBuild } from 'react-router'
import type { ViteDevServer } from 'vite'

const isDev = process.env.NODE_ENV === 'development'

const app = express()

let viteDevServer: ViteDevServer

if (isDev) {
  const vite = await import('vite')
  viteDevServer = await vite.createServer({
    server: {middlewareMode: true},
  })
  app.use(viteDevServer.middlewares)
} else {
  app.use(compression())
  app.disable('x-powered-by')
  app.use(
    '/assets',
    express.static('build/client/assets', {immutable: true, maxAge: '1y'}),
  )
  app.use(express.static('build/client', {maxAge: '1h'}))
}

app.get(['/internal/live', '/internal/ready'], (_, res) => res.sendStatus(200))

const remixHandler = createRequestHandler({
  build: isDev
    ? (() => viteDevServer.ssrLoadModule('virtual:react-router/server-build') as Promise<ServerBuild>)
    // @ts-expect-error - build output doesn't have type declarations
    : (await import('./build/server/index.js')) as ServerBuild,
})

app.use(remixHandler)

const port = isDev ? 3001 : 8080

app.listen(port, async () => {
  console.log(`Express server listening at http://localhost:${port}`)
  await startUnleash()
  console.log('Unleash initialized')
})
