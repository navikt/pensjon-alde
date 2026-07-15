import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatCurrencyNok } from '~/utils/currency'
import type {
  DagpengerBackendDTO,
  ForstegangstjenesteBackendDTO,
  InntektBackendDTO,
  OmsorgBackendDTO,
  OppdaterOpptjeningGrunnlag,
  OpptjeningstyperResponse,
  VurderingResponse,
} from './oppdater-grunnlag-types'

vi.mock('~/api/aktivitet-api', () => ({
  createAktivitetApi: vi.fn(),
}))
vi.mock('~/api/opptjeningstyper-api.server', () => ({
  fetchOpptjeningstyper: vi.fn(),
}))

const { createAktivitetApi } = await import('~/api/aktivitet-api')
const { fetchOpptjeningstyper } = await import('~/api/opptjeningstyper-api.server')
const {
  action,
  loader,
  REQUIRED_KOMMUNE,
  tilLinjeState,
  beregnStatus,
  nyInntektLinje,
  nyDagpengerLinje,
  nyForstegangstjenesteLinje,
  typeLabel,
  oversettKoderIMelding,
  inntektEndringer,
  dagpengerEndringer,
  forstegangstjenesteEndringer,
  toInntektBackend,
  toDagpengerBackend,
  toOmsorgBackend,
  toForstegangstjenesteBackend,
  inntektGrunnlagTilViewModel,
  dagpengerGrunnlagTilViewModel,
  omsorgGrunnlagTilViewModel,
  forstegangstjenesteGrunnlagTilViewModel,
  parseIsoDate,
  toIsoDate,
} = await import('./index')

const opptjeningstyper: OpptjeningstyperResponse = {
  inntekt: {
    typer: [
      { code: 'DIP_JSF', description: 'Utenlandsinntekt sjøfolk' },
      { code: 'SVA_JSF', description: 'Svalbardinntekt sjøfolk' },
      { code: 'SVA_PGI_LOENN', description: 'Svalbard PGI lønn' },
      { code: 'SVA_PGI_LOENN_PD', description: 'Svalbard PGI lønn pensjonsdel' },
      { code: 'INNTEKT_ANNET', description: 'Annen inntekt' },
    ],
    subTyper: [],
  },
  omsorg: {
    typer: [{ code: 'OMS_BARN', description: 'Omsorg for barn' }],
    subTyper: [],
  },
  dagpenger: {
    typer: [
      { code: 'DP', description: 'Ordinære dagpenger' },
      { code: 'DP_FF', description: 'Dagpenger fiskere/fangstmenn' },
    ],
    subTyper: [],
  },
  forstegangstjeneste: {
    typer: [{ code: 'MIL', description: 'Militærtjeneste' }],
    subTyper: [{ code: 'FORSTE_6_MND', description: 'Første 6 måneder' }],
  },
}

function fakeApi(overrides: Partial<Record<'hentGrunnlagsdata' | 'hentVurdering' | 'lagreVurdering', unknown>> = {}) {
  return {
    hentGrunnlagsdata: vi.fn().mockResolvedValue({}),
    hentVurdering: vi.fn().mockResolvedValue(null),
    lagreVurdering: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function requestMedFormData(fields: Record<string, string>): Request {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value)
  }
  return new Request('http://localhost/aktivitet', { method: 'POST', body: formData })
}

function assertDataResult(result: Awaited<ReturnType<typeof action>>) {
  if (result instanceof Response) {
    throw new Error('Forventet data()-resultat, fikk Response (redirect)')
  }
  return result
}

beforeEach(() => {
  vi.mocked(createAktivitetApi).mockReset()
  vi.mocked(fetchOpptjeningstyper).mockReset().mockResolvedValue(opptjeningstyper)
})

describe('typeLabel', () => {
  it('returns description for known inntekt code', () => {
    expect(typeLabel(opptjeningstyper, 'DIP_JSF')).toBe('Utenlandsinntekt sjøfolk')
  })

  it('returns description for known subtype code', () => {
    expect(typeLabel(opptjeningstyper, 'FORSTE_6_MND')).toBe('Første 6 måneder')
  })

  it('returns the code itself when unknown', () => {
    expect(typeLabel(opptjeningstyper, 'UKJENT_KODE')).toBe('UKJENT_KODE')
  })
})

describe('oversettKoderIMelding', () => {
  it('replaces a single known code embedded in a sentence', () => {
    const resultat = oversettKoderIMelding('Skattekommune for DIP_JSF må være 0301', opptjeningstyper)
    expect(resultat).toBe('Skattekommune for Utenlandsinntekt sjøfolk (DIP_JSF) må være 0301')
  })

  it('replaces multiple distinct codes in the same message', () => {
    const resultat = oversettKoderIMelding('Feil for DIP_JSF og SVA_JSF', opptjeningstyper)
    expect(resultat).toBe('Feil for Utenlandsinntekt sjøfolk (DIP_JSF) og Svalbardinntekt sjøfolk (SVA_JSF)')
  })

  it('prefers the longest matching code over an overlapping prefix', () => {
    const resultat = oversettKoderIMelding('Ugyldig type SVA_PGI_LOENN_PD', opptjeningstyper)
    expect(resultat).toBe('Ugyldig type Svalbard PGI lønn pensjonsdel (SVA_PGI_LOENN_PD)')
  })

  it('does not replace a code that is part of a larger word', () => {
    const resultat = oversettKoderIMelding('Ukjent verdi SVA_JSF2', opptjeningstyper)
    expect(resultat).toBe('Ukjent verdi SVA_JSF2')
  })

  it('returns the message unchanged when no known codes are present', () => {
    const resultat = oversettKoderIMelding('Generell feilmelding uten koder', opptjeningstyper)
    expect(resultat).toBe('Generell feilmelding uten koder')
  })
})

describe('nyInntektLinje', () => {
  it('prefylles kommune fra REQUIRED_KOMMUNE når typen krever det', () => {
    const linje = nyInntektLinje('DIP_JSF')
    expect(linje.kommune).toBe(REQUIRED_KOMMUNE.DIP_JSF)
    expect(linje._status).toBe('new')
    expect(linje._original).toBeNull()
  })

  it('setter kommune til null når typen ikke krever en spesifikk kommune', () => {
    const linje = nyInntektLinje('INNTEKT_ANNET')
    expect(linje.kommune).toBeNull()
  })
})

describe('nyDagpengerLinje', () => {
  it('returnerer forventede standardverdier', () => {
    const linje = nyDagpengerLinje()
    expect(linje.dagpengerType).toBe('DP')
    expect(linje.ar).toBe(new Date().getFullYear())
    expect(linje.uavkortetDagpengegrunnlag).toBeNull()
    expect(linje.utbetalteDagpenger).toBeNull()
    expect(linje.ferietillegg).toBeNull()
    expect(linje.barnetillegg).toBeNull()
    expect(linje._status).toBe('new')
  })
})

describe('nyForstegangstjenesteLinje', () => {
  it('returnerer forventede standardverdier', () => {
    const linje = nyForstegangstjenesteLinje()
    expect(linje.tjenesteType).toBe('MIL')
    expect(linje.periodeType).toBeNull()
    expect(linje.fomDato).toBe('')
    expect(linje.tomDato).toBe('')
    expect(linje._status).toBe('new')
  })
})

describe('tilLinjeState', () => {
  it('setter status original og en uavhengig kopi som _original', () => {
    const dto = { inntektAr: 2020, inntektType: 'DIP_JSF', belop: 100, kommune: '0301' }
    const linje = tilLinjeState(dto)

    expect(linje._status).toBe('original')
    expect(linje._original).toEqual(dto)
    expect(linje._original).not.toBe(dto)

    linje.belop = 200
    expect(linje._original?.belop).toBe(100)
  })
})

describe('beregnStatus', () => {
  type TestFelt = { a: number; b: string }
  const felter: (keyof TestFelt)[] = ['a', 'b']

  it('beholder new-status uavhengig av feltendringer', () => {
    const linje = { a: 1, b: 'x', _status: 'new' as const, _original: null }
    expect(beregnStatus<TestFelt>(linje, felter)).toBe('new')
  })

  it('beholder deleted-status uavhengig av feltendringer', () => {
    const linje = { a: 1, b: 'x', _status: 'deleted' as const, _original: { a: 1, b: 'x' } }
    expect(beregnStatus<TestFelt>(linje, felter)).toBe('deleted')
  })

  it('returnerer new når _original mangler', () => {
    const linje = { a: 1, b: 'x', _status: 'original' as const, _original: null }
    expect(beregnStatus<TestFelt>(linje, felter)).toBe('new')
  })

  it('returnerer modified når et sporet felt avviker fra original', () => {
    const linje = { a: 2, b: 'x', _status: 'original' as const, _original: { a: 1, b: 'x' } }
    expect(beregnStatus<TestFelt>(linje, felter)).toBe('modified')
  })

  it('returnerer original når ingen sporede felt avviker', () => {
    const linje = { a: 1, b: 'x', _status: 'modified' as const, _original: { a: 1, b: 'x' } }
    expect(beregnStatus<TestFelt>(linje, felter)).toBe('original')
  })
})

describe('inntektEndringer', () => {
  it('returnerer tom liste når linjen ikke har original', () => {
    const linje = tilLinjeState({ inntektAr: 2020, inntektType: 'DIP_JSF', belop: 100, kommune: '0301' })
    expect(inntektEndringer({ ...linje, _original: null }, opptjeningstyper)).toEqual([])
  })

  it('rapporterer endring i inntektstype, år, beløp og kommune', () => {
    const original = { inntektAr: 2020, inntektType: 'DIP_JSF', belop: 100, kommune: '0301' }
    const linje = { ...tilLinjeState(original), inntektType: 'SVA_JSF', inntektAr: 2021, belop: 200, kommune: '2100' }

    const resultat = inntektEndringer(linje, opptjeningstyper)

    expect(resultat).toContain('Inntektstype: Utenlandsinntekt sjøfolk → Svalbardinntekt sjøfolk')
    expect(resultat).toContain('År: 2020 → 2021')
    expect(resultat).toContain(`Beløp: ${formatCurrencyNok(100)} → ${formatCurrencyNok(200)}`)
    expect(resultat).toContain('Skattekommune: 0301 → 2100')
  })

  it('viser – når beløp går fra verdi til null', () => {
    const original = { inntektAr: 2020, inntektType: 'DIP_JSF', belop: 100, kommune: '0301' }
    const linje = { ...tilLinjeState(original), belop: null }

    expect(inntektEndringer(linje, opptjeningstyper)).toContain(`Beløp: ${formatCurrencyNok(100)} → –`)
  })
})

describe('dagpengerEndringer', () => {
  it('ekskluderer uavkortet grunnlag og ferietillegg for DP_FF', () => {
    const original = {
      ar: 2020,
      dagpengerType: 'DP_FF',
      uavkortetDagpengegrunnlag: 100,
      utbetalteDagpenger: 50,
      ferietillegg: 10,
      barnetillegg: 5,
    }
    const linje = { ...tilLinjeState(original), uavkortetDagpengegrunnlag: 999, ferietillegg: 999 }

    const resultat = dagpengerEndringer(linje, opptjeningstyper)

    expect(resultat.some(e => e.startsWith('Uavkortet grunnlag'))).toBe(false)
    expect(resultat.some(e => e.startsWith('Ferietillegg'))).toBe(false)
  })

  it('inkluderer uavkortet grunnlag og ferietillegg for andre typer enn DP_FF', () => {
    const original = {
      ar: 2020,
      dagpengerType: 'DP',
      uavkortetDagpengegrunnlag: 100,
      utbetalteDagpenger: 50,
      ferietillegg: 10,
      barnetillegg: 5,
    }
    const linje = { ...tilLinjeState(original), uavkortetDagpengegrunnlag: 200, ferietillegg: 20 }

    const resultat = dagpengerEndringer(linje, opptjeningstyper)

    expect(resultat).toContain(`Uavkortet grunnlag: ${formatCurrencyNok(100)} → ${formatCurrencyNok(200)}`)
    expect(resultat).toContain(`Ferietillegg: ${formatCurrencyNok(10)} → ${formatCurrencyNok(20)}`)
  })
})

describe('forstegangstjenesteEndringer', () => {
  it('rapporterer endring i type, periodetype, fom og tom', () => {
    const original = { tjenesteType: 'MIL', periodeType: null, fomDato: '2010-01-01', tomDato: '2010-06-01' }
    const linje = {
      ...tilLinjeState(original),
      periodeType: 'FORSTE_6_MND',
      fomDato: '2010-02-01',
      tomDato: '2010-07-01',
    }

    const resultat = forstegangstjenesteEndringer(linje, opptjeningstyper)

    expect(resultat).toContain('Periodetype: – → Første 6 måneder')
    expect(resultat).toContain('FOM: 2010-01-01 → 2010-02-01')
    expect(resultat).toContain('TOM: 2010-06-01 → 2010-07-01')
  })
})

describe('toInntektBackend', () => {
  it('mapper linjen til backend-DTO med kilde PEN', () => {
    const linje = tilLinjeState({ inntektAr: 2020, inntektType: 'DIP_JSF', belop: 100, kommune: '0301' })

    expect(toInntektBackend(linje, '12345678901')).toEqual({
      inntektId: null,
      fnr: '12345678901',
      kilde: 'PEN',
      kommune: '0301',
      piMerke: null,
      inntektAr: 2020,
      belop: '100',
      inntektType: 'DIP_JSF',
    })
  })
})

describe('toDagpengerBackend', () => {
  it('nuller uavkortet grunnlag og ferietillegg for DP_FF', () => {
    const linje = tilLinjeState({
      ar: 2020,
      dagpengerType: 'DP_FF',
      uavkortetDagpengegrunnlag: 100,
      utbetalteDagpenger: 50,
      ferietillegg: 10,
      barnetillegg: 5,
    })

    const backend = toDagpengerBackend(linje, '12345678901')

    expect(backend.uavkortetDagpengegrunnlag).toBeNull()
    expect(backend.ferietillegg).toBeNull()
    expect(backend.utbetalteDagpenger).toBe(50)
    expect(backend.barnetillegg).toBe(5)
  })

  it('beholder verdier for andre dagpengetyper', () => {
    const linje = tilLinjeState({
      ar: 2020,
      dagpengerType: 'DP',
      uavkortetDagpengegrunnlag: 100,
      utbetalteDagpenger: 50,
      ferietillegg: 10,
      barnetillegg: 5,
    })

    const backend = toDagpengerBackend(linje, '12345678901')

    expect(backend.uavkortetDagpengegrunnlag).toBe(100)
    expect(backend.ferietillegg).toBe(10)
  })
})

describe('toOmsorgBackend', () => {
  it('mapper linjen til backend-DTO', () => {
    const linje = tilLinjeState({ ar: 2020, omsorgType: 'OMS_BARN', fnrOmsorgFor: '10987654321' })

    expect(toOmsorgBackend(linje, '12345678901')).toEqual({
      omsorgId: null,
      fnr: '12345678901',
      fnrOmsorgFor: '10987654321',
      omsorgType: 'OMS_BARN',
      kilde: 'PEN',
      ar: 2020,
    })
  })
})

describe('toForstegangstjenesteBackend', () => {
  it('bygger en periodeliste med ett element fra linjen', () => {
    const linje = tilLinjeState({
      tjenesteType: 'MIL',
      periodeType: 'FORSTE_6_MND',
      fomDato: '2010-01-01',
      tomDato: '2010-06-01',
    })

    const backend = toForstegangstjenesteBackend(linje, '12345678901')

    expect(backend.tjenestestartDato).toBe('2010-01-01')
    expect(backend.dimitteringDato).toBe('2010-06-01')
    expect(backend.forstegangstjenestePeriodeListe).toEqual([
      {
        forstegangstjenestePeriodeId: null,
        periodeType: 'FORSTE_6_MND',
        tjenesteType: 'MIL',
        fomDato: '2010-01-01',
        tomDato: '2010-06-01',
      },
    ])
  })

  it('bruker null for tomme datoer', () => {
    const linje = tilLinjeState({ tjenesteType: 'MIL', periodeType: null, fomDato: '', tomDato: '' })
    const backend = toForstegangstjenesteBackend(linje, '12345678901')

    expect(backend.tjenestestartDato).toBeNull()
    expect(backend.dimitteringDato).toBeNull()
  })
})

describe('inntektGrunnlagTilViewModel', () => {
  it('konverterer belop fra streng til tall', () => {
    const dto: InntektBackendDTO = {
      inntektId: 1,
      fnr: '12345678901',
      kommune: '0301',
      inntektAr: 2020,
      belop: '1234',
      inntektType: 'DIP_JSF',
    }

    expect(inntektGrunnlagTilViewModel(dto)).toEqual({
      inntektId: 1,
      kommune: '0301',
      inntektAr: 2020,
      belop: 1234,
      inntektType: 'DIP_JSF',
    })
  })
})

describe('dagpengerGrunnlagTilViewModel', () => {
  it('mapper felter med fallback for manglende verdier', () => {
    const dto = { fnr: '12345678901', dagpengerType: 'DP' } as unknown as DagpengerBackendDTO

    expect(dagpengerGrunnlagTilViewModel(dto)).toEqual({
      dagpengerId: null,
      ar: 0,
      dagpengerType: 'DP',
      uavkortetDagpengegrunnlag: null,
      utbetalteDagpenger: null,
      ferietillegg: null,
      barnetillegg: null,
    })
  })
})

describe('omsorgGrunnlagTilViewModel', () => {
  it('mapper felter', () => {
    const dto: OmsorgBackendDTO = { fnr: '12345678901', omsorgType: 'OMS_BARN', ar: 2020, fnrOmsorgFor: '999' }

    expect(omsorgGrunnlagTilViewModel(dto)).toEqual({
      omsorgId: null,
      ar: 2020,
      omsorgType: 'OMS_BARN',
      fnrOmsorgFor: '999',
    })
  })
})

describe('forstegangstjenesteGrunnlagTilViewModel', () => {
  it('returnerer tom liste når dto mangler', () => {
    expect(forstegangstjenesteGrunnlagTilViewModel(null)).toEqual([])
    expect(forstegangstjenesteGrunnlagTilViewModel(undefined)).toEqual([])
  })

  it('mapper periodelisten til flate DTO-er', () => {
    const dto: ForstegangstjenesteBackendDTO = {
      forstegangstjenesteId: 42,
      fnr: '12345678901',
      forstegangstjenestePeriodeListe: [
        { tjenesteType: 'MIL', periodeType: 'FORSTE_6_MND', fomDato: '2010-01-01', tomDato: '2010-06-01' },
      ],
    }

    expect(forstegangstjenesteGrunnlagTilViewModel(dto)).toEqual([
      {
        forstegangstjenesteId: 42,
        tjenesteType: 'MIL',
        periodeType: 'FORSTE_6_MND',
        fomDato: '2010-01-01',
        tomDato: '2010-06-01',
      },
    ])
  })
})

describe('parseIsoDate / toIsoDate', () => {
  it('parser en gyldig ISO-dato', () => {
    const dato = parseIsoDate('2024-03-05')
    expect(dato?.getFullYear()).toBe(2024)
    expect(dato?.getMonth()).toBe(2)
    expect(dato?.getDate()).toBe(5)
  })

  it('returnerer undefined for ugyldig dato', () => {
    expect(parseIsoDate('')).toBeUndefined()
    expect(parseIsoDate('2024-03')).toBeUndefined()
  })

  it('formaterer en dato tilbake til ISO-format med nullutfylling', () => {
    expect(toIsoDate(new Date(2024, 2, 5))).toBe('2024-03-05')
  })

  it('rundtrip parseIsoDate → toIsoDate gir samme verdi', () => {
    const iso = '2024-03-05'
    expect(toIsoDate(parseIsoDate(iso) as Date)).toBe(iso)
  })
})

describe('loader', () => {
  it('henter grunnlag, vurdering og opptjeningstyper (happy path)', async () => {
    const grunnlag: OppdaterOpptjeningGrunnlag = {
      saker: [],
      opptjeningsGrunnlagDto: { fnr: '123', inntektListe: [], omsorgListe: [], dagpengerListe: [] },
    }
    const vurderingResponse: VurderingResponse = { vurdering: JSON.stringify({ fnr: '123' }) }
    const api = fakeApi({
      hentGrunnlagsdata: vi.fn().mockResolvedValue(grunnlag),
      hentVurdering: vi.fn().mockResolvedValue(vurderingResponse),
    })
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = await loader({
      params: { behandlingId: '1', aktivitetId: '2' },
      request: new Request('http://localhost/aktivitet'),
    } as never)

    expect(result.grunnlag).toBe(grunnlag)
    expect(result.savedVurdering).toEqual({ fnr: '123' })
    expect(result.opptjeningstyper).toBe(opptjeningstyper)
    expect(result.readOnly).toBe(false)
  })

  it('setter readOnly når hentGrunnlagsdata feiler med 403', async () => {
    const api = fakeApi({
      hentGrunnlagsdata: vi.fn().mockRejectedValue({ data: { status: 403, title: 'Forbidden' } }),
    })
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = await loader({
      params: { behandlingId: '1', aktivitetId: '2' },
      request: new Request('http://localhost/aktivitet'),
    } as never)

    expect(result.readOnly).toBe(true)
    expect(result.grunnlag).toEqual({})
  })

  it('kaster videre feil som ikke er 403', async () => {
    const api = fakeApi({
      hentGrunnlagsdata: vi.fn().mockRejectedValue({ data: { status: 500, title: 'Server error' } }),
    })
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    await expect(
      loader({
        params: { behandlingId: '1', aktivitetId: '2' },
        request: new Request('http://localhost/aktivitet'),
      } as never),
    ).rejects.toBeDefined()
  })

  it('returnerer savedVurdering null når det ikke finnes en lagret vurdering', async () => {
    const api = fakeApi({ hentVurdering: vi.fn().mockResolvedValue(null) })
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = await loader({
      params: { behandlingId: '1', aktivitetId: '2' },
      request: new Request('http://localhost/aktivitet'),
    } as never)

    expect(result.savedVurdering).toBeNull()
  })
})

describe('action', () => {
  it('returnerer _form-feil når payload mangler', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = assertDataResult(
      await action({
        params: { behandlingId: '1', aktivitetId: '2' },
        request: requestMedFormData({}),
      } as never),
    )

    expect(result.data.errors._form).toBe('Mangler skjemadata')
    expect(result.init?.status).toBe(400)
  })

  it('returnerer _form-feil når payload ikke er gyldig JSON', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = assertDataResult(
      await action({
        params: { behandlingId: '1', aktivitetId: '2' },
        request: requestMedFormData({ payload: 'ikke-json{' }),
      } as never),
    )

    expect(result.data.errors._form).toBe('Ugyldig skjemadata')
    expect(result.init?.status).toBe(400)
  })

  it('returnerer valideringsfeil når skattekommune ikke matcher kravet', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const payload = {
      inntektEndringer: [
        {
          endringstype: 'OPPRETT',
          inntektListe: [{ inntektType: 'DIP_JSF', kommune: '9999', inntektAr: 2020, belop: '100' }],
        },
      ],
    }

    const result = assertDataResult(
      await action({
        params: { behandlingId: '1', aktivitetId: '2' },
        request: requestMedFormData({ payload: JSON.stringify(payload) }),
      } as never),
    )

    expect(result.data.errors._form).toContain('Skattekommune for DIP_JSF må være 0301')
    expect(result.init?.status).toBe(400)
    expect(api.lagreVurdering).not.toHaveBeenCalled()
  })

  it('hopper over kommune-validering for slettede linjer', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const payload = {
      inntektEndringer: [
        {
          endringstype: 'SLETT',
          inntektListe: [{ inntektType: 'DIP_JSF', kommune: '9999', inntektAr: 2020, belop: '100' }],
        },
      ],
    }

    const result = await action({
      params: { behandlingId: '1', aktivitetId: '2' },
      request: requestMedFormData({ payload: JSON.stringify(payload) }),
    } as never)

    expect(result).toBeInstanceOf(Response)
    expect(api.lagreVurdering).toHaveBeenCalled()
  })

  it('returnerer valideringsfeil når tjenestestartdato er før 2010-01-01', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const payload = {
      forstegangstjenesteEndringer: [
        {
          endringstype: 'OPPRETT',
          forstegangstjeneste: { tjenestestartDato: '2005-01-01', forstegangstjenestePeriodeListe: [] },
        },
      ],
    }

    const result = assertDataResult(
      await action({
        params: { behandlingId: '1', aktivitetId: '2' },
        request: requestMedFormData({ payload: JSON.stringify(payload) }),
      } as never),
    )

    expect(result.data.errors._form).toContain('Tjenestestartdato for førstegangstjeneste kan ikke være før 01.01.2010')
  })

  it('slår sammen flere valideringsfeil med punktum', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const payload = {
      inntektEndringer: [
        {
          endringstype: 'OPPRETT',
          inntektListe: [{ inntektType: 'DIP_JSF', kommune: '9999', inntektAr: 2020, belop: '100' }],
        },
      ],
      forstegangstjenesteEndringer: [
        {
          endringstype: 'OPPRETT',
          forstegangstjeneste: { tjenestestartDato: '2005-01-01', forstegangstjenestePeriodeListe: [] },
        },
      ],
    }

    const result = assertDataResult(
      await action({
        params: { behandlingId: '1', aktivitetId: '2' },
        request: requestMedFormData({ payload: JSON.stringify(payload) }),
      } as never),
    )

    expect(result.data.errors._form).toBe(
      'Skattekommune for DIP_JSF må være 0301. Tjenestestartdato for førstegangstjeneste kan ikke være før 01.01.2010',
    )
  })

  it('nuller uavkortet grunnlag og ferietillegg for DP_FF før lagring', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const payload = {
      dagpengerEndringer: [
        {
          endringstype: 'OPPRETT',
          dagpengerListe: [
            {
              dagpengerType: 'DP_FF',
              ar: 2020,
              uavkortetDagpengegrunnlag: 100,
              ferietillegg: 10,
              utbetalteDagpenger: 50,
            },
          ],
        },
      ],
    }

    await action({
      params: { behandlingId: '1', aktivitetId: '2' },
      request: requestMedFormData({ payload: JSON.stringify(payload) }),
    } as never)

    expect(api.lagreVurdering).toHaveBeenCalledWith(
      expect.objectContaining({
        dagpengerEndringer: [
          expect.objectContaining({
            dagpengerListe: [
              expect.objectContaining({
                uavkortetDagpengegrunnlag: null,
                ferietillegg: null,
                utbetalteDagpenger: 50,
              }),
            ],
          }),
        ],
      }),
    )
  })

  it('inkluderer sakId i vurderingen når det er sendt inn', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    await action({
      params: { behandlingId: '1', aktivitetId: '2' },
      request: requestMedFormData({ payload: JSON.stringify({}), sakId: '999' }),
    } as never)

    expect(api.lagreVurdering).toHaveBeenCalledWith(expect.objectContaining({ sakId: 999 }))
  })

  it('redirecter til behandlingssiden etter vellykket lagring', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = await action({
      params: { behandlingId: '1', aktivitetId: '2' },
      request: requestMedFormData({ payload: JSON.stringify({}) }),
    } as never)

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(302)
    expect((result as Response).headers.get('Location')).toBe('/behandling/1?justCompleted=2')
  })

  it('returnerer violations fra backend som _server-feil ved 400', async () => {
    const api = fakeApi({
      lagreVurdering: vi
        .fn()
        .mockRejectedValue({ data: { status: 400, title: 'Bad request', violations: ['Feil A', 'Feil B'] } }),
    })
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = assertDataResult(
      await action({
        params: { behandlingId: '1', aktivitetId: '2' },
        request: requestMedFormData({ payload: JSON.stringify({}) }),
      } as never),
    )

    expect(result.data.errors._server).toEqual(['Feil A', 'Feil B'])
    expect(result.init?.status).toBe(400)
  })

  it('faller tilbake til error.data.message når violations mangler', async () => {
    const api = fakeApi({
      lagreVurdering: vi
        .fn()
        .mockRejectedValue({ data: { status: 400, title: 'Bad request', message: 'Noe gikk galt' } }),
    })
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = assertDataResult(
      await action({
        params: { behandlingId: '1', aktivitetId: '2' },
        request: requestMedFormData({ payload: JSON.stringify({}) }),
      } as never),
    )

    expect(result.data.errors._server).toEqual(['Noe gikk galt'])
  })

  it('faller tilbake til generisk melding når verken violations eller message finnes', async () => {
    const api = fakeApi({
      lagreVurdering: vi.fn().mockRejectedValue({ data: { status: 400, title: 'Bad request' } }),
    })
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = assertDataResult(
      await action({
        params: { behandlingId: '1', aktivitetId: '2' },
        request: requestMedFormData({ payload: JSON.stringify({}) }),
      } as never),
    )

    expect(result.data.errors._server).toEqual(['POPP-validering feilet'])
  })

  it('returnerer generisk _server-feil ved ikke-400-feil', async () => {
    const api = fakeApi({ lagreVurdering: vi.fn().mockRejectedValue(new Error('Nettverksfeil')) })
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = assertDataResult(
      await action({
        params: { behandlingId: '1', aktivitetId: '2' },
        request: requestMedFormData({ payload: JSON.stringify({}) }),
      } as never),
    )

    expect(result.data.errors._server).toEqual(['Det oppstod en feil ved lagring'])
    expect(result.init?.status).toBe(500)
  })
})
