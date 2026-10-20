import { describe, expect, it } from 'vitest'
import { parseBehandlingEvent } from './parse-behandling-event'

const gyldig = { behandlingId: 123, totaltAntallGangerKjort: 2, aktiviteter: [] }
const json = (value: unknown) => JSON.stringify(value)

describe('parseBehandlingEvent', () => {
  it('returnerer meldingen når den er gyldig', () => {
    expect(parseBehandlingEvent(json(gyldig))).toEqual(gyldig)
  })

  it('godtar totaltAntallGangerKjort = 0', () => {
    expect(parseBehandlingEvent(json({ ...gyldig, totaltAntallGangerKjort: 0 }))).toBeDefined()
  })

  it.each([
    ['ikke en streng', 42],
    ['ugyldig JSON', '{ikke json'],
    ['null', 'null'],
    ['mangler behandlingId', json({ ...gyldig, behandlingId: undefined })],
    ['behandlingId er en streng', json({ ...gyldig, behandlingId: '123' })],
    ['mangler totaltAntallGangerKjort', json({ ...gyldig, totaltAntallGangerKjort: undefined })],
    ['totaltAntallGangerKjort er null', json({ ...gyldig, totaltAntallGangerKjort: null })],
    ['totaltAntallGangerKjort er desimaltall', json({ ...gyldig, totaltAntallGangerKjort: 1.5 })],
    ['mangler aktiviteter', json({ ...gyldig, aktiviteter: undefined })],
  ])('returnerer undefined når %s', (_, data) => {
    expect(parseBehandlingEvent(data)).toBeUndefined()
  })
})
