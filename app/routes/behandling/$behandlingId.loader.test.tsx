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

describe('$behandlingId loader – på en aktivitet mens maskinen jobber', () => {
  function callAktivitetLoader(behandling: BehandlingDTO) {
    hentBehandling.mockResolvedValue(behandling)
    const request = new Request('https://alde.intern.nav.no/behandling/123/aktivitet/456/alderspensjon-soknad/x')
    return loader({
      params: { behandlingId: '123', aktivitetId: '456' },
      request,
      url: new URL(request.url),
      context: createContext(),
    } as never)
  }

  beforeEach(() => {
    hentBehandling.mockReset()
  })

  it('går til behandlingen, som venter og deretter finner riktig side', async () => {
    const result = await callAktivitetLoader({
      ...mockBehandling,
      aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
    })

    expect((result as Response).headers.get('Location')).toBe('/behandling/123')
  })

  it('blir stående på aktiviteten når saksbehandler skal jobbe med den', async () => {
    const result = await callAktivitetLoader(mockBehandling)

    expect(result).not.toBeInstanceOf(Response)
  })

  it('blir stående og viser feilen når behandlingen feiler', async () => {
    const result = await callAktivitetLoader({
      ...mockBehandling,
      status: BehandlingStatus.FEILENDE,
      aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
    })

    expect(result).not.toBeInstanceOf(Response)
  })
})

describe('$behandlingId loader – venter på validering på aktiviteten', () => {
  const aktivitetUrl = 'https://alde.intern.nav.no/behandling/123/aktivitet/456/alderspensjon-soknad/varig-adskilt'

  const aktivitet = (aktivitetId: number, status: AktivitetStatus): AktivitetDTO => ({
    aktivitetId,
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

  const medKjoring = (uuid: string, overrides: Partial<BehandlingDTO> = {}): BehandlingDTO => ({
    ...mockBehandling,
    aktiviteter: [aktivitet(456, AktivitetStatus.UNDER_BEHANDLING)],
    sisteKjoring: {
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
    },
    ...overrides,
  })

  function callAktivitetLoader(behandling: BehandlingDTO) {
    hentBehandling.mockResolvedValue(behandling)
    const request = new Request(`${aktivitetUrl}?forrigeKjoring=gammel`)
    return loader({
      params: { behandlingId: '123', aktivitetId: '456' },
      request,
      url: new URL(request.url),
      context: createContext(),
    } as never)
  }

  beforeEach(() => {
    hentBehandling.mockReset()
  })

  it('blir stående på aktiviteten uten lasteskjerm før det har kommet en ny kjøring', async () => {
    const result = (await callAktivitetLoader(medKjoring('gammel'))) as {
      venterPaValidering: boolean
      behandlingJobber: boolean
    }

    expect(result).not.toBeInstanceOf(Response)
    expect(result.venterPaValidering).toBe(true)
    expect(result.behandlingJobber).toBe(false)
  })

  it('blir stående på aktiviteten når maskinen jobber uten ny kjøring', async () => {
    const result = (await callAktivitetLoader(
      medKjoring('gammel', { aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL }),
    )) as { venterPaValidering: boolean; behandlingJobber: boolean }

    expect(result).not.toBeInstanceOf(Response)
    expect(result.venterPaValidering).toBe(true)
    expect(result.behandlingJobber).toBe(false)
  })

  it('viser valideringsfeilene på aktiviteten når ny kjøring har avvist vurderingen', async () => {
    const result = await callAktivitetLoader(medKjoring('ny'))

    expect((result as Response).headers.get('Location')).toBe(
      '/behandling/123/aktivitet/456/alderspensjon-soknad/varig-adskilt',
    )
  })

  it('går til behandlingen når maskinen jobber videre etter godkjent vurdering', async () => {
    const result = await callAktivitetLoader(
      medKjoring('ny', {
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
        aktiviteter: [aktivitet(456, AktivitetStatus.FULLFORT)],
      }),
    )

    expect((result as Response).headers.get('Location')).toBe('/behandling/123')
  })

  it('går rett til neste aktivitet når den venter på saksbehandler', async () => {
    const result = await callAktivitetLoader(
      medKjoring('ny', {
        aktiviteter: [aktivitet(456, AktivitetStatus.FULLFORT), aktivitet(789, AktivitetStatus.UNDER_BEHANDLING)],
      }),
    )

    expect((result as Response).headers.get('Location')).toBe('/behandling/123/aktivitet/789')
  })

  it('går rett til attestering når behandlingen venter på attestering', async () => {
    const result = await callAktivitetLoader(
      medKjoring('ny', {
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_ATTESTERING,
        aktiviteter: [aktivitet(456, AktivitetStatus.FULLFORT)],
      }),
    )

    expect((result as Response).headers.get('Location')).toBe('/behandling/123/attestering')
  })

  it('går videre så snart aktiviteten er fullført', async () => {
    const result = await callAktivitetLoader(
      medKjoring('gammel', {
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
        aktiviteter: [aktivitet(456, AktivitetStatus.FULLFORT)],
      }),
    )

    expect((result as Response).headers.get('Location')).toBe('/behandling/123')
  })

  it('blir stående når maskinen har kjørt noe annet først og aktiviteten fortsatt kan bli avvist', async () => {
    const result = (await callAktivitetLoader(
      medKjoring('ny', { aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL }),
    )) as { venterPaValidering: boolean; behandlingJobber: boolean }

    expect(result).not.toBeInstanceOf(Response)
    expect(result.venterPaValidering).toBe(true)
    expect(result.behandlingJobber).toBe(false)
  })

  it('går til behandlingen når den er utsatt etter ny kjøring', async () => {
    const result = await callAktivitetLoader(
      medKjoring('ny', {
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
        utsattTil: '2999-01-01T00:00:00',
      }),
    )

    expect((result as Response).headers.get('Location')).toBe('/behandling/123')
  })

  it('går til behandlingen når den feiler etter ny kjøring', async () => {
    const result = await callAktivitetLoader(
      medKjoring('ny', {
        status: BehandlingStatus.FEILENDE,
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
      }),
    )

    expect((result as Response).headers.get('Location')).toBe('/behandling/123')
  })
})
