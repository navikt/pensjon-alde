import type { AktivitetDTO, BehandlingDTO } from './behandling'

export type AktivitetComponentProps<Grunnlag, Vurdering> = {
  readOnly: boolean
  grunnlag: Grunnlag
  vurdering: Vurdering | null
  aktivitet: AktivitetDTO
  behandling: BehandlingDTO
}
