import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useRevalidator } from 'react-router'
import { parseBehandlingEvent } from '~/behandling-events/parse-behandling-event'
import type { BehandlingDTO } from '~/types/behandling'

const PING_TIMEOUT_MS = 45_000
const WATCHDOG_INTERVAL_MS = 5_000
const RECONNECT_DELAY_MS = 15_000
const MAX_RECONNECT_DELAY_MS = 5 * 60_000
export const LIVE_POLL_INTERVAL_MS = 10_000

export function nesteReconnectDelay(forrige: number) {
  return Math.min(forrige * 2, MAX_RECONNECT_DELAY_MS)
}

export const BehandlingEventsContext = createContext(false)

export function useBehandlingEventsLive() {
  return useContext(BehandlingEventsContext)
}

type Options = {
  onEvent?: (event: BehandlingDTO) => boolean | undefined
  onOpen?: () => boolean | undefined
}

export function useBehandlingEvents(
  behandlingId: number | string,
  { onEvent, onOpen }: Options = {},
): { live: boolean; lastEvent: BehandlingDTO | undefined } {
  const revalidator = useRevalidator()
  const revalidatorRef = useRef(revalidator)
  revalidatorRef.current = revalidator
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen

  const [live, setLive] = useState(false)
  const [lastEvent, setLastEvent] = useState<BehandlingDTO>()

  useEffect(() => {
    let source: EventSource | undefined
    let lastSeen = 0
    let hasFallenBack = false
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let reconnectDelay = RECONNECT_DELAY_MS
    let disposed = false

    setLastEvent(undefined)

    const revalidate = () => {
      void revalidatorRef.current.revalidate()
    }

    const markAlive = () => {
      lastSeen = Date.now()
      setLive(true)
    }

    const fallBackToPolling = () => {
      source?.close()
      source = undefined
      hasFallenBack = true
      setLive(false)
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
        if (hasFallenBack || onOpenRef.current?.()) revalidate()
      }
      source.addEventListener('ping', markAlive)
      source.onmessage = message => {
        markAlive()
        const event = parseBehandlingEvent(message.data)
        if (!event) return

        setLastEvent(event)
        if (onEventRef.current?.(event)) revalidate()
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
