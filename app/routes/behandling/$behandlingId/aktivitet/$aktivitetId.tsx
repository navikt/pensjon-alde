import { InformationSquareIcon } from '@navikt/aksel-icons'
import { BodyShort, InfoCard, Page } from '@navikt/ds-react'
import { Suspense } from 'react'
import { Await, Outlet, redirect, useOutlet, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { createBehandlingApi } from '~/api/behandling-api'
import AktivitetDebug from '~/components/AktivitetDebug'
import type { AktivitetDTO } from '~/types/behandling'
import { buildAktivitetRedirectUrl } from '~/utils/handler-discovery'
import type { Route } from './+types/$aktivitetId'

export { kunForrigeKjoringFjernet as shouldRevalidate } from '~/utils/fortsett-behandling'

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

  // Debugdata venter vi ikke på: promiset strømmes til klienten og vises når det er klart
  const debug = showDebug ? hentDebugdata(createAktivitetApi({ request, behandlingId, aktivitetId })) : null

  return {
    behandling,
    aktivitet,
    debug,
  }
}

function hentDebugdata(api: ReturnType<typeof createAktivitetApi>) {
  return Promise.all([
    api.hentGrunnlagsdata<unknown>().catch(() => null),
    api.hentVurdering<unknown>().catch(() => null),
  ]).then(([grunnlag, vurdering]) => ({ grunnlag, vurdering }))
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId } = params

  const api = createBehandlingApi({ request, behandlingId })

  await api.fortsett()

  return redirect(`/behandling/${behandlingId}`)
}

export default function Aktivitet({ loaderData }: Route.ComponentProps) {
  const { behandling, aktivitet, debug } = loaderData
  const outlet = useOutlet()
  const { avbrytAktivitet } = useOutletContext<{ avbrytAktivitet: () => void }>()

  return (
    <Page.Block className="aktivitet">
      <Outlet context={{ behandling, aktivitet, avbrytAktivitet }} />
      {!outlet && (
        <Page.Block gutters>
          <InfoCard data-color="info" as="section" aria-label="Aktivitet ikke implementert enda">
            <InfoCard.Header icon={<InformationSquareIcon aria-hidden />}>
              <InfoCard.Title>Aktivitet ikke implementert enda</InfoCard.Title>
            </InfoCard.Header>
            <InfoCard.Content>
              <BodyShort>
                <strong>Aktivitet:</strong> {aktivitet.friendlyName}
              </BodyShort>
              <BodyShort>
                <strong>Type:</strong> {aktivitet.type}
              </BodyShort>
              <BodyShort>
                <strong>Behandling:</strong> {behandling.friendlyName}
              </BodyShort>
            </InfoCard.Content>
          </InfoCard>
        </Page.Block>
      )}
      {debug && (
        <Suspense fallback={null}>
          <Await resolve={debug}>{data => <AktivitetDebug input={data.grunnlag} vurdering={data.vurdering} />}</Await>
        </Suspense>
      )}
    </Page.Block>
  )
}
