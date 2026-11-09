import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AktivitetFeilmeldinger } from './AktivitetFeilmeldinger'

describe('AktivitetFeilmeldinger', () => {
  it('viser alle feilmeldingene og lenker bare til felt som finnes', () => {
    const html = renderToStaticMarkup(
      <AktivitetFeilmeldinger
        feilmeldinger={[
          { melding: 'Fom-dato mangler', felt: 'fom', feltId: 'fom-input' },
          { melding: 'Fnr er ugyldig', felt: 'samboerFnr' },
          { melding: 'Begrunnelse mangler', felt: null },
        ]}
        tidspunkt="2026-10-20T10:15:00"
      />,
    )

    expect(html).toContain('Fom-dato mangler')
    expect(html).toContain('Fnr er ugyldig')
    expect(html).toContain('Begrunnelse mangler')
    expect(html).toContain('href="#fom-input"')
    expect(html.match(/href=/g)).toHaveLength(1)
  })

  it('viser ingenting uten feilmeldinger', () => {
    expect(renderToStaticMarkup(<AktivitetFeilmeldinger feilmeldinger={[]} />)).toBe('')
  })
})
