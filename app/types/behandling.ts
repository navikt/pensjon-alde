export enum AldeBehandlingStatus {
  VENTER_SAKSBEHANDLER = 'VENTER_SAKSBEHANDLER',
  VENTER_MASKINELL = 'VENTER_MASKINELL',
  VENTER_ATTESTERING = 'VENTER_ATTESTERING',
  FULLFORT = 'FULLFORT',
}

export enum BehandlingStatus {
  OPPRETTET = 'OPPRETTET',
  STARTET = 'STARTET',
  FERDIG = 'FERDIG',
  FEILET = 'FEILET',
  STOPPET = 'STOPPET',
  UTSATT = 'UTSATT',
  UNDER_BEHANDLING = 'UNDER_BEHANDLING',
}

export enum AktivitetStatus {
  OPPRETTET = 'OPPRETTET',
  FEILET = 'FEILET',
  FULLFORT = 'FULLFORT',
  UNDER_BEHANDLING = 'UNDER_BEHANDLING',
}

export interface AktivitetDTO {
  aktivitetId: number
  type: string
  opprettet: string // LocalDateTime as ISO string

  handlerName: string
  friendlyName: string

  antallGangerKjort: number
  sisteAktiveringsdato: string // LocalDateTime as ISO string
  status: AktivitetStatus
  utsattTil: string | null // LocalDateTime as ISO string
}

export interface BehandlingDTO {
  behandlingId: number | null
  type: string
  aldeBehandlingStatus: AldeBehandlingStatus

  handlerName: string | null
  friendlyName: string | null

  sisteKjoring: string // LocalDateTime as ISO string
  utsattTil: string | null // LocalDateTime as ISO string
  opprettet: string // LocalDateTime as ISO string
  stoppet: string | null // LocalDateTime as ISO string
  status: BehandlingStatus
  aktiviteter: AktivitetDTO[]

  fnr: string | null
  sakId: number | null
  kravId: number | null
  fornavn: string | null
  mellomnavn: string | null
  etternavn: string | null
  fodselsdato: string | null // LocalDate as ISO string
}
