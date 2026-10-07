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

export interface ToppbarInfo {
  fnr: string | null
  sakId: number | null
  sakType: string | null
  fornavn: string
  etternavn: string
  mellomnavn: string | null
  fodselsdato: string // LocalDate as ISO string
}
