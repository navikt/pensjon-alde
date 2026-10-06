import { useState } from 'react'
import { beregnStatus, type LinjeStatus } from './opptjening.utils'

type Linje<T> = T & { _id: string; _status: LinjeStatus; _original: T | null }

export function useLinjeState<T extends object>(lagInitielle: () => Linje<T>[], felter: (keyof T)[]) {
  const [linjer, setLinjer] = useState<Linje<T>[]>(lagInitielle)

  const leggTil = (ny: Linje<T>) => setLinjer(prev => [...prev, ny])

  const slett = (id: string) =>
    setLinjer(prev => {
      const linje = prev.find(l => l._id === id)
      if (!linje) return prev
      if (linje._status === 'new') return prev.filter(l => l._id !== id)
      return prev.map(l => (l._id === id ? { ...l, _status: 'deleted' as const } : l))
    })

  const gjenopprett = (id: string) =>
    setLinjer(prev =>
      prev.map(l => {
        if (l._id !== id) return l
        const gjenopprettet = { ...l, _status: 'original' as LinjeStatus }
        return { ...gjenopprettet, _status: beregnStatus(gjenopprettet, felter) }
      }),
    )

  const oppdater = (id: string, endre: (linje: Linje<T>) => Linje<T>) =>
    setLinjer(prev =>
      prev.map(l => {
        if (l._id !== id) return l
        const oppdatert = endre(l)
        return { ...oppdatert, _status: beregnStatus(oppdatert, felter) }
      }),
    )

  return { linjer, leggTil, slett, gjenopprett, oppdater }
}
