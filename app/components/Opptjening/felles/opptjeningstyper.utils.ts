import type { OpptjeningstyperResponse } from '~/types/opptjeningstyper'

export function typeLabel(opptjeningstyper: OpptjeningstyperResponse, code: string): string {
  return opptjeningstyper.omsorg.typer.find(t => t.code === code)?.description ?? code
}
