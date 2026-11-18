import { describe, expect, it } from 'vitest'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import { AktivitetStatus, AldeBehandlingStatus, BehandlingStatus } from '~/types/behandling'
import { aktiviteterForVisning, finnAktivitetUnderBehandling, nesteSideFraEvent } from './event-handling'

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

describe('nesteSideFraEvent', () => {
  const aktiv = aktivitet({ aktivitetId: 2, status: AktivitetStatus.UNDER_BEHANDLING })
  const neste = aktivitet({ aktivitetId: 3, status: AktivitetStatus.UNDER_BEHANDLING })
  const ferdig = { ...aktiv, status: AktivitetStatus.FULLFORT }
  const behandling = event({ aktiviteter: [aktiv], sisteKjoring: kjoring('gammel') })
  const base = {
    behandling,
    aktivitetId: '2' as string | undefined,
    forrigeKjoring: null as string | null,
    isLoading: false,
    venterPaSvar: false,
  }

  describe('lasteskjerm', () => {
    const lasteskjerm = (ev: BehandlingDTO, forrigeKjoring: string | null = null) =>
      nesteSideFraEvent({ ...base, aktivitetId: undefined, isLoading: true, forrigeKjoring, event: ev })

    it('navigerer til aktiviteten som venter på saksbehandler', () => {
      expect(lasteskjerm(event({ aktiviteter: [ferdig, neste] }))).toBe('/behandling/123/aktivitet/3')
    })

    it('navigerer til attestering når behandlingen venter på attestering', () => {
      const attestering = aktivitet({ aktivitetId: 4, handlerName: 'attestering' })
      expect(
        lasteskjerm(
          event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_ATTESTERING, aktiviteter: [ferdig, attestering] }),
        ),
      ).toBe('/behandling/123/attestering')
    })

    it('venter når attesteringsaktiviteten finnes før behandlingen venter på attestering', () => {
      const attestering = aktivitet({ aktivitetId: 4, handlerName: 'attestering' })
      expect(lasteskjerm(event({ aktiviteter: [ferdig, attestering] }))).toBeNull()
      expect(
        lasteskjerm(
          event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL, aktiviteter: [ferdig, attestering] }),
        ),
      ).toBeNull()
    })

    it('revaliderer mens maskinen jobber', () => {
      expect(
        lasteskjerm(event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL, aktiviteter: [neste] })),
      ).toBeNull()
    })

    it('revaliderer når behandlingen feiler', () => {
      expect(lasteskjerm(event({ status: BehandlingStatus.FEILENDE, aktiviteter: [neste] }))).toBeNull()
    })

    it('ignorerer meldinger fra samme kjøring som før innsending', () => {
      expect(lasteskjerm(event({ aktiviteter: [neste], sisteKjoring: kjoring('gammel') }), 'gammel')).toBeNull()
    })

    it('navigerer når en ny kjøring har satt aktiviteten tilbake til saksbehandler', () => {
      expect(lasteskjerm(event({ aktiviteter: [aktiv], sisteKjoring: kjoring('ny') }), 'gammel')).toBe(
        '/behandling/123/aktivitet/2',
      )
    })
  })

  describe('venter på validering på aktiviteten', () => {
    const validering = (ev: BehandlingDTO) =>
      nesteSideFraEvent({ ...base, venterPaSvar: true, forrigeKjoring: 'gammel', event: ev })

    it('revaliderer når maskinen jobber uten ny kjøring', () => {
      expect(
        validering(
          event({
            aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
            aktiviteter: [aktiv],
            sisteKjoring: kjoring('gammel'),
          }),
        ),
      ).toBeNull()
    })

    it('revaliderer når ny kjøring har avvist vurderingen', () => {
      expect(validering(event({ aktiviteter: [aktiv], sisteKjoring: kjoring('ny') }))).toBeNull()
    })

    it('går rett til neste aktivitet når vurderingen er godkjent', () => {
      expect(validering(event({ aktiviteter: [ferdig, neste], sisteKjoring: kjoring('ny') }))).toBe(
        '/behandling/123/aktivitet/3',
      )
    })

    it('går til behandlingen når vurderingen er godkjent og maskinen jobber videre', () => {
      expect(
        validering(
          event({
            aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
            aktiviteter: [ferdig],
            sisteKjoring: kjoring('ny'),
          }),
        ),
      ).toBe('/behandling/123')
    })

    it('går til behandlingen når den feiler', () => {
      expect(
        validering(
          event({
            status: BehandlingStatus.FEILENDE,
            aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
            aktiviteter: [aktiv],
            sisteKjoring: kjoring('ny'),
          }),
        ),
      ).toBe('/behandling/123')
    })

    it('revaliderer vanlige innsendinger uten søkeparameter', () => {
      expect(
        nesteSideFraEvent({ ...base, venterPaSvar: true, event: event({ aktiviteter: [ferdig, neste] }) }),
      ).toBeNull()
    })
  })

  describe('observatør: andre endrer behandlingen', () => {
    const observer = (ev: BehandlingDTO, aktivitetId: string | undefined = '2') =>
      nesteSideFraEvent({ ...base, aktivitetId, event: ev })

    it('blir stående når aktiviteten fortsatt er den aktive', () => {
      expect(observer(event({ aktiviteter: [aktiv], sisteKjoring: kjoring('ny') }))).toBeNull()
    })

    it('går til behandlingen når maskinen begynner å jobbe', () => {
      expect(
        observer(event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL, aktiviteter: [aktiv] })),
      ).toBe('/behandling/123')
    })

    it('navigerer til neste aktivitet når en annen aktivitet venter', () => {
      expect(observer(event({ aktiviteter: [ferdig, neste] }))).toBe('/behandling/123/aktivitet/3')
    })

    it.each([AldeBehandlingStatus.AVBRUTT_AV_BRUKER, AldeBehandlingStatus.FULLFORT])(
      'går til behandlingen når status blir %s',
      aldeBehandlingStatus => {
        expect(observer(event({ aldeBehandlingStatus, aktiviteter: [aktiv] }))).toBe('/behandling/123')
      },
    )

    it('går rett til attestering når behandlingen venter på attestering', () => {
      expect(
        observer(event({ aldeBehandlingStatus: AldeBehandlingStatus.VENTER_ATTESTERING, aktiviteter: [ferdig] })),
      ).toBe('/behandling/123/attestering')
    })

    it('blir stående når vi ser på en tidligere aktivitet', () => {
      expect(
        observer(event({ aldeBehandlingStatus: AldeBehandlingStatus.AVBRUTT_AV_BRUKER, aktiviteter: [aktiv] }), '1'),
      ).toBeNull()
    })

    it('revaliderer ventesider uten aktivitet', () => {
      expect(
        nesteSideFraEvent({
          ...base,
          aktivitetId: undefined,
          event: event({ aldeBehandlingStatus: AldeBehandlingStatus.FULLFORT, aktiviteter: [aktiv] }),
        }),
      ).toBeNull()
    })

    it('blir stående når behandlingen feiler på samme aktivitet', () => {
      expect(observer(event({ status: BehandlingStatus.FEILENDE, aktiviteter: [aktiv] }))).toBeNull()
    })
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
