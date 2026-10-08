import type { OpptjeningstyperResponse, OpptjeningTypeKode } from '~/types/opptjeningstyper'
import type { OppdaterOpptjeningGrunnlag } from './opptjening-types'

export function typeLabel(opptjeningstyper: OpptjeningstyperResponse, code: string): string {
  return opptjeningstyper.omsorg.typer.find(t => t.code === code)?.description ?? code
}

export function opptjeningstyperFraGrunnlag(
  grunnlag: OppdaterOpptjeningGrunnlag | null | undefined,
): OpptjeningstyperResponse {
  const typer = (grunnlag?.opptjeningstyper ?? []).filter((t): t is OpptjeningTypeKode => !!t.code && !!t.description)
  return { omsorg: { typer, subTyper: [] } }
}
