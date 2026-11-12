import { describe, expect, it } from 'vitest'
import { parseBehandlingEvent } from './parse-behandling-event'

describe('parseBehandlingEvent', () => {
  it('returnerer behandlingen for gyldig melding', () => {
    expect(parseBehandlingEvent(JSON.stringify({ behandlingId: 1, aktiviteter: [] }))).toEqual({
      behandlingId: 1,
      aktiviteter: [],
    })
  })

  it.each([
    ['ugyldig JSON', '{'],
    ['null', 'null'],
    ['manglende behandlingId', JSON.stringify({ aktiviteter: [] })],
    ['behandlingId som tekst', JSON.stringify({ behandlingId: '1', aktiviteter: [] })],
    ['manglende aktiviteter', JSON.stringify({ behandlingId: 1 })],
  ])('avviser %s', (_beskrivelse, data) => {
    expect(parseBehandlingEvent(data)).toBeUndefined()
  })

  it('avviser data som ikke er tekst', () => {
    expect(parseBehandlingEvent(undefined)).toBeUndefined()
  })
})
