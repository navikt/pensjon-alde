import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import type { OppdaterInntektGrunnlag, OppdaterInntektVurdering } from './Inntekt/inntekt.types'
import { OppdaterInntekt } from './OppdaterInntekt'

const grunnlag: OppdaterInntektGrunnlag = {
  saker: [{ sakId: 23077283, sakType: 'ALDER', sakStatus: 'LOPENDE' }],
  inntektsoversikt: {
    fnr: '12345678901',
    inntekterPerAr: [
      {
        inntektAr: 2020,
        inntekterPgi: [{ inntektsType: 'FastlandPgi', belopLoennsinntekt: 500000 }],
        inntekterFilformat: [{ inntektsType: 'Innenlandsinntekt', belopLoenn: 480000 }],
        inntekterAnnet: [{ inntektsType: 'Uforetrygd', belop: 12000 }],
      },
    ],
  },
  inntektstyper: {
    pensjonsgivendeInntekt: [{ code: 'FastlandPgi', description: 'Fastland' }],
    inntektFraFil: [{ code: 'Innenlandsinntekt', description: 'Innenlandsinntekt' }],
    annenInntekt: [{ code: 'Uforetrygd', description: 'Uføretrygd' }],
  },
}

const vurdering: OppdaterInntektVurdering = {
  sakId: 23077283,
  fnr: '12345678901',
  inntekterPerAr: [
    {
      inntektAr: 2020,
      inntekterPgi: [{ inntektsType: 'FastlandPgi', belopLoennsinntekt: 510000 }],
      inntekterFilformat: [],
    },
  ],
}

function render(readOnly: boolean, vurderingTilVisning: OppdaterInntektVurdering | null) {
  const router = createMemoryRouter([
    {
      path: '*',
      element: (
        <OppdaterInntekt
          readOnly={readOnly}
          grunnlag={grunnlag}
          vurdering={vurderingTilVisning}
          aktivitet={{} as AktivitetDTO}
          behandling={{} as BehandlingDTO}
          begrunnelse="Feil lønn fra arbeidsgiver"
          visNotat
        />
      ),
    },
  ])
  return renderToStaticMarkup(<RouterProvider router={router} />).replace(/\s/g, ' ')
}

describe('OppdaterInntekt', () => {
  it('viser én tabell per kategori med beløpsfeltene som kolonner', () => {
    const html = render(false, null)
    expect(html).toContain('Pensjonsgivende inntekt')
    expect(html).toContain('Inntekt fra fil')
    expect(html).toContain('Annen inntekt')
    expect(html).toContain('Lønn, bare pensjonsdel')
    expect(html).toContain('Jord-, skog- og fiskebruk')
    expect(html).toContain('500 000 kr')
    expect(html).toContain('Legg til pensjonsgivende inntekt')
    expect(html).toContain('Legg til inntekt fra fil')
    expect(html).not.toContain('Legg til annen inntekt')
    expect(html).toContain('Endre')
    expect(html).toContain('Lagre og gå videre')
  })

  it('viser vurderingen read-only i attestering og oppsummering', () => {
    const html = render(true, vurdering)
    expect(html).toContain('Oppdater inntekt')
    expect(html).toContain('Endrede linjer (1)')
    expect(html).toContain('Lønn: 500 000 kr → 510 000 kr')
    expect(html).toContain('Slettede linjer (1)')
    expect(html).toContain('Innenlandsinntekt (2020) – Lønn: 480 000 kr')
    expect(html).toContain('23077283 – ALDER (LOPENDE)')
    expect(html).toContain('Feil lønn fra arbeidsgiver')
    expect(html).not.toContain('Lagre og gå videre')
    expect(html).not.toContain('Legg til')
    expect(html).not.toContain('<form')
  })
})
