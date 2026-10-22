import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AktivitetFeilmeldinger } from './AktivitetFeilmeldinger'

describe('AktivitetFeilmeldinger', () => {
  it('viser alle feilmeldingene', () => {
    const html = renderToStaticMarkup(
      <AktivitetFeilmeldinger
        feilmeldinger={[
          { melding: 'Fom-dato mangler', felt: 'fom', tidspunkt: '2026-10-20T10:15:00.000' },
          { melding: 'Begrunnelse mangler', felt: null, tidspunkt: '2026-10-20T10:15:00.000' },
        ]}
      />,
    )

    expect(html).toContain('Fom-dato mangler')
    expect(html).toContain('Begrunnelse mangler')
  })

  it('viser ingenting uten feilmeldinger', () => {
    expect(renderToStaticMarkup(<AktivitetFeilmeldinger feilmeldinger={[]} />)).toBe('')
  })
})
