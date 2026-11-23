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
  Select,
  VStack,
} from '@navikt/ds-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Form } from 'react-router'
import styles from '~/common.module.css'
import BegrunnelseField from '~/components/shared/BegrunnelseField'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import { EndringsOppsummering } from './EndringsOppsummering'
import type {
  ActionErrors,
  OppdaterOpptjeningGrunnlag,
  OppdaterPgiSakValg,
  OpptjeningstyperResponse,
  OpptjeningTypeKode,
} from './opptjening.types'
import { type EndringSummary, harEndringer as harEndringerISummary, oversettKoderIMelding } from './opptjening.utils'

const SAK_FELT_ID = 'opptjening-sak'

interface OpptjeningSkjemaProps {
  tittel: string
  grunnlag: Pick<OppdaterOpptjeningGrunnlag, 'saker'>
  opptjeningstyper: OpptjeningstyperResponse | OpptjeningTypeKode[]
  readOnly: boolean
  manglerTilgang?: boolean
  errors?: ActionErrors
  endringSummary: EndringSummary
  payload: string
  sakId?: number
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
  grunnlag,
  opptjeningstyper,
  readOnly,
  manglerTilgang = false,
  errors,
  endringSummary,
  payload,
  sakId,
  begrunnelse,
  avbrytAktivitet,
  harKlientFeil = false,
  feiloppsummering = [],
  onInnsendingsforsok,
  visNotat = false,
  children,
}: OpptjeningSkjemaProps) {
  const isSubmitting = useIsSubmitting()

  const [selectedSakId, setSelectedSakId] = useState(sakId != null ? String(sakId) : '')
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [avvisteForsok, setAvvisteForsok] = useState(0)
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const skjemaFeilRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (avvisteForsok === 0) return
    ;(errorSummaryRef.current ?? skjemaFeilRef.current)?.focus()
  }, [avvisteForsok])

  const saker: OppdaterPgiSakValg[] =
    sakId != null && !(grunnlag.saker ?? []).some(sak => sak.sakId === sakId)
      ? [...(grunnlag.saker ?? []), { sakId }]
      : (grunnlag.saker ?? [])

  const manglerSak = !selectedSakId
  const sakIdFeil =
    hasAttemptedSubmit && manglerSak
      ? saker.length > 0
        ? 'Du må velge en sak før du kan lagre'
        : 'Ingen saker er tilgjengelige for lagring'
      : undefined
  const harEndringer = harEndringerISummary(endringSummary)

  const visSakvalg = readOnly ? !manglerSak : saker.length > 0
  const visOppsummering = !readOnly || harEndringer
  const visBegrunnelse = visNotat && (!readOnly || !!begrunnelse)

  const oppsummerteFeil = hasAttemptedSubmit
    ? [
        ...(sakIdFeil && visSakvalg ? [{ href: `#${SAK_FELT_ID}`, melding: sakIdFeil }] : []),
        ...(harKlientFeil ? feiloppsummering : []),
      ]
    : []
  const visIngenEndringer = hasAttemptedSubmit && !harEndringer
  const visSakFeilUtenFelt = !!sakIdFeil && !visSakvalg
  const visGenerellKlientFeil = hasAttemptedSubmit && harKlientFeil && feiloppsummering.length === 0

  const innhold = (
    <VStack gap="space-24">
      {visSakvalg && (
        <Select
          id={SAK_FELT_ID}
          label="Sak"
          name="sakId"
          size="small"
          value={selectedSakId}
          onChange={e => setSelectedSakId(e.target.value)}
          readOnly={readOnly}
          error={sakIdFeil}
          style={{ maxWidth: '20rem' }}
        >
          <option value="">Velg sak</option>
          {saker.map(sak => (
            <option key={sak.sakId} value={sak.sakId}>
              {sak.sakId}
              {sak.sakType ? ` – ${sak.sakType}` : ''}
              {sak.sakStatus ? ` (${sak.sakStatus})` : ''}
            </option>
          ))}
        </Select>
      )}

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

          {(visIngenEndringer || visSakFeilUtenFelt || visGenerellKlientFeil) && (
            <VStack ref={skjemaFeilRef} tabIndex={-1} gap="space-8">
              {visIngenEndringer && (
                <InlineMessage status="error">
                  Ingen endringer er registrert. Gjør minst én endring før du lagrer.
                </InlineMessage>
              )}
              {visSakFeilUtenFelt && <InlineMessage status="error">{sakIdFeil}</InlineMessage>}
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
              if (manglerSak || !harEndringer || harKlientFeil) {
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
