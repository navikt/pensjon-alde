import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hentForstegangstjenesteGrunnlag, lagreForstegangstjenesteVurdering } from './forstegangstjeneste-api.server'

const { hentGrunnlagsdata, lagreVurdering } = vi.hoisted(() => ({
  hentGrunnlagsdata: vi.fn(),
  lagreVurdering: vi.fn(),
}))
vi.mock('~/api/aktivitet-api', () => ({ createAktivitetApi: () => ({ hentGrunnlagsdata, lagreVurdering }) }))

const periode = { periodeType: 'NORMAL', tjenesteType: 'MIL', fomDato: '1982-01-04', tomDato: '1982-12-17' }
const tilLagring = {
  tjenestestartDato: '1982-01-04',
  dimitteringDato: '1982-12-17',
  forstegangstjenestePeriodeListe: [periode],
}
const payload = { forstegangstjenesteTilLagring: tilLagring }

function ref(verdi: unknown = payload) {
  const form = new FormData()
  form.set('payload', typeof verdi === 'string' ? verdi : JSON.stringify(verdi))
  form.set('begrunnelse', '  Retter dimitteringsdato  ')
  return {
    request: new Request('http://localhost/test', { method: 'POST', body: form }),
    behandlingId: '1',
    aktivitetId: '2',
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  hentGrunnlagsdata.mockResolvedValue({ forstegangstjeneste: tilLagring })
})

describe('førstegangstjeneste API', () => {
  it('loads the backend grunnlag and handles missing role access', async () => {
    expect(await hentForstegangstjenesteGrunnlag(ref())).toEqual({
      grunnlag: { forstegangstjeneste: tilLagring },
      readOnly: false,
    })
    hentGrunnlagsdata.mockRejectedValue({ data: { status: 403, title: 'Forbidden' } })
    expect(await hentForstegangstjenesteGrunnlag(ref())).toEqual({ grunnlag: {}, readOnly: true })
    hentGrunnlagsdata.mockRejectedValue(new Error('Unavailable'))
    await expect(hentForstegangstjenesteGrunnlag(ref())).rejects.toThrow('Unavailable')
  })

  it('saves only the assessment fields and redirects to the treatment', async () => {
    const result = await lagreForstegangstjenesteVurdering(ref({ ...payload, fnr: '12345678901', sakId: 123 }))
    expect(lagreVurdering).toHaveBeenCalledWith({
      forstegangstjenesteTilLagring: tilLagring,
      begrunnelse: 'Retter dimitteringsdato',
    })
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).headers.get('Location')).toBe('/behandling/1?justCompleted=2')
  })

  it('sends deletion without a replacement', async () => {
    await lagreForstegangstjenesteVurdering(ref({ slettForstegangstjeneste: true }))
    expect(lagreVurdering).toHaveBeenCalledWith({
      slettForstegangstjeneste: true,
      begrunnelse: 'Retter dimitteringsdato',
    })
  })

  it.each([
    ['broken JSON', '{'],
    ['null payload', null],
    ['no operation', {}],
    ['both save and delete', { ...payload, slettForstegangstjeneste: true }],
    ['no periods', { forstegangstjenesteTilLagring: { ...tilLagring, forstegangstjenestePeriodeListe: [] } }],
    ['invalid date', { forstegangstjenesteTilLagring: { ...tilLagring, dimitteringDato: '1982-02-30' } }],
    ['dimittering before start', { forstegangstjenesteTilLagring: { ...tilLagring, dimitteringDato: '1981-12-31' } }],
    [
      'period ending before it starts',
      {
        forstegangstjenesteTilLagring: {
          ...tilLagring,
          forstegangstjenestePeriodeListe: [{ ...periode, tomDato: '1982-01-01' }],
        },
      },
    ],
    [
      'missing period type',
      {
        forstegangstjenesteTilLagring: {
          ...tilLagring,
          forstegangstjenestePeriodeListe: [{ ...periode, periodeType: ' ' }],
        },
      },
    ],
  ])('rejects %s without calling the backend', async (_navn, verdi) => {
    const result = await lagreForstegangstjenesteVurdering(ref(verdi))
    expect(result).toMatchObject({ init: { status: 400 } })
    expect(lagreVurdering).not.toHaveBeenCalled()
  })

  it.each([400, 403, 500])('surfaces backend errors with status %s', async status => {
    lagreVurdering.mockRejectedValue({ data: { status, title: 'Error', violations: ['Ugyldig periode'] } })
    const result = await lagreForstegangstjenesteVurdering(ref())
    expect(result).toMatchObject({ init: { status }, data: { errors: { _server: expect.any(Array) } } })
    if (status === 400) expect(result).toMatchObject({ data: { errors: { _server: ['Ugyldig periode'] } } })
  })
})
