import type { Beholdning } from './types'

export interface BeholdningRad {
  id: string
  ar: number | null
  dato: string | null // yyyy-MM-dd
  pensjonsbeholdning: number | null
}

/**
 * Én rad per beholdning. År og dato hentes fra `fomDato`.
 * Radene sorteres på dato (nyeste først), slik at flere beholdninger i samme år
 * (f.eks. etter regulering 1. mai) står i riktig rekkefølge også når det sorteres på år.
 */
export function tilBeholdningRader(beholdninger: Beholdning[]): BeholdningRad[] {
  return beholdninger
    .map((beholdning, index) => ({
      id: beholdning.beholdningId?.toString() ?? `${beholdning.fomDato ?? 'ukjent'}-${index}`,
      ar: beholdning.fomDato ? Number(beholdning.fomDato.slice(0, 4)) : null,
      dato: beholdning.fomDato,
      pensjonsbeholdning: beholdning.belop,
    }))
    .sort((a, b) => (b.dato ?? '').localeCompare(a.dato ?? ''))
}
