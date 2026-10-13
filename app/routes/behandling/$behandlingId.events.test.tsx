import { describe, expect, it } from 'vitest'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import { AktivitetStatus, AldeBehandlingStatus, BehandlingStatus } from '~/types/behandling'
import {
  finnAktivitetUnderBehandling,
  getNesteAktivitetPathFraEvent,
  harEndretStatus,
  skalPolle,
  vurderEvent,
} from './$behandlingId'

const aktivitet = (overrides: Partial<AktivitetDTO>): AktivitetDTO => ({
  aktivitetId: 1,
  type: 'Aktivitet',
  opprettet: '2026-10-02T12:00:00',
  handlerName: 'vurder-samboer',
  friendlyName: 'Vurder samboer',
  antallGangerKjort: 1,
  sisteAktiveringsdato: '2026-10-02T12:00:00',
  status: AktivitetStatus.OPPRETTET,
  utsattTil: null,
  behandletFerdigMaskinelt: false,
  ...overrides,
})

const event = (overrides: Partial<BehandlingDTO>): BehandlingDTO => ({
  behandlingId: 123,
  type: 'AldeBehandling',
  aldeBehandlingStatus: AldeBehandlingStatus.VENTER_SAKSBEHANDLER,
  handlerName: 'alderspensjon-soknad',
  friendlyName: 'Alderspensjon søknad',
  processName: null,
  sisteKjoringDato: '2026-10-02T12:00:00',
  utsattTil: null,
  opprettet: '2026-10-02T12:00:00',
  stoppet: null,
  status: BehandlingStatus.UNDER_BEHANDLING,
  aktiviteter: [],
  sisteKjoring: null,
  ...overrides,
})

describe('getNesteAktivitetPathFraEvent', () => {
  const ferdig = aktivitet({ aktivitetId: 1, status: AktivitetStatus.FULLFORT })
  const neste = aktivitet({ aktivitetId: 2, status: AktivitetStatus.UNDER_BEHANDLING })

  it('returns path to next aktivitet when VENTER_SAKSBEHANDLER', () => {
    expect(getNesteAktivitetPathFraEvent(event({ aktiviteter: [ferdig, neste] }), '1')).toBe(
      '/behandling/123/aktivitet/2',
    )
  })

  it('returns attestering path for attestering aktivitet', () => {
    const attestering = aktivitet({ aktivitetId: 3, handlerName: 'attestering' })
    expect(getNesteAktivitetPathFraEvent(event({ aktiviteter: [ferdig, attestering] }), null)).toBe(
      '/behandling/123/attestering',
    )
  })

  it('returns null while VENTER_MASKINELL', () => {
    expect(
      getNesteAktivitetPathFraEvent(
        event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL, aktiviteter: [neste] }),
        null,
      ),
    ).toBeNull()
  })

  it('returns null when behandling is FEILENDE', () => {
    expect(
      getNesteAktivitetPathFraEvent(event({ status: BehandlingStatus.FEILENDE, aktiviteter: [neste] }), null),
    ).toBeNull()
  })

  it('returns null when next aktivitet is the one just completed', () => {
    expect(getNesteAktivitetPathFraEvent(event({ aktiviteter: [neste] }), '2')).toBeNull()
  })
})

describe('vurderEvent', () => {
  const now = new Date('2026-10-02T12:00:00')
  const ferdig = aktivitet({ aktivitetId: 1, status: AktivitetStatus.FULLFORT })
  const neste = aktivitet({ aktivitetId: 2, status: AktivitetStatus.UNDER_BEHANDLING })

  it('navigerer når neste aktivitet er klar', () => {
    expect(vurderEvent(event({ aktiviteter: [ferdig, neste] }), '1', now)).toEqual({
      type: 'naviger',
      path: '/behandling/123/aktivitet/2',
    })
  })

  it('ignorerer mens maskinen jobber', () => {
    expect(
      vurderEvent(
        event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL, aktiviteter: [neste] }),
        null,
        now,
      ),
    ).toEqual({ type: 'ignorer' })
  })

  it('revaliderer når maskinen er utsatt', () => {
    expect(
      vurderEvent(
        event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL, utsattTil: '2026-10-03T12:00:00' }),
        null,
        now,
      ),
    ).toEqual({ type: 'revalider' })
  })

  it('ignorerer gammel melding om aktiviteten som nettopp ble fullført', () => {
    expect(vurderEvent(event({ aktiviteter: [neste] }), '2', now)).toEqual({ type: 'ignorer' })
  })

  it('revaliderer ved feilende behandling', () => {
    expect(vurderEvent(event({ status: BehandlingStatus.FEILENDE, aktiviteter: [neste] }), null, now)).toEqual({
      type: 'revalider',
    })
  })

  it.each([
    AldeBehandlingStatus.FULLFORT,
    AldeBehandlingStatus.VENTER_ATTESTERING,
    AldeBehandlingStatus.AUTOMATISK_TIL_MANUELL,
    AldeBehandlingStatus.AVBRUTT_AV_BRUKER,
  ])('revaliderer ved %s', aldeBehandlingStatus => {
    expect(vurderEvent(event({ aldeBehandlingStatus }), null, now)).toEqual({ type: 'revalider' })
  })
})

describe('finnAktivitetUnderBehandling', () => {
  it('returns friendly name of aktivitet UNDER_BEHANDLING', () => {
    expect(
      finnAktivitetUnderBehandling([
        aktivitet({ status: AktivitetStatus.FULLFORT, friendlyName: 'Ferdig' }),
        aktivitet({ status: AktivitetStatus.UNDER_BEHANDLING, friendlyName: '' }),
        aktivitet({ status: AktivitetStatus.UNDER_BEHANDLING, friendlyName: 'Beregner' }),
      ]),
    ).toBe('Beregner')
  })

  it('falls back to OPPRETTET when none is UNDER_BEHANDLING', () => {
    expect(
      finnAktivitetUnderBehandling([
        aktivitet({ status: AktivitetStatus.FULLFORT, friendlyName: 'Ferdig' }),
        aktivitet({ status: AktivitetStatus.OPPRETTET, friendlyName: 'Neste' }),
      ]),
    ).toBe('Neste')
  })

  it('prefers UNDER_BEHANDLING over OPPRETTET', () => {
    expect(
      finnAktivitetUnderBehandling([
        aktivitet({ status: AktivitetStatus.OPPRETTET, friendlyName: 'Neste' }),
        aktivitet({ status: AktivitetStatus.UNDER_BEHANDLING, friendlyName: 'Beregner' }),
      ]),
    ).toBe('Beregner')
  })

  it('returns null when none is UNDER_BEHANDLING or OPPRETTET', () => {
    expect(finnAktivitetUnderBehandling([aktivitet({ status: AktivitetStatus.FULLFORT })])).toBeNull()
  })
})

describe('skalPolle', () => {
  it('poller alltid uten Kafka-strøm', () => {
    expect(skalPolle({ live: false, sistRevalidert: 1000, now: 1000 })).toBe(true)
  })

  it('poller ikke med Kafka-strøm før sikkerhetsintervallet har gått', () => {
    expect(skalPolle({ live: true, sistRevalidert: 0, now: 9_999 })).toBe(false)
  })

  it('poller med Kafka-strøm når sikkerhetsintervallet har gått', () => {
    expect(skalPolle({ live: true, sistRevalidert: 0, now: 10_000 })).toBe(true)
  })
})

describe('harEndretStatus', () => {
  const venterAttestering = event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_ATTESTERING })

  it('er false når statusene er like', () => {
    expect(harEndretStatus(venterAttestering, venterAttestering)).toBe(false)
  })

  it('er true når aldeBehandlingStatus er endret', () => {
    expect(
      harEndretStatus(event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_SAKSBEHANDLER }), venterAttestering),
    ).toBe(true)
  })

  it('er true når status er endret', () => {
    expect(
      harEndretStatus(
        event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_ATTESTERING, status: BehandlingStatus.FEILENDE }),
        venterAttestering,
      ),
    ).toBe(true)
  })
})
