import { Alert, BodyLong, Box, Button, Heading, HStack, VStack } from '@navikt/ds-react'
import { data, Form, Link as RouterLink, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import type { AktivitetComponentProps, FormErrors } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { Route } from './+types'

export function meta() {
  return [{ title: 'Tekst til vedtaksbrev' }, { name: 'description', content: 'Tekst til vedtaksbrev' }]
}

export type TekstTilVedtaksbrev = {
  aktivitetId: number
  aktivitetFriendlyName: string
  tekst: string
}

export type TekstTilVedtaksbrevGrunnlag = {
  tekstTilVedtaksbrev: TekstTilVedtaksbrev[]
}

export type TekstTilVedtaksbrevVurdering = Record<string, never>

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })

  const grunnlag = await api.hentGrunnlagsdata<TekstTilVedtaksbrevGrunnlag>()
  const vurdering = await api.hentVurdering<TekstTilVedtaksbrevVurdering>()

  return {
    readOnly: false,
    grunnlag,
    vurdering,
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })

  try {
    return await api.lagreVurderingOgFortsett({})
  } catch {
    return data(
      {
        errors: {
          _form: 'Det oppstod en feil ved lagring',
        } as FormErrors<TekstTilVedtaksbrevVurdering>,
      },
      { status: 500 },
    )
  }
}

export default function TekstTilVedtaksbrevRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, vurdering, readOnly } = loaderData
  const { errors } = actionData || {}
  const { aktivitet, behandling, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()

  return (
    <TekstTilVedtaksbrevComponent
      readOnly={readOnly}
      grunnlag={grunnlag}
      vurdering={vurdering}
      aktivitet={aktivitet}
      behandling={behandling}
      avbrytAktivitet={avbrytAktivitet}
      errors={errors}
    />
  )
}

function TekstTilVedtaksbrevComponent({
  grunnlag,
  aktivitet,
  behandling,
  readOnly,
  errors,
}: AktivitetComponentProps<TekstTilVedtaksbrevGrunnlag, TekstTilVedtaksbrevVurdering>) {
  const isSubmitting = useIsSubmitting()

  return (
    <Box padding="space-32">
      <VStack gap="space-32">
        <Heading level="1" size="medium">
          {aktivitet.friendlyName}
        </Heading>

        <BodyLong>Følgende tekst er lagt inn i aktiviteter og vil bli tatt med i vedtaksbrevet.</BodyLong>

        <VStack gap="space-32">
          {grunnlag.tekstTilVedtaksbrev.map(tekst => (
            <VStack key={tekst.aktivitetId} gap="space-8">
              <HStack justify="space-between" align="center">
                <Heading level="2" size="small">
                  {tekst.aktivitetFriendlyName}
                </Heading>
                <Button
                  as={RouterLink}
                  to={`/behandling/${behandling.behandlingId}/aktivitet/${tekst.aktivitetId}`}
                  variant="tertiary"
                  size="small"
                >
                  Endre
                </Button>
              </HStack>
              <Box padding="space-16" borderRadius="8" borderWidth="1" borderColor="neutral-subtle">
                <BodyLong style={{ whiteSpace: 'pre-wrap' }}>{tekst.tekst}</BodyLong>
              </Box>
            </VStack>
          ))}
        </VStack>

        {errors?._form && <Alert variant="error">{errors._form}</Alert>}

        {!readOnly && (
          <Form method="post">
            <HStack gap="space-8" justify="end">
              <Button type="submit" variant="primary" size="small" loading={isSubmitting}>
                Bekreft tekst og fortsett
              </Button>
            </HStack>
          </Form>
        )}
      </VStack>
    </Box>
  )
}
