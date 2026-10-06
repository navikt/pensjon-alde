import { Heading, Link, Page, VStack } from '@navikt/ds-react'
import { redirect } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import commonStyles from '~/common.module.css'
import { useBehandlingHeaderData } from '~/layout/BehandlingHeaderLayout/use-behandling-header-data'
import { AldeBehandlingStatus } from '~/types/behandling'
import type { Route } from './+types'

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { behandlingId } = params

  const behandling = await createBehandlingApi({ request, behandlingId }).hentBehandling()

  if (behandling.aldeBehandlingStatus !== AldeBehandlingStatus.AVBRUTT_AV_BRUKER) {
    return redirect(`/behandling/${behandlingId}`)
  }

  return null
}

const AvbruttManuelt = () => {
  const { psakPensjonsoversiktUrl } = useBehandlingHeaderData()
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
