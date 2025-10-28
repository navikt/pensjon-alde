import { Button, Heading, HStack, Page, VStack } from '@navikt/ds-react'
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

  if (behandling.aldeBehandlingStatus !== AldeBehandlingStatus.AVBRUTT_AV_BRUKER) {
    return redirect(`/behandling/${behandlingId}`)
  } else {
    return {
      pensjonsoversiktUrl: buildUrl(env.psakSakUrlTemplate, { sakId: behandling.sakId }, request),
    }
  }
}

const AvbruttManuelt = ({ loaderData }: Route.ComponentProps) => {
  const { pensjonsoversiktUrl } = loaderData
  return (
    <Page.Block gutters className={`${commonStyles.page} ${commonStyles.center}`}>
      <VStack gap="8">
        <Heading size="medium" level="1">
          Behandlingen i pilot er avbrutt
        </Heading>

        <HStack gap="2" justify="center">
          <Button size="small" as="a" href={pensjonsoversiktUrl}>
            Til pensjonsoversikt
          </Button>
        </HStack>
      </VStack>
    </Page.Block>
  )
}

export default AvbruttManuelt
