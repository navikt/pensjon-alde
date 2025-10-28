import { CheckmarkCircleIcon } from '@navikt/aksel-icons'
import { Button, Heading, HStack, Page, VStack } from '@navikt/ds-react'
import { redirect } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import commonStyles from '~/common.module.css'
import { AldeBehandlingStatus } from '~/types/behandling'
import { buildUrl } from '~/utils/build-url'
import { env } from '~/utils/env.server'
import type { Route } from './+types'

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const { behandlingId } = params

  const behandling = await createBehandlingApi({ request, behandlingId }).hentBehandling()

  if (behandling.aldeBehandlingStatus !== AldeBehandlingStatus.VENTER_ATTESTERING) {
    return redirect(`/behandling/${behandlingId}`)
  } else {
    return {
      behandlingId,
      psakOppgaveoversikt: env.psakOppgaveoversikt,
      psakPensjonsoversikt: buildUrl(env.psakSakUrlTemplate, { sakId: behandling.sakId }, request),
    }
  }
}

export const action = async ({ params }: Route.ActionArgs) => {
  const { behandlingId } = params
  return redirect(`/behandling/${behandlingId}/oppsummering`)
}

const Avbrutt = ({ loaderData }: Route.ComponentProps) => {
  const { psakOppgaveoversikt } = loaderData
  return (
    <Page.Block gutters className={`${commonStyles.page} ${commonStyles.center}`}>
      <VStack gap="space-32" className="content" align="center">
        <Heading size="medium" level="1">
          <HStack align="center">Sendt til attestering</HStack>
        </Heading>

        <CheckmarkCircleIcon fontSize="6rem" style={{ color: 'var(--ax-bg-success-strong)' }} />

        <HStack gap="2">
          <Button as="a" size="small" href={psakOppgaveoversikt}>
            Til Pensjonsoversikten
          </Button>
          <Button as="a" variant="secondary" size="small" href={psakOppgaveoversikt}>
            Til Oppgaveoversikt
          </Button>
        </HStack>
      </VStack>
    </Page.Block>
  )
}

export default Avbrutt
