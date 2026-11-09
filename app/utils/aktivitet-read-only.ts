import { type AktivitetDTO, AktivitetStatus } from '~/types/behandling'

export function erAktivitetReadOnly(aktivitet: Pick<AktivitetDTO, 'status'>): boolean {
  return aktivitet.status === AktivitetStatus.FULLFORT
}
