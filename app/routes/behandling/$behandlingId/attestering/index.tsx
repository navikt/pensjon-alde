import { BodyShort, Box, Button, Heading, HStack, VStack } from '@navikt/ds-react'
import React from 'react'
import { redirect, useOutletContext } from 'react-router'
import { createBehandlingApi } from '~/api/behandling-api'
import type { AktivitetAtt } from '~/api/behandling-api/types'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import { getAllServerComponents } from '~/utils/component-discovery'
import type { Route } from './+types'
import './attestering.css'
import clsx from 'clsx'
import { userContext } from '~/context/user-context'

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

export const loader = async ({ params, request, context }: Route.LoaderArgs) => {
  const { behandlingId } = params
  const { navident } = context.get(userContext)
  const behandlingApi = createBehandlingApi({
    request,
    behandlingId,
  })
  const behandling = await behandlingApi.hentBehandling()
  const attesteringData = await behandlingApi.hentAttesteringsdata()

  const serverComponents = getAllServerComponents()

  const parsedData = attesteringData.aktiviter
    .map(enhanceAttesteringAktivitet(behandling))
    .filter(aktivitet => (aktivitet.grunnlag || aktivitet.vurdering) && aktivitet.aktivitet.trengerAttestering)
    .map(aktivitet => ({
      ...aktivitet,
      hasComponent: serverComponents.has(aktivitet.handlerName),
    }))

  if (behandling.sisteSaksbehandlerNavident === navident) {
    return redirect(`/behandling/${behandlingId}/venter-attestering`)
  }

  return {
    aktiviteter: parsedData,
  }
}

export const action = async () => {
  return null
}

enum AttesteringUtfall {
  GODKJENT = 'godkjent',
  UNDERKJENT = 'underkjent',
}

interface AttesteringAction {
  type: 'SET' | 'RESET'
  handlerName?: string
  status?: AttesteringUtfall
}

export default function Attestering({ loaderData }: Route.ComponentProps) {
  const { aktiviteter } = loaderData
  const { behandling } = useOutletContext<AktivitetOutletContext>()

  const [attesteringer, setAttestering] = React.useReducer(
    (state: Record<string, AttesteringUtfall>, action: AttesteringAction) => {
      if (action.type === 'RESET') {
        return {}
      }
      if (action.type === 'SET' && action.handlerName && action.status) {
        return {
          ...state,
          [action.handlerName]: action.status,
        }
      }
      return state
    },
    {},
  )

  const components = getAllServerComponents()

  return (
    <VStack gap="5">
      <Heading level="1" size="large">
        Oppgaven er til attestering
      </Heading>

      {aktiviteter.map(aktivitet => {
        const Component = components.get(aktivitet.handlerName)

        return Component ? (
          <div
            id={aktivitet.handlerName}
            key={aktivitet.aktivitetId}
            className={clsx('attestering', attesteringer[aktivitet.handlerName])}
          >
            <div className="component-area">
              <div className={clsx('bar', attesteringer[aktivitet.handlerName])} />
              <div className="component">
                <Component
                  readOnly={true}
                  grunnlag={aktivitet.grunnlag}
                  vurdering={aktivitet.vurdering}
                  aktivitet={aktivitet.aktivitet}
                  behandling={behandling}
                />
              </div>
            </div>
            <VStack gap="6">
              <div className={clsx('attestant', attesteringer[aktivitet.handlerName])}>
                <Button
                  size="small"
                  className="godkjenn"
                  onClick={() =>
                    setAttestering({
                      type: 'SET',
                      handlerName: aktivitet.handlerName,
                      status: AttesteringUtfall.GODKJENT,
                    })
                  }
                >
                  Godkjenn
                </Button>
                <Button
                  size="small"
                  className="underkjenn"
                  onClick={() =>
                    setAttestering({
                      type: 'SET',
                      handlerName: aktivitet.handlerName,
                      status: AttesteringUtfall.UNDERKJENT,
                    })
                  }
                >
                  Underkjenn
                </Button>
              </div>
              <Box.New>
                Vurdert av: {aktivitet.vurdertAvBrukerId} / {aktivitet.vurdertAvBrukerNavn} <br />
                Vudert tidspunkt: {aktivitet.vurdertTidspunkt}
              </Box.New>
            </VStack>
            <div className="ferdigstill-attestering">
              <div />
              <BodyShort size="large" weight="semibold">
                {Object.keys(attesteringer).length} av {aktiviteter.length} aktiviteter attestert
              </BodyShort>

              <div>
                {Object.keys(attesteringer).length === aktiviteter.length && (
                  <HStack gap="1">
                    <Button className="ferdigstill" onClick={console.log}>
                      Ferdigstill attestering
                    </Button>
                    <Button
                      className="ferdigstill"
                      variant="secondary"
                      onClick={() => setAttestering({ type: 'RESET' })}
                    >
                      Reset attestering
                    </Button>
                  </HStack>
                )}
              </div>
            </div>
          </div>
        ) : null
      })}
    </VStack>
  )
}
