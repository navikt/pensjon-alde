import { BodyLong, Heading, Link, Page, VStack } from '@navikt/ds-react'
import { redirect } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import commonStyles from '~/common.module.css'
import { useBehandlingHeaderData } from '~/layout/BehandlingHeaderLayout/use-behandling-header-data'
import { AldeBehandlingStatus } from '~/types/behandling'
import type { Route } from './+types'

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { behandlingId } = params

  const behandling = await createBehandlingApi({ request, behandlingId }).hentBehandling()

  if (behandling.aldeBehandlingStatus !== AldeBehandlingStatus.AUTOMATISK_TIL_MANUELL) {
    return redirect(`/behandling/${behandlingId}`)
  }

  return null
}

const AvbruttAutomatisk = () => {
  const { psakPensjonsoversiktUrl } = useBehandlingHeaderData()
  return (
    <Page.Block gutters className={`${commonStyles.page} ${commonStyles.center}`}>
      <VStack gap="space-40">
        <VStack align="center" gap="space-8">
          <Heading size="medium" level="1">
            Kravet kan ikke behandles her.
          </Heading>
          <BodyLong>Saksbehandlingen må fortsettes som normal kravbehandling.</BodyLong>
        </VStack>
        <VStack gap="space-8" align="center">
          <Link href={psakPensjonsoversiktUrl}>Pensjonsoversikt</Link>
        </VStack>
      </VStack>
    </Page.Block>
  )
}

export default AvbruttAutomatisk
