import { Box, Tabs } from '@navikt/ds-react'
import { useNavigate, useParams } from 'react-router'
import type { AktivitetDTO } from '~/types/behandling'

interface Props {
  aktiviteter: AktivitetDTO[]
  valgtAktivitetId: string
}

export default function AktivitetVelger({ aktiviteter, valgtAktivitetId }: Props) {
  const navigate = useNavigate()
  const { behandlingId } = useParams()

  return (
    <Box paddingInline="space-24" paddingBlock="space-8 space-0" aria-label="Åpne aktiviteter" as="nav">
      <Tabs
        size="small"
        value={valgtAktivitetId}
        onChange={aktivitetId => navigate(`/behandling/${behandlingId}/aktivitet/${aktivitetId}`)}
      >
        <Tabs.List>
          {aktiviteter.map(aktivitet => (
            <Tabs.Tab
              key={aktivitet.aktivitetId}
              value={aktivitet.aktivitetId.toString()}
              label={aktivitet.friendlyName}
            />
          ))}
        </Tabs.List>
      </Tabs>
    </Box>
  )
}
