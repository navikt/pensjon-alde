import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import { OpptjeningAktivitetComponent } from './OpptjeningAktivitetComponent'
import type { OppdaterOpptjeningGrunnlag, OppdaterOpptjeningVurdering } from './opptjening-types'

const grunnlag: OppdaterOpptjeningGrunnlag = {
  opptjeningsGrunnlagDto: {
    fnr: '12345678901',
    omsorgListe: [{ omsorgId: 1, omsorgType: 'OBU6', ar: 2010, fnrOmsorgFor: '01011012345', kilde: 'PEN' }],
  },
}

const vurdering: OppdaterOpptjeningVurdering = {
  sakId: 23077283,
  fnr: '12345678901',
  omsorgTilSletting: [{ ar: 2010, omsorgType: 'OBU6' }],
}

function renderSomPdf(grunnlag: OppdaterOpptjeningGrunnlag) {
  const router = createMemoryRouter([
    {
      path: '*',
      element: (
        <OpptjeningAktivitetComponent
          readOnly
          grunnlag={grunnlag}
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

describe('OpptjeningAktivitetComponent', () => {
  it('rendrer endringene og begrunnelsen uten å vente på opptjeningstyper, slik PDF-tjenesten krever', () => {
    const html = renderSomPdf(grunnlag)

    expect(html).not.toContain('Laster opptjeningstyper')
    expect(html).toContain('Slettede linjer (1)')
    expect(html).toContain('OBU6 (2010) – omsorg for 01011012345')
    expect(html).toContain('Registrert på feil forelder')
  })

  it('bruker beskrivelsen av omsorgstypen fra grunnlaget når PDF-en rendres', () => {
    const html = renderSomPdf({
      ...grunnlag,
      opptjeningstyper: [{ code: 'OBU6', description: 'Omsorg for barn under 6 år - eget vedtak' }],
    })

    expect(html).toContain('Omsorg for barn under 6 år - eget vedtak (2010) – omsorg for 01011012345')
  })
})
