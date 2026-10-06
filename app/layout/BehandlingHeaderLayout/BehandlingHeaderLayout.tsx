import { PersonIcon } from '@navikt/aksel-icons'
import { Box, CopyButton, HStack, Page, Spacer } from '@navikt/ds-react'
import { Outlet, type ShouldRevalidateFunctionArgs, useOutletContext, useRouteLoaderData } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import { Fnr } from '~/components/Fnr'
import { Header } from '~/layout/Header/Header'
import type { RootOutletContext, loader as rootLoader } from '~/root'
import { buildUrl } from '~/utils/build-url'
import { formatDateToAge, formatDateToNorwegian } from '~/utils/date'
import { env } from '~/utils/env.server'
import { buildPsakOversiktUrl } from '~/utils/psak-oversikt-url.server'
import type { Route } from './+types/BehandlingHeaderLayout'
import styles from './BehandlingHeaderLayout.module.css'

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId } = params

  const api = createBehandlingApi({ request, behandlingId })
  const toppbarinfo = await api.hentToppbarinfo()

  return {
    toppbarinfo,
    psakOppgaveoversiktUrl: buildUrl(env.psakOppgaveoversikt, request, {}),
    psakPensjonsoversiktUrl: buildPsakOversiktUrl(request, toppbarinfo),
  }
}

export function shouldRevalidate({ currentParams, nextParams, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (currentParams.behandlingId !== nextParams.behandlingId) {
    return defaultShouldRevalidate
  }
  return false
}

export default function BehandlingHeaderLayout({ loaderData }: Route.ComponentProps) {
  const { toppbarinfo, psakOppgaveoversiktUrl, psakPensjonsoversiktUrl } = loaderData

  const root = useRouteLoaderData<typeof rootLoader>('root')
  if (!root) throw new Error('Root loader data not found')

  const { me, verdandeAktivitetUrl, verdandeBehandlingUrl, telemetry } = root
  const outletContext = useOutletContext<RootOutletContext>()
  const { setDarkmode, isDarkmode } = outletContext

  return (
    <div className={styles.root}>
      <Header
        me={me}
        isDarkmode={isDarkmode}
        setDarkmode={setDarkmode}
        psakPensjonsoversiktUrl={psakPensjonsoversiktUrl}
        psakOppgaveoversiktUrl={psakOppgaveoversiktUrl}
        environment={telemetry.environment}
        verdandeAktivitetUrl={verdandeAktivitetUrl}
        verdandeBehandlingUrl={verdandeBehandlingUrl}
      />
      <Box asChild>
        <Page contentBlockPadding="none" className={styles.pageFullHeight}>
          <Box
            paddingInline="space-40"
            paddingBlock="space-8"
            borderWidth="1 0"
            background="neutral-soft"
            borderColor="neutral-subtle"
          >
            <HStack align="center" gap="space-4">
              <HStack align="center">
                <PersonIcon fontSize="1.5em" /> <Fnr value={toppbarinfo.fnr} />
              </HStack>
              <span>/</span>
              {toppbarinfo.etternavn}, {toppbarinfo.fornavn} {toppbarinfo.mellomnavn}
              <span>/</span>
              Født: {formatDateToNorwegian(toppbarinfo.fodselsdato)} ({formatDateToAge(toppbarinfo.fodselsdato)})
              <Spacer />
              {toppbarinfo.sakType}
              {toppbarinfo.sakId && (
                <>
                  <span>/</span>
                  <HStack align="center">
                    {toppbarinfo.sakId}
                    <CopyButton size="small" data-color="accent" copyText={toppbarinfo.sakId.toString()} />
                  </HStack>
                </>
              )}
            </HStack>
          </Box>

          <Outlet context={outletContext} />
        </Page>
      </Box>
    </div>
  )
}
