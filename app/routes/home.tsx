import { BodyLong, Heading, Page, VStack } from '@navikt/ds-react'
import commonStyles from '~/common.module.css'

export default function Home() {
  return (
    <Page.Block gutters className={commonStyles.page}>
      <VStack gap="space-32" className="content" align="center">
        <Heading size="medium" level="1">
          <VStack align="center">
            <Heading size="medium">Mangler behandling</Heading>
            <BodyLong>Lukk siden og åpne på nytt fra Pesys</BodyLong>
          </VStack>
        </Heading>
      </VStack>
    </Page.Block>
  )
}
