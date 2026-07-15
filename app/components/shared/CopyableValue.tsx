import { BodyShort, CopyButton, HStack } from '@navikt/ds-react'

export function CopyableValue({ value }: { value: string }) {
  return (
    <HStack align="center">
      <BodyShort size="small" textColor="subtle">
        {value}
      </BodyShort>
      <CopyButton copyText={value} size="small" data-color="accent" />
    </HStack>
  )
}
