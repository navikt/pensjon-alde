import { describe, expect, it } from 'vitest'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import { AktivitetStatus, AldeBehandlingStatus, BehandlingStatus } from '~/types/behandling'
import {
  aktiviteterForVisning,
  finnAktivitetUnderBehandling,
  getNesteAktivitetPathFraEvent,
  harEndring,
  skalPolle,
  velgEventHandling,
  venterPaEndring,
  vurderEvent,
} from './event-handling'

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

const kjoring = (uuid: string): BehandlingDTO['sisteKjoring'] => ({
  behandlingId: 123,
  aktivitetId: null,
  startet: '2026-10-02T12:00:00',
  avsluttet: '2026-10-02T12:00:01',
  uuid,
  traceId: null,
  behandlingKjoringId: null,
  correlationId: 'c',
  feilmelding: null,
  stackTrace: null,
})

describe('getNesteAktivitetPathFraEvent', () => {
  const ferdig = aktivitet({ aktivitetId: 1, status: AktivitetStatus.FULLFORT })
  const neste = aktivitet({ aktivitetId: 2, status: AktivitetStatus.UNDER_BEHANDLING })

  it('returns path to next aktivitet when VENTER_SAKSBEHANDLER', () => {
    expect(getNesteAktivitetPathFraEvent(event({ aktiviteter: [ferdig, neste] }))).toBe('/behandling/123/aktivitet/2')
  })

  it('returns attestering path for attestering aktivitet', () => {
    const attestering = aktivitet({ aktivitetId: 3, handlerName: 'attestering' })
    expect(getNesteAktivitetPathFraEvent(event({ aktiviteter: [ferdig, attestering] }))).toBe(
      '/behandling/123/attestering',
    )
  })

  it('returns null while VENTER_MASKINELL', () => {
    expect(
      getNesteAktivitetPathFraEvent(
        event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL, aktiviteter: [neste] }),
      ),
    ).toBeNull()
  })

  it('returns null when behandling is FEILENDE', () => {
    expect(getNesteAktivitetPathFraEvent(event({ status: BehandlingStatus.FEILENDE, aktiviteter: [neste] }))).toBeNull()
  })
})

describe('vurderEvent', () => {
  const ferdig = aktivitet({ aktivitetId: 1, status: AktivitetStatus.FULLFORT })
  const neste = aktivitet({ aktivitetId: 2, status: AktivitetStatus.UNDER_BEHANDLING })

  it('navigerer når neste aktivitet er klar', () => {
    expect(vurderEvent(event({ aktiviteter: [ferdig, neste] }), null)).toEqual({
      type: 'naviger',
      path: '/behandling/123/aktivitet/2',
    })
  })

  it('ignorerer mens maskinen jobber', () => {
    expect(
      vurderEvent(event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL, aktiviteter: [neste] }), null),
    ).toEqual({ type: 'ignorer' })
  })

  it('ignorerer meldinger fra samme kjøring som før innsending', () => {
    expect(vurderEvent(event({ aktiviteter: [neste], sisteKjoring: kjoring('gammel') }), 'gammel')).toEqual({
      type: 'ignorer',
    })
  })

  it('viser samme aktivitet igjen når en ny kjøring har satt den tilbake til saksbehandler (avvist)', () => {
    expect(vurderEvent(event({ aktiviteter: [neste], sisteKjoring: kjoring('ny') }), 'gammel')).toEqual({
      type: 'naviger',
      path: '/behandling/123/aktivitet/2',
    })
  })

  it('revaliderer ved feilende behandling', () => {
    expect(vurderEvent(event({ status: BehandlingStatus.FEILENDE, aktiviteter: [neste] }), null)).toEqual({
      type: 'revalider',
    })
  })

  it.each([
    AldeBehandlingStatus.FULLFORT,
    AldeBehandlingStatus.VENTER_ATTESTERING,
    AldeBehandlingStatus.AUTOMATISK_TIL_MANUELL,
    AldeBehandlingStatus.AVBRUTT_AV_BRUKER,
  ])('revaliderer ved %s', aldeBehandlingStatus => {
    expect(vurderEvent(event({ aldeBehandlingStatus }), null)).toEqual({ type: 'revalider' })
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

describe('venterPaEndring', () => {
  it('er true mens maskinen jobber', () => {
    expect(venterPaEndring(event({}), true)).toBe(true)
  })

  it('er true mens behandlingen venter på attestering', () => {
    expect(venterPaEndring(event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_ATTESTERING }), false)).toBe(true)
  })

  it('er false når saksbehandler jobber med en aktivitet', () => {
    expect(venterPaEndring(event({}), false)).toBe(false)
  })
})

describe('velgEventHandling', () => {
  const aktiv = aktivitet({ aktivitetId: 2, status: AktivitetStatus.UNDER_BEHANDLING, antallGangerKjort: 1 })
  const behandling = event({ aktiviteter: [aktiv] })
  const base = {
    behandling,
    aktivitetId: '2',
    forrigeKjoring: null,
    isLoading: false,
  }

  it('revaliderer på alle meldinger mens vi sender inn', () => {
    expect(velgEventHandling({ ...base, event: behandling, venterPaSvar: true })).toEqual({ type: 'revalider' })
  })

  describe('venter på validering på aktiviteten', () => {
    const venterPaValidering = (ev: BehandlingDTO) =>
      velgEventHandling({ ...base, forrigeKjoring: 'gammel', event: ev, venterPaSvar: true })

    it('blir stående og lar loaderen avgjøre når maskinen jobber uten ny kjøring', () => {
      expect(
        venterPaValidering(
          event({
            aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
            aktiviteter: [aktiv],
            sisteKjoring: kjoring('gammel'),
          }),
        ),
      ).toEqual({ type: 'revalider' })
    })

    it('revaliderer når ny kjøring har avvist vurderingen', () => {
      expect(venterPaValidering(event({ aktiviteter: [aktiv], sisteKjoring: kjoring('ny') }))).toEqual({
        type: 'revalider',
      })
    })

    it('går rett til neste aktivitet når vurderingen er godkjent', () => {
      const neste = aktivitet({ aktivitetId: 3, status: AktivitetStatus.UNDER_BEHANDLING })
      expect(
        venterPaValidering(
          event({ aktiviteter: [{ ...aktiv, status: AktivitetStatus.FULLFORT }, neste], sisteKjoring: kjoring('ny') }),
        ),
      ).toEqual({ type: 'naviger', path: '/behandling/123/aktivitet/3' })
    })

    it('går til behandlingen når vurderingen er godkjent og maskinen jobber videre', () => {
      expect(
        venterPaValidering(
          event({
            aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
            aktiviteter: [{ ...aktiv, status: AktivitetStatus.FULLFORT }],
            sisteKjoring: kjoring('ny'),
          }),
        ),
      ).toEqual({ type: 'naviger', path: '/behandling/123' })
    })

    it('går til behandlingen når den feiler', () => {
      expect(
        venterPaValidering(
          event({
            status: BehandlingStatus.FEILENDE,
            aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
            aktiviteter: [aktiv],
            sisteKjoring: kjoring('ny'),
          }),
        ),
      ).toEqual({ type: 'naviger', path: '/behandling/123' })
    })

    it('revaliderer vanlige innsendinger uten søkeparameter', () => {
      expect(
        velgEventHandling({
          ...base,
          event: event({ aktiviteter: [{ ...aktiv, status: AktivitetStatus.FULLFORT }] }),
          venterPaSvar: true,
        }),
      ).toEqual({ type: 'revalider' })
    })
  })

  describe('observatør: andre endrer behandlingen', () => {
    const observer = (ev: BehandlingDTO, overrides: Partial<typeof base> = {}) =>
      velgEventHandling({ ...base, ...overrides, event: ev, venterPaSvar: false })

    it('ignorerer meldinger uten endring', () => {
      expect(observer(behandling)).toEqual({ type: 'ignorer' })
    })

    it('går til behandlingen når noen andre sender inn og maskinen begynner å jobbe', () => {
      expect(
        observer(event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL, aktiviteter: [aktiv] })),
      ).toEqual({ type: 'naviger', path: '/behandling/123' })
    })

    it('navigerer til neste aktivitet når en annen aktivitet venter', () => {
      const neste = aktivitet({ aktivitetId: 3, status: AktivitetStatus.UNDER_BEHANDLING })
      expect(
        observer(
          event({
            aktiviteter: [{ ...aktiv, status: AktivitetStatus.FULLFORT }, neste],
            sisteKjoring: kjoring('ny'),
          }),
        ),
      ).toEqual({
        type: 'naviger',
        path: '/behandling/123/aktivitet/3',
      })
    })

    it('revaliderer når noen andres vurdering ble avvist uten statusendring', () => {
      expect(observer(event({ aktiviteter: [aktiv], sisteKjoring: kjoring('ny') }))).toEqual({ type: 'revalider' })
    })

    it.each([
      AldeBehandlingStatus.AVBRUTT_AV_BRUKER,
      AldeBehandlingStatus.VENTER_ATTESTERING,
      AldeBehandlingStatus.FULLFORT,
    ])('går til behandlingen når status blir %s', aldeBehandlingStatus => {
      expect(observer(event({ aldeBehandlingStatus, aktiviteter: [aktiv] }))).toEqual({
        type: 'naviger',
        path: '/behandling/123',
      })
    })

    it('blir stående og oppdaterer data når vi ser på en tidligere aktivitet', () => {
      expect(
        observer(event({ aldeBehandlingStatus: AldeBehandlingStatus.AVBRUTT_AV_BRUKER, aktiviteter: [aktiv] }), {
          aktivitetId: '1',
        }),
      ).toEqual({ type: 'revalider' })
    })

    it('revaliderer ventesider uten aktivitet ved endring', () => {
      expect(
        observer(event({ aldeBehandlingStatus: AldeBehandlingStatus.FULLFORT, aktiviteter: [aktiv] }), {
          aktivitetId: undefined,
        }),
      ).toEqual({ type: 'revalider' })
    })
  })

  it('følger maskinen når lasteskjermen vises', () => {
    const neste = aktivitet({ aktivitetId: 3, status: AktivitetStatus.UNDER_BEHANDLING })
    expect(
      velgEventHandling({
        ...base,
        aktivitetId: undefined,
        isLoading: true,
        venterPaSvar: false,
        event: event({ aktiviteter: [neste] }),
      }),
    ).toEqual({ type: 'naviger', path: '/behandling/123/aktivitet/3' })
  })
})

describe('venterPaEndring med venterPaSvar', () => {
  it('er true mens vi venter på svar på innsendt vurdering', () => {
    expect(venterPaEndring(event({}), false, true)).toBe(true)
  })
})

describe('harEndring', () => {
  const behandling = event({ sisteKjoring: kjoring('a') })

  it('er false for samme kjøring og status', () => {
    expect(harEndring(event({ sisteKjoring: kjoring('a') }), behandling)).toBe(false)
  })

  it('er true for ny kjøring selv uten statusendring', () => {
    expect(harEndring(event({ sisteKjoring: kjoring('b') }), behandling)).toBe(true)
  })

  it('er true ved statusendring', () => {
    expect(
      harEndring(
        event({ sisteKjoring: kjoring('a'), aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL }),
        behandling,
      ),
    ).toBe(true)
  })
})

describe('aktiviteterForVisning', () => {
  const fraLoader = [aktivitet({ aktivitetId: 1, friendlyName: 'Fra loader' })]
  const fraEvent = [aktivitet({ aktivitetId: 1, friendlyName: 'Fra melding' })]
  const behandling = event({ aktiviteter: fraLoader, sisteKjoring: kjoring('gammel') })

  it('bruker loaderdata når lasteskjermen ikke vises', () => {
    const lastEvent = event({ aktiviteter: fraEvent, sisteKjoring: kjoring('ny') })
    expect(aktiviteterForVisning({ behandling, lastEvent, isLoading: false, forrigeKjoring: null })).toBe(fraLoader)
  })

  it('bruker siste melding mens lasteskjermen vises', () => {
    const lastEvent = event({ aktiviteter: fraEvent, sisteKjoring: kjoring('ny') })
    expect(aktiviteterForVisning({ behandling, lastEvent, isLoading: true, forrigeKjoring: null })).toBe(fraEvent)
  })

  it('bruker loaderdata når meldingen er fra før innsendingen', () => {
    const lastEvent = event({ aktiviteter: fraEvent, sisteKjoring: kjoring('gammel') })
    expect(aktiviteterForVisning({ behandling, lastEvent, isLoading: true, forrigeKjoring: 'gammel' })).toBe(fraLoader)
  })

  it('bruker loaderdata uten melding', () => {
    expect(aktiviteterForVisning({ behandling, lastEvent: undefined, isLoading: true, forrigeKjoring: null })).toBe(
      fraLoader,
    )
  })
})
