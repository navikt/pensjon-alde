import type { OpptjeningstyperResponse } from '~/types/opptjeningstyper'

export function typeLabel(opptjeningstyper: OpptjeningstyperResponse, code: string): string {
  const alle = [...opptjeningstyper.omsorg.typer, ...opptjeningstyper.omsorg.subTyper]
  return alle.find(t => t.code === code)?.description ?? code
}
