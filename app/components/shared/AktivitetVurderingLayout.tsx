import clsx from 'clsx'
import type React from 'react'
import type { AktivitetDTO } from '~/types/behandling'
import './aktivitet-vurdering-layout.css'
import { Heading, HStack } from '@navikt/ds-react'

interface AktivitetVurderingLayoutProps {
  aktivitet?: AktivitetDTO
  sidebar: React.ReactNode
  details: React.ReactNode
  className?: string
}

const AktivitetVurderingLayout: React.FC<AktivitetVurderingLayoutProps> = ({
  aktivitet,
  sidebar,
  details,
  className = '',
}) => (
  <div className={clsx('aktivitet-vurdering-layout', className)}>
    <Heading size="small" level="3">
      {aktivitet?.friendlyName}
    </Heading>

    <div className="grid">
      <div className="main">{details}</div>

      <div className="sidebar">{sidebar}</div>
    </div>
  </div>
)

export default AktivitetVurderingLayout
