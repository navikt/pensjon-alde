import type {
  OppdaterOpptjeningGrunnlag,
  OppdaterOpptjeningVurdering,
  OpptjeningstyperResponse,
} from '../Opptjening/opptjening.types'
import {
  byggEndringSummary,
  type EndringSummary,
  type LinjeStatus,
  oppsummeringForKategori,
  tilLinjeState,
} from '../Opptjening/opptjening.utils'
import { typeLabel } from '../Opptjening/opptjeningstyper.utils'
import type { OmsorgGrunnlagDTO, OmsorgTilSlettingDTO } from './omsorg.types'

export type OmsorgLinjeState = OmsorgGrunnlagDTO & {
  _id: string
  _status: LinjeStatus
  _original: OmsorgGrunnlagDTO | null
}

export const OMSORG_FELTER: (keyof OmsorgGrunnlagDTO)[] = ['omsorgType', 'ar', 'fnrOmsorgFor']

export function grupperOmsorgLinjer(linjer: OmsorgLinjeState[]) {
  const grupper = new Map<string | null, OmsorgLinjeState[]>()
  for (const linje of [...linjer].sort((venstre, hoyre) => venstre.ar - hoyre.ar)) {
    const fnr = linje.fnrOmsorgFor || null
    const gruppe = grupper.get(fnr)
    if (gruppe) {
      gruppe.push(linje)
    } else {
      grupper.set(fnr, [linje])
    }
  }
  return [...grupper.entries()]
}

export function omsorgLabel(l: OmsorgGrunnlagDTO, opptjeningstyper: OpptjeningstyperResponse): string {
  const omsorgFor = l.fnrOmsorgFor ? ` – omsorg for ${l.fnrOmsorgFor}` : ''
  return `${typeLabel(opptjeningstyper, l.omsorgType)} (${l.ar})${omsorgFor}`
}

export function byggOmsorgEndringSummary(
  linjer: OmsorgLinjeState[],
  opptjeningstyper: OpptjeningstyperResponse,
): EndringSummary {
  return byggEndringSummary([
    oppsummeringForKategori('Omsorg', linjer, { label: l => omsorgLabel(l, opptjeningstyper) }),
  ])
}

/**
 * Bygger omsorgslinjene fra grunnlaget og markerer linjene i en lagret vurdering som slettet,
 * slik at skjemaet kan vises read-only i attestering og oppsummering.
 * Slettinger som ikke finnes i grunnlaget legges til slutt med kun år og type.
 */
export function omsorgLinjerFraVurdering(
  grunnlag: OppdaterOpptjeningGrunnlag['opptjeningsGrunnlagDto'] | null | undefined,
  vurdering: OppdaterOpptjeningVurdering | null | undefined,
): OmsorgLinjeState[] {
  const omsorgListe = grunnlag?.omsorgListe ?? []
  const tilSletting = vurdering?.omsorgTilSletting ?? []
  const samme = (a: OmsorgTilSlettingDTO, b: OmsorgTilSlettingDTO) => a.ar === b.ar && a.omsorgType === b.omsorgType

  const fraGrunnlag: OmsorgLinjeState[] = omsorgListe.map((dto, i) => ({
    ...tilLinjeState(dto),
    _id: `omsorg-${i}`,
    _status: tilSletting.some(s => samme(s, dto)) ? 'deleted' : 'original',
  }))

  const utenforGrunnlag: OmsorgLinjeState[] = tilSletting
    .filter(s => !omsorgListe.some(o => samme(o, s)))
    .map((dto, i) => ({
      ...dto,
      _id: `omsorg-slettet-${i}`,
      _status: 'deleted',
      _original: null,
    }))

  return [...fraGrunnlag, ...utenforGrunnlag]
}

export function toOmsorgTilSletting(l: OmsorgLinjeState): OmsorgTilSlettingDTO {
  return {
    ar: Number(l.ar),
    omsorgType: l.omsorgType,
  }
}

export function byggOmsorgPayload(linjer: OmsorgLinjeState[], fnr: string): OppdaterOpptjeningVurdering {
  return {
    fnr,
    omsorgTilSletting: linjer.filter(l => l._status === 'deleted').map(toOmsorgTilSletting),
  }
}

/** Backend identifiserer omsorg kun med år og type, så øvrige felter hentes fra grunnlaget for visning. */
export function medOmsorgGrunnlag(
  dto: OmsorgTilSlettingDTO,
  omsorgListe: OmsorgGrunnlagDTO[] | undefined,
): OmsorgGrunnlagDTO {
  const original = omsorgListe?.find(o => o.omsorgType === dto.omsorgType && o.ar === dto.ar)
  return { ...original, ...dto }
}
