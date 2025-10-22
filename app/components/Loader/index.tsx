import { RobotSmileIcon } from '@navikt/aksel-icons'
import { BodyShort, HStack, Label, Loader, VStack } from '@navikt/ds-react'
import './loader.css'
import commonStyles from '~/common.module.css'

export const AldeLoader = () => {
  return (
    <HStack gap="4" justify="center" align="center" className={`loader ${commonStyles.page}`}>
      <div>
        <RobotSmileIcon className="robot-smile" fontSize="2.2em" />
        <Loader size="3xlarge" />
      </div>
      <VStack justify="center">
        <Label>Maskinen tenker</Label>
        <BodyShort>Vent mens vi ser om resten av saken kan behandles automatisk</BodyShort>
      </VStack>
    </HStack>
  )
}

export default AldeLoader
