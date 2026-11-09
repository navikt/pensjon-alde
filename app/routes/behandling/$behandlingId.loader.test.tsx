import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsContext } from '~/context/settings-context'
import { userContext } from '~/context/user-context'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import { AktivitetStatus, AldeBehandlingStatus, BehandlingStatus } from '~/types/behandling'
import { loader } from './$behandlingId'

const hentBehandling = vi.fn()

vi.mock('~/api/behandling-api', () => ({
  createBehandlingApi: () => ({ hentBehandling }),
}))

const mockBehandling: BehandlingDTO = {
  behandlingId: 123,
  handlerName: 'alderspensjon-soknad',
  friendlyName: 'Alderspensjon søknad',
  status: BehandlingStatus.UNDER_BEHANDLING,
  aldeBehandlingStatus: AldeBehandlingStatus.VENTER_SAKSBEHANDLER,
  opprettet: '2024-01-01T10:00:00Z',
  utsattTil: null,
  aktiviteter: [],
  type: 'FORSTEGANGSBEHANDLING',
  sisteKjoringDato: '2024-01-01T10:00:00Z',
  sisteKjoring: null,
  stoppet: null,
  processName: null,
}

function createContext() {
  const values = new Map<unknown, unknown>([
    [userContext, { navident: 'Z999999', fornavn: 'Ola', etternavn: 'Nordmann', enhet: '1234' }],
    [settingsContext, { showStepper: true, kladdemodus: false }],
  ])
  return { get: (key: unknown) => values.get(key) } as never
}

function callLoader(behandling: BehandlingDTO, forrigeKjoring: string | null) {
  hentBehandling.mockResolvedValue(behandling)
  const search = forrigeKjoring === null ? '' : `?forrigeKjoring=${forrigeKjoring}`
  const request = new Request(`https://alde.intern.nav.no/behandling/123${search}`)
  const url = new URL(request.url)
  return loader({
    params: { behandlingId: '123' },
    request,
    url,
    context: createContext(),
  } as never)
}

describe('$behandlingId loader', () => {
  beforeEach(() => {
    hentBehandling.mockReset()
  })

  it('keeps the error view instead of the polling loader when FEILENDE and waiting for a new kjøring', async () => {
    const behandling: BehandlingDTO = {
      ...mockBehandling,
      status: BehandlingStatus.FEILENDE,
      aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
    }

    const result = (await callLoader(behandling, 'gammel')) as {
      behandlingFeiler: boolean
      behandlingJobber: boolean
    }

    expect(result.behandlingFeiler).toBe(true)
    expect(result.behandlingJobber).toBe(false)
  })

  it('shows the polling loader when waiting for a new kjøring and behandling is not FEILENDE', async () => {
    const behandling: BehandlingDTO = {
      ...mockBehandling,
      status: BehandlingStatus.UNDER_BEHANDLING,
      aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
    }

    const result = (await callLoader(behandling, 'gammel')) as {
      behandlingFeiler: boolean
      behandlingJobber: boolean
    }

    expect(result.behandlingFeiler).toBe(false)
    expect(result.behandlingJobber).toBe(true)
  })
})

describe('$behandlingId loader – venter på ny kjøring etter innsending', () => {
  const aktivitet: AktivitetDTO = {
    aktivitetId: 456,
    type: 'FleksibelApSak_VurderSamboer',
    opprettet: '2024-01-01T10:00:00Z',
    handlerName: 'vurder-samboer',
    friendlyName: 'Vurder samboer',
    antallGangerKjort: 1,
    sisteAktiveringsdato: '2024-01-01T10:00:00Z',
    status: AktivitetStatus.UNDER_BEHANDLING,
    utsattTil: null,
    behandletFerdigMaskinelt: false,
  }

  const medKjoring = (uuid: string | null, overrides: Partial<BehandlingDTO> = {}): BehandlingDTO => ({
    ...mockBehandling,
    aktiviteter: [aktivitet],
    sisteKjoring: uuid
      ? {
          behandlingId: 123,
          aktivitetId: 456,
          startet: '2024-01-01T10:00:00Z',
          avsluttet: '2024-01-01T10:00:01Z',
          uuid,
          traceId: null,
          behandlingKjoringId: null,
          correlationId: 'c',
          feilmelding: null,
          stackTrace: null,
        }
      : null,
    ...overrides,
  })

  beforeEach(() => {
    hentBehandling.mockReset()
  })

  it('venter når siste kjøring er den samme som før innsending', async () => {
    const result = (await callLoader(medKjoring('gammel'), 'gammel')) as { behandlingJobber: boolean }

    expect(result).not.toBeInstanceOf(Response)
    expect(result.behandlingJobber).toBe(true)
  })

  it('viser samme aktivitet igjen når ny kjøring har satt den tilbake til saksbehandler (avvist)', async () => {
    const result = await callLoader(medKjoring('ny'), 'gammel')

    expect((result as Response).headers.get('Location')).toBe('/behandling/123/aktivitet/456')
  })

  it('venter på maskinen når ny kjøring fortsatt jobber', async () => {
    const result = (await callLoader(
      medKjoring('ny', { aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL }),
      'gammel',
    )) as { behandlingJobber: boolean }

    expect(result.behandlingJobber).toBe(true)
  })

  it('regner første kjøring som ny når det ikke fantes kjøring før innsending', async () => {
    const result = await callLoader(medKjoring('ny'), '')

    expect((result as Response).headers.get('Location')).toBe('/behandling/123/aktivitet/456')
  })

  it('venter når behandlingen er utsatt uten ny kjøring', async () => {
    const result = (await callLoader(
      medKjoring('gammel', {
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
        utsattTil: '2999-01-01T00:00:00',
      }),
      'gammel',
    )) as { behandlingJobber: boolean }

    expect(result.behandlingJobber).toBe(true)
  })
})
