import { AsyncLocalStorage } from 'node:async_hooks'
import { channel, subscribe, unsubscribe } from 'node:diagnostics_channel'
import { once } from 'node:events'
import { createServer, type RequestListener } from 'node:http'
import { type AddressInfo, Socket } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { type Attributes, type Context, context, ROOT_CONTEXT, type Span, TraceFlags, trace } from '@opentelemetry/api'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { startPenConnectionTracing } from './pen-connection-tracing.server'

interface RecordedEvent {
  name: string
  attributes: Attributes
}

function recordingSpan(index: number) {
  const events: RecordedEvent[] = []
  let ended = false
  const span = {
    spanContext: () => ({
      traceId: index.toString(16).padStart(32, '0'),
      spanId: index.toString(16).padStart(16, '0'),
      traceFlags: TraceFlags.SAMPLED,
    }),
    isRecording: () => !ended,
    addEvent: vi.fn((name: string, attributes: Attributes) => events.push({ name, attributes })),
    end: vi.fn(() => {
      ended = true
    }),
  } as unknown as Span
  return { span, events }
}

async function withServer(reply: RequestListener, test: (url: string, sockets: Socket[]) => Promise<void>) {
  const sockets: Socket[] = []
  const server = createServer((request, response) => {
    sockets.push(request.socket)
    reply(request, response)
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    await test(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, sockets)
  } finally {
    server.closeAllConnections()
    server.close()
    await once(server, 'close')
    await delay(10)
  }
}

describe('Pen-forbindelsesdiagnostikk med OpenTelemetry-kontekst', () => {
  const storage = new AsyncLocalStorage<Context>()
  let stop: (() => void) | undefined

  beforeAll(() => {
    expect(
      context.setGlobalContextManager({
        active: () => storage.getStore() ?? ROOT_CONTEXT,
        with: (ctx, fn, thisArg, ...args) => storage.run(ctx, () => fn.call(thisArg, ...args)),
        bind: (_ctx, target) => target,
        enable() {
          return this
        },
        disable() {
          storage.disable()
          return this
        },
      }),
    ).toBe(true)
  })

  afterAll(() => context.disable())

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    stop?.()
    stop = undefined
    vi.restoreAllMocks()
  })

  it('korrelerer sekvensielle GET/POST med faktiske sockets uten å registrere sensitive felt', async () => {
    const recorded = recordingSpan(1)
    await withServer(
      async (request, response) => {
        for await (const _chunk of request) {
        }
        response.setHeader('content-type', 'application/json')
        response.setHeader('keep-alive', 'timeout=5, extra=synthetic-private-marker')
        response.setHeader('set-cookie', 'synthetic-private-marker')
        response.end('{"synthetic":true}')
      },
      async (url, sockets) => {
        stop = startPenConnectionTracing(url)
        expect(startPenConnectionTracing(url)).toBe(stop)
        await context.with(trace.setSpan(context.active(), recorded.span), async () => {
          for (let i = 0; i < 8; i++) {
            const response = await fetch(`${url}/synthetic-private-marker?synthetic-private-marker`, {
              method: i % 2 === 0 ? 'GET' : 'POST',
              headers: { authorization: 'Bearer synthetic-private-marker' },
              body: i % 2 === 0 ? undefined : 'synthetic-private-marker',
            })
            expect(await response.json()).toEqual({ synthetic: true })
          }
        })

        const assigned = recorded.events.filter(event => event.name === 'pen.connection.assigned')
        expect(assigned).toHaveLength(8)
        expect(new Set(assigned.map(event => event.attributes['pen.connection.id'])).size).toBe(new Set(sockets).size)
        expect(new Set(sockets).size).toBeLessThan(8)
        expect(assigned.slice(4).every(event => event.attributes['pen.connection.reused'] === true)).toBe(true)
        expect(assigned.every(event => typeof event.attributes['pen.connection.age_ms'] === 'number')).toBe(true)
        expect(new Set(assigned.map(event => event.attributes['pen.request.id'])).size).toBe(8)
        expect(recorded.events.filter(event => event.name === 'pen.response.complete')).toHaveLength(8)
        expect(recorded.events.find(event => event.name === 'pen.response.headers')?.attributes).toMatchObject({
          'http.response.status_code': 200,
          'pen.response.connection_close': false,
          'pen.response.keep_alive_timeout_seconds': 5,
        })
        expect(recorded.span.end).not.toHaveBeenCalled()
        recorded.span.end()
      },
    )
    expect(JSON.stringify(recorded.events)).not.toContain('synthetic-private-marker')
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain('synthetic-private-marker')
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('bevarer separate aktive spenn og gjenbruk ved parallelle kall', async () => {
    const recordings = Array.from({ length: 8 }, (_, index) => recordingSpan(index + 1))
    let active = 0
    let maxActive = 0
    await withServer(
      async (_request, response) => {
        maxActive = Math.max(maxActive, ++active)
        await delay(20)
        response.end('synthetic')
        active--
      },
      async (url, sockets) => {
        stop = startPenConnectionTracing(url)
        for (let batch = 0; batch < 2; batch++) {
          await Promise.all(
            recordings.slice(batch * 4, batch * 4 + 4).map(recorded =>
              context.with(trace.setSpan(context.active(), recorded.span), async () => {
                const response = await fetch(url)
                expect(await response.text()).toBe('synthetic')
              }),
            ),
          )
          await delay(10)
        }
        expect(maxActive).toBe(4)
        expect(sockets).toHaveLength(8)
        expect(new Set(sockets).size).toBe(4)
      },
    )

    for (const recorded of recordings) {
      expect(recorded.events.map(event => event.name)).toEqual([
        'pen.request.created',
        'pen.connection.assigned',
        'pen.response.headers',
        'pen.response.complete',
      ])
      expect(new Set(recorded.events.map(event => event.attributes['pen.request.id'])).size).toBe(1)
    }
    expect(new Set(recordings.map(recorded => recorded.events[0].attributes['pen.request.id'])).size).toBe(8)
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('logger lukking med siste trace-ID selv etter at spennet er avsluttet', async () => {
    const recorded = recordingSpan(3)
    await withServer(
      (_request, response) => response.end('synthetic'),
      async url => {
        stop = startPenConnectionTracing(url)
        await context.with(trace.setSpan(context.active(), recorded.span), async () => {
          const response = await fetch(url)
          await response.text()
        })
        recorded.span.end()
      },
    )

    const logs = vi.mocked(console.info).mock.calls.map(([message]) => JSON.parse(String(message)))
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      event: 'pen.connection.closed',
      trace_id: recorded.span.spanContext().traceId,
      span_id: recorded.span.spanContext().spanId,
      'pen.connection.request_count': 1,
      'pen.connection.requests_in_flight': 0,
      'pen.connection.age_ms': expect.any(Number),
      'pen.connection.since_last_completion_ms': expect.any(Number),
      'pen.connection.had_error': expect.any(Boolean),
      'pen.connection.peer_end_observed': expect.any(Boolean),
    })
    expect(logs[0]['pen.connection.id']).toBe(
      recorded.events.find(event => event.name === 'pen.connection.assigned')?.attributes['pen.connection.id'],
    )
    expect(recorded.events.some(event => event.name === 'pen.connection.closed')).toBe(false)
  })

  it('registrerer serverens Connection: close og nye forbindelser uten å endre transporten', async () => {
    const recorded = recordingSpan(4)
    await withServer(
      (_request, response) => {
        response.setHeader('connection', 'close')
        response.end('synthetic')
      },
      async (url, sockets) => {
        stop = startPenConnectionTracing(url)
        await context.with(trace.setSpan(context.active(), recorded.span), async () => {
          for (let i = 0; i < 3; i++) {
            const response = await fetch(url)
            await response.text()
          }
        })
        expect(new Set(sockets).size).toBe(3)
      },
    )
    const headers = recorded.events.filter(event => event.name === 'pen.response.headers')
    expect(headers).toHaveLength(3)
    expect(headers.every(event => event.attributes['pen.response.connection_close'] === true)).toBe(true)
    expect(vi.mocked(console.info).mock.calls).toHaveLength(3)
  })

  it('identifiserer Undicis faktiske idle-lukking uten å endre klientoppsettet', async () => {
    await withServer(
      (_request, response) => {
        response.removeHeader('keep-alive')
        response.end('synthetic')
      },
      async url => {
        stop = startPenConnectionTracing(url)
        await (await fetch(url)).text()
        await vi.waitFor(() => expect(console.info).toHaveBeenCalledTimes(1), { timeout: 6000 })
        const log = JSON.parse(String(vi.mocked(console.info).mock.calls[0][0]))
        expect(log).toMatchObject({
          'pen.connection.close_reason': 'idle_timeout',
          'pen.connection.error_code': 'UND_ERR_INFO',
          'pen.connection.had_error': true,
          'pen.connection.requests_in_flight': 0,
        })
      },
    )
  }, 10000)

  it.each([
    ['ECONNRESET', 'synthetic-private-marker', 'socket_error', 'ECONNRESET'],
    ['ETIMEDOUT', 'synthetic-private-marker', 'socket_error', 'ETIMEDOUT'],
    ['UND_ERR_INFO', 'synthetic-private-marker', 'informational_close', 'UND_ERR_INFO'],
    ['synthetic-private-marker', 'socket idle timeout', 'socket_error', undefined],
  ])('klassifiserer socket-feil %s uten å logge fritekst', async (code, message, reason, expectedCode) => {
    await withServer(
      (_request, response) => response.end('synthetic'),
      async url => {
        stop = startPenConnectionTracing(url)
        const port = new URL(url).port
        const socket = new Socket()
        socket.on('error', () => {})
        socket.connect(Number(port), '127.0.0.1')
        await once(socket, 'connect')
        channel('undici:client:connected').publish({
          socket,
          connectParams: { hostname: '127.0.0.1', protocol: 'http:', port },
        })
        const closed = new Promise<void>(resolve => socket.once('close', () => resolve()))
        socket.destroy(Object.assign(new Error(message), { code }))
        await closed
      },
    )

    const log = JSON.parse(String(vi.mocked(console.info).mock.calls[0][0]))
    expect(log['pen.connection.close_reason']).toBe(reason)
    expect(log['pen.connection.error_code']).toBe(expectedCode)
    expect(log['pen.connection.had_error']).toBe(true)
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain('synthetic-private-marker')
  })

  it('ignorerer andre origins og slutter å observere når den stoppes', async () => {
    const recorded = recordingSpan(5)
    await withServer(
      (_request, response) => response.end('synthetic'),
      async url => {
        stop = startPenConnectionTracing('http://127.0.0.1:1')
        await context.with(trace.setSpan(context.active(), recorded.span), async () => {
          await (await fetch(url)).text()
        })
        expect(recorded.events).toEqual([])
        stop()
        stop = startPenConnectionTracing(url)
        stop()
        await context.with(trace.setSpan(context.active(), recorded.span), async () => {
          await (await fetch(url)).text()
        })
        expect(recorded.events).toEqual([])
      },
    )
    expect(console.info).not.toHaveBeenCalled()
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('bevarer andre diagnostikkabonnenter og eksisterende traceparent-propagering', async () => {
    const recorded = recordingSpan(8)
    const traceparent = '00-00000000000000000000000000000008-0000000000000009-01'
    let observed = 0
    const existingSubscriber = (message: unknown) => {
      const { request } = message as { request: { addHeader: (name: string, value: string) => void } }
      request.addHeader('traceparent', traceparent)
      observed++
    }
    subscribe('undici:request:create', existingSubscriber)
    try {
      await withServer(
        (request, response) => response.end(request.headers.traceparent),
        async url => {
          stop = startPenConnectionTracing(url)
          await context.with(trace.setSpan(context.active(), recorded.span), async () => {
            expect(await (await fetch(url)).text()).toBe(traceparent)
            stop?.()
            expect(await (await fetch(url)).text()).toBe(traceparent)
          })
          expect(observed).toBe(2)
          expect(recorded.events.filter(event => event.name === 'pen.request.created')).toHaveLength(1)
          expect(recorded.span.end).not.toHaveBeenCalled()
        },
      )
    } finally {
      unsubscribe('undici:request:create', existingSubscriber)
    }
  })

  it('lar kall uten aktivt OpenTelemetry-spenn fungere', async () => {
    await withServer(
      (_request, response) => response.end('synthetic'),
      async url => {
        stop = startPenConnectionTracing(url)
        await context.with(ROOT_CONTEXT, async () => {
          expect(await (await fetch(url)).text()).toBe('synthetic')
        })
      },
    )
    expect(console.warn).not.toHaveBeenCalled()
    const logs = vi.mocked(console.info).mock.calls.map(([message]) => JSON.parse(String(message)))
    expect(logs).toHaveLength(1)
    expect(logs[0].trace_id).toBeUndefined()
    expect(logs[0]['pen.connection.request_count']).toBe(1)
  })

  it('observerer avbrudd under responslesing uten å prøve POST på nytt', async () => {
    const recorded = recordingSpan(6)
    const controller = new AbortController()
    await withServer(
      (_request, response) => response.write('synthetic'),
      async (url, sockets) => {
        stop = startPenConnectionTracing(url)
        await context.with(trace.setSpan(context.active(), recorded.span), async () => {
          const response = await fetch(url, { method: 'POST', signal: controller.signal })
          controller.abort()
          await expect(response.text()).rejects.toMatchObject({ name: 'AbortError' })
        })
        expect(sockets).toHaveLength(1)
      },
    )
    expect(recorded.events.find(event => event.name === 'pen.request.error')?.attributes).toMatchObject({
      'pen.request.aborted': true,
      'pen.requests.in_flight': 0,
    })
  })

  it('lar HTTP-kallet lykkes selv om span-eksporten feiler', async () => {
    const recorded = recordingSpan(7)
    vi.mocked(recorded.span.addEvent).mockImplementation(() => {
      throw new Error('synthetic-private-marker')
    })
    await withServer(
      (_request, response) => response.end('synthetic'),
      async url => {
        stop = startPenConnectionTracing(url)
        await context.with(trace.setSpan(context.active(), recorded.span), async () => {
          expect(await (await fetch(url)).text()).toBe('synthetic')
        })
      },
    )
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('synthetic-private-marker')
  })
})
