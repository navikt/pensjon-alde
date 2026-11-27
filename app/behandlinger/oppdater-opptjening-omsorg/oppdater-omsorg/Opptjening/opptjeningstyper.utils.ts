import type { OppdaterOpptjeningGrunnlag, OpptjeningstyperResponse, OpptjeningTypeKode } from './opptjening.types'

export function typeLabel(opptjeningstyper: OpptjeningstyperResponse, type: string): string {
  return opptjeningstyper.omsorg.typer.find(t => t.type === type)?.beskrivelse ?? type
}

export function opptjeningstyperFraGrunnlag(
  grunnlag: OppdaterOpptjeningGrunnlag | null | undefined,
): OpptjeningstyperResponse {
  const typer = (grunnlag?.opptjeningstyper ?? []).filter((t): t is OpptjeningTypeKode => !!t.type && !!t.beskrivelse)
  return { omsorg: { typer, subTyper: [] } }
}
