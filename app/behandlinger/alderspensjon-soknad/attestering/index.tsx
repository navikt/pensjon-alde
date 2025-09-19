import { DogHarnessIcon } from '@navikt/aksel-icons'
import { BodyLong, VStack } from '@navikt/ds-react'
import { createBehandlingApi } from '~/api/behandling-api'
import type { AktivitetAtt } from '~/api/behandling-api/types'
import type { BehandlingDTO } from '~/types/behandling'
import type { Route } from './+types'

interface AktivitetTilAttestering {
  aktivitetId: number
  handlerName: string
  friendlyName: string
  grunnlag: string
  vurdering: string
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
  const parsedData = attesteringData.aktiviter.map(enhanceAttesteringAktivitet(behandling))

  return {
    aktiviteter: parsedData,
  }
}

export const action = async () => {
  return null
}

export default function Attestering({ loaderData }: Route.ComponentProps) {
  const { aktiviteter } = loaderData
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem',
        marginTop: '2rem',
      }}
    >
      <VStack>
        <DogHarnessIcon
          title="Attestering fullført"
          fontSize="2rem"
          color="var(--ax-text-success)"
          aria-label="Oppgaven er til attestering"
        />
        <BodyLong>Oppgaven er til attestering</BodyLong>

        <pre> {JSON.stringify(aktiviteter, null, 2)}</pre>
      </VStack>
    </div>
  )
}
