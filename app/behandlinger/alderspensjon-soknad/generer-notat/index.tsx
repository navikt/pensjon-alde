import { Alert, BodyLong, BodyShort, Box, Button, Heading, HStack, Page, VStack } from '@navikt/ds-react'
import { useEffect, useState } from 'react'
import { data, Form, redirect, useNavigation, useOutletContext } from 'react-router'
import { createAktivitetApi } from '~/api/aktivitet-api'
import commonStyles from '~/common.module.css'
import type { AktivitetComponentProps, FormErrors } from '~/types/aktivitet-component'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { Route } from './+types'

export function meta() {
  return [{ title: 'Generer notat' }, { name: 'description', content: 'Generer notat' }]
}

export type GenererNotatGrunnlagOk = {
  type: 'ok'
  pdf: string
}

export type GenererNotatGrunnlagError = {
  type: 'error'
  feilmelding: string
}

export type GenererNotatGrunnlag = GenererNotatGrunnlagOk | GenererNotatGrunnlagError

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
  const intent = formData.get('intent')

  if (intent === 'prov-igjen') {
    try {
      await api.retryGrunnlagsdata()
      return redirect(`/behandling/${behandlingId}`)
    } catch {
      return data(
        {
          errors: {
            _form: 'Det oppstod en feil ved ny generering av notatet',
          } as FormErrors<GenererNotatVurdering>,
        },
        { status: 500 },
      )
    }
  }

  if (intent === 'hopp-over') {
    try {
      await api.lagreVurdering({
        akseptert: false,
      })
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

  return data(
    {
      errors: {
        _form: 'Ukjent handling',
      } as FormErrors<GenererNotatVurdering>,
    },
    { status: 400 },
  )
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
  if (grunnlag.type === 'error') {
    return <NotatError grunnlag={grunnlag} readOnly={readOnly} errors={errors} />
  }

  return (
    <Box padding="space-32">
      <VStack gap="space-32">
        <Heading level="1" size="medium">
          {aktivitet.friendlyName}
        </Heading>

        <NotatOk pdf={grunnlag.pdf} />
      </VStack>
    </Box>
  )
}

function NotatOk({ pdf }: { pdf: string }) {
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

  if (!pdfSrc) {
    return <Alert variant="info">Ingen PDF tilgjengelig for forhåndsvisning.</Alert>
  }

  return (
    <Box borderWidth="1" overflow="hidden" width="100%">
      <iframe
        title="Forhåndsvisning av notat"
        src={pdfSrc}
        width="100%"
        style={{ border: 0, height: '80vh', display: 'block' }}
      />
    </Box>
  )
}

function NotatError({
  grunnlag,
  readOnly,
  errors,
}: {
  grunnlag: GenererNotatGrunnlagError
  readOnly: boolean
  errors?: FormErrors<GenererNotatVurdering>
}) {
  const navigation = useNavigation()
  const submittingIntent = navigation.state !== 'idle' ? navigation.formData?.get('intent') : null

  return (
    <Page.Block gutters className={`${commonStyles.page} ${commonStyles.center}`} width="text">
      <VStack gap="space-40" align="center">
        <VStack align="center" gap="space-16">
          <Heading size="medium" level="1" align="center">
            Klarte ikke å generere notatet
          </Heading>
          <BodyLong align="center">
            Notatet blir vanligvis generert automatisk. Denne gangen feilet det, og behandlingen venter nå på deg.
            Feilen er som regel forbigående, så det er ofte nok å prøve på nytt.
          </BodyLong>
          <BodyLong align="center">
            Hvis du hopper over notatet, går behandlingen videre til attestering uten at notatet journalføres. Da må du
            selv opprette notatet manuelt i Pesys.
          </BodyLong>
          <BodyShort size="small" textColor="subtle" align="center">
            {grunnlag.feilmelding}
          </BodyShort>
        </VStack>

        {errors?._form && <Alert variant="error">{errors._form}</Alert>}

        {!readOnly && (
          <HStack gap="space-16" align="center" justify="center">
            <Form method="post">
              <input type="hidden" name="intent" value="prov-igjen" />
              <Button
                type="submit"
                variant="primary"
                loading={submittingIntent === 'prov-igjen'}
                disabled={submittingIntent != null}
              >
                Prøv igjen
              </Button>
            </Form>

            <Form method="post">
              <input type="hidden" name="intent" value="hopp-over" />
              <Button
                type="submit"
                variant="secondary"
                loading={submittingIntent === 'hopp-over'}
                disabled={submittingIntent != null}
              >
                Hopp over notat
              </Button>
            </Form>
          </HStack>
        )}
      </VStack>
    </Page.Block>
  )
}

export const Component = GenererNotatComponent
