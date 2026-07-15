import { buildUrl } from './build-url'
import { env } from './env.server'
import { encryptPid } from './pid-encryption.server'

export function buildPsakOversiktUrl(
  request: Request,
  behandling: { sakId: number | null; fnr: string | null },
): string {
  if (behandling.sakId !== null) {
    return buildUrl(env.psakSakUrlTemplate, request, { sakId: behandling.sakId })
  }

  if (!behandling.fnr) {
    return buildUrl(env.psakOversiktUrlTemplate, request, {})
  }

  return buildUrl(`${env.psakOversiktUrlTemplate}/${encryptPid(behandling.fnr)}`, request, {})
}
