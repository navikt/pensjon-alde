import { Alert, Box, Detail, Heading, Page, VStack } from '@navikt/ds-react'
import { useOutletContext } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import type { AktivitetAtt } from '~/api/behandling-api/types'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import { getAllServerComponents } from '~/utils/component-discovery'
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
    .filter(aktivitet => aktivitet.grunnlag && aktivitet.vurdering)
    .map(aktivitet => ({
      ...aktivitet,
      hasComponent: serverComponents.has(aktivitet.handlerName),
    }))

  return {
    aktiviteter: parsedData,
  }
}

export const action = async () => {
  return null
}

export default function Attestering({ loaderData }: Route.ComponentProps) {
  const { aktiviteter } = loaderData
  const { behandling } = useOutletContext<AktivitetOutletContext>()
  const components = getAllServerComponents()

  if (aktiviteter.length === 0) {
    return (
      <Box.New paddingBlock="8 0" style={{ display: 'flex', justifyContent: 'center' }}>
        <Alert variant="info" style={{ maxWidth: '600px', width: '100%' }}>
          <Heading spacing size="small" level="3">
            Ingen vurdering tatt
          </Heading>

          <Detail>Viser bare de aktivitetene som har blitt vurdert</Detail>
        </Alert>
      </Box.New>
    )
  }

  return (
    <Page.Block gutters>
      <Heading level="1" size="large">
        Oppsummering av behandlingen
      </Heading>
      {aktiviteter.map(aktivitet => {
        const Component = components.get(aktivitet.handlerName)

        return Component ? (
          <VStack gap="6" key={aktivitet.aktivitetId}>
            <Component
              readOnly={true}
              grunnlag={aktivitet.grunnlag}
              vurdering={aktivitet.vurdering}
              aktivitet={aktivitet.aktivitet}
              behandling={behandling}
              avbrytAktivitet={() => {}}
            />
            <Box.New>
              Vurdert av: {aktivitet.vurdertAvBrukerId} / {aktivitet.vurdertAvBrukerNavn} <br />
              Vurdert tidspunkt: {aktivitet.vurdertTidspunkt}
            </Box.New>
          </VStack>
        ) : null
      })}
    </Page.Block>
  )
}
