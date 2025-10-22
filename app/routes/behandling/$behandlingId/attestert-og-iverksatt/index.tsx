import { CheckmarkCircleIcon } from '@navikt/aksel-icons'
import { Button, Heading, HStack, Loader, Page, VStack } from '@navikt/ds-react'
import { useEffect } from 'react'
import { redirect, useRevalidator } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import commonStyles from '~/common.module.css'
import { AldeBehandlingStatus } from '~/types/behandling'
import { env } from '~/utils/env.server'
import type { Route } from './+types'

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { behandlingId } = params
  const { psakOppgaveoversikt } = env

  const behandling = await createBehandlingApi({ request, behandlingId }).hentBehandling()

  if (
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_ATTESTERING ||
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.FULLFORT
  ) {
    return { behandlingId, psakOppgaveoversikt, status: behandling.aldeBehandlingStatus }
  } else {
    return redirect(`/behandling/${behandlingId}`)
  }
}

const AttestertOgIverksatt = ({ loaderData }: Route.ComponentProps) => {
  const { psakOppgaveoversikt, status } = loaderData
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
      <Page.Block gutters className={commonStyles.page}>
        <VStack gap="space-32" className="content" align="center">
          <Heading size="medium" level="1">
            Iverksetter
          </Heading>

          <Loader size="3xlarge" title="Iverksetter" />
        </VStack>
      </Page.Block>
    )
  }

  return (
    <Page.Block gutters className={commonStyles.page}>
      <VStack gap="space-32" className="content" align="center">
        <Heading size="medium" level="1">
          <HStack align="center">Saken er attestert og iverksatt</HStack>
        </Heading>

        <CheckmarkCircleIcon fontSize="6rem" style={{ color: 'var(--ax-bg-success-strong)' }} />

        <HStack gap="2">
          <Button as="a" size="small" href={psakOppgaveoversikt}>
            Til Oppgaveoversikt
          </Button>
        </HStack>
      </VStack>
    </Page.Block>
  )
}

export default AttestertOgIverksatt
