import type { LinjeStatus } from '../felles/opptjening.utils'
import type { OppdaterOpptjeningVurdering, OpptjeningstyperResponse } from '../felles/opptjening-types'
import { typeLabel } from '../felles/opptjeningstyper.utils'
import type { OmsorgGrunnlagDTO, OmsorgTilSlettingDTO } from './omsorg-types'

export type OmsorgLinjeState = OmsorgGrunnlagDTO & {
  _id: string
  _status: LinjeStatus
  _original: OmsorgGrunnlagDTO | null
}

export const OMSORG_FELTER: (keyof OmsorgGrunnlagDTO)[] = ['omsorgType', 'ar', 'fnrOmsorgFor']

export function omsorgLabel(l: OmsorgGrunnlagDTO, opptjeningstyper: OpptjeningstyperResponse): string {
  const omsorgFor = l.fnrOmsorgFor ? ` – omsorg for ${l.fnrOmsorgFor}` : ''
  return `${typeLabel(opptjeningstyper, l.omsorgType)} (${l.ar})${omsorgFor}`
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
