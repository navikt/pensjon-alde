import { Button, Heading, Page, Radio, RadioGroup, Textarea, VStack } from '@navikt/ds-react'
import { useState } from 'react'
import { data, Form, redirect, useNavigation, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import styles from '~/common.module.css'
import { userContext } from '~/context/user-context'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { Route } from './+types'

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { navident } = context.get(userContext)
  const { behandlingId, aktivitetId } = params
  createAktivitetApi({ request, behandlingId, aktivitetId })
  return { navident }
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  const { navident } = context.get(userContext)
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })

  const formData = await request.formData()
  const utfall = formData.get('utfall') as string
  const returArsak = formData.get('returArsak') as string | null

  if (!utfall) {
    return data({ errors: { utfall: 'Du må velge et utfall' } }, { status: 400 })
  }

  if (utfall === 'IKKE_GODKJENN' && !returArsak?.trim()) {
    return data({ errors: { returArsak: 'Du må oppgi begrunnelse for retur' } }, { status: 400 })
  }

  const attestert = utfall === 'GODKJENN'

  await api.lagreVurdering({
    attestert,
    returArsak: attestert ? null : returArsak,
    attestant: navident,
  })

  return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
}

export default function AttesterRoute({ actionData }: Route.ComponentProps) {
  const { errors } = actionData || {}
  const { avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state !== 'idle' && navigation.formData != null
  const [utfall, setUtfall] = useState<string>('')

  return (
    <Page.Block gutters className={styles.page}>
      <VStack gap="space-32">
        <Heading size="medium" level="2">
          Attester oppdatering av pensjonsgivende inntekt
        </Heading>

        <Form method="post">
          <VStack gap="space-24">
            <RadioGroup legend="Utfall" name="utfall" value={utfall} onChange={setUtfall} error={errors?.utfall}>
              <Radio value="GODKJENN">Godkjenn</Radio>
              <Radio value="IKKE_GODKJENN">Returner til saksbehandler</Radio>
            </RadioGroup>

            {utfall === 'IKKE_GODKJENN' && (
              <Textarea label="Begrunnelse for retur" name="returArsak" rows={4} error={errors?.returArsak} />
            )}

            <VStack gap="space-8" align="start">
              <Button type="submit" variant="primary" size="small" loading={isSubmitting}>
                Bekreft
              </Button>
              <Button type="button" variant="tertiary" size="small" onClick={avbrytAktivitet} disabled={isSubmitting}>
                Avbryt behandling
              </Button>
            </VStack>
          </VStack>
        </Form>
      </VStack>
    </Page.Block>
  )
}
