import { Alert, Button, Heading, VStack } from '@navikt/ds-react'
import { data, Form, redirect, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import AktivitetVurderingLayout from '~/components/shared/AktivitetVurderingLayout'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { Route } from './+types'
import type { UtenlandsoppholdGrunnlag, UtenlandsoppholdVurdering } from './types'
import UtenlandsoppholdTabell from './UtenlandsoppholdTabell'

export function meta() {
  return [{ title: 'Utenlandsopphold' }, { name: 'description', content: 'Utenlandsopphold' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  const api = createAktivitetApi({
    request,
    behandlingId,
    aktivitetId,
  })

  const [grunnlag, vurdering] = await Promise.all([
    api.hentGrunnlagsdata<UtenlandsoppholdGrunnlag>(),
    api.hentVurdering<UtenlandsoppholdVurdering>(),
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

  const vurdering: UtenlandsoppholdVurdering = {}

  try {
    await api.lagreVurdering(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch {
    return data({ feil: 'Det oppstod en feil ved lagring av vurderingen' }, { status: 500 })
  }
}

export default function UtenlandsoppholdRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, vurdering } = loaderData
  const { aktivitet, behandling, avbrytAktivitet, readOnly } = useOutletContext<AktivitetOutletContext>()

  return (
    <Utenlandsopphold
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

type UtenlandsoppholdProps = AktivitetComponentProps<UtenlandsoppholdGrunnlag, UtenlandsoppholdVurdering> & {
  serverFeil?: string
}

function Utenlandsopphold({ grunnlag, aktivitet, readOnly, avbrytAktivitet, serverFeil }: UtenlandsoppholdProps) {
  const isSubmitting = useIsSubmitting()

  const sidebar = (
    <Form method="post">
      <VStack gap="space-24">
        <Heading level="2" size="small">
          Utenlandsopphold
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
          Utenlandsopphold
        </Heading>
        <UtenlandsoppholdTabell utenlandsopphold={grunnlag?.utenlandsopphold ?? []} />
      </VStack>
    </AktivitetVurderingLayout>
  )
}

export const Component = Utenlandsopphold
