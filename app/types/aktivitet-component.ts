import type { AktivitetDTO, BehandlingDTO } from './behandling'

export type FormErrors<T> = Partial<Record<keyof T | '_form', string>>

export type AktivitetComponentProps<Grunnlag, Vurdering> = {
  readOnly: boolean
  grunnlag: Grunnlag
  vurdering: Vurdering | null
  aktivitet: AktivitetDTO
  behandling: BehandlingDTO
  avbrytAktivitet?: () => void
  errors?: FormErrors<Vurdering>
}
