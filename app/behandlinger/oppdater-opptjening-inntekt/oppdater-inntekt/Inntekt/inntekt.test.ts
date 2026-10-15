import { describe, expect, it } from 'vitest'
import type { OppdaterInntektGrunnlag } from './inntekt.types'
import {
  byggInntektEndringSummary,
  byggInntektPayload,
  endreInntektFelt,
  finnInntektFeil,
  harInntektEndringer,
  type InntektLinjeState,
  inntektLinjerFraVurdering,
  inntektstyperPerKategori,
  nyInntektLinje,
  sorterInntektLinjer,
  tilbakestillInntektLinje,
} from './inntekt.utils'

const grunnlag: OppdaterInntektGrunnlag = {
  saker: [{ sakId: 1 }],
  inntektsoversikt: {
    fnr: '12345678901',
    inntekterPerAr: [
      {
        inntektAr: 2020,
        inntekterPgi: [{ inntektsType: 'FastlandPgi', belopLoennsinntekt: 500000, belopNaeringsinntekt: null }],
        inntekterFilformat: [{ inntektsType: 'Innenlandsinntekt', belopLoenn: 480000, belopNaering: 10000 }],
        inntekterAnnet: [{ inntektsType: 'Uforetrygd', belop: 12000 }],
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
    annenInntekt: [{ code: 'Uforetrygd', description: 'Uføretrygd' }],
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
      sakId: 1,
      fnr: '12345678901',
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
    expect(byggInntektPayload(inntektLinjerFraVurdering(grunnlag, null), '123').inntekterPerAr).toEqual([])
  })

  it('sender hele året med alle aktive fil- og PGI-linjer når én linje endres', () => {
    const linjer = inntektLinjerFraVurdering(grunnlag, null).map(l =>
      l.kategori === 'pgi' && l.inntektAr === '2020'
        ? medStatus(endreInntektFelt(l, 'belopLoennsinntekt', '510 000'), 'modified')
        : l,
    )

    expect(byggInntektPayload(linjer, '12345678901')).toEqual({
      fnr: '12345678901',
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

    expect(byggInntektPayload(linjer, '123').inntekterPerAr).toEqual([
      { inntektAr: 2021, inntekterFilformat: [], inntekterPgi: [] },
    ])
  })

  it('sender både opprinnelig og nytt år når en linje flyttes', () => {
    const linjer = inntektLinjerFraVurdering(grunnlag, null).map(l =>
      l.kategori === 'pgi' && l.inntektAr === '2021'
        ? medStatus(endreInntektFelt(l, 'inntektAr', '2022'), 'modified')
        : l,
    )

    const payload = byggInntektPayload(linjer, '123')
    expect(payload.inntekterPerAr?.map(ar => ar.inntektAr)).toEqual([2021, 2022])
    expect(payload.inntekterPerAr?.[0].inntekterPgi).toEqual([])
    expect(payload.inntekterPerAr?.[1].inntekterPgi).toHaveLength(1)
  })

  it('tar med nye linjer, men aldri annen inntekt', () => {
    const ny = { ...nyInntektLinje('filformat', 'Innenlandsinntekt'), inntektAr: '2020', belopJsf: '5000' }
    const linjer = [...inntektLinjerFraVurdering(grunnlag, null), ny]

    const [ar2020] = byggInntektPayload(linjer, '123').inntekterPerAr ?? []
    expect(ar2020.inntekterFilformat).toHaveLength(2)
    expect(ar2020).not.toHaveProperty('inntekterAnnet')
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
})

describe('sorterInntektLinjer', () => {
  it('sorterer på opprinnelig år og legger nye linjer sist', () => {
    const [a, b, c, d] = inntektLinjerFraVurdering(grunnlag, null)
    const flyttet = endreInntektFelt(d, 'inntektAr', '1999')
    const ny = nyInntektLinje('pgi', 'FastlandPgi')

    expect(sorterInntektLinjer([ny, flyttet, c, b, a]).map(l => l._id)).toEqual([
      a._id,
      b._id,
      c._id,
      flyttet._id,
      ny._id,
    ])
  })
})

describe('tilbakestillInntektLinje', () => {
  it('henter tilbake opprinnelige verdier', () => {
    const [original] = inntektLinjerFraVurdering(grunnlag, null)
    const endret = endreInntektFelt(original, 'belopLoennsinntekt', '1')
    expect(tilbakestillInntektLinje(endret).belopLoennsinntekt).toBe(original.belopLoennsinntekt)
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
