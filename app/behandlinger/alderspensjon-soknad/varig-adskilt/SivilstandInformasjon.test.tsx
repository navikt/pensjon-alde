import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SivilstandInformasjon } from './SivilstandInformasjon'
import type { Sivilstand } from './types'

const sivilstand: Sivilstand = {
  sokerSivilstand: 'GIFT',
  gyldigFraOgMed: '1990-06-15',
  bekreftelsesdato: '2024-01-02',
}

describe('SivilstandInformasjon', () => {
  it('viser sivilstand og datoer fra grunnlaget', () => {
    const html = renderToStaticMarkup(<SivilstandInformasjon sivilstand={sivilstand} />)

    expect(html).toContain('Gift')
    expect(html).toContain('15.06.1990')
    expect(html).toContain('02.01.2024')
  })

  it('viser registrert partnerskap uten valgfrie opplysninger', () => {
    const html = renderToStaticMarkup(
      <SivilstandInformasjon
        sivilstand={{
          sokerSivilstand: 'REPA',
          gyldigFraOgMed: null,
          bekreftelsesdato: null,
        }}
      />,
    )

    expect(html).toContain('Registrert partner')
    expect(html).not.toContain('Gyldig fra og med')
    expect(html).not.toContain('Bekreftelsesdato')
  })

  it('håndterer manglende sivilstand for ektefelle eller partner', () => {
    const html = renderToStaticMarkup(<SivilstandInformasjon sivilstand={null} />)

    expect(html).toContain('Ukjent')
    expect(html).not.toContain('Gyldig fra og med')
    expect(html).not.toContain('Bekreftelsesdato')
  })
})
