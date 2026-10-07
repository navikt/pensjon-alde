import { CheckmarkCircleIcon } from '@navikt/aksel-icons'
import { Heading, HStack, Link, Page, VStack } from '@navikt/ds-react'
import commonStyles from '~/common.module.css'
import { useBehandlingHeaderData } from '~/layout/BehandlingHeaderLayout/use-behandling-header-data'

export default function VenterAttestering({ psakOppgaveoversiktUrl }: { psakOppgaveoversiktUrl: string }) {
  const { psakPensjonsoversiktUrl } = useBehandlingHeaderData()

  return (
    <Page.Block gutters className={`${commonStyles.page} ${commonStyles.center}`}>
      <VStack gap="space-32" className="content" align="center">
        <CheckmarkCircleIcon fontSize="6rem" style={{ color: 'var(--ax-bg-success-strong)' }} />
        <Heading size="medium" level="1">
          <HStack align="center">Sendt til attestering</HStack>
        </Heading>

        <VStack align="center" gap="space-8">
          <Link href={psakPensjonsoversiktUrl}>Pensjonsoversikt</Link>
          <Link href={psakOppgaveoversiktUrl}>Oppgavelisten</Link>
        </VStack>
      </VStack>
    </Page.Block>
  )
}
