import type { OpptjeningstyperResponse } from '~/types/opptjeningstyper'

export function typeLabel(opptjeningstyper: OpptjeningstyperResponse, code: string): string {
  const alle = [
    ...opptjeningstyper.inntekt.typer,
    ...opptjeningstyper.omsorg.typer,
    ...opptjeningstyper.dagpenger.typer,
    ...opptjeningstyper.forstegangstjeneste.typer,
    ...opptjeningstyper.forstegangstjeneste.subTyper,
  ]
  return alle.find(t => t.code === code)?.description ?? code
}
