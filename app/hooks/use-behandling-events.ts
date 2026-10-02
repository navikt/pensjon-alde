import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useRevalidator } from 'react-router'

const PING_TIMEOUT_MS = 45_000
const WATCHDOG_INTERVAL_MS = 5_000
const RECONNECT_DELAY_MS = 15_000

export const BehandlingEventsContext = createContext(false)

export function useBehandlingEventsLive() {
  return useContext(BehandlingEventsContext)
}

export function useBehandlingEvents(behandlingId: number | string): boolean {
  const revalidator = useRevalidator()
  const revalidatorRef = useRef(revalidator)
  revalidatorRef.current = revalidator

  const [live, setLive] = useState(false)

  useEffect(() => {
    let source: EventSource | undefined
    let lastSeen = 0
    let hasFallenBack = false
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let disposed = false

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
        if (hasFallenBack) revalidate()
      }
      source.addEventListener('ping', markAlive)
      source.onmessage = () => {
        markAlive()
        revalidate()
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

  return live
}
