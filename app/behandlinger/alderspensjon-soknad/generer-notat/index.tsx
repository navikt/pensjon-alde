import { Alert, BodyShort, Box, Button, Heading, HStack, VStack } from '@navikt/ds-react'
import { useEffect, useState } from 'react'
import { data, Form, redirect, useNavigation, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import type { AktivitetComponentProps, FormErrors } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { Route } from './+types'

export function meta() {
  return [{ title: 'Generer notat' }, { name: 'description', content: 'Generer notat' }]
}

export type GenererNotatGrunnlag = {
  pdf: string
}

export type GenererNotatVurdering = {
  akseptert: boolean
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { behandlingId, aktivitetId } = params

  const api = createAktivitetApi({ request, behandlingId, aktivitetId })

  const grunnlag = await api.hentGrunnlagsdata<GenererNotatGrunnlag>()
  const vurdering = await api.hentVurdering<GenererNotatVurdering>()

  return {
    readOnly: false,
    grunnlag,
    vurdering,
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { behandlingId, aktivitetId } = params
  const api = createAktivitetApi({ request, behandlingId, aktivitetId })

  const formData = await request.formData()
  const utfall = formData.get('utfall')

  if (utfall !== 'akseptert' && utfall !== 'avslatt') {
    return data(
      {
        errors: {
          _form: 'Du må velge å akseptere eller avslå notatet',
        } as FormErrors<GenererNotatVurdering>,
      },
      { status: 400 },
    )
  }

  try {
    const vurdering: GenererNotatVurdering = { akseptert: utfall === 'akseptert' }
    await api.lagreVurdering(vurdering)
    return redirect(`/behandling/${behandlingId}?justCompleted=${aktivitetId}`)
  } catch {
    return data(
      {
        errors: {
          _form: 'Det oppstod en feil ved lagring av vurderingen',
        } as FormErrors<GenererNotatVurdering>,
      },
      { status: 500 },
    )
  }
}

export default function GenererNotatRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { grunnlag, vurdering, readOnly } = loaderData
  const { errors } = actionData || {}
  const { aktivitet, behandling, avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()

  return (
    <GenererNotatComponent
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

function GenererNotatComponent({
  grunnlag,
  aktivitet,
  readOnly,
  errors,
}: AktivitetComponentProps<GenererNotatGrunnlag, GenererNotatVurdering>) {
  const { pdf } = grunnlag
  const [pdfSrc, setPdfSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!pdf) {
      setPdfSrc(null)
      return
    }
    const bytes = Uint8Array.from(atob(pdf), char => char.charCodeAt(0))
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
    setPdfSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [pdf])

  const navigation = useNavigation()
  const isSubmitting = navigation.state !== 'idle' && navigation.formData != null

  return (
    <Box padding="space-32">
      <VStack gap="space-32">
        <Heading level="1" size="medium">
          {aktivitet.friendlyName}
        </Heading>

        {pdfSrc ? (
          <Box borderWidth="1" overflow="hidden" width="100%">
            <iframe
              title="Forhåndsvisning av notat"
              src={pdfSrc}
              width="100%"
              style={{ border: 0, height: '80vh', display: 'block' }}
            />
          </Box>
        ) : (
          <Alert variant="info">Ingen PDF tilgjengelig for forhåndsvisning.</Alert>
        )}

        {errors?._form && <Alert variant="error">{errors._form}</Alert>}

        {!readOnly && (
          <Form method="post">
            <VStack gap="space-8">
              <BodyShort textColor="subtle">Vurder notatet for å fortsette behandlingen.</BodyShort>
              <HStack gap="space-16">
                <Button type="submit" name="utfall" value="akseptert" variant="primary" loading={isSubmitting}>
                  Aksepter
                </Button>
                <Button type="submit" name="utfall" value="avslatt" variant="secondary" loading={isSubmitting}>
                  Avslå
                </Button>
              </HStack>
            </VStack>
          </Form>
        )}
      </VStack>
    </Box>
  )
}

export const Component = GenererNotatComponent
