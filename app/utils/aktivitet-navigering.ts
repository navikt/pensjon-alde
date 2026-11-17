import {
  type AktivitetDTO,
  AktivitetStatus,
  AldeBehandlingStatus,
  type BehandlingDTO,
  BehandlingStatus,
} from '~/types/behandling'

export function finnAktivitetSomSkalVises(aktiviteter: AktivitetDTO[]): AktivitetDTO | undefined {
  const erAktivOgVenter = (aktivitet: AktivitetDTO) =>
    !aktivitet.behandletFerdigMaskinelt &&
    (aktivitet.status === AktivitetStatus.UNDER_BEHANDLING ||
      aktivitet.status === AktivitetStatus.FEILET ||
      aktivitet.status === AktivitetStatus.OPPRETTET)

  return (
    aktiviteter.find(aktivitet => erAktivOgVenter(aktivitet) && aktivitet.handlerName && aktivitet.friendlyName) ??
    aktiviteter.find(aktivitet => erAktivOgVenter(aktivitet) && aktivitet.handlerName)
  )
}

export function venterSaksbehandlerPaAktivitet(behandling: BehandlingDTO, aktivitetId: string): boolean {
  return (
    behandling.status !== BehandlingStatus.FEILENDE &&
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_SAKSBEHANDLER &&
    finnAktivitetSomSkalVises(behandling.aktiviteter)?.aktivitetId.toString() === aktivitetId
  )
}

const APNE_AKTIVITETSTATUSER = [AktivitetStatus.OPPRETTET, AktivitetStatus.UNDER_BEHANDLING, AktivitetStatus.FEILET]

export function kanGaTilbakeTilSaksbehandler(behandling: BehandlingDTO, aktivitetId: string): boolean {
  if (behandling.status === BehandlingStatus.FEILENDE) return false
  if (
    behandling.aldeBehandlingStatus !== AldeBehandlingStatus.VENTER_MASKINELL &&
    behandling.aldeBehandlingStatus !== AldeBehandlingStatus.VENTER_SAKSBEHANDLER
  ) {
    return false
  }
  const aktivitet = behandling.aktiviteter.find(a => a.aktivitetId.toString() === aktivitetId)
  return aktivitet !== undefined && APNE_AKTIVITETSTATUSER.includes(aktivitet.status)
}
