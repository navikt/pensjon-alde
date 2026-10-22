import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { FormErrors } from '~/types/aktivitet-component'
import type { AktivitetFeilmeldingDTO } from '~/types/behandling'

const ENDRINGSHENDELSER = ['input', 'change', 'click', 'keyup', 'focusout'] as const

export function feltfeilFraFeilmeldinger(feilmeldinger: AktivitetFeilmeldingDTO[] | undefined): Record<string, string> {
  const feltfeil: Record<string, string> = {}
  for (const { felt, melding } of feilmeldinger ?? []) {
    if (felt && !feltfeil[felt]) feltfeil[felt] = melding
  }
  return feltfeil
}

type Feltelement = { type?: string; checked?: boolean; value?: unknown }

export function lesFeltverdi(navn: string, dokument: Pick<Document, 'getElementsByName'> = document): string {
  return Array.from(dokument.getElementsByName(navn) as ArrayLike<Feltelement>)
    .map(({ type, checked, value }) => {
      if (type === 'radio' || type === 'checkbox') return checked ? String(value) : ''
      return value == null ? '' : String(value)
    })
    .join('|')
}

function useEndredeFelter(feilmeldinger: AktivitetFeilmeldingDTO[] | undefined): ReadonlySet<string> {
  const [endrede, setEndrede] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    setEndrede(forrige => (forrige.size === 0 ? forrige : new Set()))
    const navn = Object.keys(feltfeilFraFeilmeldinger(feilmeldinger))
    if (navn.length === 0) return

    const startverdier = new Map(navn.map(felt => [felt, lesFeltverdi(felt)]))
    let frame = 0
    const sjekk = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const nye = navn.filter(felt => lesFeltverdi(felt) !== startverdier.get(felt))
        setEndrede(forrige =>
          forrige.size === nye.length && nye.every(felt => forrige.has(felt)) ? forrige : new Set(nye),
        )
      })
    }

    for (const hendelse of ENDRINGSHENDELSER) document.addEventListener(hendelse, sjekk, true)
    return () => {
      cancelAnimationFrame(frame)
      for (const hendelse of ENDRINGSHENDELSER) document.removeEventListener(hendelse, sjekk, true)
    }
  }, [feilmeldinger])

  return endrede
}

type AktivitetFeilState = {
  feltfeil: Record<string, string>
  gjeldendeFeilmeldinger: AktivitetFeilmeldingDTO[]
}

const AktivitetFeilContext = createContext<AktivitetFeilState>({ feltfeil: {}, gjeldendeFeilmeldinger: [] })

export const AktivitetFeilProvider = AktivitetFeilContext.Provider

export function gjeldendeFeilmeldinger(
  feilmeldinger: AktivitetFeilmeldingDTO[] | undefined,
  endredeFelter: ReadonlySet<string>,
): AktivitetFeilmeldingDTO[] {
  return (feilmeldinger ?? []).filter(({ felt }) => !felt || !endredeFelter.has(felt))
}

export function useAktivitetFeilState(feilmeldinger: AktivitetFeilmeldingDTO[] | undefined): AktivitetFeilState {
  const endredeFelter = useEndredeFelter(feilmeldinger)
  return useMemo(() => {
    const gjeldende = gjeldendeFeilmeldinger(feilmeldinger, endredeFelter)
    return { feltfeil: feltfeilFraFeilmeldinger(gjeldende), gjeldendeFeilmeldinger: gjeldende }
  }, [feilmeldinger, endredeFelter])
}

export function useAktivitetFeil<T>(egneFeil?: FormErrors<T>): FormErrors<T> {
  const { feltfeil } = useContext(AktivitetFeilContext)
  return useMemo(() => ({ ...feltfeil, ...egneFeil }) as FormErrors<T>, [feltfeil, egneFeil])
}
