import { BodyShort, CopyButton, HStack } from '@navikt/ds-react'

interface CopyableValueProps {
  title: string
  value: string
  iconPosition?: 'left' | 'right'
  iconSize?: 'xsmall' | 'small' | 'medium' | undefined
  text?: string
  textColor?: 'default' | 'subtle' | 'contrast' | undefined
  textSize?: 'small' | 'medium' | 'large'
  textWeight?: 'regular' | 'semibold'
  activeText?: string
  useAccentColor?: boolean
}

export const CopyableValue = ({
  title,
  value,
  iconPosition = 'right',
  iconSize = 'small',
  text = value,
  textColor = 'subtle',
  textSize = 'small',
  textWeight = 'regular',
  activeText = 'Kopiert!',
  useAccentColor = true,
}: CopyableValueProps) => (
  <HStack gap="space-4" align="center">
    {title && (
      <BodyShort size={textSize} textColor={textColor} weight={textWeight}>
        {title}
      </BodyShort>
    )}
    <CopyButton
      text={text}
      copyText={value}
      size={iconSize}
      data-color={useAccentColor ? 'accent' : undefined}
      activeText={activeText}
      iconPosition={iconPosition}
    />
  </HStack>
)

export default CopyableValue
