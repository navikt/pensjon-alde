import { PersonCheckmarkIcon } from '@navikt/aksel-icons'
import { Box, Button, Heading, HStack, Page, VStack } from '@navikt/ds-react'
import { redirect } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import commonStyles from '~/common.module.css'
import { AldeBehandlingStatus } from '~/types/behandling'
import { buildUrl } from '~/utils/build-url'
import { env } from '~/utils/env.server'
import type { Route } from './+types'

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { behandlingId } = params

  const behandling = await createBehandlingApi({ request, behandlingId }).hentBehandling()

  if (behandling.aldeBehandlingStatus !== AldeBehandlingStatus.AUTOMATISK_TIL_MANUELL) {
    return redirect(`/behandling/${behandlingId}`)
  } else {
    return {
      pensjonsoversiktUrl: buildUrl(env.psakSakUrlTemplate, { sakId: behandling.sakId }),
      oppsummeringUrl: `/behandling/${behandling.behandlingId}/oppsummering`,
    }
  }
}

const AttesteringReturnertTilSaksbehandler = ({ loaderData }: Route.ComponentProps) => {
  const { pensjonsoversiktUrl } = loaderData
  return (
    <Page.Block gutters className={commonStyles.page}>
      <VStack gap="8">
        <Heading size="medium" level="1">
          Kravet er retunert til saksbehandler.
        </Heading>

        <Box.New style={{ display: 'flex', justifyContent: 'center' }}>
          <PersonCheckmarkIcon fontSize="6rem" style={{ color: 'var(--ax-bg-success-strong)' }} />
        </Box.New>
        <HStack gap="2" justify="center">
          <Button size="small" as="a" href={pensjonsoversiktUrl}>
            Til pensjonsoversikt
          </Button>

          <Button size="small" variant="secondary" as="a" href={loaderData.oppsummeringUrl}>
            Vis oppsummering
          </Button>
        </HStack>
      </VStack>
    </Page.Block>
  )
}

export default AttesteringReturnertTilSaksbehandler
