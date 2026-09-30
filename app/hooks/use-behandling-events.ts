import { useEffect, useRef } from 'react'
import { useRevalidator } from 'react-router'

export function useBehandlingEvents(behandlingId: number | string) {
  const revalidator = useRevalidator()
  const revalidatorRef = useRef(revalidator)
  revalidatorRef.current = revalidator

  useEffect(() => {
    const source = new EventSource(`/api/behandling/${behandlingId}/events`)

    source.onmessage = () => {
      if (revalidatorRef.current.state === 'idle') revalidatorRef.current.revalidate()
    }

    return () => source.close()
  }, [behandlingId])
}
