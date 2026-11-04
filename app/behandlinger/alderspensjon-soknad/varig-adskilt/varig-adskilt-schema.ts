import { formatISO, isValid, parse } from 'date-fns'
import { z } from 'zod'
import type { SivilstandType } from './types'

export const DATO_FORMAT = 'dd.MM.yyyy'

const DATO_PAKREVD = 'Du må skrive en dato, f.eks. på denne måten: ddmmåååå'
const DATO_UGYLDIG = 'Ugyldig dato, skriv f.eks. på denne måten: ddmmåååå'
const TOM_FOR_FOM = 'Til og med kan ikke være før fra og med'

const tilIsoDato = (value: string) => {
  const dato = parse(value, DATO_FORMAT, new Date())
  return isValid(dato) ? formatISO(dato, { representation: 'date' }) : null
}

export const varigAdskiltVurderingSchema = z
  .object({
    ektefellePartnerFnr: z.string({ error: 'Fødselsnummer for ektefelle/partner mangler' }),
    vurdertSivilstand: z.enum(['LEVER_ADSKILT', 'LEVER_SAMMEN'], {
      error: 'Du må velge et alternativ',
    }),
    fom: z.string({ error: DATO_PAKREVD }).transform((value, ctx) => {
      const dato = tilIsoDato(value)
      if (!dato) {
        ctx.addIssue({ code: 'custom', message: DATO_PAKREVD })
        return z.NEVER
      }
      return dato
    }),
    tom: z
      .string()
      .optional()
      .transform((value, ctx) => {
        if (!value) return null
        const dato = tilIsoDato(value)
        if (!dato) {
          ctx.addIssue({ code: 'custom', message: DATO_UGYLDIG })
          return z.NEVER
        }
        return dato
      }),
    begrunnelse: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.tom && value.tom < value.fom) {
      ctx.addIssue({ code: 'custom', path: ['tom'], message: TOM_FOR_FOM })
    }
  })

export type VarigAdskiltVurderingInput = z.input<typeof varigAdskiltVurderingSchema>
export type VarigAdskiltVurderingOutput = z.output<typeof varigAdskiltVurderingSchema>

const PARTNER_SIVILSTANDER: SivilstandType[] = ['REPA', 'SEPA', 'SKPA', 'GJPA']

export const erPartner = (sivilstand: SivilstandType | null | undefined) =>
  !!sivilstand && PARTNER_SIVILSTANDER.includes(sivilstand)
