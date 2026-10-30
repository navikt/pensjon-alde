import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hentDagpengerGrunnlag, lagreDagpengerVurdering } from './dagpenger-api.server'

const { hentGrunnlagsdata, lagreVurdering } = vi.hoisted(() => ({
  hentGrunnlagsdata: vi.fn(),
  lagreVurdering: vi.fn(),
}))
vi.mock('~/api/aktivitet-api', () => ({ createAktivitetApi: () => ({ hentGrunnlagsdata, lagreVurdering }) }))

const rad = { ar: 2024, dagpengerType: 'DP', utbetalteDagpenger: 10000, barnetillegg: 0 }
const payload = { dagpengerTilLagring: [rad], dagpengerTilSletting: [] }

function ref(verdi: unknown = payload) {
  const form = new FormData()
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

  it('saves only the assessment fields and redirects to the treatment', async () => {
    const result = await lagreDagpengerVurdering(ref({ ...payload, fnr: '12345678901', sakId: 123 }))
    expect(lagreVurdering).toHaveBeenCalledWith({ ...payload, begrunnelse: 'Retter feilregistrering' })
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
  })

  it.each([400, 403, 500])('surfaces backend errors with status %s', async status => {
    lagreVurdering.mockRejectedValue({ data: { status, title: 'Error', violations: ['Ugyldig dagpengegrunnlag'] } })
    const result = await lagreDagpengerVurdering(ref())
    expect(result).toMatchObject({ init: { status }, data: { errors: { _server: expect.any(Array) } } })
    if (status === 400) expect(result).toMatchObject({ data: { errors: { _server: ['Ugyldig dagpengegrunnlag'] } } })
  })
})
