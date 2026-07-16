export type OpptjeningTypeKode = {
  code: string
  description: string
}

export type OpptjeningstyperKategori = {
  typer: OpptjeningTypeKode[]
  subTyper: OpptjeningTypeKode[]
}

export type OpptjeningstyperResponse = {
  inntekt: OpptjeningstyperKategori
  omsorg: OpptjeningstyperKategori
  dagpenger: OpptjeningstyperKategori
  forstegangstjeneste: OpptjeningstyperKategori
}
