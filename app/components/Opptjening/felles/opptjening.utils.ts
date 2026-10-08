import { medOmsorgGrunnlag, type OmsorgLinjeState, omsorgLabel } from '../Omsorg/omsorg.utils'
import type {
  OppdaterOpptjeningGrunnlag,
  OppdaterOpptjeningVurdering,
  OpptjeningstyperResponse,
} from './opptjening-types'

export type LinjeStatus = 'original' | 'new' | 'modified' | 'deleted'

export type EndringSummaryItem = {
  id: string
  kategori: string
  label: string
  endringer?: string[]
}

export type EndringSummary = {
  nye: EndringSummaryItem[]
  endrede: EndringSummaryItem[]
  slettede: EndringSummaryItem[]
}

export function tilLinjeState<T extends object>(dto: T): T & { _id: string; _status: LinjeStatus; _original: T } {
  return { ...dto, _id: crypto.randomUUID(), _status: 'original' as LinjeStatus, _original: { ...dto } as T }
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

export function oversettKoderIMelding(melding: string, opptjeningstyper: OpptjeningstyperResponse): string {
  const alle = [...opptjeningstyper.omsorg.typer].sort((a, b) => b.code.length - a.code.length)

  return alle.reduce((tekst, type) => {
    const escaped = type.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'g')
    return tekst.replace(regex, `${type.description} (${type.code})`)
  }, melding)
}

export function oppsummeringForKategori<T extends { _id: string; _status: LinjeStatus }>(
  kategori: string,
  linjer: T[],
  format: {
    label: (linje: T) => string
    kortLabel?: (linje: T) => string
    endringer?: (linje: T) => string[]
  },
): (status: LinjeStatus) => EndringSummaryItem[] {
  return status =>
    linjer
      .filter(linje => linje._status === status)
      .map(linje => ({
        id: linje._id,
        kategori,
        label: (status === 'modified' && format.kortLabel ? format.kortLabel : format.label)(linje),
        endringer: status === 'modified' ? format.endringer?.(linje) : undefined,
      }))
}

export type OpptjeningLinjer = {
  omsorg?: OmsorgLinjeState[]
}

export function byggEndringSummary(
  linjer: OpptjeningLinjer,
  opptjeningstyper: OpptjeningstyperResponse,
): EndringSummary {
  // Omsorgslinjer kan kun slettes, derfor ingen kortLabel/endringer.
  const kategorier = [
    oppsummeringForKategori('Omsorg', linjer.omsorg ?? [], {
      label: l => omsorgLabel(l, opptjeningstyper),
    }),
  ]

  return {
    nye: kategorier.flatMap(oppsummer => oppsummer('new')),
    endrede: kategorier.flatMap(oppsummer => oppsummer('modified')),
    slettede: kategorier.flatMap(oppsummer => oppsummer('deleted')),
  }
}

export function harEndringer(summary: EndringSummary): boolean {
  return summary.nye.length + summary.endrede.length + summary.slettede.length > 0
}

/**
 * Bygger samme oppsummering som redigeringsskjemaet, men fra en lagret vurdering.
 * `grunnlag` er opptjeningsgrunnlaget slik det var før endringene, og brukes til å
 * berike slettede omsorgslinjer med visningsfelter.
 */
export function endringSummaryFraVurdering(
  vurdering: OppdaterOpptjeningVurdering | null | undefined,
  grunnlag: OppdaterOpptjeningGrunnlag['opptjeningsGrunnlagDto'] | null | undefined,
  opptjeningstyper: OpptjeningstyperResponse,
): EndringSummary {
  const omsorg: OmsorgLinjeState[] = (vurdering?.omsorgTilSletting ?? []).map((dto, li) => ({
    ...medOmsorgGrunnlag(dto, grunnlag?.omsorgListe),
    _id: `omsorg-0-${li}`,
    _status: 'deleted',
    _original: null,
  }))

  return byggEndringSummary({ omsorg }, opptjeningstyper)
}
