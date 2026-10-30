import { Alert, Button, Heading, VStack } from '@navikt/ds-react'
import { data, Form, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { Route } from './+types'
import PensjonsbeholdningTabell from './PensjonsbeholdningTabell'
import PensjonspoengTabell from './PensjonspoengTabell'
import type { SendEosSkjemaTilSokerGrunnlag, SendEosSkjemaTilSokerVurdering } from './types'

export function meta() {
  return [{ title: 'Send EØS-skjema til søker' }, { name: 'description', content: 'Send EØS-skjema til søker' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })

  const [grunnlag, vurdering] = await Promise.all([
    api.hentGrunnlagsdata<SendEosSkjemaTilSokerGrunnlag>(),
    api.hentVurdering<SendEosSkjemaTilSokerVurdering>(),
  ])

  return {
    grunnlag,
    vurdering,
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })

  const vurdering: SendEosSkjemaTilSokerVurdering = {}

  try {
    await api.lagreVurdering(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch {
    return data({ feil: 'Det oppstod en feil ved lagring av vurderingen' }, { status: 500 })
  }
}

export default function SendEosSkjemaTilSokerRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, vurdering } = loaderData
  const { aktivitet, behandling, avbrytAktivitet, readOnly } = useOutletContext<AktivitetOutletContext>()

  return (
    <SendEosSkjemaTilSoker
      readOnly={readOnly}
      grunnlag={grunnlag}
      vurdering={vurdering}
      aktivitet={aktivitet}
      behandling={behandling}
      avbrytAktivitet={avbrytAktivitet}
      serverFeil={actionData?.feil}
    />
  )
}

type SendEosSkjemaTilSokerProps = AktivitetComponentProps<
  SendEosSkjemaTilSokerGrunnlag,
  SendEosSkjemaTilSokerVurdering
> & {
  serverFeil?: string
}

function SendEosSkjemaTilSoker({
  grunnlag,
  aktivitet,
  readOnly,
  avbrytAktivitet,
  serverFeil,
}: SendEosSkjemaTilSokerProps) {
  const isSubmitting = useIsSubmitting()

  const sidebar = (
    <Form method="post">
      <VStack gap="space-24">
        <Heading level="2" size="small">
          Send EØS-skjema til søker
        </Heading>

        {serverFeil && (
          <Alert variant="error" size="small">
            {serverFeil}
          </Alert>
        )}

        {!readOnly && (
          <VStack gap="space-12">
            <Button type="submit" variant="primary" size="small" loading={isSubmitting}>
              Fortsett behandling
            </Button>
            <Button type="button" variant="tertiary" size="small" onClick={avbrytAktivitet} disabled={isSubmitting}>
              Avbryt del-auto behandling
            </Button>
          </VStack>
        )}
      </VStack>
    </Form>
  )

  return (
    <AktivitetVurderingLayout aktivitet={aktivitet} sidebar={sidebar}>
      <VStack gap="space-16">
        <Heading level="2" size="small">
          Pensjonspoeng
        </Heading>
        <PensjonspoengTabell pensjonspoeng={grunnlag?.pensjonspoeng ?? []} />
      </VStack>
      <VStack gap="space-16">
        <Heading level="2" size="small">
          Pensjonsbeholdning
        </Heading>
        <PensjonsbeholdningTabell beholdninger={grunnlag?.beholdning ?? []} />
      </VStack>
    </AktivitetVurderingLayout>
  )
}

export const Component = SendEosSkjemaTilSoker
