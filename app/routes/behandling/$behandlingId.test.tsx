import { describe, expect, it } from 'vitest'
import type { BehandlingDTO } from '~/types/behandling'
import { AktivitetStatus, AldeBehandlingStatus, BehandlingStatus } from '~/types/behandling'
import { getRedirectPath } from './$behandlingId'

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

describe('getRedirectPath', () => {
  it('returns null when not on exact behandling route', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123/aktivitet/456',
      behandlingId: '123',
      behandling: mockBehandling,
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBeNull()
  })

  it('returns null when on oppsummering route', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123/oppsummering',
      behandlingId: '123',
      behandling: { ...mockBehandling, aldeBehandlingStatus: AldeBehandlingStatus.FULLFORT },
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBeNull()
  })

  it('redirects to oppsummering when FULLFORT on exact route', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: { ...mockBehandling, aldeBehandlingStatus: AldeBehandlingStatus.FULLFORT },
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBe('/behandling/123/oppsummering')
  })

  it('redirects to avbrutt-automatisk when AUTOMATISK_TIL_MANUELL on exact route', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: { ...mockBehandling, aldeBehandlingStatus: AldeBehandlingStatus.AUTOMATISK_TIL_MANUELL },
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBe('/behandling/123/avbrutt-automatisk')
  })

  it('redirects to venter-attestering when same saksbehandler on exact route', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: {
        ...mockBehandling,
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_ATTESTERING,
        sisteSaksbehandlerNavident: 'Z999999',
      },
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBe('/behandling/123/venter-attestering')
  })

  it('does NOT redirect to venter-attestering when different saksbehandler', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: {
        ...mockBehandling,
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_ATTESTERING,
        sisteSaksbehandlerNavident: 'Z888888',
      },
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBeNull()
  })

  it('redirects to aktivitet when aktivitet has handlerName and friendlyName', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: {
        ...mockBehandling,
        aktiviteter: [
          {
            aktivitetId: 456,
            handlerName: 'vurder-samboer',
            friendlyName: 'Vurder samboer',
            status: AktivitetStatus.UNDER_BEHANDLING,
            type: 'AKTIVITET',
            opprettet: '2024-01-01T10:00:00Z',
            antallGangerKjort: 0,
            sisteAktiveringsdato: '2024-01-01T10:00:00Z',
            utsattTil: null,
            behandletFerdigMaskinelt: false,
          },
        ],
      },
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBe('/behandling/123/aktivitet/456')
  })

  it('redirects to attestering when aktivitet handlerName is attestering', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: {
        ...mockBehandling,
        aktiviteter: [
          {
            aktivitetId: 456,
            handlerName: 'attestering',
            friendlyName: 'Attestering',
            status: AktivitetStatus.UNDER_BEHANDLING,
            type: 'AKTIVITET',
            opprettet: '2024-01-01T10:00:00Z',
            antallGangerKjort: 0,
            sisteAktiveringsdato: '2024-01-01T10:00:00Z',
            utsattTil: null,
            behandletFerdigMaskinelt: false,
          },
        ],
      },
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBe('/behandling/123/attestering')
  })

  it('redirects to aktivitet when handlerName is attester and different saksbehandler', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: {
        ...mockBehandling,
        handlerName: 'oppdater-opptjeningsgrunnlag',
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_ATTESTERING,
        sisteSaksbehandlerNavident: 'Z888888',
        aktiviteter: [
          {
            aktivitetId: 456,
            handlerName: 'attester',
            friendlyName: 'Attester',
            status: AktivitetStatus.UNDER_BEHANDLING,
            type: 'AKTIVITET',
            opprettet: '2024-01-01T10:00:00Z',
            antallGangerKjort: 0,
            sisteAktiveringsdato: '2024-01-01T10:00:00Z',
            utsattTil: null,
            behandletFerdigMaskinelt: false,
          },
        ],
      },
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBe('/behandling/123/aktivitet/456')
  })

  it('redirects attester aktivitet to venter-attestering for the submitting saksbehandler', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: {
        ...mockBehandling,
        handlerName: 'oppdater-opptjeningsgrunnlag',
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_ATTESTERING,
        sisteSaksbehandlerNavident: 'Z999999',
        aktiviteter: [
          {
            aktivitetId: 456,
            handlerName: 'attester',
            friendlyName: 'Attester',
            status: AktivitetStatus.UNDER_BEHANDLING,
            type: 'AKTIVITET',
            opprettet: '2024-01-01T10:00:00Z',
            antallGangerKjort: 0,
            sisteAktiveringsdato: '2024-01-01T10:00:00Z',
            utsattTil: null,
            behandletFerdigMaskinelt: false,
          },
        ],
      },
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBe('/behandling/123/venter-attestering')
  })

  it('does NOT redirect when justCompletedId matches aktivitet', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: {
        ...mockBehandling,
        aktiviteter: [
          {
            aktivitetId: 456,
            handlerName: 'vurder-samboer',
            friendlyName: 'Vurder samboer',
            status: AktivitetStatus.UNDER_BEHANDLING,
            type: 'AKTIVITET',
            opprettet: '2024-01-01T10:00:00Z',
            antallGangerKjort: 0,
            sisteAktiveringsdato: '2024-01-01T10:00:00Z',
            utsattTil: null,
            behandletFerdigMaskinelt: false,
          },
        ],
      },
      navident: 'Z999999',
      justCompletedId: '456',
    })

    expect(result).toBeNull()
  })

  it('finds aktivitet with FEILET status', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: {
        ...mockBehandling,
        aktiviteter: [
          {
            aktivitetId: 456,
            handlerName: 'vurder-samboer',
            friendlyName: 'Vurder samboer',
            status: AktivitetStatus.FEILET,
            type: 'AKTIVITET',
            opprettet: '2024-01-01T10:00:00Z',
            antallGangerKjort: 0,
            sisteAktiveringsdato: '2024-01-01T10:00:00Z',
            utsattTil: null,
            behandletFerdigMaskinelt: false,
          },
        ],
      },
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBe('/behandling/123/aktivitet/456')
  })

  it('finds newly created aktivitet with OPPRETTET status', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: {
        ...mockBehandling,
        aktiviteter: [
          {
            aktivitetId: 456,
            handlerName: 'generer-notat',
            friendlyName: 'Genererer Notat',
            status: AktivitetStatus.OPPRETTET,
            type: 'AKTIVITET',
            opprettet: '2024-01-01T10:00:00Z',
            antallGangerKjort: 0,
            sisteAktiveringsdato: '2024-01-01T10:00:00Z',
            utsattTil: null,
            behandletFerdigMaskinelt: false,
          },
        ],
      },
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBe('/behandling/123/aktivitet/456')
  })

  it('skips a machine-handled (behandletFerdigMaskinelt) aktivitet with a handlerName', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: {
        ...mockBehandling,
        aktiviteter: [
          {
            aktivitetId: 456,
            handlerName: 'generer-notat',
            friendlyName: 'Genererer Notat',
            status: AktivitetStatus.OPPRETTET,
            type: 'AKTIVITET',
            opprettet: '2024-01-01T10:00:00Z',
            antallGangerKjort: 0,
            sisteAktiveringsdato: '2024-01-01T10:00:00Z',
            utsattTil: null,
            behandletFerdigMaskinelt: true,
          },
        ],
      },
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBeNull()
  })

  it('redirects to attestering and skips a machine-handled generer-notat still marked OPPRETTET', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: {
        ...mockBehandling,
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_ATTESTERING,
        sisteSaksbehandlerNavident: undefined,
        aktiviteter: [
          {
            aktivitetId: 456,
            handlerName: 'generer-notat',
            friendlyName: 'Genererer Notat',
            status: AktivitetStatus.OPPRETTET,
            type: 'AKTIVITET',
            opprettet: '2024-01-01T10:00:00Z',
            antallGangerKjort: 1,
            sisteAktiveringsdato: '2024-01-01T10:00:00Z',
            utsattTil: null,
            behandletFerdigMaskinelt: true,
          },
          {
            aktivitetId: 789,
            handlerName: 'attestering',
            friendlyName: 'Attestering',
            status: AktivitetStatus.OPPRETTET,
            type: 'AKTIVITET',
            opprettet: '2024-01-01T10:01:00Z',
            antallGangerKjort: 0,
            sisteAktiveringsdato: '2024-01-01T10:01:00Z',
            utsattTil: null,
            behandletFerdigMaskinelt: false,
          },
        ],
      },
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBe('/behandling/123/attestering')
  })

  it('returns null when no aktiviteter need processing', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: {
        ...mockBehandling,
        aktiviteter: [
          {
            aktivitetId: 456,
            handlerName: 'vurder-samboer',
            friendlyName: 'Vurder samboer',
            status: AktivitetStatus.FULLFORT,
            type: 'AKTIVITET',
            opprettet: '2024-01-01T10:00:00Z',
            antallGangerKjort: 0,
            sisteAktiveringsdato: '2024-01-01T10:00:00Z',
            utsattTil: null,
            behandletFerdigMaskinelt: false,
          },
        ],
      },
      navident: 'Z999999',
      justCompletedId: null,
    })

    expect(result).toBeNull()
  })

  it('does not redirect to a handler-less (backend-only) aktivitet', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: {
        ...mockBehandling,
        aktiviteter: [
          {
            aktivitetId: 789,
            handlerName: null,
            friendlyName: 'Fullfør kontroll',
            status: AktivitetStatus.UNDER_BEHANDLING,
            type: 'AKTIVITET',
            opprettet: '2024-01-01T10:00:00Z',
            antallGangerKjort: 0,
            sisteAktiveringsdato: '2024-01-01T10:00:00Z',
            utsattTil: null,
            behandletFerdigMaskinelt: true,
          },
        ] as unknown as BehandlingDTO['aktiviteter'],
      },
      navident: 'Z999999',
      justCompletedId: '456',
    })

    expect(result).toBeNull()
  })

  it('does not redirect to a handler aktivitet while machine is still working (VENTER_MASKINELL)', () => {
    const result = getRedirectPath({
      pathname: '/behandling/123',
      behandlingId: '123',
      behandling: {
        ...mockBehandling,
        aldeBehandlingStatus: AldeBehandlingStatus.VENTER_MASKINELL,
        aktiviteter: [
          {
            aktivitetId: 456,
            handlerName: 'generer-notat',
            friendlyName: 'Genererer Notat',
            status: AktivitetStatus.UNDER_BEHANDLING,
            type: 'AKTIVITET',
            opprettet: '2024-01-01T10:00:00Z',
            antallGangerKjort: 1,
            sisteAktiveringsdato: '2024-01-01T10:00:00Z',
            utsattTil: null,
            behandletFerdigMaskinelt: true,
          },
        ],
      },
      navident: 'Z999999',
      justCompletedId: '999',
    })

    expect(result).toBeNull()
  })
})
