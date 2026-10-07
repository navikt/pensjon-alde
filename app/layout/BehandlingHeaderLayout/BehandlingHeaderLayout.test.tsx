import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ToppbarInfo } from '~/api/behandling-api/types'
import { loader, shouldRevalidate } from './BehandlingHeaderLayout'

const hentToppbarinfo = vi.fn()
const createBehandlingApi = vi.fn((_: { request: Request; behandlingId: string }) => ({ hentToppbarinfo }))

vi.mock('~/api/behandling-api', () => ({
  createBehandlingApi: (args: { request: Request; behandlingId: string }) => createBehandlingApi(args),
}))

vi.mock('~/utils/env.server', () => ({
  env: {
    psakOppgaveoversikt: 'https://example.com/oppgaver',
    psakSakUrlTemplate: 'https://example.com/psak/sak/{sakId}',
    psakOversiktUrlTemplate: 'https://example.com/pensjonsoversikt/person/{pid}',
  },
}))

const toppbarinfo: ToppbarInfo = {
  fnr: '12345678901',
  sakId: 456,
  sakType: 'Alderspensjon',
  fornavn: 'Ola',
  etternavn: 'Nordmann',
  mellomnavn: null,
  fodselsdato: '1962-03-15',
}

function callLoader(behandlingId = '123') {
  const request = new Request(`https://alde.intern.nav.no/behandling/${behandlingId}`)
  return loader({ params: { behandlingId }, request } as never)
}

describe('BehandlingHeaderLayout loader', () => {
  beforeEach(() => {
    hentToppbarinfo.mockReset()
    createBehandlingApi.mockClear()
  })

  it('henter toppbarinfo for behandlingId fra params', async () => {
    hentToppbarinfo.mockResolvedValue(toppbarinfo)

    const result = await callLoader('123')

    expect(createBehandlingApi).toHaveBeenCalledWith(expect.objectContaining({ behandlingId: '123' }))
    expect(hentToppbarinfo).toHaveBeenCalledTimes(1)
    expect(result.toppbarinfo).toEqual(toppbarinfo)
  })

  it('bygger pensjonsoversikt-url fra sakId i toppbarinfo', async () => {
    hentToppbarinfo.mockResolvedValue(toppbarinfo)

    const result = await callLoader()

    expect(result.psakPensjonsoversiktUrl).toBe('https://example.com/psak/sak/456')
    expect(result.psakOppgaveoversiktUrl).toBe('https://example.com/oppgaver')
  })
})

describe('BehandlingHeaderLayout shouldRevalidate', () => {
  const args = (current: string, next: string) =>
    ({ currentParams: { behandlingId: current }, nextParams: { behandlingId: next } }) as never

  it('henter ikke toppbarinfo på nytt innenfor samme behandling', () => {
    expect(shouldRevalidate(args('123', '123'))).toBe(false)
  })

  it('henter toppbarinfo på nytt ved bytte av behandling', () => {
    expect(shouldRevalidate(args('123', '456'))).toBe(true)
  })
})
