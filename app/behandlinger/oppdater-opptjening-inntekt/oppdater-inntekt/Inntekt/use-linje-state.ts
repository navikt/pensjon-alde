import { useState } from 'react'
import type { LinjeStatus } from './opptjening.utils'

type Linje<T> = T & { _id: string; _status: LinjeStatus; _original: T | null; _utkast?: Partial<T> }

export function useLinjeState<T extends object>(
  lagInitielle: () => Linje<T>[],
  felter: (keyof T)[],
  beregnStatus: (linje: Linje<T>) => LinjeStatus,
) {
  const [linjer, setLinjer] = useState<Linje<T>[]>(lagInitielle)

  const leggTil = (ny: Linje<T>) => setLinjer(prev => [...prev, ny])

  const slett = (id: string) =>
    setLinjer(prev => {
      const linje = prev.find(l => l._id === id)
      if (!linje) return prev
      if (linje._status === 'new') return prev.filter(l => l._id !== id)
      const utkast = Object.fromEntries(felter.map(felt => [felt, linje[felt]])) as Partial<T>
      return prev.map(l => (l._id === id ? { ...l, ...l._original, _status: 'deleted' as const, _utkast: utkast } : l))
    })

  const gjenopprett = (id: string) =>
    setLinjer(prev =>
      prev.map(l => {
        if (l._id !== id) return l
        const { _utkast, ...rest } = l
        const gjenopprettet = { ...rest, ..._utkast, _status: 'original' as LinjeStatus } as Linje<T>
        return { ...gjenopprettet, _status: beregnStatus(gjenopprettet) }
      }),
    )

  const oppdater = (id: string, endre: (linje: Linje<T>) => Linje<T>) =>
    setLinjer(prev =>
      prev.map(l => {
        if (l._id !== id) return l
        const oppdatert = endre(l)
        return { ...oppdatert, _status: beregnStatus(oppdatert) }
      }),
    )

  return { linjer, leggTil, slett, gjenopprett, oppdater }
}
