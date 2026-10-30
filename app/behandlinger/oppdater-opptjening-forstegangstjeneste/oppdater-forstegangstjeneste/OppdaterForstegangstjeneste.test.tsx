import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import type { ForstegangstjenesteGrunnlag, ForstegangstjenesteVurdering } from './forstegangstjeneste.types'
import { OppdaterForstegangstjeneste } from './OppdaterForstegangstjeneste'

const periode = { periodeType: 'NORMAL', tjenesteType: 'MIL', fomDato: '1982-01-04', tomDato: '1982-12-17' }
const grunnlag: ForstegangstjenesteGrunnlag = {
  forstegangstjeneste: {
    kilde: 'POPP',
    rapportType: 'FORST',
    tjenestestartDato: '1982-01-04',
    dimitteringDato: '1982-12-17',
    forstegangstjenestePeriodeListe: [periode],
  },
  periodetyper: [{ code: 'NORMAL', description: 'Ordinær tjeneste' }],
  tjenestetyper: [{ code: 'MIL', description: 'Militær tjeneste' }],
}
const vurdering: ForstegangstjenesteVurdering = {
  forstegangstjenesteTilLagring: {
    tjenestestartDato: '1982-01-04',
    dimitteringDato: '1982-12-20',
    forstegangstjenestePeriodeListe: [{ ...periode, tomDato: '1982-12-20' }],
  },
}

function render(readOnly: boolean, manglerTilgang = false, grunnlagForRender = grunnlag) {
  const router = createMemoryRouter([
    {
      path: '*',
      element: (
        <OppdaterForstegangstjeneste
          grunnlag={grunnlagForRender}
          vurdering={readOnly ? vurdering : null}
          readOnly={readOnly}
          manglerTilgang={manglerTilgang}
          aktivitet={{} as AktivitetDTO}
          behandling={{} as BehandlingDTO}
          visNotat
          begrunnelse="Retter dimitteringsdato"
        />
      ),
    },
  ])
  return renderToStaticMarkup(<RouterProvider router={router} />)
}

describe('OppdaterForstegangstjeneste', () => {
  it('renders the saved replacement read-only for attestation', () => {
    const html = render(true)
    expect(html).toContain('Oppdater førstegangstjeneste')
    expect(html).toContain('Dimittering: 17.12.1982 → 20.12.1982')
    expect(html).toContain('Tidligere: 17.12.1982')
    expect(html).toContain('Retter dimitteringsdato')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('Lagre og gå videre')
    expect(html).not.toContain('Legg til periode')
    expect(html).not.toContain('Mangler rolle tilgang')
  })

  it('renders the editable workflow with text actions and without backend-owned fields', () => {
    const html = render(false)
    for (const tekst of [
      'Tjenestestart',
      'Dimittering',
      'Periodetype',
      'Tjenestetype',
      'Fra og med',
      'Til og med',
      '>Endre<',
      '>Slett<',
      'Legg til periode',
      'Lagre og gå videre',
    ]) {
      expect(html).toContain(tekst)
    }
    expect(html).not.toContain('Rapporttype')
    expect(html).not.toContain('Kilde')
    expect(html).toContain('<form')
    expect(html).toContain('name="payload"')
  })

  it('offers registration when the person has no førstegangstjeneste', () => {
    const html = render(false, false, { ...grunnlag, forstegangstjeneste: null })
    expect(html).toContain('Ingen førstegangstjeneste registrert.')
    expect(html).toContain('Registrer førstegangstjeneste')
  })

  it('shows the role warning only when access is missing', () => {
    expect(render(true, true)).toContain('Mangler rolle tilgang')
  })
})
