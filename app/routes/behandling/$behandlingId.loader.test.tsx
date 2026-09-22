import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsContext } from '~/context/settings-context'
import { userContext } from '~/context/user-context'
import type { BehandlingDTO } from '~/types/behandling'
import { AldeBehandlingStatus, BehandlingStatus } from '~/types/behandling'

const hentBehandling = vi.fn()

vi.mock('~/api/behandling-api', () => ({
  createBehandlingApi: () => ({ hentBehandling }),
}))

const mockBehandling: BehandlingDTO = {
  behandlingId: 123,
  sakId: 456,
  kravId: 789,
  fnr: '12345678901',
  fornavn: 'Ola',
  etternavn: 'Nordmann',
  mellomnavn: null,
  fodselsdato: '1990-01-01',
  handlerName: 'alderspensjon-soknad',
  friendlyName: 'Alderspensjon søknad',
  status: BehandlingStatus.UNDER_BEHANDLING,
  aldeBehandlingStatus: AldeBehandlingStatus.VENTER_SAKSBEHANDLER,
  opprettet: '2024-01-01T10:00:00Z',
  sisteSaksbehandlerNavident: 'Z999999',
  utsattTil: null,
  aktiviteter: [],
  type: 'FORSTEGANGSBEHANDLING',
  sisteKjoringDato: '2024-01-01T10:00:00Z',
  sisteKjoring: null,
  stoppet: null,
  processName: null,
  sakType: null,
}

function createContext() {
  const values = new Map<unknown, unknown>([
    [userContext, { navident: 'Z999999', fornavn: 'Ola', etternavn: 'Nordmann', enhet: '1234' }],
    [settingsContext, { showStepper: true, showMetadata: true, kladdemodus: false }],
  ])
  return { get: (key: unknown) => values.get(key) } as never
}

function callLoader(behandling: BehandlingDTO, justCompleted: string | null) {
  hentBehandling.mockResolvedValue(behandling)
  const search = justCompleted ? `?justCompleted=${justCompleted}` : ''
  const request = new Request(`https://alde.intern.nav.no/behandling/123${search}`)
  const url = new URL(request.url)
  return import('./$behandlingId').then(({ loader }) =>
    loader({
      params: { behandlingId: '123' },
      request,
      url,
      context: createContext(),
    } as never),
  )
}

describe('$behandlingId loader', () => {
  beforeEach(() => {
    hentBehandling.mockReset()
  })

  it('keeps the error view instead of the polling loader when FEILENDE and justCompleted is present', async () => {
    const behandling: BehandlingDTO = {
      ...mockBehandling,
      status: BehandlingStatus.FEILENDE,
      aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
    }

    const result = (await callLoader(behandling, '456')) as {
      behandlingFeiler: boolean
      behandlingJobber: boolean
    }

    expect(result.behandlingFeiler).toBe(true)
    expect(result.behandlingJobber).toBe(false)
  })

  it('shows the polling loader when justCompleted is present and behandling is not FEILENDE', async () => {
    const behandling: BehandlingDTO = {
      ...mockBehandling,
      status: BehandlingStatus.UNDER_BEHANDLING,
      aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
    }

    const result = (await callLoader(behandling, '456')) as {
      behandlingFeiler: boolean
      behandlingJobber: boolean
    }

    expect(result.behandlingFeiler).toBe(false)
    expect(result.behandlingJobber).toBe(true)
  })
})
