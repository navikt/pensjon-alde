import { RobotSmileIcon } from '@navikt/aksel-icons'
import { BodyShort, Label, Loader, VStack } from '@navikt/ds-react'
import './loader.css'
import commonStyles from '~/common.module.css'

export const AldeLoader = () => {
  return (
    <VStack gap="4" align="center" className={`loader ${commonStyles.page}`}>
      <div>
        <RobotSmileIcon className="robot-smile" fontSize="2.2em" />
        <Loader size="3xlarge" />
      </div>
      <VStack justify="center" align="center">
        <Label>Maskinen tenker</Label>
        <BodyShort>Vent mens vi ser om resten av saken kan behandles automatisk</BodyShort>
      </VStack>
    </VStack>
  )
}

export default AldeLoader
