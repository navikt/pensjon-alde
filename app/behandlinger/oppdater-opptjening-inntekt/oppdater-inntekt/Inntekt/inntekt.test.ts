import { describe, expect, it } from 'vitest'
import type { OppdaterInntektGrunnlag } from './inntekt.types'
import {
  beregnInntektStatus,
  brukteInntektstyper,
  byggInntektEndringSummary,
  byggInntektFeiloppsummering,
  byggInntektPayload,
  endreInntektFelt,
  finnInntektFeil,
  grupperInntektLinjerPerAr,
  harInntektEndringer,
  type InntektLinjeState,
  inntektEndringer,
  inntektFeltId,
  inntektLinjerFraVurdering,
  inntektstyperPerKategori,
  ledigInntektstype,
  nyInntektLinje,
} from './inntekt.utils'

const grunnlag: OppdaterInntektGrunnlag = {
  inntektsoversikt: {
    fnr: '12345678901',
    inntekterPerAr: [
      {
        inntektAr: 2020,
        inntekterPgi: [{ inntektsType: 'FastlandPgi', belopLoennsinntekt: 500000, belopNaeringsinntekt: null }],
        inntekterFilformat: [{ inntektsType: 'Innenlandsinntekt', belopLoenn: 480000, belopNaering: 10000 }],
        inntekterAnnet: [{ inntektsType: 'Utenlandsinntekt', belop: 12000 }],
      },
      {
        inntektAr: 2021,
        inntekterPgi: [{ inntektsType: 'FastlandPgi', belopLoennsinntekt: 520000 }],
      },
    ],
  },
  inntektstyper: {
    pensjonsgivendeInntekt: [{ code: 'FastlandPgi', description: 'Fastland' }],
    inntektFraFil: [{ code: 'Innenlandsinntekt', description: 'Innenlands' }],
    annenInntekt: [{ code: 'Utenlandsinntekt', description: 'Utenlandsinntekt' }],
  },
}

const typer = inntektstyperPerKategori(grunnlag.inntektstyper)

function finn(linjer: InntektLinjeState[], kategori: string, ar: string) {
  const linje = linjer.find(l => l.kategori === kategori && l.inntektAr === ar)
  if (!linje) throw new Error(`Fant ikke ${kategori} ${ar}`)
  return linje
}

function medStatus(linje: InntektLinjeState, status: InntektLinjeState['_status']): InntektLinjeState {
  return { ...linje, _status: status }
}

const utenNbsp = (tekst: string) => tekst.replace(/\s/g, ' ')

describe('inntektLinjerFraVurdering', () => {
  it('lager én linje per type med beløpsfeltene for kategorien', () => {
    const linjer = inntektLinjerFraVurdering(grunnlag, null)

    expect(linjer).toHaveLength(4)
    expect(linjer.every(l => l._status === 'original')).toBe(true)
    expect(finn(linjer, 'pgi', '2020')).toMatchObject({
      inntektsType: 'FastlandPgi',
      belopLoennsinntekt: '500000',
      belopLoennsinntektBarePensjonsdel: '',
      belopNaeringsinntekt: '',
    })
    expect(finn(linjer, 'filformat', '2020')).toMatchObject({
      belopLoenn: '480000',
      belopNaering: '10000',
      belopJsf: '',
    })
    expect(finn(linjer, 'annet', '2020')).toMatchObject({ belop: '12000' })
    expect(finn(linjer, 'pgi', '2020')).not.toHaveProperty('belopLoenn')
  })

  it('markerer endrede, slettede og nye linjer for årene i vurderingen', () => {
    const linjer = inntektLinjerFraVurdering(grunnlag, {
      inntekterPerAr: [
        {
          inntektAr: 2020,
          inntekterPgi: [{ inntektsType: 'FastlandPgi', belopLoennsinntekt: 510000 }],
          inntekterFilformat: [],
        },
        {
          inntektAr: 2022,
          inntekterPgi: [],
          inntekterFilformat: [{ inntektsType: 'Innenlandsinntekt', belopLoenn: 300000 }],
        },
      ],
    })

    expect(finn(linjer, 'pgi', '2020')).toMatchObject({ _status: 'modified', belopLoennsinntekt: '510000' })
    expect(finn(linjer, 'filformat', '2020')._status).toBe('deleted')
    expect(finn(linjer, 'annet', '2020')._status).toBe('original')
    expect(finn(linjer, 'pgi', '2021')._status).toBe('original')
    expect(finn(linjer, 'filformat', '2022')).toMatchObject({ _status: 'new', belopLoenn: '300000' })
  })
})

describe('byggInntektPayload', () => {
  it('sender ingen år når ingenting er endret', () => {
    expect(byggInntektPayload(inntektLinjerFraVurdering(grunnlag, null)).inntekterPerAr).toEqual([])
  })

  it('sender hele året med alle aktive fil- og PGI-linjer når én linje endres', () => {
    const linjer = inntektLinjerFraVurdering(grunnlag, null).map(l =>
      l.kategori === 'pgi' && l.inntektAr === '2020'
        ? medStatus(endreInntektFelt(l, 'belopLoennsinntekt', '510 000'), 'modified')
        : l,
    )

    expect(byggInntektPayload(linjer)).toEqual({
      inntekterPerAr: [
        {
          inntektAr: 2020,
          inntekterFilformat: [
            { inntektsType: 'Innenlandsinntekt', belopLoenn: 480000, belopNaering: 10000, belopJsf: null },
          ],
          inntekterPgi: [
            {
              inntektsType: 'FastlandPgi',
              belopLoennsinntekt: 510000,
              belopLoennsinntektBarePensjonsdel: null,
              belopNaeringsinntekt: null,
              belopNaeringsinntektFraFiskeFangstEllerFamiliebarnehage: null,
            },
          ],
        },
      ],
    })
  })

  it('utelater slettede linjer og sender tomme lister når hele året slettes', () => {
    const linjer = inntektLinjerFraVurdering(grunnlag, null).map(l =>
      l.inntektAr === '2021' ? medStatus(l, 'deleted') : l,
    )

    expect(byggInntektPayload(linjer).inntekterPerAr).toEqual([
      { inntektAr: 2021, inntekterFilformat: [], inntekterPgi: [] },
    ])
  })

  it('sender både opprinnelig og nytt år når en linje flyttes', () => {
    const linjer = inntektLinjerFraVurdering(grunnlag, null).map(l =>
      l.kategori === 'pgi' && l.inntektAr === '2021'
        ? medStatus(endreInntektFelt(l, 'inntektAr', '2022'), 'modified')
        : l,
    )

    const payload = byggInntektPayload(linjer)
    expect(payload.inntekterPerAr?.map(ar => ar.inntektAr)).toEqual([2021, 2022])
    expect(payload.inntekterPerAr?.[0].inntekterPgi).toEqual([])
    expect(payload.inntekterPerAr?.[1].inntekterPgi).toHaveLength(1)
  })

  it('tar med nye linjer, men aldri annen inntekt', () => {
    const ny = { ...nyInntektLinje('filformat', 'Innenlandsinntekt'), inntektAr: '2020', belopJsf: '5000' }
    const linjer = [...inntektLinjerFraVurdering(grunnlag, null), ny]

    const [ar2020] = byggInntektPayload(linjer).inntekterPerAr ?? []
    expect(ar2020.inntekterFilformat).toHaveLength(2)
    expect(ar2020).not.toHaveProperty('inntekterAnnet')
  })
})

describe('beregnInntektStatus', () => {
  it('regner ikke tusenskille eller mellomrom rundt året som en endring', () => {
    const original = finn(inntektLinjerFraVurdering(grunnlag, null), 'filformat', '2020')
    const formatert = { ...original, belopLoenn: '480 000', inntektAr: ' 2020' }

    expect(beregnInntektStatus(formatert)).toBe('original')
    expect(inntektEndringer(formatert, typer)).toEqual([])
  })
})

describe('finnInntektFeil', () => {
  it('validerer år, beløp og at minst ett beløp er fylt ut for nye linjer', () => {
    const ny = { ...nyInntektLinje('pgi', 'FastlandPgi'), belopNaeringsinntekt: '12,5' }
    const tom = nyInntektLinje('pgi', 'FastlandPgi')

    const feil = finnInntektFeil([ny, tom])

    expect(feil[ny._id]).toEqual({
      inntektAr: 'År må ha fire siffer',
      belopNaeringsinntekt: 'Næring må være et helt kronebeløp',
    })
    expect(feil[tom._id]).toEqual({
      inntektAr: 'År må ha fire siffer',
      _belop: 'Fyll ut minst ett beløp',
    })
  })

  it('godtar negative beløp og mellomrom som tusenskille', () => {
    const ny = { ...nyInntektLinje('pgi', 'FastlandPgi'), inntektAr: '2023', belopNaeringsinntekt: '-25 000' }
    expect(finnInntektFeil([ny])).toEqual({})
  })

  it('avviser 0 som beløp', () => {
    const ny = { ...nyInntektLinje('pgi', 'FastlandPgi', '2023'), belopLoennsinntekt: '0', belopNaeringsinntekt: '-0' }
    expect(finnInntektFeil([ny])).toEqual({
      [ny._id]: { belopLoennsinntekt: 'Lønn kan ikke være 0', belopNaeringsinntekt: 'Næring kan ikke være 0' },
    })
  })

  it('avviser beløp som ikke kan representeres eksakt', () => {
    const ny = {
      ...nyInntektLinje('pgi', 'FastlandPgi', '2023'),
      belopLoennsinntekt: '9'.repeat(400),
      belopNaeringsinntekt: '9007199254740993',
    }
    expect(finnInntektFeil([ny])).toEqual({
      [ny._id]: {
        belopLoennsinntekt: 'Lønn har for mange siffer',
        belopNaeringsinntekt: 'Næring har for mange siffer',
      },
    })
  })

  it('godtar uendret 0 fra eksisterende linje', () => {
    const [original] = inntektLinjerFraVurdering(grunnlag, null)
    const medNull = { ...original, _original: { ...original, belopNaeringsinntekt: '0' }, belopNaeringsinntekt: '0' }
    const endret = endreInntektFelt(medNull, 'belopLoennsinntekt', '1')
    expect(finnInntektFeil([{ ...endret, _status: 'modified' }])).toEqual({})
  })

  it('avviser samme type to ganger i samme år og kategori', () => {
    const ny = { ...nyInntektLinje('pgi', 'FastlandPgi'), inntektAr: '2020', belopLoennsinntekt: '1' }
    const feil = finnInntektFeil([...inntektLinjerFraVurdering(grunnlag, null), ny])

    expect(feil).toEqual({ [ny._id]: { _duplikat: 'Inntektstypen er allerede registrert for dette året' } })
  })

  it('ignorerer slettede linjer og annen inntekt', () => {
    const linjer = inntektLinjerFraVurdering(grunnlag, null)
    const slettet = medStatus(endreInntektFelt(finn(linjer, 'pgi', '2020'), 'inntektAr', ''), 'deleted')
    expect(finnInntektFeil([slettet, finn(linjer, 'annet', '2020')])).toEqual({})
  })
})

describe('byggInntektFeiloppsummering', () => {
  it('lenker hver feil til feltet den gjelder, i visningsrekkefølge', () => {
    const tom = nyInntektLinje('pgi', 'FastlandPgi')
    const duplikat = { ...nyInntektLinje('pgi', 'FastlandPgi', '2020'), belopLoennsinntekt: '1' }
    const linjer = [...inntektLinjerFraVurdering(grunnlag, null), tom, duplikat]

    expect(byggInntektFeiloppsummering(linjer, finnInntektFeil(linjer), typer)).toEqual([
      {
        href: `#${inntektFeltId(duplikat._id, 'inntektsType')}`,
        melding: '2020 Fastland: Inntektstypen er allerede registrert for dette året',
      },
      { href: `#${inntektFeltId(tom._id, 'inntektsType')}`, melding: 'Fastland: År må ha fire siffer' },
      { href: `#${inntektFeltId(tom._id, 'belopLoennsinntekt')}`, melding: 'Fastland: Fyll ut minst ett beløp' },
    ])
  })
})

describe('byggInntektEndringSummary', () => {
  it('oppsummerer per kategori med typebeskrivelse, år og beløp', () => {
    const linjer = inntektLinjerFraVurdering(grunnlag, null).map(l => {
      if (l.kategori === 'pgi' && l.inntektAr === '2020') {
        return medStatus(endreInntektFelt(l, 'belopLoennsinntekt', '510000'), 'modified')
      }
      if (l.kategori === 'filformat') return medStatus(l, 'deleted')
      return l
    })

    const summary = byggInntektEndringSummary(linjer, typer)

    expect(summary.endrede).toHaveLength(1)
    expect(summary.endrede[0]).toMatchObject({ kategori: 'Pensjonsgivende inntekt', label: 'Fastland (2020)' })
    expect(utenNbsp(summary.endrede[0].endringer?.[0] ?? '')).toBe('Lønn: 500 000 kr → 510 000 kr')
    expect(utenNbsp(summary.slettede[0].label)).toBe('Innenlands (2020) – Lønn: 480 000 kr, Næring: 10 000 kr')
    expect(summary.nye).toEqual([])
  })

  it('utelater linjer med valideringsfeil', () => {
    const gyldig = { ...nyInntektLinje('pgi', 'SvalbardPgi', '2020'), belopLoennsinntekt: '1' }
    const ugyldig = { ...nyInntektLinje('pgi', 'FastlandPgi', '2023'), belopLoennsinntekt: '0' }
    const linjer = [gyldig, ugyldig]

    const summary = byggInntektEndringSummary(linjer, typer, finnInntektFeil(linjer))

    expect(summary.nye.map(item => item.id)).toEqual([gyldig._id])
  })
})

describe('grupperInntektLinjerPerAr', () => {
  it('samler alle kategorier per opprinnelig år og legger nye linjer uten år sist', () => {
    const linjer = inntektLinjerFraVurdering(grunnlag, null)
    const flyttet = endreInntektFelt(finn(linjer, 'pgi', '2021'), 'inntektAr', '1999')
    const nyFor2020 = nyInntektLinje('filformat', 'Innenlandsinntekt', '2020')
    const utenAr = nyInntektLinje('pgi', 'FastlandPgi')

    const grupper = grupperInntektLinjerPerAr([
      utenAr,
      flyttet,
      nyFor2020,
      ...linjer.filter(l => l._id !== flyttet._id),
    ])

    expect(grupper.map(g => g.inntektAr)).toEqual(['2020', '2021', null])
    expect(grupper[0].linjer.map(l => l.kategori)).toEqual(['pgi', 'filformat', 'annet', 'filformat'])
    expect(grupper[0].linjer.at(-1)?._id).toBe(nyFor2020._id)
    expect(grupper[1].linjer.map(l => l._id)).toEqual([flyttet._id])
    expect(grupper[2].linjer.map(l => l._id)).toEqual([utenAr._id])
  })

  it('grupperer nye linjer fra vurderingen på året de gjelder', () => {
    const linjer = inntektLinjerFraVurdering(grunnlag, {
      inntekterPerAr: [{ inntektAr: 2022, inntekterPgi: [{ inntektsType: 'FastlandPgi' }], inntekterFilformat: [] }],
    })

    expect(grupperInntektLinjerPerAr(linjer).map(g => g.inntektAr)).toEqual(['2020', '2021', '2022'])
  })

  it('lager tomme grupper for ekstra år og slår sammen med eksisterende år', () => {
    const linjer = inntektLinjerFraVurdering(grunnlag, null)
    const grupper = grupperInntektLinjerPerAr(linjer, ['2006', '2021'])

    expect(grupper.map(g => g.inntektAr)).toEqual(['2006', '2020', '2021'])
    expect(grupper[0].linjer).toEqual([])
    expect(grupper[2].linjer).toHaveLength(1)
  })
})

describe('ledigInntektstype', () => {
  it('velger første type som er ledig for året, regner med nye linjer og ignorerer slettede', () => {
    const pgiTyper = [
      { code: 'FastlandPgi', description: 'Fastland' },
      { code: 'SvalbardPgi', description: 'Svalbard' },
    ]
    const linjer = inntektLinjerFraVurdering(grunnlag, null)
    const nyForAr = nyInntektLinje('pgi', 'SvalbardPgi', '2020')

    expect(ledigInntektstype(linjer, pgiTyper, 'pgi', '2020')).toBe('SvalbardPgi')
    expect(ledigInntektstype(linjer, pgiTyper, 'pgi', '')).toBe('FastlandPgi')
    expect(ledigInntektstype([...linjer, nyForAr], pgiTyper, 'pgi', '2020')).toBeNull()
    expect(ledigInntektstype([...linjer, { ...nyForAr, _status: 'deleted' }], pgiTyper, 'pgi', '2020')).toBe(
      'SvalbardPgi',
    )
  })
})

describe('brukteInntektstyper', () => {
  it('finner typer i bruk for året og kategorien, unntatt gitt linje', () => {
    const a = nyInntektLinje('pgi', 'FastlandPgi', '2030')
    const b = nyInntektLinje('pgi', 'SvalbardPgi', '2030')
    const annenKategori = nyInntektLinje('filformat', 'Innenlandsinntekt', '2030')
    const linjer = [a, b, annenKategori]
    expect(brukteInntektstyper(linjer, 'pgi', '2030')).toEqual(new Set(['FastlandPgi', 'SvalbardPgi']))
    expect(brukteInntektstyper(linjer, 'pgi', '2030', a._id)).toEqual(new Set(['SvalbardPgi']))
    expect(brukteInntektstyper(linjer, 'pgi', '20')).toEqual(new Set())
  })
})

describe('harInntektEndringer', () => {
  it.each([
    [{ inntekterPerAr: [{ inntektAr: 2020, inntekterPgi: [], inntekterFilformat: [] }] }, true],
    [{ inntekterPerAr: [] }, false],
    [{ omsorgTilSletting: [{ ar: 2020, omsorgType: 'OBU6' }] }, false],
    [null, false],
    [[], false],
  ])('%j → %s', (payload, forventet) => {
    expect(harInntektEndringer(payload)).toBe(forventet)
  })
})
