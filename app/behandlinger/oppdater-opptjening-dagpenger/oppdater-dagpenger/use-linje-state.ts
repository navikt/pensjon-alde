import { useState } from 'react'
import type { LinjeStatus } from './dagpenger.types'
import { beregnStatus } from './opptjening.utils'

type Linje<T> = T & { _id: string; _status: LinjeStatus; _original: T | null; _foerSletting?: Linje<T> }

// Slettede linjer viser verdiene fra POPP, siden det er dem som slettes. Endringene tas vare på til gjenoppretting.
export function slettLinje<T extends object>(linje: Linje<T>): Linje<T> {
  const visning = linje._original
    ? ({ ...linje._original, _id: linje._id, _original: linje._original } as Linje<T>)
    : linje
  return { ...visning, _status: 'deleted', _foerSletting: linje }
}

export function gjenopprettLinje<T extends object>(linje: Linje<T>, felter: (keyof T)[]): Linje<T> {
  const gjenopprettet = { ...(linje._foerSletting ?? linje), _status: 'original' as LinjeStatus }
  return { ...gjenopprettet, _status: beregnStatus(gjenopprettet, felter) }
}

export function useLinjeState<T extends object>(lagInitielle: () => Linje<T>[], felter: (keyof T)[]) {
  const [linjer, setLinjer] = useState<Linje<T>[]>(lagInitielle)

  const leggTil = (ny: Linje<T>) => setLinjer(prev => [...prev, ny])

  const slett = (id: string) =>
    setLinjer(prev => {
      const linje = prev.find(l => l._id === id)
      if (!linje) return prev
      if (linje._status === 'new') return prev.filter(l => l._id !== id)
      return prev.map(l => (l._id === id ? slettLinje(l) : l))
    })

  const gjenopprett = (id: string) => setLinjer(prev => prev.map(l => (l._id === id ? gjenopprettLinje(l, felter) : l)))

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
