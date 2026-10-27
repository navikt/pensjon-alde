import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hentForstegangstjenesteGrunnlag, lagreForstegangstjenesteVurdering } from './forstegangstjeneste-api.server'

const { hentGrunnlagsdata, lagreVurdering, hentToppbarinfo } = vi.hoisted(() => ({
  hentGrunnlagsdata: vi.fn(),
  lagreVurdering: vi.fn(),
  hentToppbarinfo: vi.fn(),
}))
vi.mock('~/api/aktivitet-api', () => ({ createAktivitetApi: () => ({ hentGrunnlagsdata, lagreVurdering }) }))
vi.mock('~/api/behandling-api', () => ({ createBehandlingApi: () => ({ hentToppbarinfo }) }))

const periode = { periodeType: 'NORMAL', tjenesteType: 'MIL', fomDato: '1982-01-04', tomDato: '1982-12-17' }
const tilLagring = {
  tjenestestartDato: '1982-01-04',
  dimitteringDato: '1982-12-17',
  forstegangstjenestePeriodeListe: [periode],
}
const payload = { fnr: 'untrusted', forstegangstjenesteTilLagring: tilLagring }

function ref(verdi: unknown = payload, sakId = '123') {
  const form = new FormData()
  form.set('sakId', sakId)
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
  hentToppbarinfo.mockResolvedValue({ fnr: '12345678901' })
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

  it('saves using the trusted person identity and redirects to the treatment', async () => {
    const result = await lagreForstegangstjenesteVurdering(ref())
    expect(lagreVurdering).toHaveBeenCalledWith({
      sakId: 123,
      fnr: '12345678901',
      forstegangstjenesteTilLagring: tilLagring,
      begrunnelse: 'Retter dimitteringsdato',
    })
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).headers.get('Location')).toBe('/behandling/1?justCompleted=2')
  })

  it('sends deletion without a replacement', async () => {
    await lagreForstegangstjenesteVurdering(ref({ slettForstegangstjeneste: true }))
    expect(lagreVurdering).toHaveBeenCalledWith({
      sakId: 123,
      fnr: '12345678901',
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
    expect(hentToppbarinfo).not.toHaveBeenCalled()
  })

  it.each(['', 'abc', '1.5', '-1', '0'])('rejects invalid case ID %s', async sakId => {
    expect(await lagreForstegangstjenesteVurdering(ref(payload, sakId))).toMatchObject({ init: { status: 400 } })
    expect(lagreVurdering).not.toHaveBeenCalled()
  })

  it('refuses to save without a person identity', async () => {
    hentToppbarinfo.mockResolvedValue({ fnr: null })
    expect(await lagreForstegangstjenesteVurdering(ref())).toMatchObject({ init: { status: 400 } })
    expect(lagreVurdering).not.toHaveBeenCalled()
  })

  it.each([400, 403, 500])('surfaces backend errors with status %s', async status => {
    lagreVurdering.mockRejectedValue({ data: { status, title: 'Error', violations: ['Ugyldig periode'] } })
    const result = await lagreForstegangstjenesteVurdering(ref())
    expect(result).toMatchObject({ init: { status }, data: { errors: { _server: expect.any(Array) } } })
    if (status === 400) expect(result).toMatchObject({ data: { errors: { _server: ['Ugyldig periode'] } } })
  })
})
