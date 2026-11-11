import { once } from 'node:events'
import { createServer, type RequestListener } from 'node:http'
import type { AddressInfo, Socket } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requireAccessToken } from '~/auth/auth.server'
import { fetcher } from './api-client'

vi.mock('~/auth/auth.server', () => ({
  requireAccessToken: vi.fn().mockResolvedValue('test-token'),
}))

vi.mock('~/utils/env.server', () => ({
  isMockEnv: false,
}))

async function withServer(reply: RequestListener, test: (baseUrl: string, requestSockets: Socket[]) => Promise<void>) {
  const requestSockets: Socket[] = []
  const server = createServer((request, response) => {
    requestSockets.push(request.socket)
    reply(request, response)
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')

  try {
    const { port } = server.address() as AddressInfo
    await test(`http://127.0.0.1:${port}`, requestSockets)
  } finally {
    server.closeAllConnections()
    server.close()
    await once(server, 'close')
  }
}

describe('fetcher med ekte HTTP-forbindelser', () => {
  beforeEach(() => {
    vi.mocked(requireAccessToken).mockResolvedValue('test-token')
  })

  it('gjenbruker varme forbindelser for sekvensielle GET- og POST-kall', async () => {
    await withServer(
      async (request, response) => {
        let body = ''
        for await (const chunk of request) body += chunk
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify({ method: request.method, authorization: request.headers.authorization, body }))
      },
      async (baseUrl, requestSockets) => {
        let warmConnections = 0
        for (let i = 0; i < 8; i++) {
          const method = i % 2 === 0 ? 'GET' : 'POST'
          const body = method === 'POST' ? '{"synthetic":true}' : undefined
          const api = fetcher(baseUrl, new Request('http://alde.test'))
          expect(await api('/synthetic', { method, body })).toEqual({
            method,
            authorization: 'Bearer test-token',
            body: body ?? '',
          })
          if (i === 3) warmConnections = new Set(requestSockets).size
        }

        expect(requestSockets).toHaveLength(8)
        expect(new Set(requestSockets).size).toBe(warmConnections)
        expect(warmConnections).toBeLessThan(8)
      },
    )
  })

  it.each([undefined, 'text/plain'])(
    'konsumerer hele svar uten JSON (%s) og frigjør forbindelsene',
    async contentType => {
      let completedBodies = 0
      await withServer(
        async (_request, response) => {
          if (contentType) response.setHeader('content-type', contentType)
          response.write(Buffer.alloc(256 * 1024, 'x'))
          await delay(20)
          response.end(Buffer.alloc(256 * 1024, 'y'))
          completedBodies++
        },
        async (baseUrl, requestSockets) => {
          for (let i = 0; i < 8; i++) {
            const api = fetcher(baseUrl, new Request('http://alde.test'))
            expect(await api('/synthetic', { method: 'POST' })).toBeUndefined()
            expect(completedBodies).toBe(i + 1)
          }

          expect(requestSockets).toHaveLength(8)
          expect(new Set(requestSockets).size).toBeLessThan(8)
        },
      )
    },
  )

  it('gjenbruker forbindelser mellom parallelle puljer uten å serialisere kallene', async () => {
    let active = 0
    let maxActive = 0
    await withServer(
      async (_request, response) => {
        maxActive = Math.max(maxActive, ++active)
        await delay(20)
        response.setHeader('content-type', 'application/json')
        response.end('{"synthetic":true}')
        active--
      },
      async (baseUrl, requestSockets) => {
        let warmConnections = 0
        for (let batch = 0; batch < 3; batch++) {
          await Promise.all(
            Array.from({ length: 4 }, async () => {
              const api = fetcher(baseUrl, new Request('http://alde.test'))
              expect(await api('/synthetic', { method: 'GET' })).toEqual({ synthetic: true })
            }),
          )
          if (batch === 0) warmConnections = new Set(requestSockets).size
          await delay(10)
        }

        expect(maxActive).toBe(4)
        expect(requestSockets).toHaveLength(12)
        expect(new Set(requestSockets).size).toBe(warmConnections)
        expect(warmConnections).toBeLessThan(12)
      },
    )
  })

  it('bevarer eksplisitt avbrudd under lesing av svar uten JSON og prøver ikke POST på nytt', async () => {
    const controller = new AbortController()
    await withServer(
      (_request, response) => {
        response.setHeader('content-type', 'text/plain')
        response.write('synthetic')
        setTimeout(() => controller.abort(), 20)
      },
      async (baseUrl, requestSockets) => {
        const api = fetcher(baseUrl, new Request('http://alde.test'))
        await expect(api('/synthetic', { method: 'POST', signal: controller.signal })).rejects.toMatchObject({
          name: 'AbortError',
        })
        expect(requestSockets).toHaveLength(1)
      },
    )
  })
})
