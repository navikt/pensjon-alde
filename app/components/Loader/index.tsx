import { RobotSmileIcon } from '@navikt/aksel-icons'
import { BodyShort, Detail, Label, Loader, VStack } from '@navikt/ds-react'
import './loader.css'
import commonStyles from '~/common.module.css'

type Props = {
  aktivitetNavn?: string | null
}

export const AldeLoader = ({ aktivitetNavn }: Props = {}) => {
  return (
    <VStack gap="space-16" align="center" className={`loader ${commonStyles.page}`}>
      <div>
        <RobotSmileIcon className="robot-smile" fontSize="2.2em" />
        <Loader size="3xlarge" />
      </div>
      <VStack justify="center" align="center" gap="space-4">
        <Label>Maskinen tenker</Label>
        <BodyShort>Vent mens vi ser om resten av saken kan behandles automatisk</BodyShort>
        <div className="aktivitet-navn" aria-live="polite">
          {aktivitetNavn && (
            <Detail key={aktivitetNavn} textColor="subtle" className="aktivitet-navn-tekst">
              {aktivitetNavn}
            </Detail>
          )}
        </div>
      </VStack>
    </VStack>
  )
}

export default AldeLoader
