import { createBehandlingApi } from '~/api/behandling-api'
import { connect, subscribe } from '~/behandling-events/behandling-events.server'
import type { Route } from './+types/behandling-events'

const MAKS_LEVETID_MS = 15 * 60_000

export async function loader({ params, request }: Route.LoaderArgs) {
  const behandlingId = Number(params.behandlingId)

  if (!Number.isSafeInteger(behandlingId)) {
    return new Response('Invalid behandlingId', { status: 400 })
  }

  await createBehandlingApi({ request, behandlingId: params.behandlingId }).hentBehandling()

  try {
    await connect()
  } catch (error) {
    console.warn('[behandling-events] Rejected client, Kafka not connected', {
      behandlingId,
      error: error instanceof Error ? error.message : String(error),
    })
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
      const levetid = setTimeout(() => close(), MAKS_LEVETID_MS)
      send('event: ping\ndata: {}\n\n')

      cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(ping)
        clearTimeout(levetid)
        unsubscribe()
      }

      const close = () => {
        cleanup()
        try {
          controller.close()
        } catch {}
      }

      request.signal.addEventListener('abort', close)
      if (request.signal.aborted) close()
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
