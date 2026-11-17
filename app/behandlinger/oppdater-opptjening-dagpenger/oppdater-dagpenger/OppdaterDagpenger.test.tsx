import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import type { DagpengerGrunnlag, DagpengerVurdering } from './dagpenger.types'
import { OppdaterDagpenger } from './OppdaterDagpenger'

const rad = { ar: 2024, dagpengerType: 'DP', utbetalteDagpenger: 10000, barnetillegg: 500 }
const grunnlag: DagpengerGrunnlag = {
  dagpengertyper: [
    { code: 'DP', description: 'Dagpenger' },
    { code: 'DP_FF', description: 'Dagpenger fiskere og fangstmenn' },
  ],
  dagpengerListe: [rad, { ...rad, ar: 2023 }],
}
const vurdering: DagpengerVurdering = {
  dagpengerTilLagring: [
    { ...rad, utbetalteDagpenger: 20000 },
    { ...rad, ar: 2025 },
  ],
  dagpengerTilSletting: [{ ar: 2023, dagpengerType: 'DP' }],
}

function render(readOnly: boolean, manglerTilgang = false) {
  const router = createMemoryRouter([
    {
      path: '*',
      element: (
        <OppdaterDagpenger
          grunnlag={grunnlag}
          vurdering={readOnly ? vurdering : null}
          readOnly={readOnly}
          manglerTilgang={manglerTilgang}
          aktivitet={{} as AktivitetDTO}
          behandling={{} as BehandlingDTO}
          visNotat
          begrunnelse="Retter feilregistrering"
        />
      ),
    },
  ])
  return renderToStaticMarkup(<RouterProvider router={router} />)
}

describe('OppdaterDagpenger', () => {
  it('renders new, updated and deleted rows read-only for attestation', () => {
    const html = render(true)
    expect(html).toContain('Oppdater dagpenger')
    expect(html).toContain('Dagpenger (2024)')
    expect(html).toContain('Utbetalte dagpenger: 10000 → 20000')
    expect(html).toContain('Tidligere: 10 000')
    expect(html).toContain('Slettede linjer (1)')
    expect(html).toContain('Retter feilregistrering')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('Lagre og gå videre')
    expect(html).not.toContain('Legg til dagpenger')
    expect(html).not.toContain('Mangler rolle tilgang')
  })

  it('renders the editable workflow with text actions and without backend-owned fields', () => {
    const html = render(false)
    for (const tekst of [
      'År',
      'Type',
      'Utbetalte dagpenger',
      'Barnetillegg',
      'Uavkortet dagpengegrunnlag',
      'Ferietillegg',
      '>Endre<',
      '>Slett<',
      'Legg til dagpenger',
      'Lagre og gå videre',
    ]) {
      expect(html).toContain(tekst)
    }
    expect(html).not.toContain('Rapporttype')
    expect(html).not.toContain('Kilde')
    expect(html).toContain('<form')
    expect(html).toContain('name="payload"')
  })

  it('shows the role warning only when access is missing', () => {
    expect(render(true, true)).toContain('Mangler rolle tilgang')
  })
})
