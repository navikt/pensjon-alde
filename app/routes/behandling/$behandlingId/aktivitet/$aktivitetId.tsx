import { Alert, Box, Detail, Heading, Page } from '@navikt/ds-react'
import { Outlet, redirect, useOutlet, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { createBehandlingApi } from '~/api/behandling-api'
import AktivitetDebug from '~/components/AktivitetDebug'
import type { AktivitetDTO } from '~/types/behandling'
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
        aktivitetApi.hentGrunnlagsdata<any>().catch(() => null),
        aktivitetApi.hentVurdering<any>().catch(() => null),
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
  }
}

export default function Aktivitet({ loaderData }: Route.ComponentProps) {
  const { behandling, aktivitet, debug, showDebug } = loaderData
  const outlet = useOutlet()
  const { avbrytAktivitet } = useOutletContext<{ avbrytAktivitet: () => void }>()

  return (
    <Page.Block gutters className="aktivitet">
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
              <strong>Behandling:</strong> {behandling.friendlyName}
            </Detail>
          </Alert>
        </Box.New>
      )}
      {showDebug && <AktivitetDebug input={debug.grunnlag} vurdering={debug.vurdering} />}
    </Page.Block>
  )
}
