import { Heading, Link, Page, VStack } from '@navikt/ds-react'
import { redirect } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import commonStyles from '~/common.module.css'
import { AldeBehandlingStatus } from '~/types/behandling'
import { buildPsakOversiktUrl } from '~/utils/psak-oversikt-url.server'
import type { Route } from './+types'

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { behandlingId } = params

  const behandling = await createBehandlingApi({ request, behandlingId }).hentBehandling()

  if (behandling.aldeBehandlingStatus !== AldeBehandlingStatus.AVBRUTT_AV_BRUKER) {
    return redirect(`/behandling/${behandlingId}`)
  } else {
    return {
      psakPensjonsoversiktUrl: buildPsakOversiktUrl(request, behandling),
    }
  }
}

const AvbruttManuelt = ({ loaderData }: Route.ComponentProps) => {
  const { psakPensjonsoversiktUrl } = loaderData
  return (
    <Page.Block gutters className={`${commonStyles.page} ${commonStyles.center}`}>
      <VStack gap="space-32">
        <Heading size="medium" level="1">
          Del-automatisk behandling er avbrutt
        </Heading>

        <VStack gap="space-8" align="center">
          <Link href={psakPensjonsoversiktUrl}>Pensjonsoversikt</Link>
        </VStack>
      </VStack>
    </Page.Block>
  )
}

export default AvbruttManuelt
