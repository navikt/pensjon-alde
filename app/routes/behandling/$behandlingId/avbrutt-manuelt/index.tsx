import { Button, Heading, Page, VStack } from '@navikt/ds-react'

export const loader = () => {}

const Avbrutt = () => {
  return (
    <Page.Block gutters>
      <VStack gap="8">
        <Heading size="medium" level="1">
          Behandlingen i pilot er avbrutt
        </Heading>

        <VStack gap="2" width="10em">
          <Button size="small" onClick={() => console.log}>
            Til pensjonsoversikt
          </Button>
        </VStack>
      </VStack>
    </Page.Block>
  )
}

export default Avbrutt
