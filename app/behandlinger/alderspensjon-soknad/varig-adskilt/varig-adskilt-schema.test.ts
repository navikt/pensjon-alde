import { getZodConstraint } from '@conform-to/zod/v4'
import { describe, expect, it } from 'vitest'
import { erPartner, varigAdskiltVurderingSchema } from './varig-adskilt-schema'

const gyldig = {
  ektefellePartnerFnr: '12345678901',
  vurdertSivilstand: 'LEVER_ADSKILT',
  fom: '01.06.2024',
}

describe('varigAdskiltVurderingSchema', () => {
  it('konverterer datoer til ISO og setter tom til null når den mangler', () => {
    const resultat = varigAdskiltVurderingSchema.parse(gyldig)

    expect(resultat).toEqual({
      ektefellePartnerFnr: '12345678901',
      vurdertSivilstand: 'LEVER_ADSKILT',
      fom: '2024-06-01',
      tom: null,
    })
  })

  it('godtar tom etter fom', () => {
    const resultat = varigAdskiltVurderingSchema.parse({ ...gyldig, tom: '31.12.2024' })

    expect(resultat.tom).toBe('2024-12-31')
  })

  it('avviser tom før fom', () => {
    const resultat = varigAdskiltVurderingSchema.safeParse({ ...gyldig, tom: '01.01.2024' })

    expect(resultat.success).toBe(false)
    expect(resultat.error?.issues[0]?.path).toEqual(['tom'])
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
