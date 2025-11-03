import { BodyLong, Button, Heading, HStack, Page, VStack } from '@navikt/ds-react'
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
      pensjonsoversiktUrl: buildUrl(env.psakSakUrlTemplate, request, { sakId: behandling.sakId }),
    }
  }
}

const AvbruttAutomatisk = ({ loaderData }: Route.ComponentProps) => {
  const { pensjonsoversiktUrl } = loaderData
  return (
    <Page.Block gutters className={`${commonStyles.page} ${commonStyles.center}`}>
      <VStack gap="space-40">
        <VStack align="center" gap="space-8">
          <Heading size="medium" level="1">
            Kravet kan ikke behandles i pilot
          </Heading>
          <BodyLong>Saksbehandlig må fortsettes som normal kravbehandling.</BodyLong>
        </VStack>
        <HStack gap="2" justify="center">
          <Button size="small" as="a" href={pensjonsoversiktUrl}>
            Til Pensjonsoversikt
          </Button>
        </HStack>
      </VStack>
    </Page.Block>
  )
}

export default AvbruttAutomatisk
