import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { parseBehandlingEvent } from '~/behandling-events/parse-behandling-event'
import type { BehandlingDTO } from '~/types/behandling'

const PING_TIMEOUT_MS = 45_000
const WATCHDOG_INTERVAL_MS = 5_000
const RECONNECT_DELAY_MS = 15_000
const MAX_RECONNECT_DELAY_MS = 5 * 60_000

export function nesteReconnectDelay(forrige: number) {
  return Math.min(forrige * 2, MAX_RECONNECT_DELAY_MS)
}

export const BehandlingEventsContext = createContext(false)

export function useBehandlingEventsLive() {
  return useContext(BehandlingEventsContext)
}

type Options = {
  onEvent: (event: BehandlingDTO) => void
  /** Kalles når strømmen åpner igjen etter et brudd, siden vi kan ha gått glipp av hendelser. */
  onReconnect: () => void
}

export function useBehandlingEvents(
  behandlingId: number | string,
  { onEvent, onReconnect }: Options,
): { live: boolean; lastEvent: BehandlingDTO | undefined } {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const onReconnectRef = useRef(onReconnect)
  onReconnectRef.current = onReconnect

  const [live, setLive] = useState(false)
  const [lastEvent, setLastEvent] = useState<BehandlingDTO>()

  useEffect(() => {
    let source: EventSource | undefined
    let lastSeen = 0
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let reconnectDelay = RECONNECT_DELAY_MS
    let disposed = false
    let harMistetForbindelsen = false

    setLastEvent(undefined)

    const markAlive = () => {
      lastSeen = Date.now()
      setLive(true)
    }

    const fallBackToPolling = () => {
      harMistetForbindelsen = true
      source?.close()
      source = undefined
      setLive(false)
      setLastEvent(undefined)
      clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(open, reconnectDelay)
      reconnectDelay = nesteReconnectDelay(reconnectDelay)
    }

    const open = () => {
      if (disposed || typeof EventSource === 'undefined') return

      lastSeen = Date.now()
      source = new EventSource(`/api/behandling/${behandlingId}/events`)

      source.onopen = () => {
        markAlive()
        reconnectDelay = RECONNECT_DELAY_MS
        if (harMistetForbindelsen) onReconnectRef.current()
      }
      source.addEventListener('ping', markAlive)
      source.onmessage = message => {
        markAlive()
        const event = parseBehandlingEvent(message.data)
        if (!event) return
        setLastEvent(event)
        onEventRef.current(event)
      }
      source.onerror = fallBackToPolling
    }

    const watchdog = setInterval(() => {
      if (source && Date.now() - lastSeen > PING_TIMEOUT_MS) fallBackToPolling()
    }, WATCHDOG_INTERVAL_MS)

    open()

    return () => {
      disposed = true
      clearInterval(watchdog)
      clearTimeout(reconnectTimer)
      source?.close()
    }
  }, [behandlingId])

  return { live, lastEvent }
}
