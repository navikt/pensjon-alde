import { PersonCheckmarkIcon } from '@navikt/aksel-icons'
import { Box, Heading, HStack, Link, Loader, Page, VStack } from '@navikt/ds-react'
import { useEffect, useRef } from 'react'
import { redirect, useRevalidator } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import commonStyles from '~/common.module.css'
import { AldeBehandlingStatus } from '~/types/behandling'
import { buildPsakOversiktUrl } from '~/utils/psak-oversikt-url.server'
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
      psakPensjonsoversiktUrl: buildPsakOversiktUrl(request, behandling),
      oppsummeringUrl: `/behandling/${behandling.behandlingId}/oppsummering`,
      status: behandling.aldeBehandlingStatus,
    }
  } else {
    return redirect(`/behandling/${behandlingId}`)
  }
}

const AttesteringReturnertTilSaksbehandler = ({ loaderData }: Route.ComponentProps) => {
  const { psakPensjonsoversiktUrl, status } = loaderData
  const { revalidate, state } = useRevalidator()
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (status === AldeBehandlingStatus.VENTER_ATTESTERING) {
      const intervalId = setInterval(() => {
        // Ny revalidering avbryter en pågående, som gjør at redirecten aldri lander
        if (stateRef.current === 'idle') {
          revalidate()
        }
      }, 1000)

      return () => clearInterval(intervalId)
    }
  }, [status, revalidate])

  if (status === AldeBehandlingStatus.VENTER_ATTESTERING) {
    return (
      <Page.Block gutters className={`${commonStyles.page} ${commonStyles.center}`}>
        <VStack gap="space-32" className="content" align="center">
          <Loader size="3xlarge" title="Sender tilbake til saksbehandler" />
          <Heading size="medium" level="1">
            Sender tilbake til saksbehandler
          </Heading>
        </VStack>
      </Page.Block>
    )
  }

  return (
    <Page.Block gutters className={`${commonStyles.page} ${commonStyles.center}`}>
      <VStack gap="space-32">
        <Box style={{ display: 'flex', justifyContent: 'center' }}>
          <PersonCheckmarkIcon fontSize="6rem" style={{ color: 'var(--ax-text-success-decoration)' }} />
        </Box>
        <Heading size="medium" level="1">
          Kravet er returnert til saksbehandler
        </Heading>

        <HStack gap="space-8" justify="center">
          <Link href={psakPensjonsoversiktUrl}>Pensjonsoversikt</Link>
        </HStack>
      </VStack>
    </Page.Block>
  )
}

export default AttesteringReturnertTilSaksbehandler
