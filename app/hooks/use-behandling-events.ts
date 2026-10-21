import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useRevalidator } from 'react-router'
import type { BehandlingDTO } from '~/types/behandling'

const PING_TIMEOUT_MS = 45_000
const WATCHDOG_INTERVAL_MS = 5_000
const RECONNECT_DELAY_MS = 15_000

export const BehandlingEventsContext = createContext(false)

export function useBehandlingEventsLive() {
  return useContext(BehandlingEventsContext)
}

type Options = {
  /**
   * Kalles for hver melding. Meldinger fører ikke til revalidering med mindre denne returnerer `true`.
   */
  onEvent?: (event: BehandlingDTO) => boolean | undefined
  /**
   * Kalles når strømmen åpnes. Returner `true` for å revalidere, slik at meldinger publisert
   * mellom loaderen og tilkoblingen ikke går tapt. Etter fallback til polling revalideres det alltid.
   */
  onOpen?: () => boolean | undefined
}

function parseEvent(data: unknown): BehandlingDTO | undefined {
  if (typeof data !== 'string') return undefined
  try {
    const event = JSON.parse(data) as BehandlingDTO
    return Number.isSafeInteger(event?.behandlingId) && Array.isArray(event.aktiviteter) ? event : undefined
  } catch {
    return undefined
  }
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
    let disposed = false

    setLastEvent(undefined)

    const revalidate = () => {
      if (revalidatorRef.current.state === 'idle') revalidatorRef.current.revalidate()
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
      reconnectTimer = setTimeout(open, RECONNECT_DELAY_MS)
    }

    const open = () => {
      if (disposed || typeof EventSource === 'undefined') return

      lastSeen = Date.now()
      source = new EventSource(`/api/behandling/${behandlingId}/events`)

      source.onopen = () => {
        markAlive()
        if (hasFallenBack || onOpenRef.current?.()) revalidate()
      }
      source.addEventListener('ping', markAlive)
      source.onmessage = message => {
        markAlive()
        const event = parseEvent(message.data)
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
