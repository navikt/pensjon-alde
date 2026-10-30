import { describe, expect, it } from 'vitest'
import { landnavn } from '.'

describe('landnavn', () => {
  it('slår opp landnavn', () => {
    expect(landnavn('SWE')).toBe('Sverige')
    expect(landnavn('NOR')).toBe('Norge')
  })

  it('håndterer versjonerte koder', () => {
    expect(landnavn('ATF_V1')).toBe('Franske Antiller')
  })

  it('returnerer koden for ukjente koder og null når kode mangler', () => {
    expect(landnavn('ABC')).toBe('ABC')
    expect(landnavn(null)).toBeNull()
  })
})
