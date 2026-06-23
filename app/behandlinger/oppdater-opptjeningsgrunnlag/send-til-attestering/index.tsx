import { Button, Heading, Page, VStack } from '@navikt/ds-react'
import { Form, redirect, useNavigation, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import styles from '~/common.module.css'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { Route } from './+types'

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params
  createAktivitetApi({ request, behandlingId, aktivitetId })
  return {}
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })
  await api.lagreVurdering({ sendTilAttestering: true })
  return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
}

export default function SendTilAttesteringRoute() {
  const { avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state !== 'idle' && navigation.formData != null

  return (
    <Page.Block gutters className={`${styles.page} ${styles.center}`}>
      <VStack gap="space-32">
        <Heading size="medium" level="2">
          Send til attestering
        </Heading>

        <Form method="post">
          <VStack gap="space-8" align="center">
            <Button type="submit" variant="primary" size="small" loading={isSubmitting}>
              Send til attestering
            </Button>
            <Button type="button" variant="tertiary" size="small" onClick={avbrytAktivitet} disabled={isSubmitting}>
              Avbryt behandling
            </Button>
          </VStack>
        </Form>
      </VStack>
    </Page.Block>
  )
}
