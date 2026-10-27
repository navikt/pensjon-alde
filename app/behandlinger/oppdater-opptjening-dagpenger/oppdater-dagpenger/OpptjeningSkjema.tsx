import { InformationSquareIcon } from '@navikt/aksel-icons'
import { Button, Heading, HStack, InfoCard, InlineMessage, LocalAlert, Page, Select, VStack } from '@navikt/ds-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Form } from 'react-router'
import styles from '~/common.module.css'
import BegrunnelseField from '~/components/shared/BegrunnelseField'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import type { ActionErrors, DagpengerGrunnlag, Dagpengertype, SakValg } from './dagpenger.types'
import { EndringsOppsummering } from './EndringsOppsummering'
import { type EndringSummary, harEndringer as harEndringerISummary, oversettKoderIMelding } from './opptjening.utils'

interface OpptjeningSkjemaProps {
  tittel: string
  grunnlag: DagpengerGrunnlag
  opptjeningstyper: Dagpengertype[]
  readOnly: boolean
  manglerTilgang?: boolean
  errors?: ActionErrors
  endringSummary: EndringSummary
  payload: string
  sakId?: number
  begrunnelse?: string
  avbrytAktivitet?: () => void
  harKlientFeil?: boolean
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
  onInnsendingsforsok,
  visNotat = false,
  children,
}: OpptjeningSkjemaProps) {
  const isSubmitting = useIsSubmitting()

  const [selectedSakId, setSelectedSakId] = useState(sakId != null ? String(sakId) : '')
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const saker: SakValg[] =
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

  const innhold = (
    <VStack gap="space-24">
      {visSakvalg && (
        <Select
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

          {hasAttemptedSubmit && !harEndringer && (
            <InlineMessage status="error">
              Ingen endringer er registrert. Gjør minst én endring før du lagrer.
            </InlineMessage>
          )}

          {hasAttemptedSubmit && harKlientFeil && (
            <InlineMessage status="error">Rett feilene i tabellen før du lagrer.</InlineMessage>
          )}

          {errors?._server && errors._server.length > 0 && (
            <LocalAlert status="error">
              <LocalAlert.Header>
                <LocalAlert.Title>Vennligst sjekk følgende feil</LocalAlert.Title>
              </LocalAlert.Header>
              <LocalAlert.Content>
                <VStack gap="space-4">
                  <ul>
                    {Array.from(new Set(errors._server)).map(melding => (
                      <li key={melding}>{oversettKoderIMelding(melding, opptjeningstyper)}</li>
                    ))}
                  </ul>
                </VStack>
              </LocalAlert.Content>
            </LocalAlert>
          )}

          {sakIdFeil && !visSakvalg && <InlineMessage status="error">{sakIdFeil}</InlineMessage>}

          <HStack gap="space-8">
            <Button
              type="submit"
              variant="primary"
              size="small"
              loading={isSubmitting}
              // Blur i tabellen kan vise feil og flytte knappen før klikket registreres
              onMouseDown={e => e.preventDefault()}
            >
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
              <LocalAlert.Title>Mangler rolle tilgang</LocalAlert.Title>
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
              if (manglerSak || !harEndringer || harKlientFeil) e.preventDefault()
            }}
          >
            {innhold}
          </Form>
        )}
      </VStack>
    </Page.Block>
  )
}
