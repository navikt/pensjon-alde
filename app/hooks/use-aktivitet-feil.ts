import { createContext, type RefObject, useContext, useEffect, useMemo, useState } from 'react'
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
type Feltrot = { querySelectorAll(selector: string): ArrayLike<unknown> }

export function lesFeltverdi(navn: string, rot: Feltrot): string {
  const selector = `[name="${navn.replace(/["\\]/g, '\\$&')}"]`
  return Array.from(rot.querySelectorAll(selector) as ArrayLike<Feltelement>)
    .map(({ type, checked, value }) => {
      if (type === 'radio' || type === 'checkbox') return checked ? String(value) : ''
      return value == null ? '' : String(value)
    })
    .join('|')
}

export function feilmeldingerNokkel(
  aktivitetId: number | string | null,
  feilmeldinger: AktivitetFeilmeldingDTO[] | undefined,
) {
  return JSON.stringify([
    String(aktivitetId),
    (feilmeldinger ?? []).map(({ felt, melding, tidspunkt }) => [felt, melding, tidspunkt]),
  ])
}

export function feltnavnFraNokkel(nokkel: string): string[] {
  const [, feilmeldinger] = JSON.parse(nokkel) as [string, [string | null, string, string][]]
  return [...new Set(feilmeldinger.flatMap(([felt]) => (felt ? [felt] : [])))]
}

function useEndredeFelter(nokkel: string, rotRef: RefObject<HTMLElement | null>): ReadonlySet<string> {
  const [endrede, setEndrede] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    setEndrede(forrige => (forrige.size === 0 ? forrige : new Set()))
    const rot = rotRef.current
    const navn = feltnavnFraNokkel(nokkel)
    if (!rot || navn.length === 0) return

    const startverdier = new Map(navn.map(felt => [felt, lesFeltverdi(felt, rot)]))
    let frame = 0
    const sjekk = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const nye = navn.filter(felt => lesFeltverdi(felt, rot) !== startverdier.get(felt))
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
  }, [nokkel, rotRef])

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

export function useAktivitetFeilState(
  aktivitetId: number | string | null,
  feilmeldinger: AktivitetFeilmeldingDTO[] | undefined,
  rotRef: RefObject<HTMLElement | null>,
): AktivitetFeilState {
  const endredeFelter = useEndredeFelter(feilmeldingerNokkel(aktivitetId, feilmeldinger), rotRef)
  return useMemo(() => {
    const gjeldende = gjeldendeFeilmeldinger(feilmeldinger, endredeFelter)
    return { feltfeil: feltfeilFraFeilmeldinger(gjeldende), gjeldendeFeilmeldinger: gjeldende }
  }, [feilmeldinger, endredeFelter])
}

export function useAktivitetFeil<T>(egneFeil?: FormErrors<T>): FormErrors<T> {
  const { feltfeil } = useContext(AktivitetFeilContext)
  return useMemo(() => ({ ...feltfeil, ...egneFeil }) as FormErrors<T>, [feltfeil, egneFeil])
}
