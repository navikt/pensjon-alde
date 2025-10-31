import { PersonCheckmarkIcon } from '@navikt/aksel-icons'
import { Box, Button, Heading, HStack, Loader, Page, VStack } from '@navikt/ds-react'
import { useEffect } from 'react'
import { redirect, useRevalidator } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import commonStyles from '~/common.module.css'
import { AldeBehandlingStatus } from '~/types/behandling'
import { buildUrl } from '~/utils/build-url'
import { env } from '~/utils/env.server'
import type { Route } from './+types'

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { behandlingId } = params

  const behandling = await createBehandlingApi({ request, behandlingId }).hentBehandling()

  if (
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_ATTESTERING ||
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.AUTOMATISK_TIL_MANUELL ||
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_MASKINELL
  ) {
    return {
      pensjonsoversiktUrl: buildUrl(env.psakSakUrlTemplate, request, { sakId: behandling.sakId }),
      oppsummeringUrl: `/behandling/${behandling.behandlingId}/oppsummering`,
      status: behandling.aldeBehandlingStatus,
    }
  } else {
    return redirect(`/behandling/${behandlingId}`)
  }
}

const AttesteringReturnertTilSaksbehandler = ({ loaderData }: Route.ComponentProps) => {
  const { pensjonsoversiktUrl, status } = loaderData

  const revalidator = useRevalidator()

  useEffect(() => {
    if (status === AldeBehandlingStatus.VENTER_ATTESTERING) {
      const intervalId = setInterval(() => {
        revalidator.revalidate()
      }, 1000)

      return () => clearInterval(intervalId)
    }
  }, [status, revalidator])

  if (status === AldeBehandlingStatus.VENTER_ATTESTERING) {
    return (
      <Page.Block gutters className={`${commonStyles.page} ${commonStyles.center}`}>
        <VStack gap="space-32" className="content" align="center">
          <Heading size="medium" level="1">
            Sender tilbake til saksbehandler
          </Heading>

          <Loader size="3xlarge" title="Sender tilbake til saksbehandler" />
        </VStack>
      </Page.Block>
    )
  }

  return (
    <Page.Block gutters className={`${commonStyles.page} ${commonStyles.center}`}>
      <VStack gap="8">
        <Heading size="medium" level="1">
          Kravet er returnert til saksbehandler
        </Heading>

        <Box.New style={{ display: 'flex', justifyContent: 'center' }}>
          <PersonCheckmarkIcon fontSize="6rem" style={{ color: 'var(--ax-text-success-decoration)' }} />
        </Box.New>
        <HStack gap="2" justify="center">
          <Button size="small" as="a" href={pensjonsoversiktUrl}>
            Til Pensjonsoversikt
          </Button>
        </HStack>
      </VStack>
    </Page.Block>
  )
}

export default AttesteringReturnertTilSaksbehandler
