export interface Attesteringsdata {
  aktiviter: AktivitetAtt[]
}

export interface AktivitetAtt {
  aktivitetId: number
  grunnlag: string // JSON string
  vurdering: string // JSON string
}
