import { formatISO, isAfter, isValid, parse, startOfDay } from 'date-fns'
import { z } from 'zod'

export const DATO_FORMAT = 'dd.MM.yyyy'

const DATO_PAKREVD = 'Du må skrive en dato, f.eks. på denne måten: ddmmåååå'
const DATO_FREM_I_TID = 'Dato kan ikke være etter dagens dato'

export const samboerVurderingSchema = z.object({
  vurdering: z.enum(['SAMBOER_3_2', 'SAMBOER_1_5', 'IKKE_SAMBOER'], {
    error: 'Du må velge et alternativ',
  }),
  samboerFra: z.string({ error: DATO_PAKREVD }).transform((value, ctx) => {
    const dato = parse(value, DATO_FORMAT, new Date())

    if (!isValid(dato)) {
      ctx.addIssue({ code: 'custom', message: DATO_PAKREVD })
      return z.NEVER
    }

    if (isAfter(startOfDay(dato), startOfDay(new Date()))) {
      ctx.addIssue({ code: 'custom', message: DATO_FREM_I_TID })
      return z.NEVER
    }

    return formatISO(dato, { representation: 'date' })
  }),
  begrunnelse: z.string().trim().optional(),
})

export type SamboerVurderingInput = z.input<typeof samboerVurderingSchema>
