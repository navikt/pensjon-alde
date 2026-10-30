import { AktivitetGruppe } from '~/types/behandling'

const GRUPPE_NAVN: Record<string, string> = {
  [AktivitetGruppe.KLARGJORING]: 'Klargjøring',
  [AktivitetGruppe.GRUNNLAGSVURDERNG]: 'Grunnlagsvurdering',
  [AktivitetGruppe.USORTET]: 'Andre aktiviteter',
}

export function gruppeNavn(gruppe: string): string {
  return GRUPPE_NAVN[gruppe] ?? gruppe
}

export interface AktivitetGrupperinger<T> {
  gruppe: string
  navn: string
  aktiviteter: T[]
}

/**
 * Grupperer aktiviteter på `gruppe`. Rekkefølgen fra backend beholdes (sortert på gruppe og orden),
 * og gruppene kommer i den rekkefølgen de først opptrer.
 */
export function grupperAktiviteter<T extends { gruppe?: string | null }>(aktiviteter: T[]): AktivitetGrupperinger<T>[] {
  const grupper = new Map<string, T[]>()
  for (const aktivitet of aktiviteter) {
    const gruppe = aktivitet.gruppe || AktivitetGruppe.USORTET
    const liste = grupper.get(gruppe)
    if (liste) {
      liste.push(aktivitet)
    } else {
      grupper.set(gruppe, [aktivitet])
    }
  }
  return Array.from(grupper, ([gruppe, aktiviteter]) => ({ gruppe, navn: gruppeNavn(gruppe), aktiviteter }))
}
