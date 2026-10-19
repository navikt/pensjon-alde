import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import type { OppdaterOpptjeningGrunnlag, OppdaterOpptjeningVurdering } from './Omsorg/opptjening.types'
import { OppdaterOmsorg } from './OppdaterOmsorg'

const grunnlag: OppdaterOpptjeningGrunnlag = {
  saker: [{ sakId: 23077283, sakType: 'ALDER', sakStatus: 'LOPENDE' }],
  opptjeningsGrunnlagDto: {
    fnr: '12345678901',
    omsorgListe: [
      { omsorgId: 1, omsorgType: 'OBU6', ar: 2010, fnrOmsorgFor: '01011012345', kilde: 'PEN' },
      { omsorgId: 2, omsorgType: 'OBU6', ar: 2011, fnrOmsorgFor: '01011012345', kilde: 'PEN' },
    ],
  },
}

const vurdering: OppdaterOpptjeningVurdering = {
  sakId: 23077283,
  fnr: '12345678901',
  omsorgTilSletting: [{ ar: 2010, omsorgType: 'OBU6' }],
}

function renderReadOnly(grunnlagTilVisning: OppdaterOpptjeningGrunnlag) {
  const router = createMemoryRouter([
    {
      path: '*',
      element: (
        <OppdaterOmsorg
          readOnly
          grunnlag={grunnlagTilVisning}
          vurdering={vurdering}
          aktivitet={{} as AktivitetDTO}
          behandling={{} as BehandlingDTO}
          begrunnelse="Registrert på feil forelder"
          visNotat
        />
      ),
    },
  ])
  return renderToStaticMarkup(<RouterProvider router={router} />)
}

describe('OppdaterOmsorg (attestering og oppsummering)', () => {
  it('viser skjemaet read-only med slettede linjer, sak og begrunnelse', () => {
    const html = renderReadOnly(grunnlag)

    expect(html).toContain('Oppdater omsorg')
    expect(html).toContain('Slettede linjer (1)')
    expect(html).toContain('OBU6 (2010) – omsorg for 01011012345')
    expect(html).toContain('Slettet')
    expect(html).toContain('23077283 – ALDER (LOPENDE)')
    expect(html).toContain('Registrert på feil forelder')
    expect(html).not.toContain('Lagre og gå videre')
    expect(html).not.toContain('Mangler rolletilgang')
    expect(html).not.toContain('<form')
  })

  it('bruker beskrivelsen av omsorgstypen fra grunnlaget', () => {
    const html = renderReadOnly({
      ...grunnlag,
      opptjeningstyper: [{ code: 'OBU6', description: 'Omsorg for barn under 6 år - eget vedtak' }],
    })

    expect(html).toContain('Omsorg for barn under 6 år - eget vedtak (2010) – omsorg for 01011012345')
  })
})
