import { getZodConstraint } from '@conform-to/zod/v4'
import { describe, expect, it } from 'vitest'
import { erPartner, varigAdskiltVurderingSchema } from './varig-adskilt-schema'

const gyldig = {
  vurdertSivilstand: 'LEVER_ADSKILT',
  fom: '01.06.2024',
}

describe('varigAdskiltVurderingSchema', () => {
  it('konverterer fom til ISO', () => {
    const resultat = varigAdskiltVurderingSchema.parse(gyldig)

    expect(resultat).toEqual({
      vurdertSivilstand: 'LEVER_ADSKILT',
      fom: '2024-06-01',
    })
  })

  it('avviser ugyldig fom', () => {
    const resultat = varigAdskiltVurderingSchema.safeParse({ ...gyldig, fom: '32.13.2024' })

    expect(resultat.success).toBe(false)
  })

  it('krever valgt sivilstand', () => {
    const { vurdertSivilstand: _, ...utenSivilstand } = gyldig
    const resultat = varigAdskiltVurderingSchema.safeParse(utenSivilstand)

    expect(resultat.success).toBe(false)
  })
})

describe('erPartner', () => {
  it('gjenkjenner partner-sivilstander', () => {
    expect(erPartner('REPA')).toBe(true)
    expect(erPartner('SEPA')).toBe(true)
    expect(erPartner('GIFT')).toBe(false)
    expect(erPartner(null)).toBe(false)
  })
})

describe('getZodConstraint', () => {
  it('støtter skjemaet', () => {
    expect(() => getZodConstraint(varigAdskiltVurderingSchema)).not.toThrow()
  })
})
