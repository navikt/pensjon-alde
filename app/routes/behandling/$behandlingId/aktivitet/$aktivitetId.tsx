import { Alert, BodyShort, Box, Detail, Heading } from '@navikt/ds-react'
import { Outlet, redirect, useOutlet } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import { buildAktivitetRedirectUrl } from '~/utils/handler-discovery'
import type { Route } from './+types/$aktivitetId'

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Aktivitet ${params.aktivitetId}` }, { name: 'description', content: 'Aktivitet detaljer' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createBehandlingApi({ request, behandlingId })
  const behandling = await api.hentBehandling<BehandlingDTO>()

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
    !currentPath.includes(behandling.handlerName!) &&
    !currentPath.includes(aktivitet.handlerName!)
  ) {
    return redirect(implementationUrl)
  }

  return { behandling, aktivitet }
}

export default function Aktivitet({ loaderData }: Route.ComponentProps) {
  const { behandling, aktivitet } = loaderData
  const outlet = useOutlet()

  return (
    <div className="aktivitet">
      <Outlet context={{ behandling, aktivitet }} />

      {!outlet && (
        <Box.New paddingBlock="8 0" style={{ display: 'flex', justifyContent: 'center' }}>
          <Alert variant="info" style={{ maxWidth: '600px', width: '100%' }}>
            <Heading spacing size="small" level="3">
              Aktivitet ikke implementert enda
            </Heading>

            <BodyShort spacing>Denne aktiviteten er ikke implementert enda.</BodyShort>

            <Detail>
              <strong>Type:</strong> {aktivitet.type}
            </Detail>

            {aktivitet.handlerName && (
              <Detail>
                <strong>Aktivitet Handler:</strong> {aktivitet.handlerName}
              </Detail>
            )}

            {behandling.handlerName && (
              <Detail>
                <strong>Behandling Handler:</strong> {behandling.handlerName}
              </Detail>
            )}

            {!aktivitet.handlerName && (
              <Detail>
                <strong>Info:</strong> Denne aktiviteten kjører kun i backend
              </Detail>
            )}
          </Alert>
        </Box.New>
      )}
    </div>
  )
}
