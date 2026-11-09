import { redirect } from 'react-router'
import type { BehandlingDTO } from '~/types/behandling'

export const FORRIGE_KJORING_PARAM = 'forrigeKjoring'

export function fortsettBehandlingUrl({
  behandlingId,
  forrigeKjoring,
}: {
  behandlingId: string
  forrigeKjoring: string | null
}) {
  const params = new URLSearchParams({ [FORRIGE_KJORING_PARAM]: forrigeKjoring ?? '' })
  return `/behandling/${behandlingId}?${params}`
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
