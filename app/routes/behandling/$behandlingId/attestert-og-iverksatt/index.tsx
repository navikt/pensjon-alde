import { CheckmarkCircleIcon } from '@navikt/aksel-icons'
import { Button, Heading, HStack, Page, VStack } from '@navikt/ds-react'
import { redirect } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import commonStyles from '~/common.module.css'
import { AldeBehandlingStatus } from '~/types/behandling'
import { env } from '~/utils/env.server'
import type { Route } from './+types'

type Loader = (data: Route.LoaderArgs) => Promise<{ behandlingId: string; psakOppgaveoversikt: string } | Response>

export const loader: Loader = async ({ request, params }) => {
  const { behandlingId } = params
  const { psakOppgaveoversikt } = env

  const behandling = await createBehandlingApi({ request, behandlingId }).hentBehandling()

  if (behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_ATTESTERING) {
    return { behandlingId, psakOppgaveoversikt }
  } else {
    return redirect(`/behandling/${behandlingId}`)
  }
}

const AttestertOgIverksatt = ({ loaderData }: Route.ComponentProps) => {
  const { psakOppgaveoversikt } = loaderData
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
