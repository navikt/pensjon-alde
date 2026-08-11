import { describe, expect, it } from 'vitest'
import { parseDate } from './parseDate'

describe('parseDate', () => {
  it('returnerer null for tomme verdier', () => {
    expect(parseDate(null)).toBeNull()
    expect(parseDate(undefined)).toBeNull()
    expect(parseDate('')).toBeNull()
  })

  it('parser ISO-datostreng', () => {
    const result = parseDate('2026-07-14')
    expect(result).toBeInstanceOf(Date)
    expect(result?.getFullYear()).toBe(2026)
  })

  it('parser ISO-dato-tid-streng', () => {
    const result = parseDate('2026-07-14T10:30:00Z')
    expect(result?.toISOString()).toBe('2026-07-14T10:30:00.000Z')
  })

  it('parser timestamp gitt som streng', () => {
    const ts = Date.UTC(2026, 6, 14)
    expect(parseDate(String(ts))?.getTime()).toBe(ts)
  })

  it('parser timestamp gitt som tall', () => {
    const ts = Date.UTC(2026, 6, 14)
    expect(parseDate(ts)?.getTime()).toBe(ts)
  })

  it('parser epoch (0) som gyldig timestamp, ikke som tom verdi', () => {
    expect(parseDate(0)?.getTime()).toBe(0)
    expect(parseDate('0')?.getTime()).toBe(0)
  })

  it('returnerer null for whitespace-streng i stedet for å tolke den som epoch (0)', () => {
    expect(parseDate('   ')).toBeNull()
    expect(parseDate('\t\n')).toBeNull()
  })

  it('parser en gyldig ISO-streng med omkringliggende whitespace', () => {
    const ts = Date.UTC(2026, 6, 14)
    expect(parseDate('  2026-07-14T00:00:00.000Z  ')?.getTime()).toBe(ts)
  })

  it('returnerer det samme Date-objektet for en gyldig Date', () => {
    const date = new Date('2026-07-14T00:00:00Z')
    expect(parseDate(date)).toBe(date)
  })

  it('returnerer null for ugyldig datostreng', () => {
    expect(parseDate('ikke-en-dato')).toBeNull()
  })

  it('returnerer null for ugyldig Date', () => {
    expect(parseDate(new Date('invalid'))).toBeNull()
  })
})
