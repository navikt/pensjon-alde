import { BodyShort, Heading, Loader, Page, VStack } from '@navikt/ds-react'
import styles from '~/common.module.css'

export async function loader() {
  return {}
}

export default function SendMilitaerTilPoppRoute() {
  return (
    <Page.Block gutters className={`${styles.page} ${styles.center}`}>
      <VStack gap="space-16" align="center">
        <Loader size="large" />
        <Heading size="medium" level="2">
          Sender militæropptjening til POPP
        </Heading>
        <BodyShort>Vennligst vent mens militæropptjeningen sendes til POPP.</BodyShort>
      </VStack>
    </Page.Block>
  )
}
