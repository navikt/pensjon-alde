import { InformationSquareIcon } from '@navikt/aksel-icons'
import { Button, Heading, HStack, InfoCard, InlineMessage, LocalAlert, Page, Select, VStack } from '@navikt/ds-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Form, useOutletContext } from 'react-router'
import styles from '~/common.module.css'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import { EndringsOppsummering } from './EndringsOppsummering'
import { type EndringSummary, harEndringer as harEndringerISummary, oversettKoderIMelding } from './opptjening.utils'
import type { ActionErrors, OppdaterOpptjeningGrunnlag, OpptjeningstyperResponse } from './opptjening-types'

interface OpptjeningSkjemaProps {
  tittel: string
  grunnlag: OppdaterOpptjeningGrunnlag
  opptjeningstyper: OpptjeningstyperResponse
  readOnly: boolean
  errors?: ActionErrors
  endringSummary: EndringSummary
  payload: string
  harKlientFeil?: boolean
  children: ReactNode
}

export function OpptjeningSkjema({
  tittel,
  grunnlag,
  opptjeningstyper,
  readOnly,
  errors,
  endringSummary,
  payload,
  harKlientFeil = false,
  children,
}: OpptjeningSkjemaProps) {
  const { avbrytAktivitet } = useOutletContext<AktivitetOutletContext>()
  const isSubmitting = useIsSubmitting()

  const saker = grunnlag.saker ?? []
  const [selectedSakId, setSelectedSakId] = useState('')
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const manglerSak = saker.length > 0 && !selectedSakId
  const sakIdFeil = hasAttemptedSubmit && manglerSak ? 'Du må velge en sak før du kan lagre' : undefined
  const harEndringer = harEndringerISummary(endringSummary)

  return (
    <Page.Block gutters className={styles.page}>
      <VStack gap="space-32">
        <Heading size="medium" level="2">
          {tittel}
        </Heading>

        {readOnly && (
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
          children
        ) : (
          <Form
            method="post"
            onSubmit={e => {
              setHasAttemptedSubmit(true)
              if (manglerSak || !harEndringer) e.preventDefault()
            }}
          >
            <VStack gap="space-24">
              {saker.length > 0 && (
                <Select
                  label="Sak"
                  name="sakId"
                  size="small"
                  value={selectedSakId}
                  onChange={e => setSelectedSakId(e.target.value)}
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

              {harEndringer && (
                <InfoCard data-color="info">
                  <InfoCard.Header icon={<InformationSquareIcon aria-hidden />}>
                    <InfoCard.Title>Endringer som vil bli lagret</InfoCard.Title>
                  </InfoCard.Header>
                  <InfoCard.Content>
                    <EndringsOppsummering summary={endringSummary} />
                  </InfoCard.Content>
                </InfoCard>
              )}

              <input type="hidden" name="payload" value={payload} />

              {hasAttemptedSubmit && !harEndringer && (
                <InlineMessage status="error">
                  Ingen endringer er registrert. Gjør minst én endring før du lagrer.
                </InlineMessage>
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

              <HStack gap="space-8">
                <Button type="submit" variant="primary" size="small" loading={isSubmitting} disabled={harKlientFeil}>
                  Lagre og gå videre
                </Button>
                <Button type="button" variant="tertiary" size="small" onClick={avbrytAktivitet} disabled={isSubmitting}>
                  Avbryt behandling
                </Button>
              </HStack>
            </VStack>
          </Form>
        )}
      </VStack>
    </Page.Block>
  )
}
