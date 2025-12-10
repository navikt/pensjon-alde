import { Alert, Box, Detail, Heading, Page } from '@navikt/ds-react'
import { Outlet, redirect, useFetcher, useOutlet, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { createBehandlingApi } from '~/api/behandling-api'
import AktivitetDebug from '~/components/AktivitetDebug'
import FeilendeBehandling from '~/components/FeilendeBehandling'
import { type AktivitetDTO, BehandlingStatus } from '~/types/behandling'
import { buildAktivitetRedirectUrl } from '~/utils/handler-discovery'
import type { Route } from './+types/$aktivitetId'

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Aktivitet ${params.aktivitetId}` }, { name: 'description', content: 'Aktivitet detaljer' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createBehandlingApi({ request, behandlingId })
  const behandling = await api.hentBehandling()

  // Find the specific aktivitet using aktivitetId
  const aktivitet = behandling.aktiviteter.find((a: AktivitetDTO) => a.aktivitetId?.toString() === aktivitetId)

  if (!aktivitet) {
    throw new Error(`Aktivitet ${aktivitetId} not found`)
  }

  // Check if we should redirect to an implementation
  const implementationUrl = buildAktivitetRedirectUrl(behandlingId, aktivitetId, behandling, aktivitet)

  const url = new URL(request.url)
  const currentPath = url.pathname

  if (
    implementationUrl &&
    behandling.handlerName &&
    aktivitet.handlerName &&
    !currentPath.includes(behandling.handlerName) &&
    !currentPath.includes(aktivitet.handlerName)
  ) {
    return redirect(implementationUrl)
  }

  const showDebug = process.env.NAIS_CLUSTER_NAME !== 'prod-gcp'

  // Fetch debug data if debug parameter is present
  let debugData = { grunnlag: null, vurdering: null }

  if (showDebug) {
    try {
      const aktivitetApi = createAktivitetApi({
        request,
        behandlingId,
        aktivitetId,
      })

      const [grunnlag, vurdering] = await Promise.all([
        aktivitetApi
          // biome-ignore lint/suspicious/noExplicitAny: Bare for debug, og vet ikke hvordan grunnlag ser ut for aktivitet
          .hentGrunnlagsdata<any>()
          .catch(() => null),
        aktivitetApi
          // biome-ignore lint/suspicious/noExplicitAny: Bare for debug, og vet ikke hvordan vurdering ser ut for aktivitet
          .hentVurdering<any>()
          .catch(() => null),
      ])

      debugData = { grunnlag, vurdering }
    } catch (error) {
      console.error('Debug data fetch error:', error)
    }
  }

  return {
    behandling,
    aktivitet,
    debug: debugData,
    showDebug,
    dato: Date.now(),
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId } = params

  const api = createBehandlingApi({ request, behandlingId })

  await api.fortsett()

  return redirect(`/behandling/${behandlingId}`)
}

export default function Aktivitet({ loaderData }: Route.ComponentProps) {
  const { behandling, aktivitet, debug, showDebug, dato } = loaderData
  const outlet = useOutlet()
  const { avbrytAktivitet } = useOutletContext<{ avbrytAktivitet: () => void }>()

  const fetcher = useFetcher()

  function retry() {
    fetcher.submit(
      {},
      {
        method: 'POST',
      },
    )
  }

  if (behandling.status === BehandlingStatus.FEILENDE) {
    return <FeilendeBehandling dato={dato} behandling={behandling} retry={retry} avbrytAktivitet={avbrytAktivitet} />
  } else {
    return (
      <Page.Block gutters className="aktivitet" style={{ paddingTop: '2em' }} width="xl">
        <Outlet context={{ behandling, aktivitet, avbrytAktivitet }} />

        {!outlet && (
          <Box.New paddingBlock="8 0" style={{ display: 'flex', justifyContent: 'center' }}>
            <Alert variant="info" style={{ maxWidth: '600px', width: '100%' }}>
              <Heading spacing size="small" level="3">
                Aktivitet ikke implementert enda
              </Heading>

              <Detail>
                <strong>Aktivitet:</strong> {aktivitet.friendlyName}
              </Detail>
              <Detail>
                <strong>Type:</strong> {aktivitet.type}
              </Detail>
              <Detail>
                <strong>Behandling:</strong> {behandling.friendlyName}
              </Detail>
            </Alert>
          </Box.New>
        )}
        {showDebug && <AktivitetDebug input={debug.grunnlag} vurdering={debug.vurdering} />}
      </Page.Block>
    )
  }
}
