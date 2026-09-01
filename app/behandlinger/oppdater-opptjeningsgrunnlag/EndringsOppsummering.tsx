import { VStack } from '@navikt/ds-react'
import type { EndringSummary } from './oppdater-grunnlag/oppdater-grunnlag.utils'

interface EndringsOppsummeringProps {
  summary: EndringSummary
}

export const EndringsOppsummering = ({ summary }: EndringsOppsummeringProps) => (
  <VStack gap="space-12">
    {summary.nye.length > 0 && (
      <div>
        <strong>Nye linjer ({summary.nye.length})</strong>
        <ul>
          {summary.nye.map(item => (
            <li key={item.id}>
              {item.kategori}: {item.label}
            </li>
          ))}
        </ul>
      </div>
    )}

    {summary.endrede.length > 0 && (
      <div>
        <strong>Endrede linjer ({summary.endrede.length})</strong>
        <ul>
          {summary.endrede.map(item => (
            <li key={item.id}>
              {item.kategori}: {item.label}
              {item.endringer && item.endringer.length > 0 && (
                <ul>
                  {item.endringer.map(e => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    )}

    {summary.slettede.length > 0 && (
      <div>
        <strong>Slettede linjer ({summary.slettede.length})</strong>
        <ul>
          {summary.slettede.map(item => (
            <li key={item.id}>
              {item.kategori}: {item.label}
            </li>
          ))}
        </ul>
      </div>
    )}
  </VStack>
)

export default EndringsOppsummering
