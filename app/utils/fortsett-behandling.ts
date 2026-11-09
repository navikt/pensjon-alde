import { redirect } from 'react-router'
import type { BehandlingDTO } from '~/types/behandling'

export const FORRIGE_KJORING_PARAM = 'forrigeKjoring'

export function medForrigeKjoring(pathname: string, forrigeKjoring: string | null) {
  const params = new URLSearchParams({ [FORRIGE_KJORING_PARAM]: forrigeKjoring ?? '' })
  return `${pathname}?${params}`
}

export function fortsettBehandlingUrl({
  behandlingId,
  forrigeKjoring,
}: {
  behandlingId: string
  forrigeKjoring: string | null
}) {
  return medForrigeKjoring(`/behandling/${behandlingId}`, forrigeKjoring)
}

export function fortsettBehandling(args: { behandlingId: string; forrigeKjoring: string | null }) {
  return redirect(fortsettBehandlingUrl(args))
}

export function erProsessertEtter(behandling: BehandlingDTO, forrigeKjoring: string): boolean {
  return (behandling.sisteKjoring?.uuid ?? '') !== forrigeKjoring
}

export function venterPaNyKjoring(behandling: BehandlingDTO, forrigeKjoring: string | null) {
  return forrigeKjoring !== null && !erProsessertEtter(behandling, forrigeKjoring)
}

export function venterPaValideringPaAktivitet(aktivitetId: string | undefined, searchParams: URLSearchParams) {
  return aktivitetId !== undefined && searchParams.has(FORRIGE_KJORING_PARAM)
}
