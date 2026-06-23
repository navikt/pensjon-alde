export type OpptjeningType = 'INNTEKT' | 'MILITAER' | 'DAGPENGER' | 'OMSORG'

export type OppdaterPgiLinje = {
  type: OpptjeningType
  aar: number
  belop?: string | null
  skattekommune?: string | null
  registrertDato?: string | null
  kilde?: string | null
}

export type OppdaterPgiSakValg = {
  sakId: number
  sakType?: string | null
  sakStatus?: string | null
}

export type OppdaterOpptjeningGrunnlag = {
  saker: OppdaterPgiSakValg[]
  kanOppretteGenerellSak: boolean
}

export type OppdaterOpptjeningVurdering = {
  sakId: number
  linjer: OppdaterPgiLinje[]
}
