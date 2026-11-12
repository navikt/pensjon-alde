import { redirect, type ShouldRevalidateFunctionArgs } from 'react-router'
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

export function utenForrigeKjoring(search: string) {
  const params = new URLSearchParams(search)
  params.delete(FORRIGE_KJORING_PARAM)
  const rest = params.toString()
  return rest ? `?${rest}` : ''
}

/**
 * Når valideringen er ferdig fjerner klienten forrigeKjoring fra URL-en. Dataene er allerede lastet,
 * så den navigasjonen skal ikke kjøre loaderne på nytt. Eksporteres som shouldRevalidate fra rutene
 * som lastes på aktivitetssiden.
 */
export function kunForrigeKjoringFjernet({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs): boolean {
  const fjernet =
    formMethod === undefined &&
    currentUrl.pathname === nextUrl.pathname &&
    currentUrl.searchParams.has(FORRIGE_KJORING_PARAM) &&
    !nextUrl.searchParams.has(FORRIGE_KJORING_PARAM) &&
    utenForrigeKjoring(currentUrl.search) === utenForrigeKjoring(nextUrl.search)
  return fjernet ? false : defaultShouldRevalidate
}
