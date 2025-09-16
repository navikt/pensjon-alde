import clsx from 'clsx'
import type React from 'react'
import type { AktivitetDTO } from '~/types/behandling'
import './aktivitet-vurdering-layout.css'
import { Heading } from '@navikt/ds-react'

interface AktivitetVurderingLayoutProps {
  aktivitet?: AktivitetDTO
  children?: React.ReactNode
  sidebar: React.ReactNode
  detailsTitle: string
  detailsContent: React.ReactNode
  className?: string
}

const AktivitetVurderingLayout: React.FC<AktivitetVurderingLayoutProps> = ({
  aktivitet,
  children,
  sidebar,
  detailsTitle,
  detailsContent,
  className = '',
}) => (
  <div className={clsx('aktivitet-vurdering-container', className)}>
    <Heading size="small" level="3">
      {aktivitet?.friendlyName}
    </Heading>

    <div className="aktivitet-vurdering-grid">
      <div className="information-section">
        <div className="details-section">
          <h4>{detailsTitle}</h4>
          {detailsContent}
        </div>
        {children}
      </div>
      <div className="decision-sidebar">{sidebar}</div>
    </div>
  </div>
)

export default AktivitetVurderingLayout
