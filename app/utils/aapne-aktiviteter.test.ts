import { describe, expect, it } from 'vitest'
import { type AktivitetDTO, AktivitetStatus } from '~/types/behandling'
import { erAapenAktivitet, finnAapneAktiviteterForSaksbehandler } from './aapne-aktiviteter'

function lagAktivitet(overrides: Partial<AktivitetDTO>): AktivitetDTO {
  return {
    aktivitetId: 1,
    type: 'AKTIVITET',
    opprettet: '2024-01-01T10:00:00Z',
    handlerName: 'vurder-samboer',
    friendlyName: 'Vurder samboer',
    antallGangerKjort: 0,
    sisteAktiveringsdato: '2024-01-01T10:00:00Z',
    status: AktivitetStatus.UNDER_BEHANDLING,
    utsattTil: null,
    behandletFerdigMaskinelt: false,
    ...overrides,
  }
}

describe('erAapenAktivitet', () => {
  it.each([AktivitetStatus.OPPRETTET, AktivitetStatus.UNDER_BEHANDLING, AktivitetStatus.FEILET])(
    'er åpen når status er %s',
    status => {
      expect(erAapenAktivitet(lagAktivitet({ status }))).toBe(true)
    },
  )

  it('er ikke åpen når aktiviteten er fullført', () => {
    expect(erAapenAktivitet(lagAktivitet({ status: AktivitetStatus.FULLFORT }))).toBe(false)
  })

  it('er ikke åpen når aktiviteten er behandlet maskinelt', () => {
    expect(erAapenAktivitet(lagAktivitet({ behandletFerdigMaskinelt: true }))).toBe(false)
  })

  it('er ikke åpen når aktiviteten mangler handlerName', () => {
    expect(erAapenAktivitet(lagAktivitet({ handlerName: null as unknown as string }))).toBe(false)
  })
})

describe('finnAapneAktiviteterForSaksbehandler', () => {
  it('returnerer åpne aktiviteter med friendlyName sortert på opprettet, uten attestering', () => {
    const aktiviteter = [
      lagAktivitet({ aktivitetId: 3, opprettet: '2024-01-03T10:00:00Z' }),
      lagAktivitet({ aktivitetId: 1, opprettet: '2024-01-01T10:00:00Z' }),
      lagAktivitet({ aktivitetId: 2, status: AktivitetStatus.FULLFORT }),
      lagAktivitet({ aktivitetId: 4, friendlyName: '' }),
      lagAktivitet({ aktivitetId: 5, handlerName: 'attestering' }),
    ]

    expect(finnAapneAktiviteterForSaksbehandler(aktiviteter).map(it => it.aktivitetId)).toEqual([1, 3])
  })
})
