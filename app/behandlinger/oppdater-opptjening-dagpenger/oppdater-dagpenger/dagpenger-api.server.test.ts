import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hentDagpengerGrunnlag, lagreDagpengerVurdering } from './dagpenger-api.server'

const { hentGrunnlagsdata, lagreVurdering, hentToppbarinfo } = vi.hoisted(() => ({
  hentGrunnlagsdata: vi.fn(),
  lagreVurdering: vi.fn(),
  hentToppbarinfo: vi.fn(),
}))
vi.mock('~/api/aktivitet-api', () => ({ createAktivitetApi: () => ({ hentGrunnlagsdata, lagreVurdering }) }))
vi.mock('~/api/behandling-api', () => ({ createBehandlingApi: () => ({ hentToppbarinfo }) }))

const rad = { ar: 2024, dagpengerType: 'DP', utbetalteDagpenger: 10000, barnetillegg: 0 }
const payload = { fnr: 'untrusted', dagpengerTilLagring: [rad], dagpengerTilSletting: [] }

function ref(verdi: unknown = payload, sakId = '123') {
  const form = new FormData()
  form.set('sakId', sakId)
  form.set('payload', typeof verdi === 'string' ? verdi : JSON.stringify(verdi))
  form.set('begrunnelse', '  Retter feilregistrering  ')
  return {
    request: new Request('http://localhost/test', { method: 'POST', body: form }),
    behandlingId: '1',
    aktivitetId: '2',
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  hentToppbarinfo.mockResolvedValue({ fnr: '12345678901' })
  hentGrunnlagsdata.mockResolvedValue({ dagpengerListe: [rad] })
})

describe('dagpenger API', () => {
  it('loads the backend grunnlag and handles missing role access', async () => {
    expect(await hentDagpengerGrunnlag(ref())).toEqual({ grunnlag: { dagpengerListe: [rad] }, readOnly: false })
    hentGrunnlagsdata.mockRejectedValue({ data: { status: 403, title: 'Forbidden' } })
    expect(await hentDagpengerGrunnlag(ref())).toEqual({ grunnlag: {}, readOnly: true })
    hentGrunnlagsdata.mockRejectedValue(new Error('Unavailable'))
    await expect(hentDagpengerGrunnlag(ref())).rejects.toThrow('Unavailable')
  })

  it('saves using the trusted person identity and redirects to the treatment', async () => {
    const result = await lagreDagpengerVurdering(ref())
    expect(lagreVurdering).toHaveBeenCalledWith({
      ...payload,
      fnr: '12345678901',
      sakId: 123,
      begrunnelse: 'Retter feilregistrering',
    })
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).headers.get('Location')).toBe('/behandling/1?justCompleted=2')
  })

  it('accepts deletion-only assessments', async () => {
    await lagreDagpengerVurdering(
      ref({ dagpengerTilLagring: [], dagpengerTilSletting: [{ ar: 2024, dagpengerType: 'DP' }] }),
    )
    expect(lagreVurdering).toHaveBeenCalledOnce()
  })

  it.each([
    ['broken JSON', '{'],
    ['null payload', null],
    ['empty operations', { dagpengerTilLagring: [], dagpengerTilSletting: [] }],
    ['missing mandatory amount', { ...payload, dagpengerTilLagring: [{ ...rad, barnetillegg: null }] }],
    ['fractional amount', { ...payload, dagpengerTilLagring: [{ ...rad, utbetalteDagpenger: 1.5 }] }],
    ['duplicate operations', { ...payload, dagpengerTilSletting: [{ ar: 2024, dagpengerType: 'DP' }] }],
  ])('rejects %s without calling the backend', async (_navn, verdi) => {
    const result = await lagreDagpengerVurdering(ref(verdi))
    expect(result).toMatchObject({ init: { status: 400 } })
    expect(lagreVurdering).not.toHaveBeenCalled()
    expect(hentToppbarinfo).not.toHaveBeenCalled()
  })

  it.each(['', 'abc', '1.5', '-1', '0'])('rejects invalid case ID %s', async sakId => {
    expect(await lagreDagpengerVurdering(ref(payload, sakId))).toMatchObject({ init: { status: 400 } })
    expect(lagreVurdering).not.toHaveBeenCalled()
  })

  it('refuses to save without a person identity', async () => {
    hentToppbarinfo.mockResolvedValue({ fnr: null })
    expect(await lagreDagpengerVurdering(ref())).toMatchObject({ init: { status: 400 } })
    expect(lagreVurdering).not.toHaveBeenCalled()
  })

  it.each([400, 403, 500])('surfaces backend errors with status %s', async status => {
    lagreVurdering.mockRejectedValue({ data: { status, title: 'Error', violations: ['Ugyldig dagpengegrunnlag'] } })
    const result = await lagreDagpengerVurdering(ref())
    expect(result).toMatchObject({ init: { status }, data: { errors: { _server: expect.any(Array) } } })
    if (status === 400) expect(result).toMatchObject({ data: { errors: { _server: ['Ugyldig dagpengegrunnlag'] } } })
  })
})
