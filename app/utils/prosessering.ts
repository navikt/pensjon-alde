import { AktivitetStatus, type BehandlingDTO, BehandlingStatus } from '~/types/behandling'

/**
 * Søkeparameter som settes på aktivitetssiden etter at en vurdering er lagret, mens pen prosesserer
 * den asynkront. Siden blir stående med en intern lastetilstand til vi vet utfallet.
 */
export const PROSESSERER_PARAM = 'prosesserer'

const AVSLUTTENDE_BEHANDLINGSSTATUSER = [BehandlingStatus.FEILENDE, BehandlingStatus.FULLFORT, BehandlingStatus.STOPPET]

/**
 * Om behandlingen er ferdig med aktiviteten (eller har feilet/stoppet), slik at vi skal videre fra aktivitetssiden.
 * Avvist vurdering gir ikke ny aktivitet – samme aktivitet kjøres på nytt og venter på saksbehandler igjen.
 */
export function erFerdigMedAktivitet(behandling: BehandlingDTO, aktivitetId: string): boolean {
  if (AVSLUTTENDE_BEHANDLINGSSTATUSER.includes(behandling.status)) return true

  const aktivitet = behandling.aktiviteter.find(a => a.aktivitetId?.toString() === aktivitetId)
  return !aktivitet || aktivitet.status === AktivitetStatus.FULLFORT || aktivitet.status === AktivitetStatus.FEILET
}
