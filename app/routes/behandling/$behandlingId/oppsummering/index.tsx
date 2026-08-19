import { InformationSquareIcon } from '@navikt/aksel-icons'
import { Box, Heading, InfoCard, Link, Page, VStack } from '@navikt/ds-react'
import { useOutletContext } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import type { AktivitetAtt } from '~/api/behandling-api/types'
import commonStyles from '~/common.module.css'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { type AktivitetDTO, type BehandlingDTO, BehandlingStatus } from '~/types/behandling'
import { getAllServerComponents } from '~/utils/component-discovery'
import { buildPsakOversiktUrl } from '~/utils/psak-oversikt-url.server'
import type { Route } from './+types'

interface AktivitetTilAttestering {
  aktivitetId: number
  handlerName: string
  friendlyName: string
  grunnlag: string
  vurdering: string
  aktivitet: AktivitetDTO
  vurdertTidspunkt?: string
  vurdertAvBrukerId?: string
  vurdertAvBrukerNavn?: string
}

const enhanceAttesteringAktivitet =
  (beh: BehandlingDTO) =>
  (aktivitet: AktivitetAtt): AktivitetTilAttestering => {
    const behandlingAktivitet = beh.aktiviteter.find(ba => ba.aktivitetId === aktivitet.aktivitetId)
    if (!behandlingAktivitet) {
      throw new Error(
        `Aktivitet ${aktivitet.aktivitetId} not found in behandling ${JSON.stringify(beh.aktiviteter, null, 2)}`,
      )
    }
    return {
      aktivitetId: behandlingAktivitet.aktivitetId,
      handlerName: behandlingAktivitet.handlerName,
      friendlyName: behandlingAktivitet.friendlyName,
      grunnlag: aktivitet.grunnlag ? JSON.parse(aktivitet.grunnlag) : null,
      vurdering: aktivitet.vurdering ? JSON.parse(aktivitet.vurdering) : null,
      aktivitet: behandlingAktivitet,
      vurdertTidspunkt: aktivitet.vurdertTidspunkt,
      vurdertAvBrukerId: aktivitet.vurdertAvBrukerId,
      vurdertAvBrukerNavn: aktivitet.vurdertAvBrukerNavn,
    }
  }

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const { behandlingId } = params
  const behandlingApi = createBehandlingApi({
    request,
    behandlingId,
  })
  const behandling = await behandlingApi.hentBehandling()
  const attesteringData = await behandlingApi.hentAttesteringsdata()

  const serverComponents = getAllServerComponents()

  const parsedData = attesteringData.aktiviter
    .map(enhanceAttesteringAktivitet(behandling))
    .filter(aktivitet => aktivitet.grunnlag && aktivitet.vurdering && aktivitet.vurdertAvBrukerId)
    .map(aktivitet => ({
      ...aktivitet,
      hasComponent: serverComponents.has(aktivitet.handlerName),
    }))

  return {
    aktiviteter: parsedData,
    psakPensjonsoversiktUrl: buildPsakOversiktUrl(request, behandling),
    behandlingErFullført: behandling.status === BehandlingStatus.FULLFORT,
    behandlingFeilende: behandling.status === BehandlingStatus.FEILENDE,
  }
}

export const action = async () => {
  return null
}

export default function Attestering({ loaderData }: Route.ComponentProps) {
  const { aktiviteter, behandlingErFullført, psakPensjonsoversiktUrl } = loaderData
  const { behandling } = useOutletContext<AktivitetOutletContext>()
  const components = getAllServerComponents()

  if (aktiviteter.length === 0) {
    return (
      <Page.Block gutters className={commonStyles.behandlingPage}>
        <Heading level="1" size="large" spacing>
          Oppsummering av behandlingen
        </Heading>

        <InfoCard data-color="info" as="section" aria-label="Ingen vurdering tatt">
          <InfoCard.Header icon={<InformationSquareIcon aria-hidden />}>
            <InfoCard.Title>Ingen vurdering tatt</InfoCard.Title>
          </InfoCard.Header>
          <InfoCard.Content>Viser bare de aktivitetene som har blitt vurdert</InfoCard.Content>
        </InfoCard>
      </Page.Block>
    )
  }

  return (
    <Page.Block gutters className={commonStyles.behandlingPage}>
      <Heading level="1" size="large" spacing>
        Oppsummering av behandlingen
      </Heading>
      {behandlingErFullført && (
        <InfoCard data-color="info" as="section" aria-label="Behandlingen er fullført">
          <InfoCard.Header icon={<InformationSquareIcon aria-hidden />}>
            <InfoCard.Title>Behandlingen er fullført</InfoCard.Title>
          </InfoCard.Header>
          <InfoCard.Content>
            Vi kan ikke behandle denne videre og har samlet en oppsummering på hva som har blitt utført.{' '}
            <Link href={psakPensjonsoversiktUrl}>Pensjonsoversikt</Link>
          </InfoCard.Content>
        </InfoCard>
      )}
      {aktiviteter.map(aktivitet => {
        const Component = components.get(aktivitet.handlerName)

        return Component ? (
          <VStack gap="space-24" key={aktivitet.aktivitetId}>
            <Component
              readOnly={true}
              grunnlag={aktivitet.grunnlag}
              vurdering={aktivitet.vurdering}
              aktivitet={aktivitet.aktivitet}
              behandling={behandling}
              avbrytAktivitet={() => {}}
              visNotat={true}
            />
            <Box>
              Vurdert av: {aktivitet.vurdertAvBrukerId} / {aktivitet.vurdertAvBrukerNavn} <br />
              Vurdert tidspunkt: {aktivitet.vurdertTidspunkt}
            </Box>
          </VStack>
        ) : null
      })}
    </Page.Block>
  )
}
