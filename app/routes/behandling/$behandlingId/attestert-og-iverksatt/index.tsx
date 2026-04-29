import { CheckmarkCircleIcon } from '@navikt/aksel-icons'
import { Heading, HStack, Link, Loader, Page, VStack } from '@navikt/ds-react'
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
  const { psakOppgaveoversikt, psakSakUrlTemplate } = env

  const behandling = await createBehandlingApi({ request, behandlingId }).hentBehandling()

  if (
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_ATTESTERING ||
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.VENTER_MASKINELL ||
    behandling.aldeBehandlingStatus === AldeBehandlingStatus.FULLFORT
  ) {
    return {
      behandlingId,
      psakOppgaveoversikt: buildUrl(psakOppgaveoversikt, request, {}),
      psakPensjonsoversikt: buildUrl(psakSakUrlTemplate, request, { sakId: behandling.sakId }),
      status: behandling.aldeBehandlingStatus,
    }
  } else {
    return redirect(`/behandling/${behandlingId}`)
  }
}

const AttestertOgIverksatt = ({ loaderData }: Route.ComponentProps) => {
  const { psakOppgaveoversikt, psakPensjonsoversikt, status } = loaderData
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
        <CheckmarkCircleIcon fontSize="6rem" style={{ color: 'var(--ax-bg-success-strong)' }} />
        <Heading size="medium" level="1">
          <HStack align="center">Saken er attestert og iverksatt</HStack>
        </Heading>

        <HStack gap="2">
          <Link href={psakPensjonsoversikt}>Pensjonsoversikt</Link>
          <Link href={psakOppgaveoversikt}>Oppgavelisten</Link>
        </HStack>
      </VStack>
    </Page.Block>
  )
}

export default AttestertOgIverksatt
