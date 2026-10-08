export type OpptjeningTypeKode = {
  code: string
  description: string
}

export type OpptjeningstyperKategori = {
  typer: OpptjeningTypeKode[]
  subTyper: OpptjeningTypeKode[]
}

export type OpptjeningstyperResponse = {
  omsorg: OpptjeningstyperKategori
}
