import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  beregnStatus,
  endringSummaryFraVurdering,
  oppsummeringForKategori,
  oversettKoderIMelding,
  tilLinjeState,
} from './opptjening.utils'
import type {
  OppdaterOpptjeningGrunnlag,
  OppdaterOpptjeningVurdering,
  OpptjeningstyperResponse,
} from './opptjening-types'
import { typeLabel } from './opptjeningstyper.utils'

vi.mock('~/api/aktivitet-api', () => ({
  createAktivitetApi: vi.fn(),
}))

const { createAktivitetApi } = await import('~/api/aktivitet-api')
const { hentOpptjeningLoaderData, lagreOpptjeningVurdering } = await import('./opptjening-api.server')

const opptjeningstyper: OpptjeningstyperResponse = {
  omsorg: {
    typer: [
      // Oppdiktet kode – testene trenger bare en vilkårlig kode med beskrivelse
      { code: 'OMS_BARN', description: 'Omsorg for barn' },
      { code: 'OBU6', description: 'Omsorg for barn under 6 år - eget vedtak' },
      { code: 'OBU7', description: 'Omsorg for barn under 7 år - eget vedtak' },
      // Oppdiktet: ingen POPP-kode er prefiks av en annen, så lengste-treff-testen trenger et konstruert par
      { code: 'OBO', description: 'Omsorg for syke/eldre' },
      { code: 'OBO_PLEIE', description: 'Omsorg for pleietrengende' },
    ],
    subTyper: [],
  },
}

function fakeApi(overrides: Partial<Record<'hentGrunnlagsdata' | 'lagreVurdering', unknown>> = {}) {
  return {
    hentGrunnlagsdata: vi.fn().mockResolvedValue({}),
    lagreVurdering: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function requestMedFormData(fields: Record<string, string>): Request {
  const formData = new FormData()
  for (const [key, value] of Object.entries({ sakId: '999', ...fields })) {
    formData.set(key, value)
  }
  return new Request('http://localhost/aktivitet', { method: 'POST', body: formData })
}

function assertDataResult(result: Awaited<ReturnType<typeof lagreOpptjeningVurdering>>) {
  if (result instanceof Response) {
    throw new Error('Forventet data()-resultat, fikk Response (redirect)')
  }
  return result
}

function lagre(request: Request, options: Partial<Parameters<typeof lagreOpptjeningVurdering>[0]> = {}) {
  return lagreOpptjeningVurdering({
    request,
    behandlingId: '1',
    aktivitetId: '2',
    ...options,
  })
}

beforeEach(() => {
  vi.mocked(createAktivitetApi).mockReset()
})

describe('typeLabel', () => {
  it('returns description for known type code', () => {
    expect(typeLabel(opptjeningstyper, 'OBU6')).toBe('Omsorg for barn under 6 år - eget vedtak')
  })

  it('returns the code itself when unknown', () => {
    expect(typeLabel(opptjeningstyper, 'UKJENT_KODE')).toBe('UKJENT_KODE')
  })
})

describe('oversettKoderIMelding', () => {
  it('replaces a single known code embedded in a sentence', () => {
    const resultat = oversettKoderIMelding('Kan ikke slette OBU6 for 2010', opptjeningstyper)
    expect(resultat).toBe('Kan ikke slette Omsorg for barn under 6 år - eget vedtak (OBU6) for 2010')
  })

  it('replaces multiple distinct codes in the same message', () => {
    const resultat = oversettKoderIMelding('Feil for OBU6 og OBU7', opptjeningstyper)
    expect(resultat).toBe(
      'Feil for Omsorg for barn under 6 år - eget vedtak (OBU6) og Omsorg for barn under 7 år - eget vedtak (OBU7)',
    )
  })

  it('prefers the longest matching code over an overlapping prefix', () => {
    const resultat = oversettKoderIMelding('Ugyldig type OBO_PLEIE', opptjeningstyper)
    expect(resultat).toBe('Ugyldig type Omsorg for pleietrengende (OBO_PLEIE)')
  })

  it('does not replace a code that is part of a larger word', () => {
    const resultat = oversettKoderIMelding('Ukjent verdi OBU62', opptjeningstyper)
    expect(resultat).toBe('Ukjent verdi OBU62')
  })

  it('returns the message unchanged when no known codes are present', () => {
    const resultat = oversettKoderIMelding('Generell feilmelding uten koder', opptjeningstyper)
    expect(resultat).toBe('Generell feilmelding uten koder')
  })
})

describe('tilLinjeState', () => {
  it('setter status original og en uavhengig kopi som _original', () => {
    const dto = { ar: 2020, omsorgType: 'OBU6', fnrOmsorgFor: '01011012345' }
    const linje = tilLinjeState(dto)

    expect(linje._status).toBe('original')
    expect(linje._original).toEqual(dto)
    expect(linje._original).not.toBe(dto)

    linje.ar = 2021
    expect(linje._original?.ar).toBe(2020)
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

describe('oppsummeringForKategori', () => {
  const linjer = [
    { _id: 'a', _status: 'new' as const, navn: 'ny' },
    { _id: 'b', _status: 'modified' as const, navn: 'endret' },
    { _id: 'c', _status: 'deleted' as const, navn: 'slettet' },
    { _id: 'd', _status: 'original' as const, navn: 'urørt' },
  ]

  const oppsummer = oppsummeringForKategori('Kategori', linjer, {
    label: l => `full-${l.navn}`,
    kortLabel: l => `kort-${l.navn}`,
    endringer: l => [`endring-${l.navn}`],
  })

  it('filtrerer på status og bruker full label for nye og slettede', () => {
    expect(oppsummer('new')).toEqual([{ id: 'a', kategori: 'Kategori', label: 'full-ny', endringer: undefined }])
    expect(oppsummer('deleted')).toEqual([
      { id: 'c', kategori: 'Kategori', label: 'full-slettet', endringer: undefined },
    ])
    expect(oppsummer('original')).toEqual([
      { id: 'd', kategori: 'Kategori', label: 'full-urørt', endringer: undefined },
    ])
  })

  it('bruker kortLabel og endringer for endrede linjer', () => {
    expect(oppsummer('modified')).toEqual([
      { id: 'b', kategori: 'Kategori', label: 'kort-endret', endringer: ['endring-endret'] },
    ])
  })

  it('faller tilbake til full label når kortLabel mangler', () => {
    const utenKortLabel = oppsummeringForKategori('Omsorg', linjer, { label: l => `full-${l.navn}` })

    expect(utenKortLabel('modified')).toEqual([
      { id: 'b', kategori: 'Omsorg', label: 'full-endret', endringer: undefined },
    ])
  })
})

describe('endringSummaryFraVurdering', () => {
  const grunnlag: NonNullable<OppdaterOpptjeningGrunnlag['opptjeningsGrunnlagDto']> = {
    fnr: '12345678901',
    omsorgListe: [{ omsorgId: 5, omsorgType: 'OMS_BARN', ar: 2020, fnrOmsorgFor: '10987654321' }],
  }

  it('viser slettet omsorg som slettet linje', () => {
    const vurdering: OppdaterOpptjeningVurdering = {
      omsorgTilSletting: [{ ar: 2020, omsorgType: 'OMS_BARN' }],
    }

    const summary = endringSummaryFraVurdering(vurdering, grunnlag, opptjeningstyper)

    expect(summary.slettede).toEqual([
      {
        id: 'omsorg-0-0',
        kategori: 'Omsorg',
        label: 'Omsorg for barn (2020) – omsorg for 10987654321',
        endringer: undefined,
      },
    ])
  })

  it('viser kun år og type når grunnlaget mangler', () => {
    const vurdering: OppdaterOpptjeningVurdering = {
      omsorgTilSletting: [{ ar: 2020, omsorgType: 'OMS_BARN' }],
    }

    expect(endringSummaryFraVurdering(vurdering, undefined, opptjeningstyper).slettede[0].label).toBe(
      'Omsorg for barn (2020)',
    )
  })
})

describe('hentOpptjeningLoaderData', () => {
  it('henter grunnlag og leser opptjeningstyper fra grunnlaget (happy path)', async () => {
    const grunnlag: OppdaterOpptjeningGrunnlag = {
      saker: [],
      opptjeningsGrunnlagDto: { fnr: '123', omsorgListe: [] },
      opptjeningstyper: [{ code: 'OBU6', description: 'Omsorg for barn under 6 år - eget vedtak' }],
    }
    const api = fakeApi({
      hentGrunnlagsdata: vi.fn().mockResolvedValue(grunnlag),
    })
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = await hentOpptjeningLoaderData({
      request: new Request('http://localhost/aktivitet'),
      behandlingId: '1',
      aktivitetId: '2',
    })

    expect(result.grunnlag).toBe(grunnlag)
    expect(result.opptjeningstyper).toEqual({
      omsorg: { typer: [{ code: 'OBU6', description: 'Omsorg for barn under 6 år - eget vedtak' }], subTyper: [] },
    })
    expect(result.readOnly).toBe(false)
  })

  it('setter readOnly når hentGrunnlagsdata feiler med 403', async () => {
    const api = fakeApi({
      hentGrunnlagsdata: vi.fn().mockRejectedValue({ data: { status: 403, title: 'Forbidden' } }),
    })
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = await hentOpptjeningLoaderData({
      request: new Request('http://localhost/aktivitet'),
      behandlingId: '1',
      aktivitetId: '2',
    })

    expect(result.readOnly).toBe(true)
    expect(result.grunnlag).toEqual({})
    expect(result.opptjeningstyper).toEqual({ omsorg: { typer: [], subTyper: [] } })
  })

  it('kaster videre feil som ikke er 403', async () => {
    const api = fakeApi({
      hentGrunnlagsdata: vi.fn().mockRejectedValue({ data: { status: 500, title: 'Server error' } }),
    })
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    await expect(
      hentOpptjeningLoaderData({
        request: new Request('http://localhost/aktivitet'),
        behandlingId: '1',
        aktivitetId: '2',
      }),
    ).rejects.toBeDefined()
  })
})

describe('lagreOpptjeningVurdering', () => {
  it('returnerer _form-feil når payload mangler', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = assertDataResult(await lagre(requestMedFormData({})))

    expect(result.data.errors._form).toBe('Mangler skjemadata')
    expect(result.init?.status).toBe(400)
  })

  it('returnerer _form-feil når payload ikke er gyldig JSON', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = assertDataResult(await lagre(requestMedFormData({ payload: 'ikke-json{' })))

    expect(result.data.errors._form).toBe('Ugyldig skjemadata')
    expect(result.init?.status).toBe(400)
  })

  it('inkluderer sakId i vurderingen når det er sendt inn', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    await lagre(requestMedFormData({ payload: JSON.stringify({}), sakId: '999' }))

    expect(api.lagreVurdering).toHaveBeenCalledWith(expect.objectContaining({ sakId: 999 }))
  })

  it('krever sakId når vurderingen lagres', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = await lagre(requestMedFormData({ payload: JSON.stringify({ fnr: '12345678901' }), sakId: '' }))

    expect(assertDataResult(result)).toMatchObject({ data: { errors: { _form: 'Mangler sakId' } } })
    expect(api.lagreVurdering).not.toHaveBeenCalled()
  })

  it('sender Omsorg-data i lagreVurdering med sakId, fnr og flat omsorgTilSletting-liste', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)
    const omsorg = { ar: 2020, omsorgType: 'OMS_BARN' }

    await lagre(
      requestMedFormData({
        payload: JSON.stringify({ fnr: '12345678901', omsorgTilSletting: [omsorg] }),
        sakId: '999',
      }),
    )

    expect(api.lagreVurdering).toHaveBeenCalledWith({
      sakId: 999,
      fnr: '12345678901',
      omsorgTilSletting: [omsorg],
    })
  })

  it('sender begrunnelse til lagreVurdering når den er fylt ut', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    await lagre(
      requestMedFormData({ payload: JSON.stringify({ fnr: '12345678901' }), begrunnelse: '  Feilregistrert  ' }),
    )

    expect(api.lagreVurdering).toHaveBeenCalledWith({ sakId: 999, fnr: '12345678901', begrunnelse: 'Feilregistrert' })
  })

  it('utelater tom begrunnelse', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    await lagre(requestMedFormData({ payload: JSON.stringify({ fnr: '12345678901' }), begrunnelse: '   ' }))

    expect(api.lagreVurdering).toHaveBeenCalledWith({ sakId: 999, fnr: '12345678901' })
  })

  it('redirecter til behandlingssiden etter vellykket lagring', async () => {
    const api = fakeApi()
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = await lagre(requestMedFormData({ payload: JSON.stringify({}) }))

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

    const result = assertDataResult(await lagre(requestMedFormData({ payload: JSON.stringify({}) })))

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

    const result = assertDataResult(await lagre(requestMedFormData({ payload: JSON.stringify({}) })))

    expect(result.data.errors._server).toEqual(['Noe gikk galt'])
  })

  it('faller tilbake til generisk melding når verken violations eller message finnes', async () => {
    const api = fakeApi({
      lagreVurdering: vi.fn().mockRejectedValue({ data: { status: 400, title: 'Bad request' } }),
    })
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = assertDataResult(await lagre(requestMedFormData({ payload: JSON.stringify({}) })))

    expect(result.data.errors._server).toEqual(['POPP-validering feilet'])
  })

  it('returnerer generisk _server-feil ved ikke-400-feil', async () => {
    const api = fakeApi({ lagreVurdering: vi.fn().mockRejectedValue(new Error('Nettverksfeil')) })
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = assertDataResult(await lagre(requestMedFormData({ payload: JSON.stringify({}) })))

    expect(result.data.errors._server).toEqual(['Det oppstod en feil ved lagring'])
    expect(result.init?.status).toBe(500)
  })

  it('returnerer 403-melding om manglende rolle', async () => {
    const api = fakeApi({
      lagreVurdering: vi.fn().mockRejectedValue({ data: { status: 403, title: 'Forbidden' } }),
    })
    vi.mocked(createAktivitetApi).mockReturnValue(api as never)

    const result = assertDataResult(await lagre(requestMedFormData({ payload: JSON.stringify({}) })))

    expect(result.data.errors._server?.[0]).toContain('Spesial PGI')
    expect(result.init?.status).toBe(403)
  })
})
