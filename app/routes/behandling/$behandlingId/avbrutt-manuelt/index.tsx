import { Button, Heading, VStack } from '@navikt/ds-react'

export const loader = () => {}

const Avbrutt = () => {
  return (
    <VStack gap="8">
      <Heading size="medium" level="1">
        Behandlingen i pilot er avbrutt
      </Heading>

      <div>
        <Button size="small" onClick={() => console.log}>
          Til pensjonsoversikt
        </Button>
      </div>
    </VStack>
  )
}

export default Avbrutt
