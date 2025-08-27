export enum BehandlingStatus {
  OPPRETTET = "OPPRETTET",
  STARTET = "STARTET",
  FERDIG = "FERDIG",
  FEILET = "FEILET",
  STOPPET = "STOPPET",
  UTSATT = "UTSATT",
  UNDER_BEHANDLING = "UNDER_BEHANDLING",
}

export enum Prioritet {
  LAV = "LAV",
  NORMAL = "NORMAL",
  HOY = "HOY",
  KRITISK = "KRITISK",
}

export enum AktivitetStatus {
  OPPRETTET = "OPPRETTET",
  FEILET = "FEILET",
  FULLFORT = "FULLFORT",
  UNDER_BEHANDLING = "UNDER_BEHANDLING",
}

export interface Team {
  id: string;
  navn: string;
}

export interface KontrollpunktDecode {
  id: string;
  navn: string;
  beskrivelse?: string;
}

export interface BehandlingKjoringDTO {
  id: number;
  startet: string; // LocalDateTime as ISO string
  avsluttet?: string; // LocalDateTime as ISO string
  status: string;
}

export interface AktivitetDTO {
  aktivitetId: number | null;
  type: string;
  opprettet: string; // LocalDateTime as ISO string
  handlerName: string | null;
  friendlyName: string | null;
  antallGangerKjort: number;
  sisteAktiveringsdato: string; // LocalDateTime as ISO string
  status: AktivitetStatus;
  utsattTil: string | null; // LocalDateTime as ISO string
  uuid?: string;
  funksjonellIdentifikator?: string;
  ventPaForegaendeAktiviteter?: boolean;
}

export interface BehandlingDTO {
  behandlingId: number | null;
  type: string;
  handlerName: string | null;
  friendlyName: string | null;
  sisteKjoring: string; // LocalDateTime as ISO string
  utsattTil: string | null; // LocalDateTime as ISO string
  opprettet: string; // LocalDateTime as ISO string
  stoppet: string | null; // LocalDateTime as ISO string
  status: BehandlingStatus;
  aktiviteter: AktivitetDTO[];
  fnr: string | null;
  sakId: number | null;
  kravId: number | null;
  uuid?: string;
  funksjonellIdentifikator?: string;
  forrigeBehandlingId?: number | null;
  planlagtStartet?: string | null; // LocalDateTime as ISO string
  prioritet?: Prioritet;
  behandlingKjoringer?: BehandlingKjoringDTO[];
  ansvarligTeam?: Team | null;
  vedtakId?: number | null;
  journalpostId?: string | null;
  parametere?: Record<string, string | null>;
  debugJson?: string | null;
  muligeKontrollpunkt?: KontrollpunktDecode[];
}

export interface BehandlingApiResponse {
  data: BehandlingDTO;
}
