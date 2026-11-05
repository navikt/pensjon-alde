import type { OpptjeningChangeStamp, Pensjonspoeng } from './types'

const INNTEKT_TYPE = 'PPI'

export interface PensjonspoengRad {
  ar: number
  pensjonsgivendeInntekt: number | null
  pensjonspoeng: number | null
  omsorgspoeng: number | null
  sisteRegistrertDato: string | null // yyyy-MM-dd
}

function sisteDato(...datoer: (string | null | undefined)[]): string | null {
  // ISO-datoer (yyyy-MM-dd) kan sammenlignes leksikografisk
  return datoer.reduce<string | null>((siste, dato) => (dato && (!siste || dato > siste) ? dato : siste), null)
}

function datoerFra(changeStamp: OpptjeningChangeStamp | null | undefined): (string | null)[] {
  return changeStamp ? [changeStamp.createdDate, changeStamp.updatedDate] : []
}

function maks(a: number | null, b: number | null | undefined): number | null {
  if (b == null) return a
  return a == null ? b : Math.max(a, b)
}

/**
 * Slår sammen pensjonspoeng til én rad per år.
 * - `PPI` gir pensjonspoeng og pensjonsgivende inntekt
 * - øvrige typer (OBU6, OBU7, OBO6H, OBO7H, OSFE) gir omsorgspoeng
 */
export function tilPensjonspoengRader(pensjonspoeng: Pensjonspoeng[]): PensjonspoengRad[] {
  const rader = new Map<number, PensjonspoengRad>()

  for (const poeng of pensjonspoeng) {
    const ar = poeng.ar ?? poeng.inntekt?.inntektAr ?? poeng.omsorg?.ar
    if (ar == null) continue

    const rad = rader.get(ar) ?? {
      ar,
      pensjonsgivendeInntekt: null,
      pensjonspoeng: null,
      omsorgspoeng: null,
      sisteRegistrertDato: null,
    }

    if (poeng.pensjonspoengType === INNTEKT_TYPE) {
      rad.pensjonspoeng = maks(rad.pensjonspoeng, poeng.poeng)
      rad.pensjonsgivendeInntekt = maks(rad.pensjonsgivendeInntekt, poeng.inntekt?.belop)
    } else {
      rad.omsorgspoeng = maks(rad.omsorgspoeng, poeng.poeng)
    }

    rad.sisteRegistrertDato = sisteDato(
      rad.sisteRegistrertDato,
      ...datoerFra(poeng.changeStamp),
      ...datoerFra(poeng.inntekt?.changeStamp),
      ...datoerFra(poeng.omsorg?.changeStamp),
    )

    rader.set(ar, rad)
  }

  return Array.from(rader.values())
}
