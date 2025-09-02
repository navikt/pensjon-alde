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
}) => {
  return (
    <div className={`aktivitet-vurdering-container ${className}`}>
      <Heading size="small" level={'3'}>
        {aktivitet?.friendlyName}
      </Heading>
      <div className="aktivitet-vurdering-grid">
        <div className="information-section">
          {aktivitet && (
            <div className="aktivitet-info">
              <h4>Aktivitet informasjon:</h4>
              <p>
                <strong>Status:</strong> {aktivitet.status}
              </p>
              <p>
                <strong>Type:</strong> {aktivitet.type}
              </p>
              <p>
                <strong>Siste aktivering:</strong> {new Date(aktivitet.sisteAktiveringsdato).toLocaleString('no-NO')}
              </p>
            </div>
          )}
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
}

export default AktivitetVurderingLayout
