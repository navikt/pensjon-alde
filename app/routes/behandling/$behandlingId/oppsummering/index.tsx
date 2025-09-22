import { Heading } from '@navikt/ds-react'
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
    .filter(aktivitet => aktivitet.grunnlag || aktivitet.vurdering)
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

  return (
    <div>
      <Heading level="1" size="large">
        Oppsummering av behandlingen
      </Heading>
      {aktiviteter.map(aktivitet => {
        const Component = components.get(aktivitet.handlerName)

        return Component ? (
          <Component
            key={aktivitet.aktivitetId}
            readOnly={true}
            grunnlag={aktivitet.grunnlag}
            vurdering={aktivitet.vurdering}
            aktivitet={aktivitet.aktivitet}
            behandling={behandling}
          />
        ) : null
      })}
    </div>
  )
}
