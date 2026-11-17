import { LIVE_POLL_INTERVAL_MS } from '~/hooks/use-behandling-events'
import {
  type AktivitetDTO,
  AktivitetStatus,
  AldeBehandlingStatus,
  type BehandlingDTO,
  BehandlingStatus,
} from '~/types/behandling'
import { aktivitetPath, finnAktivitetSomSkalVises, kanGaTilbakeTilSaksbehandler } from '~/utils/aktivitet-navigering'
import { erProsessertEtter } from '~/utils/fortsett-behandling'

export function skalPolle({ live, sistRevalidert, now }: { live: boolean; sistRevalidert: number; now: number }) {
  return !live || now - sistRevalidert >= LIVE_POLL_INTERVAL_MS
}

export function getNesteAktivitetPathFraEvent(event: BehandlingDTO): string | null {
  if (
    event.aldeBehandlingStatus !== AldeBehandlingStatus.VENTER_SAKSBEHANDLER ||
    event.status === BehandlingStatus.FEILENDE
  ) {
    return null
  }

  const aktivitet = finnAktivitetSomSkalVises(event.aktiviteter)
  return aktivitet ? aktivitetPath(event.behandlingId, aktivitet) : null
}

export type EventHandling = { type: 'naviger'; path: string } | { type: 'revalider' } | { type: 'ignorer' }

export function vurderEvent(event: BehandlingDTO, forrigeKjoring: string | null): EventHandling {
  if (forrigeKjoring !== null && !erProsessertEtter(event, forrigeKjoring)) {
    return { type: 'ignorer' }
  }

  const path = getNesteAktivitetPathFraEvent(event)
  if (path) {
    return { type: 'naviger', path }
  }

  if (event.status === BehandlingStatus.FEILENDE) {
    return { type: 'revalider' }
  }

  if (event.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_MASKINELL) {
    return { type: 'ignorer' }
  }

  return { type: 'revalider' }
}

export function harEndring(event: BehandlingDTO, behandling: BehandlingDTO): boolean {
  return (
    event.status !== behandling.status ||
    event.aldeBehandlingStatus !== behandling.aldeBehandlingStatus ||
    event.sisteKjoring?.uuid !== behandling.sisteKjoring?.uuid
  )
}

export function vurderEventSomObservator({
  event,
  behandling,
  aktivitetId,
}: {
  event: BehandlingDTO
  behandling: BehandlingDTO
  aktivitetId: string | undefined
}): EventHandling {
  const endret = harEndring(event, behandling)
  const oppdater: EventHandling = endret ? { type: 'revalider' } : { type: 'ignorer' }

  const aktivAktivitet = finnAktivitetSomSkalVises(behandling.aktiviteter)
  const staarPaAktivAktivitet =
    aktivitetId !== undefined &&
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_SAKSBEHANDLER &&
    aktivAktivitet?.aktivitetId.toString() === aktivitetId

  if (!staarPaAktivAktivitet || !endret) return oppdater

  if (event.status === BehandlingStatus.FEILENDE) return { type: 'revalider' }

  if (event.aldeBehandlingStatus !== AldeBehandlingStatus.VENTER_SAKSBEHANDLER) {
    return { type: 'naviger', path: `/behandling/${event.behandlingId}` }
  }

  const nesteAktivitet = finnAktivitetSomSkalVises(event.aktiviteter)
  if (nesteAktivitet && nesteAktivitet.aktivitetId.toString() !== aktivitetId) {
    return { type: 'naviger', path: aktivitetPath(event.behandlingId, nesteAktivitet) }
  }

  return { type: 'revalider' }
}

export function vurderEventVedValidering(event: BehandlingDTO, aktivitetId: string): EventHandling {
  if (kanGaTilbakeTilSaksbehandler(event, aktivitetId)) return { type: 'revalider' }
  return { type: 'naviger', path: getNesteAktivitetPathFraEvent(event) ?? `/behandling/${event.behandlingId}` }
}

export function velgEventHandling({
  event,
  behandling,
  aktivitetId,
  forrigeKjoring,
  isLoading,
  venterPaSvar,
}: {
  event: BehandlingDTO
  behandling: BehandlingDTO
  aktivitetId: string | undefined
  forrigeKjoring: string | null
  isLoading: boolean
  venterPaSvar: boolean
}): EventHandling {
  if (isLoading) return vurderEvent(event, forrigeKjoring)
  if (venterPaSvar && aktivitetId !== undefined && forrigeKjoring !== null) {
    return vurderEventVedValidering(event, aktivitetId)
  }
  if (venterPaSvar) return { type: 'revalider' }
  return vurderEventSomObservator({ event, behandling, aktivitetId })
}

export function venterPaEndring(behandling: BehandlingDTO, isLoading: boolean, venterPaSvar = false): boolean {
  return isLoading || venterPaSvar || behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_ATTESTERING
}

export function finnAktivitetUnderBehandling(aktiviteter: AktivitetDTO[]): string | null {
  const finnMedStatus = (status: AktivitetStatus) =>
    aktiviteter.find(aktivitet => aktivitet.status === status && aktivitet.friendlyName)?.friendlyName

  return finnMedStatus(AktivitetStatus.UNDER_BEHANDLING) ?? finnMedStatus(AktivitetStatus.OPPRETTET) ?? null
}

export function aktiviteterForVisning({
  behandling,
  lastEvent,
  isLoading,
  forrigeKjoring,
}: {
  behandling: BehandlingDTO
  lastEvent: BehandlingDTO | undefined
  isLoading: boolean
  forrigeKjoring: string | null
}): AktivitetDTO[] {
  const brukEvent =
    isLoading && lastEvent !== undefined && (forrigeKjoring === null || erProsessertEtter(lastEvent, forrigeKjoring))
  return brukEvent ? lastEvent.aktiviteter : behandling.aktiviteter
}
