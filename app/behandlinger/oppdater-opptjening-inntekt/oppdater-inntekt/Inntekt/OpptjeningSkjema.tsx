import { InformationSquareIcon } from '@navikt/aksel-icons'
import {
  Button,
  ErrorSummary,
  Heading,
  HStack,
  InfoCard,
  InlineMessage,
  List,
  LocalAlert,
  Page,
  VStack,
} from '@navikt/ds-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Form } from 'react-router'
import styles from '~/common.module.css'
import BegrunnelseField from '~/components/shared/BegrunnelseField'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import { EndringsOppsummering } from './EndringsOppsummering'
import type { ActionErrors, OpptjeningstyperResponse, OpptjeningTypeKode } from './opptjening.types'
import { type EndringSummary, harEndringer as harEndringerISummary, oversettKoderIMelding } from './opptjening.utils'

interface OpptjeningSkjemaProps {
  tittel: string
  opptjeningstyper: OpptjeningstyperResponse | OpptjeningTypeKode[]
  readOnly: boolean
  manglerTilgang?: boolean
  errors?: ActionErrors
  endringSummary: EndringSummary
  payload: string
  begrunnelse?: string
  avbrytAktivitet?: () => void
  harKlientFeil?: boolean
  feiloppsummering?: { href: string; melding: string }[]
  onInnsendingsforsok?: () => void
  visNotat?: boolean
  children: ReactNode
}

export function OpptjeningSkjema({
  tittel,
  opptjeningstyper,
  readOnly,
  manglerTilgang = false,
  errors,
  endringSummary,
  payload,
  begrunnelse,
  avbrytAktivitet,
  harKlientFeil = false,
  feiloppsummering = [],
  onInnsendingsforsok,
  visNotat = false,
  children,
}: OpptjeningSkjemaProps) {
  const isSubmitting = useIsSubmitting()

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [avvisteForsok, setAvvisteForsok] = useState(0)
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const skjemaFeilRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (avvisteForsok === 0) return
    ;(errorSummaryRef.current ?? skjemaFeilRef.current)?.focus()
  }, [avvisteForsok])

  const harEndringer = harEndringerISummary(endringSummary)

  const visOppsummering = !readOnly || harEndringer
  const visBegrunnelse = visNotat && (!readOnly || !!begrunnelse)

  const oppsummerteFeil = hasAttemptedSubmit && harKlientFeil ? feiloppsummering : []
  const visIngenEndringer = hasAttemptedSubmit && !harEndringer && !harKlientFeil
  const visGenerellKlientFeil = hasAttemptedSubmit && harKlientFeil && feiloppsummering.length === 0

  const innhold = (
    <VStack gap="space-24">
      {children}

      {visOppsummering && (
        <InfoCard data-color="info">
          <InfoCard.Header icon={<InformationSquareIcon aria-hidden />}>
            <InfoCard.Title>Oppsummering av endringer</InfoCard.Title>
          </InfoCard.Header>
          <InfoCard.Content>
            <EndringsOppsummering summary={endringSummary} />
          </InfoCard.Content>
        </InfoCard>
      )}

      {visBegrunnelse && <BegrunnelseField readOnly={readOnly} defaultValue={begrunnelse} />}

      {!readOnly && (
        <>
          <input type="hidden" name="payload" value={payload} />

          {errors?._server && errors._server.length > 0 && (
            <LocalAlert status="error">
              <LocalAlert.Header>
                <LocalAlert.Title>Sjekk følgende feil</LocalAlert.Title>
              </LocalAlert.Header>
              <LocalAlert.Content>
                <List size="small">
                  {Array.from(new Set(errors._server)).map(melding => (
                    <List.Item key={melding}>{oversettKoderIMelding(melding, opptjeningstyper)}</List.Item>
                  ))}
                </List>
              </LocalAlert.Content>
            </LocalAlert>
          )}

          {oppsummerteFeil.length > 0 && (
            <ErrorSummary
              ref={errorSummaryRef}
              size="small"
              heading="Rett disse feilene før du lagrer:"
              headingTag="h3"
            >
              {oppsummerteFeil.map(({ href, melding }) => (
                <ErrorSummary.Item key={`${href}-${melding}`} href={href}>
                  {melding}
                </ErrorSummary.Item>
              ))}
            </ErrorSummary>
          )}

          {(visIngenEndringer || visGenerellKlientFeil) && (
            <VStack ref={skjemaFeilRef} tabIndex={-1} gap="space-8">
              {visIngenEndringer && (
                <InlineMessage status="error">
                  Ingen endringer er registrert. Gjør minst én endring før du lagrer.
                </InlineMessage>
              )}
              {visGenerellKlientFeil && (
                <InlineMessage status="error">Rett feilene i skjemaet før du lagrer.</InlineMessage>
              )}
            </VStack>
          )}

          <HStack gap="space-8">
            <Button type="submit" variant="primary" size="small" loading={isSubmitting}>
              Lagre og gå videre
            </Button>
            <Button type="button" variant="tertiary" size="small" onClick={avbrytAktivitet} disabled={isSubmitting}>
              Avbryt behandling
            </Button>
          </HStack>
        </>
      )}
    </VStack>
  )

  return (
    <Page.Block gutters={!readOnly} className={styles.page}>
      <VStack gap="space-32">
        <Heading size="medium" level="2">
          {tittel}
        </Heading>

        {manglerTilgang && (
          <LocalAlert status="warning">
            <LocalAlert.Header>
              <LocalAlert.Title>Mangler rolletilgang</LocalAlert.Title>
            </LocalAlert.Header>
            <LocalAlert.Content>
              Kun saksbehandlere med tilleggsrolle «Spesial PGI» kan gjøre endringer i Opptjeningsregisteret.
            </LocalAlert.Content>
          </LocalAlert>
        )}

        {errors?._form && (
          <LocalAlert status="error">
            <LocalAlert.Header>
              <LocalAlert.Title>Feilmelding</LocalAlert.Title>
            </LocalAlert.Header>
            <LocalAlert.Content>{errors._form}</LocalAlert.Content>
          </LocalAlert>
        )}

        {readOnly ? (
          innhold
        ) : (
          <Form
            method="post"
            onSubmit={e => {
              setHasAttemptedSubmit(true)
              onInnsendingsforsok?.()
              if (!harEndringer || harKlientFeil) {
                e.preventDefault()
                setAvvisteForsok(forsok => forsok + 1)
              }
            }}
          >
            {innhold}
          </Form>
        )}
      </VStack>
    </Page.Block>
  )
}
