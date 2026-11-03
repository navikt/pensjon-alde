import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import type { OppdaterInntektGrunnlag, OppdaterInntektVurdering } from './Inntekt/inntekt.types'
import { OppdaterInntekt } from './OppdaterInntekt'

const grunnlag: OppdaterInntektGrunnlag = {
  inntektsoversikt: {
    fnr: '12345678901',
    inntekterPerAr: [
      {
        inntektAr: 2020,
        inntekterPgi: [{ inntektsType: 'FastlandPgi', belopLoennsinntekt: 500000 }],
        inntekterFilformat: [{ inntektsType: 'Innenlandsinntekt', belopLoenn: 480000 }],
        inntekterAnnet: [
          { inntektsType: 'Utenlandsinntekt', belop: 12000 },
          { inntektsType: 'SumPensjonsgivendeInntekt', belop: 480000 },
        ],
      },
    ],
  },
  inntektstyper: {
    pensjonsgivendeInntekt: [{ code: 'FastlandPgi', description: 'Fastland' }],
    inntektFraFil: [{ code: 'Innenlandsinntekt', description: 'Innenlandsinntekt' }],
    annenInntekt: [{ code: 'Utenlandsinntekt', description: 'Utenlandsinntekt' }],
  },
}

const vurdering: OppdaterInntektVurdering = {
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
  it('viser bare inntektsår som er valgt i comboboxen', () => {
    const html = render(false, null)
    expect(html).toContain('Inntektsår')
    expect(html).toContain('Skriv et nytt år og trykk Enter for å legge det til.')
    expect(html).not.toContain('Inntektsår 2020')
    expect(html).not.toContain('Legg til pensjonsgivende inntekt')
    expect(html).not.toContain('Uten inntektsår')
  })

  it('tilbyr ikke å legge til annen inntekt og navngir handlingene per linje', () => {
    const html = render(false, vurdering)
    expect(html).toContain('Legg til pensjonsgivende inntekt')
    expect(html).not.toContain('Legg til annen inntekt')
    expect(html).toContain('aria-label="Endre 2020 Fastland"')
    expect(html).toContain('aria-label="Slett 2020 Fastland"')
  })

  it('viser vurderingen read-only i attestering og oppsummering', () => {
    const html = render(true, vurdering)
    expect(html).toContain('Inntektsår 2020')
    expect(html).toContain('Velg årene du vil se.')
    expect(html).not.toContain('Skriv et nytt år')
    expect(html).toContain('Endrede linjer (1)')
    expect(html).toContain('Lønn: 500 000 kr → 510 000 kr')
    expect(html).toContain('Tidligere: 500 000 kr')
    expect(html).toContain('Slettede linjer (1)')
    expect(html).toMatch(/<span style="text-decoration:line-through">480 000 kr<\/span>/)
    expect(html).toContain('Innenlandsinntekt (2020) – Lønn: 480 000 kr')
    expect(html).toContain('Feil lønn fra arbeidsgiver')
    expect(html).not.toContain('Lagre og gå videre')
    expect(html).not.toContain('Legg til')
    expect(html).not.toContain('<form')
  })

  it('viser lagrede endringer i read-only selv om de ikke ville bestått utkastvalideringen', () => {
    const html = render(true, {
      ...vurdering,
      inntekterPerAr: [
        {
          inntektAr: 2020,
          inntekterPgi: [{ inntektsType: 'SvalbardPgi', belopLoennsinntekt: 0 }],
          inntekterFilformat: [{ inntektsType: 'Innenlandsinntekt', belopLoenn: 480000 }],
        },
      ],
    })
    expect(html).toContain('Nye linjer (1)')
    expect(html).toContain('SvalbardPgi (2020) – Lønn: 0 kr')
  })
})
