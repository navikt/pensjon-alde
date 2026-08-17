export interface Attesteringsdata {
  aktiviter: AktivitetAtt[]
  journalpostId?: string
}

export interface AktivitetAtt {
  aktivitetId: number
  grunnlag: string // JSON string
  vurdering: string // JSON string
  vurdertTidspunkt: string
  vurdertAvBrukerId: string
  vurdertAvBrukerNavn: string
  begrunnelse?: string
}
