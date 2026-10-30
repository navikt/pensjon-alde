import { type AktivitetDTO, AktivitetStatus } from '~/types/behandling'

export function erAapenAktivitet(
  aktivitet: Pick<AktivitetDTO, 'status' | 'behandletFerdigMaskinelt' | 'handlerName'>,
): boolean {
  return (
    Boolean(aktivitet.handlerName) &&
    !aktivitet.behandletFerdigMaskinelt &&
    (aktivitet.status === AktivitetStatus.UNDER_BEHANDLING ||
      aktivitet.status === AktivitetStatus.FEILET ||
      aktivitet.status === AktivitetStatus.OPPRETTET)
  )
}

export function finnAapneAktiviteterForSaksbehandler(aktiviteter: AktivitetDTO[]): AktivitetDTO[] {
  return aktiviteter
    .filter(
      aktivitet => erAapenAktivitet(aktivitet) && aktivitet.friendlyName && aktivitet.handlerName !== 'attestering',
    )
    .sort((a, b) => a.opprettet.localeCompare(b.opprettet))
}
