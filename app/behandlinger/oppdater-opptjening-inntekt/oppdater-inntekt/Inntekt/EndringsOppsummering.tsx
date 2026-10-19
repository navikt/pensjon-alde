import { BodyShort, Label, List, VStack } from '@navikt/ds-react'
import { type EndringSummary, harEndringer } from './opptjening.utils'

interface EndringsOppsummeringProps {
  summary: EndringSummary
}

export const EndringsOppsummering = ({ summary }: EndringsOppsummeringProps) => (
  <VStack gap="space-12">
    {harEndringer(summary) || <BodyShort>Ingen endringer</BodyShort>}
    {summary.nye.length > 0 && (
      <VStack gap="space-4">
        <Label as="p">Nye linjer ({summary.nye.length})</Label>
        <List size="small">
          {summary.nye.map(item => (
            <List.Item key={item.id}>{item.label}</List.Item>
          ))}
        </List>
      </VStack>
    )}

    {summary.endrede.length > 0 && (
      <VStack gap="space-4">
        <Label as="p">Endrede linjer ({summary.endrede.length})</Label>
        <List size="small">
          {summary.endrede.map(item => (
            <List.Item key={item.id}>
              {item.label}
              {item.endringer && item.endringer.length > 0 && (
                <List size="small">
                  {item.endringer.map(e => (
                    <List.Item key={e}>{e}</List.Item>
                  ))}
                </List>
              )}
            </List.Item>
          ))}
        </List>
      </VStack>
    )}

    {summary.slettede.length > 0 && (
      <VStack gap="space-4">
        <Label as="p">Slettede linjer ({summary.slettede.length})</Label>
        <List size="small">
          {summary.slettede.map(item => (
            <List.Item key={item.id}>{item.label}</List.Item>
          ))}
        </List>
      </VStack>
    )}
  </VStack>
)

export default EndringsOppsummering
