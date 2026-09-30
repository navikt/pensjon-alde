import { createBehandlingApi } from '~/api/behandling-api'
import { subscribe } from '~/behandling-events/behandling-events.server'
import type { Route } from './+types/behandling-events'

export async function loader({ params, request }: Route.LoaderArgs) {
  await createBehandlingApi({ request, behandlingId: params.behandlingId }).hentBehandling()

  const encoder = new TextEncoder()
  let cleanup = () => {}

  const stream = new ReadableStream({
    start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text))

      const unsubscribe = subscribe(Number(params.behandlingId), event => {
        console.log('message from kafka', event)
        send(`data: ${JSON.stringify(event)}\n\n`)
      })
      const ping = setInterval(() => send(': ping\n\n'), 20_000)

      cleanup = () => {
        clearInterval(ping)
        unsubscribe()
      }
      request.signal.addEventListener('abort', () => {
        cleanup()
        controller.close()
      })
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
