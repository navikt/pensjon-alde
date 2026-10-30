import { Alert, BodyShort, Box, Button, Heading, VStack } from '@navikt/ds-react'
import { data, Form, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { Route } from './+types'
import type { SendForesporselOmTrygdetidTilEessiGrunnlag, SendForesporselOmTrygdetidTilEessiVurdering } from './types'

export function meta() {
  return [
    { title: 'Send forespørsel om trygdetid til EESSI' },
    { name: 'description', content: 'Send forespørsel om trygdetid til EESSI' },
  ]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })

  const [grunnlag, vurdering] = await Promise.all([
    api.hentGrunnlagsdata<SendForesporselOmTrygdetidTilEessiGrunnlag>(),
    api.hentVurdering<SendForesporselOmTrygdetidTilEessiVurdering>(),
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

  const vurdering: SendForesporselOmTrygdetidTilEessiVurdering = {}

  try {
    await api.lagreVurdering(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch {
    return data({ feil: 'Det oppstod en feil ved lagring av vurderingen' }, { status: 500 })
  }
}

export default function SendForesporselOmTrygdetidTilEessiRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, vurdering } = loaderData
  const { aktivitet, behandling, avbrytAktivitet, readOnly } = useOutletContext<AktivitetOutletContext>()

  return (
    <SendForesporselOmTrygdetidTilEessi
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

type SendForesporselOmTrygdetidTilEessiProps = AktivitetComponentProps<
  SendForesporselOmTrygdetidTilEessiGrunnlag,
  SendForesporselOmTrygdetidTilEessiVurdering
> & {
  serverFeil?: string
}

function SendForesporselOmTrygdetidTilEessi({
  grunnlag,
  vurdering,
  aktivitet,
  readOnly,
  avbrytAktivitet,
  serverFeil,
}: SendForesporselOmTrygdetidTilEessiProps) {
  const isSubmitting = useIsSubmitting()

  const sidebar = (
    <Form method="post">
      <VStack gap="space-24">
        <Heading level="2" size="small">
          Send forespørsel om trygdetid til EESSI
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
          Grunnlag
        </Heading>
        <Box background="neutral-soft" padding="space-16" borderRadius="8">
          <BodyShort as="pre" size="small">
            {JSON.stringify(grunnlag, null, 2)}
          </BodyShort>
        </Box>
      </VStack>
      <VStack gap="space-16">
        <Heading level="2" size="small">
          Vurdering
        </Heading>
        <Box background="neutral-soft" padding="space-16" borderRadius="8">
          <BodyShort as="pre" size="small">
            {JSON.stringify(vurdering, null, 2)}
          </BodyShort>
        </Box>
      </VStack>
    </AktivitetVurderingLayout>
  )
}

export const Component = SendForesporselOmTrygdetidTilEessi
