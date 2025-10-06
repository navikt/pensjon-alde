import { Button, Heading, VStack } from '@navikt/ds-react'
import { Form, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { Route } from './+types'

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })

  return {
    readOnly: false,
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })

  try {
    await api.lagreVurdering({ sendTilAttestering: true })
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch (error) {
    console.error(error)
  }
}

export default function SendTilAttesteringRoute() {
  const { avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()

  return (
    <VStack gap="8">
      <Heading size="medium" level="2">
        Alle vurderinger på saken er gjennomført
      </Heading>

      <Form method="post">
        <VStack gap="2" width="10em">
          <Button type="submit" variant="primary" size="small">
            Send til attestering
          </Button>

          <Button type="button" variant="secondary" size="small" onClick={avbrytAktivitet}>
            Avbryt
          </Button>
        </VStack>
      </Form>
    </VStack>
  )
}
