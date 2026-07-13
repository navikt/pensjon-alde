import { CheckmarkCircleIcon } from '@navikt/aksel-icons'
import { Heading, HStack, Link, Page, VStack } from '@navikt/ds-react'
import { redirect } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import commonStyles from '~/common.module.css'
import { AldeBehandlingStatus } from '~/types/behandling'
import { buildUrl } from '~/utils/build-url'
import { env } from '~/utils/env.server'
import { buildPsakOversiktUrl } from '~/utils/psak-oversikt-url.server'
import type { Route } from './+types'

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const { behandlingId } = params

  const behandling = await createBehandlingApi({ request, behandlingId }).hentBehandling()

  if (behandling.aldeBehandlingStatus !== AldeBehandlingStatus.VENTER_ATTESTERING) {
    return redirect(`/behandling/${behandlingId}`)
  } else {
    return {
      psakOppgaveoversiktUrl: buildUrl(env.psakOppgaveoversikt, request, {}),
      psakPensjonsoversiktUrl: buildPsakOversiktUrl(request, behandling),
    }
  }
}

const Avbrutt = ({ loaderData }: Route.ComponentProps) => {
  const { psakOppgaveoversiktUrl, psakPensjonsoversiktUrl } = loaderData

  return (
    <Page.Block gutters className={`${commonStyles.page} ${commonStyles.center}`}>
      <VStack gap="space-32" className="content" align="center">
        <CheckmarkCircleIcon fontSize="6rem" style={{ color: 'var(--ax-bg-success-strong)' }} />
        <Heading size="medium" level="1">
          <HStack align="center">Sendt til attestering</HStack>
        </Heading>

        <VStack align="center" gap="space-8">
          <Link href={psakPensjonsoversiktUrl}>Pensjonsoversikt</Link>
          <Link href={psakOppgaveoversiktUrl}>Oppgavelisten</Link>
        </VStack>
      </VStack>
    </Page.Block>
  )
}

export default Avbrutt
