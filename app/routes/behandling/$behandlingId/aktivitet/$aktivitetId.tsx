import { InformationSquareIcon } from '@navikt/aksel-icons'
import { BodyShort, Box, InfoCard, Page } from '@navikt/ds-react'
import { useEffect, useRef } from 'react'
import { Outlet, redirect, useOutlet, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { createBehandlingApi } from '~/api/behandling-api'
import AktivitetDebug from '~/components/AktivitetDebug'
import { AktivitetFeilmeldinger } from '~/components/shared/AktivitetFeilmeldinger'
import { AktivitetFeilProvider, useAktivitetFeilState } from '~/hooks/use-aktivitet-feil'
import type { AktivitetDTO } from '~/types/behandling'
import type { Validering } from '~/types/vurdering'
import { buildAktivitetRedirectUrl } from '~/utils/handler-discovery'
import type { Route } from './+types/$aktivitetId'
import styles from './aktivitet.module.css'

type VurderingMedValideringsfeil = Record<string, unknown> & {
  vurdertTidspunkt?: string | null
  validering?: Validering | null
}

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
  const aktivitetApi = createAktivitetApi({ request, behandlingId, aktivitetId })

  const [grunnlag, vurdering] = await Promise.all([
    showDebug
      ? aktivitetApi
          // biome-ignore lint/suspicious/noExplicitAny: Bare for debug, og vet ikke hvordan grunnlag ser ut for aktivitet
          .hentGrunnlagsdata<any>()
          .catch(() => null)
      : null,
    // Valideringsfeilene kommer med vurderingen. Uten dem er vurderingen bare nødvendig for debug.
    aktivitet.harValideringsfeil
      ? aktivitetApi.hentVurdering<VurderingMedValideringsfeil>()
      : showDebug
        ? aktivitetApi.hentVurdering<VurderingMedValideringsfeil>().catch(() => null)
        : null,
  ])

  return {
    behandling,
    aktivitet,
    valideringsfeil: vurdering?.validering?.feil ?? null,
    vurdertTidspunkt: vurdering?.vurdertTidspunkt ?? null,
    debug: { grunnlag, vurdering: showDebug ? vurdering : null },
    showDebug,
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId } = params

  const api = createBehandlingApi({ request, behandlingId })

  await api.fortsett()

  return redirect(`/behandling/${behandlingId}`)
}

export default function Aktivitet({ loaderData }: Route.ComponentProps) {
  const { behandling, aktivitet, valideringsfeil, vurdertTidspunkt, debug, showDebug } = loaderData
  const outlet = useOutlet()
  const { avbrytAktivitet } = useOutletContext<{ avbrytAktivitet: () => void }>()
  const aktivitetRef = useRef<HTMLDivElement>(null)
  const feilState = useAktivitetFeilState(aktivitet.aktivitetId, valideringsfeil, vurdertTidspunkt, aktivitetRef)
  const feilmeldingerRef = useRef<HTMLDivElement>(null)

  // Fokuserer bare når en ny vurdering gir feil, ikke når en feil dukker opp igjen mens saksbehandler retter.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Skal kjøres på nytt for hver vurdering
  useEffect(() => {
    feilmeldingerRef.current?.focus()
  }, [aktivitet.aktivitetId, vurdertTidspunkt])

  return (
    <Page.Block className="aktivitet" ref={aktivitetRef}>
      {feilState.gjeldendeFeilmeldinger.length ? (
        <Box className={styles.feilmeldinger}>
          <AktivitetFeilmeldinger
            ref={feilmeldingerRef}
            feilmeldinger={feilState.gjeldendeFeilmeldinger}
            tidspunkt={vurdertTidspunkt ?? undefined}
          />
        </Box>
      ) : null}
      <AktivitetFeilProvider value={feilState}>
        <Outlet context={{ behandling, aktivitet, avbrytAktivitet }} />
      </AktivitetFeilProvider>
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
      {showDebug && <AktivitetDebug input={debug.grunnlag} vurdering={debug.vurdering} />}
    </Page.Block>
  )
}
