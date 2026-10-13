import { connect, connections, subscribe } from '~/behandling-events/behandling-events.server'
import { createLogger } from '~/utils/logger.server'
import type { Route } from './+types/behandling-events'

const log = createLogger('behandling-events')

export async function loader({ params, request }: Route.LoaderArgs) {
  const behandlingId = Number(params.behandlingId)

  if (!Number.isSafeInteger(behandlingId)) {
    return new Response('Invalid behandlingId', { status: 400 })
  }

  try {
    await connect()
  } catch (error) {
    log.warn('Rejected client, Kafka not connected', { behandlingId }, error)
    return new Response('Kafka not connected', { status: 503 })
  }

  const encoder = new TextEncoder()
  let cleanup = () => {}

  const stream = new ReadableStream({
    start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text))
      let closed = false

      const unsubscribe = subscribe(behandlingId, {
        onEvent: event => send(`data: ${JSON.stringify(event)}\n\n`),
        onClose: () => close(),
      })
      const ping = setInterval(() => send('event: ping\ndata: {}\n\n'), 20_000)

      log.info('Client connected', { behandlingId, connections: connections() })

      cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(ping)
        unsubscribe()
        log.info('Client disconnected', { behandlingId, connections: connections() })
      }

      const close = () => {
        cleanup()
        try {
          controller.close()
        } catch {}
      }

      request.signal.addEventListener('abort', close)
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
    },
  })
}
