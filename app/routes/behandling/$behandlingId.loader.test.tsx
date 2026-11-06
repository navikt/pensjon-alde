import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsContext } from '~/context/settings-context'
import { userContext } from '~/context/user-context'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import { AktivitetStatus, AldeBehandlingStatus, BehandlingStatus } from '~/types/behandling'
import { loader } from './$behandlingId'

const hentBehandling = vi.fn()
const hentVurdering = vi.fn()

vi.mock('~/api/behandling-api', () => ({
  createBehandlingApi: () => ({ hentBehandling }),
}))

vi.mock('~/api/aktivitet-api', () => ({
  createAktivitetApi: () => ({ hentVurdering }),
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

function callLoader(behandling: BehandlingDTO, justCompleted: string | null) {
  hentBehandling.mockResolvedValue(behandling)
  const search = justCompleted ? `?justCompleted=${justCompleted}` : ''
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

describe('$behandlingId loader – venter på prosessering av lagret vurdering', () => {
  const aktivitetUrl = 'https://alde.intern.nav.no/behandling/123/aktivitet/456/alderspensjon-soknad/varig-adskilt'

  const aktivitet = (status: AktivitetStatus): AktivitetDTO => ({
    aktivitetId: 456,
    type: 'FleksibelApSak_VarigAdskilt',
    opprettet: '2024-01-01T10:00:00Z',
    handlerName: 'varig-adskilt',
    friendlyName: 'Varig adskilt',
    antallGangerKjort: 1,
    sisteAktiveringsdato: '2024-01-01T10:00:00Z',
    status,
    utsattTil: null,
    behandletFerdigMaskinelt: false,
  })

  function callAktivitetLoader(behandling: BehandlingDTO, vurdering: unknown = null) {
    hentBehandling.mockResolvedValue(behandling)
    hentVurdering.mockResolvedValue(vurdering)
    const request = new Request(`${aktivitetUrl}?prosesserer=true`)
    return loader({
      params: { behandlingId: '123', aktivitetId: '456' },
      request,
      url: new URL(request.url),
      context: createContext(),
    } as never)
  }

  beforeEach(() => {
    hentBehandling.mockReset()
    hentVurdering.mockReset()
  })

  it('går videre til behandlingen når aktiviteten er fullført', async () => {
    const result = await callAktivitetLoader({
      ...mockBehandling,
      aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
      aktiviteter: [aktivitet(AktivitetStatus.FULLFORT)],
    })

    expect((result as Response).headers.get('Location')).toBe('/behandling/123')
  })

  it('går tilbake til aktiviteten uten lastetilstand når vurderingen ble avvist', async () => {
    const result = await callAktivitetLoader(
      { ...mockBehandling, aktiviteter: [aktivitet(AktivitetStatus.UNDER_BEHANDLING)] },
      { vurdering: { fom: '2027-05-01' }, validering: { feil: [{ melding: 'Feil', felt: 'fom' }] } },
    )

    expect((result as Response).headers.get('Location')).toBe(
      '/behandling/123/aktivitet/456/alderspensjon-soknad/varig-adskilt',
    )
  })

  it('blir stående på aktiviteten og venter mens vurderingen prosesseres', async () => {
    const result = (await callAktivitetLoader(
      {
        ...mockBehandling,
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
        aktiviteter: [aktivitet(AktivitetStatus.UNDER_BEHANDLING)],
      },
      { vurdering: { fom: '2027-05-01' }, validering: null },
    )) as { venterPaProsessering: boolean; behandlingJobber: boolean }

    expect(result.venterPaProsessering).toBe(true)
    expect(result.behandlingJobber).toBe(false)
  })
})
