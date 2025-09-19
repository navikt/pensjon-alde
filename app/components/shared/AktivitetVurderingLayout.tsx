import clsx from 'clsx'
import React from 'react'
import type { AktivitetDTO } from '~/types/behandling'
import './aktivitet-vurdering-layout.css'
import { Heading } from '@navikt/ds-react'

interface AktivitetVurderingLayoutProps {
  aktivitet?: AktivitetDTO
  sidebar: React.ReactNode
  children: React.ReactNode
  className?: string
}

interface DetailsSectionProps {
  children: React.ReactNode
}

const DetailsSection: React.FC<DetailsSectionProps> = ({ children }) => {
  return <>{children}</>
}

type AktivitetVurderingLayoutComponent = React.FC<AktivitetVurderingLayoutProps> & {
  Section: React.FC<DetailsSectionProps>
}

const AktivitetVurderingLayout: AktivitetVurderingLayoutComponent = ({
  aktivitet,
  sidebar,
  children,
  className = '',
}) => {
  const renderDetails = () => {
    const childrenArray = React.Children.toArray(children)

    return childrenArray.map((child, index) => {
      const key = React.isValidElement(child) && child.key ? child.key : `section-${index}`
      return (
        <React.Fragment key={key}>
          <div className="section">{child}</div>
          {index < childrenArray.length - 1 && <div className="details-divider" />}
        </React.Fragment>
      )
    })
  }

  return (
    <div className={clsx('aktivitet-vurdering-layout', className)}>
      <div className="grid">
        <div className="main">
          <Heading size="medium" level="1" className="header">
            {aktivitet?.friendlyName}
          </Heading>
          {renderDetails()}
        </div>

        <div className="sidebar">{sidebar}</div>
      </div>
    </div>
  )
}

AktivitetVurderingLayout.Section = DetailsSection

export default AktivitetVurderingLayout
