import {
  type AktivitetDTO,
  AktivitetStatus,
  AldeBehandlingStatus,
  type BehandlingDTO,
  BehandlingStatus,
} from '~/types/behandling'
import {
  aktivitetSomVenterPaSaksbehandler,
  finnAktivitetSomSkalVises,
  kanGaTilbakeTilSaksbehandler,
} from '~/utils/aktivitet-navigering'
import { erProsessertEtter } from '~/utils/fortsett-behandling'

function aktivAktivitetId(behandling: BehandlingDTO): string | undefined {
  if (behandling.aldeBehandlingStatus !== AldeBehandlingStatus.VENTER_SAKSBEHANDLER) return undefined
  return finnAktivitetSomSkalVises(behandling.aktiviteter)?.aktivitetId.toString()
}

function nesteAktivitetPath(event: BehandlingDTO): string | null {
  if (event.status === BehandlingStatus.FEILENDE) return null
  if (event.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_ATTESTERING) {
    return `/behandling/${event.behandlingId}/attestering`
  }
  const aktivitet = aktivitetSomVenterPaSaksbehandler(event)
  return aktivitet ? `/behandling/${event.behandlingId}/aktivitet/${aktivitet.aktivitetId}` : null
}

export function nesteSideFraEvent({
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
}): string | null {
  if (forrigeKjoring !== null && !erProsessertEtter(event, forrigeKjoring)) return null

  const neste = nesteAktivitetPath(event)
  const nesteEllerBehandling = neste ?? `/behandling/${event.behandlingId}`

  if (isLoading) return neste
  if (aktivitetId === undefined) return null

  if (venterPaSvar) {
    if (forrigeKjoring === null || kanGaTilbakeTilSaksbehandler(event, aktivitetId)) return null
    return nesteEllerBehandling
  }

  const varAktiv = aktivAktivitetId(behandling) === aktivitetId
  return varAktiv && aktivAktivitetId(event) !== aktivitetId ? nesteEllerBehandling : null
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

export function finnAktivitetUnderBehandling(aktiviteter: AktivitetDTO[]): string | null {
  const finnMedStatus = (status: AktivitetStatus) =>
    aktiviteter.find(aktivitet => aktivitet.status === status && aktivitet.friendlyName)?.friendlyName

  return finnMedStatus(AktivitetStatus.UNDER_BEHANDLING) ?? finnMedStatus(AktivitetStatus.OPPRETTET) ?? null
}
