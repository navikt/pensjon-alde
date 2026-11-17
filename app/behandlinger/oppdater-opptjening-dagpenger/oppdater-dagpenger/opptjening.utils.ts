import type { Dagpengertype, LinjeStatus } from './dagpenger.types'

export type EndringSummaryItem = {
  id: string
  label: string
  endringer?: string[]
}

export type EndringSummary = {
  nye: EndringSummaryItem[]
  endrede: EndringSummaryItem[]
  slettede: EndringSummaryItem[]
}

export function beregnStatus<T extends object>(
  linje: T & { _status: LinjeStatus; _original: T | null },
  felter: (keyof T)[],
): LinjeStatus {
  if (linje._status === 'new' || linje._status === 'deleted') return linje._status
  if (!linje._original) return 'new'
  const orig = linje._original
  const endret = felter.some(k => (linje[k] ?? null) !== (orig[k] ?? null))
  return endret ? 'modified' : 'original'
}

export function oversettKoderIMelding(melding: string, typer: Dagpengertype[]): string {
  return [...typer]
    .sort((a, b) => b.code.length - a.code.length)
    .reduce((tekst, type) => {
      const escaped = type.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return tekst.replace(new RegExp(`\\b${escaped}\\b`, 'g'), `${type.description} (${type.code})`)
    }, melding)
}

export function byggEndringSummary<T extends { _id: string; _status: LinjeStatus }>(
  linjer: T[],
  format: { label: (linje: T) => string; endringer: (linje: T) => string[] },
): EndringSummary {
  const items = (status: LinjeStatus) =>
    linjer
      .filter(linje => linje._status === status)
      .map(linje => ({
        id: linje._id,
        label: format.label(linje),
        endringer: status === 'modified' ? format.endringer(linje) : undefined,
      }))
  return { nye: items('new'), endrede: items('modified'), slettede: items('deleted') }
}

export function harEndringer(summary: EndringSummary): boolean {
  return summary.nye.length + summary.endrede.length + summary.slettede.length > 0
}
