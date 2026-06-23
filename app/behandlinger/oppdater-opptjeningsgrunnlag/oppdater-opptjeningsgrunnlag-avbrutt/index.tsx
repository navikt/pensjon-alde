import { Alert, BodyShort, Heading, Page, VStack } from '@navikt/ds-react'
import { useOutletContext } from 'react-router'
import styles from '~/common.module.css'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'

export async function loader() {
  return {}
}

export default function OppdaterOpptjeningsgrunnlagAvbruttRoute() {
  const { behandling } = useOutletContext<AktivitetOutletContext>()

  return (
    <Page.Block gutters className={`${styles.page} ${styles.center}`}>
      <VStack gap="space-16">
        <Heading size="medium" level="2">
          Behandlingen er avbrutt
        </Heading>
        <Alert variant="warning">
          <BodyShort>
            Oppdatering av pensjonsgivende inntekt for behandling {behandling.behandlingId} er avbrutt.
          </BodyShort>
        </Alert>
      </VStack>
    </Page.Block>
  )
}
