import { randomUUID } from 'node:crypto'
import { subscribe, unsubscribe } from 'node:diagnostics_channel'
import type { Socket } from 'node:net'
import { performance } from 'node:perf_hooks'
import { type Attributes, isSpanContextValid, type Span, type SpanContext, trace } from '@opentelemetry/api'

interface PenRequest {
  origin: string | URL
}

interface RequestMessage {
  request: PenRequest
}

interface ConnectedMessage {
  socket: Socket
  connectParams: { hostname: string; protocol: string; port: string | number }
}

interface SendHeadersMessage extends RequestMessage {
  socket: Socket
}

interface ResponseHeadersMessage extends RequestMessage {
  response: { statusCode: number; headers: (string | Buffer)[] }
}

interface RequestErrorMessage extends RequestMessage {
  error: unknown
}

interface RequestState {
  id: string
  startedAt: number
  span: Span | undefined
  connection?: ConnectionState
}

interface ConnectionState {
  id: string
  connectedAt?: number
  requestCount: number
  requests: Set<RequestState>
  lastCompletedAt?: number
  lastSpanContext?: SpanContext
  lastRequestId?: string
  peerEndObserved: boolean
  onEnd: () => void
  onClose: (hadError: boolean) => void
}

let stopTracing: (() => void) | undefined

const SOCKET_ERROR_CODES = new Set([
  'UND_ERR_INFO',
  'UND_ERR_SOCKET',
  'UND_ERR_ABORTED',
  'UND_ERR_DESTROYED',
  'UND_ERR_CLOSED',
  'ECONNRESET',
  'ECONNABORTED',
  'ETIMEDOUT',
  'EPIPE',
  'ERR_STREAM_PREMATURE_CLOSE',
])

export function startPenConnectionTracing(penUrl: string): () => void {
  if (stopTracing) return stopTracing

  const origin = new URL(penUrl).origin
  const prefix = randomUUID()
  const requests = new WeakMap<object, RequestState>()
  const connections = new Map<Socket, ConnectionState>()
  const subscriptions: [string, (message: unknown) => void][] = []
  let connectionCount = 0
  let requestCount = 0
  let inFlight = 0
  let warned = false

  function safely(action: () => void) {
    try {
      action()
    } catch {
      if (!warned) {
        warned = true
        console.warn('Pen connection tracing failed; HTTP traffic is unaffected')
      }
    }
  }

  function event(state: RequestState, name: string, attributes: Attributes = {}) {
    safely(() => {
      if (state.span?.isRecording()) state.span.addEvent(name, { 'pen.request.id': state.id, ...attributes })
    })
  }

  function listen<T>(name: string, callback: (message: T) => void) {
    const listener = (message: unknown) => safely(() => callback(message as T))
    subscribe(name, listener)
    subscriptions.push([name, listener])
  }

  function connectionAttributes(connection: ConnectionState): Attributes {
    const now = performance.now()
    return {
      'pen.connection.id': connection.id,
      'pen.connection.request_count': connection.requestCount,
      'pen.connection.requests_in_flight': connection.requests.size,
      ...(connection.connectedAt !== undefined && {
        'pen.connection.age_ms': Math.round(now - connection.connectedAt),
      }),
      ...(connection.requests.size === 0 &&
        connection.lastCompletedAt !== undefined && {
          'pen.connection.since_last_completion_ms': Math.round(now - connection.lastCompletedAt),
        }),
    }
  }

  function connectionCounts(): Attributes {
    let withoutRequests = 0
    for (const connection of connections.values()) {
      if (connection.requests.size === 0) withoutRequests++
    }
    return {
      'pen.connections.open': connections.size,
      'pen.connections.without_requests': withoutRequests,
    }
  }

  function observeSocket(socket: Socket, connectedAt?: number): ConnectionState {
    const existing = connections.get(socket)
    if (existing) return existing

    const connection: ConnectionState = {
      id: `${prefix}-${++connectionCount}`,
      connectedAt,
      requestCount: 0,
      requests: new Set(),
      peerEndObserved: false,
      onEnd: () => {
        connection.peerEndObserved = true
      },
      onClose: hadError =>
        safely(() => {
          connections.delete(socket)
          socket.removeListener('end', connection.onEnd)
          const error = socket.errored as (Error & { code?: unknown }) | null
          const code = typeof error?.code === 'string' && SOCKET_ERROR_CODES.has(error.code) ? error.code : undefined
          const idleTimeout =
            code === 'UND_ERR_INFO' && error?.message === 'socket idle timeout' && connection.requests.size === 0
          const closeReason = idleTimeout
            ? 'idle_timeout'
            : code === 'UND_ERR_INFO'
              ? 'informational_close'
              : hadError
                ? 'socket_error'
                : connection.peerEndObserved
                  ? 'peer_end'
                  : 'unknown'
          const attributes = {
            ...connectionAttributes(connection),
            'pen.connection.had_error': hadError,
            'pen.connection.peer_end_observed': connection.peerEndObserved,
            'pen.connection.close_reason': closeReason,
            ...(code && { 'pen.connection.error_code': code }),
          }
          for (const request of connection.requests) event(request, 'pen.connection.closed', attributes)
          const spanContext = connection.lastSpanContext
          console.info(
            JSON.stringify({
              event: 'pen.connection.closed',
              ...attributes,
              'pen.request.id': connection.lastRequestId,
              ...(spanContext &&
                isSpanContextValid(spanContext) && {
                  trace_id: spanContext.traceId,
                  span_id: spanContext.spanId,
                }),
            }),
          )
        }),
    }
    connections.set(socket, connection)
    socket.once('end', connection.onEnd)
    socket.once('close', connection.onClose)
    return connection
  }

  function finish(request: object, name: string, attributes: Attributes = {}) {
    const state = requests.get(request)
    if (!state) return

    inFlight--
    const connection = state.connection
    if (connection) {
      connection.requests.delete(state)
      connection.lastCompletedAt = performance.now()
    }
    event(state, name, {
      ...attributes,
      'pen.request.transport_duration_ms': Math.round(performance.now() - state.startedAt),
      'pen.requests.in_flight': inFlight,
      ...(connection && connectionAttributes(connection)),
    })
    requests.delete(request)
  }

  listen<RequestMessage>('undici:request:create', ({ request }) => {
    if (new URL(request.origin).origin !== origin) return

    const state: RequestState = {
      id: `${prefix}-request-${++requestCount}`,
      startedAt: performance.now(),
      span: trace.getActiveSpan(),
    }
    requests.set(request, state)
    event(state, 'pen.request.created', {
      ...connectionCounts(),
      'pen.requests.in_flight': ++inFlight,
      'pen.process.uptime_ms': Math.round(process.uptime() * 1000),
    })
  })

  listen<ConnectedMessage>('undici:client:connected', ({ socket, connectParams }) => {
    const port = connectParams.port || (connectParams.protocol === 'https:' ? '443' : '80')
    const target = new URL(origin)
    if (
      connectParams.hostname === target.hostname &&
      String(port) === (target.port || (target.protocol === 'https:' ? '443' : '80')) &&
      connectParams.protocol === target.protocol
    ) {
      observeSocket(socket, performance.now())
    }
  })

  listen<SendHeadersMessage>('undici:client:sendHeaders', ({ request, socket }) => {
    const state = requests.get(request)
    if (!state) return

    state.connection?.requests.delete(state)
    const connection = observeSocket(socket)
    const reused = connection.requestCount > 0
    const idleMs =
      connection.requests.size === 0 && connection.lastCompletedAt !== undefined
        ? Math.round(performance.now() - connection.lastCompletedAt)
        : undefined
    state.connection = connection
    connection.requestCount++
    connection.requests.add(state)
    connection.lastSpanContext = state.span?.spanContext()
    connection.lastRequestId = state.id
    event(state, 'pen.connection.assigned', {
      ...connectionAttributes(connection),
      ...connectionCounts(),
      'pen.connection.reused': reused,
      'pen.requests.in_flight': inFlight,
      'pen.request.until_assignment_ms': Math.round(performance.now() - state.startedAt),
      ...(idleMs !== undefined && { 'pen.connection.since_last_completion_ms': idleMs }),
    })
  })

  listen<ResponseHeadersMessage>('undici:request:headers', ({ request, response }) => {
    const state = requests.get(request)
    if (!state) return

    const attributes: Attributes = { 'http.response.status_code': response.statusCode }
    for (let i = 0; i < response.headers.length; i += 2) {
      const name = String(response.headers[i]).toLowerCase()
      if (name === 'connection') {
        attributes['pen.response.connection_close'] = String(response.headers[i + 1])
          .toLowerCase()
          .split(',')
          .some(value => value.trim() === 'close')
      } else if (name === 'keep-alive') {
        const timeout = /(?:^|,)\s*timeout\s*=\s*(\d+)/i.exec(String(response.headers[i + 1]))
        if (timeout && Number.isSafeInteger(Number(timeout[1]))) {
          attributes['pen.response.keep_alive_timeout_seconds'] = Number(timeout[1])
        }
      }
    }
    event(state, 'pen.response.headers', {
      ...attributes,
      ...(state.connection && connectionAttributes(state.connection)),
    })
  })

  listen<RequestMessage>('undici:request:trailers', ({ request }) => finish(request, 'pen.response.complete'))

  listen<RequestErrorMessage>('undici:request:error', ({ request, error }) => {
    const details =
      typeof error === 'object' && error !== null ? (error as { name?: unknown; code?: unknown }) : undefined
    const code = typeof details?.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(details.code) ? details.code : undefined
    finish(request, 'pen.request.error', {
      'pen.request.aborted': details?.name === 'AbortError' || code === 'UND_ERR_ABORTED',
      ...(code && { 'pen.request.error_code': code }),
    })
  })

  stopTracing = () => {
    for (const [name, listener] of subscriptions) unsubscribe(name, listener)
    for (const [socket, connection] of connections) {
      socket.removeListener('end', connection.onEnd)
      socket.removeListener('close', connection.onClose)
    }
    connections.clear()
    stopTracing = undefined
  }
  return stopTracing
}
