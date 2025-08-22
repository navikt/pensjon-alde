export enum BehandlingStatus {
  OPPRETTET = "OPPRETTET",
  STARTET = "STARTET",
  FERDIG = "FERDIG",
  FEILET = "FEILET",
  STOPPET = "STOPPET",
  UTSATT = "UTSATT",
}

export enum Prioritet {
  LAV = "LAV",
  NORMAL = "NORMAL",
  HOY = "HOY",
  KRITISK = "KRITISK",
}

export enum AktivitetStatus {
  OPPRETTET = "OPPRETTET",
  KLAR = "KLAR",
  STARTET = "STARTET",
  FERDIG = "FERDIG",
  FEILET = "FEILET",
  HOPPET_OVER = "HOPPET_OVER",
  UTSATT = "UTSATT",
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
  uuid: string;
  funksjonellIdentifikator: string;
  antallGangerKjort: number;
  sisteAktiveringsdato: string; // LocalDateTime as ISO string
  status: AktivitetStatus;
  utsattTil: string | null; // LocalDateTime as ISO string
  ventPaForegaendeAktiviteter: boolean;
}

export interface BehandlingDTO {
  behandlingId: number | null;
  type: string;
  uuid: string;
  funksjonellIdentifikator: string;
  forrigeBehandlingId: number | null;
  sisteKjoring: string; // LocalDateTime as ISO string
  utsattTil: string | null; // LocalDateTime as ISO string
  opprettet: string; // LocalDateTime as ISO string
  planlagtStartet: string | null; // LocalDateTime as ISO string
  stoppet: string | null; // LocalDateTime as ISO string
  status: BehandlingStatus;
  prioritet: Prioritet;
  behandlingKjoringer: BehandlingKjoringDTO[];
  aktiviteter: AktivitetDTO[];
  ansvarligTeam: Team | null;
  fnr: string | null;
  sakId: number | null;
  kravId: number | null;
  vedtakId: number | null;
  journalpostId: string | null;
  parametere: Record<string, string | null>;
  debugJson: string | null;
  muligeKontrollpunkt: KontrollpunktDecode[];
}

export interface BehandlingApiResponse {
  data: BehandlingDTO;
}
