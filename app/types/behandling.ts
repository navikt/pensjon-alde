export enum AldeBehandlingStatus {
  VENTER_SAKSBEHANDLER = 'VENTER_SAKSBEHANDLER',
  VENTER_MASKINELL = 'VENTER_MASKINELL',
  VENTER_ATTESTERING = 'VENTER_ATTESTERING',
  AUTOMATISK_TIL_MANUELL = 'AUTOMATISK_TIL_MANUELL',
  AVBRUTT_AV_BRUKER = 'AVBRUTT_AV_BRUKER',
  FULLFORT = 'FULLFORT',
}

export enum BehandlingStatus {
  OPPRETTET = 'OPPRETTET',
  STARTET = 'STARTET',
  FEILENDE = 'FEILENDE',
  FULLFORT = 'FULLFORT',
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
  behandlingId: number
  type: string
  aldeBehandlingStatus: AldeBehandlingStatus

  handlerName: string | null
  friendlyName: string | null

  sisteKjoring: AldeBehandlingKjoringDTO | null // LocalDateTime as ISO string

  sisteKjoringDato: string // LocalDateTime as ISO string
  utsattTil: string | null // LocalDateTime as ISO string
  opprettet: string // LocalDateTime as ISO string
  stoppet: string | null // LocalDateTime as ISO string
  status: BehandlingStatus
  aktiviteter: AktivitetDTO[]
  sisteSaksbehandlerNavident?: string

  fnr: string | null
  sakId: number | null
  kravId: number | null
  fornavn: string | null
  mellomnavn: string | null
  etternavn: string | null
  fodselsdato: string | null // LocalDate as ISO string
}

export interface AldeBehandlingKjoringDTO {
  behandlingId: number
  aktivitetId: number | null
  startet: string // LocalDateTime as ISO string
  avsluttet: string // LocalDateTime as ISO string
  uuid: string | null
  traceId: string | null
  behandlingKjoringId: number | null
  correlationId: string
  feilmelding: string | null
  stackTrace: string | null
}

export interface ReturnerTilSaksbehandlerDTO {
  begrunnelse: string
}
