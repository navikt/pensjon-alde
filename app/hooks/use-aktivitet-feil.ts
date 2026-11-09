import { createContext, type RefObject, useContext, useEffect, useMemo, useState } from 'react'
import type { FormErrors } from '~/types/aktivitet-component'
import type { Valideringsfeil } from '~/types/vurdering'

const ENDRINGSHENDELSER = ['input', 'change', 'click', 'keyup', 'focusout'] as const

export function feltfeilFraFeilmeldinger(feilmeldinger: Valideringsfeil[] | undefined): Record<string, string> {
  const feltfeil: Record<string, string> = {}
  for (const { felt, melding } of feilmeldinger ?? []) {
    if (felt && !feltfeil[felt]) feltfeil[felt] = melding
  }
  return feltfeil
}

type Feltelement = { type?: string; checked?: boolean; value?: unknown }
type Feltrot = { querySelectorAll(selector: string): ArrayLike<unknown> }
type Lenkemaal = {
  id: string
  name?: string
  disabled?: boolean
  tabIndex: number
  getClientRects(): ArrayLike<unknown>
}

export function lesFeltverdi(navn: string, rot: Feltrot): string {
  const selector = `[name="${navn.replace(/["\\]/g, '\\$&')}"]`
  return Array.from(rot.querySelectorAll(selector) as ArrayLike<Feltelement>)
    .map(({ type, checked, value }) => {
      if (type === 'radio' || type === 'checkbox') return checked ? String(value) : ''
      return value == null ? '' : String(value)
    })
    .join('|')
}

export function finnFeltId(felt: string, rot: Feltrot): string | undefined {
  const elementer = Array.from(rot.querySelectorAll('[name], [id]') as ArrayLike<Lenkemaal>)
  return elementer.find(
    element =>
      (element.name === felt || element.id === felt) &&
      element.id !== '' &&
      !element.disabled &&
      element.tabIndex >= 0 &&
      element.getClientRects().length > 0,
  )?.id
}

/** Endres ved hver ny vurdering, også når valideringen gir de samme feilene som sist. */
export function feilmeldingerNokkel(
  aktivitetId: number | string | null,
  vurdertTidspunkt: string | null | undefined,
  feilmeldinger: Valideringsfeil[] | null | undefined,
) {
  return JSON.stringify([
    String(aktivitetId),
    vurdertTidspunkt ?? null,
    (feilmeldinger ?? []).map(({ felt, melding }) => [felt, melding]),
  ])
}

export function feltnavnFraNokkel(nokkel: string): string[] {
  const [, , feilmeldinger] = JSON.parse(nokkel) as [string, string | null, [string | null, string][]]
  return [...new Set(feilmeldinger.flatMap(([felt]) => (felt ? [felt] : [])))]
}

export type Feltstatus = { endrede: string[]; feltIder: Record<string, string | undefined> }

const TOM_FELTSTATUS: Feltstatus = { endrede: [], feltIder: {} }

function useFeltstatus(nokkel: string, rotRef: RefObject<HTMLElement | null>): Feltstatus {
  const [status, setStatus] = useState(TOM_FELTSTATUS)

  useEffect(() => {
    const rot = rotRef.current
    const navn = feltnavnFraNokkel(nokkel)
    if (!rot || navn.length === 0) {
      setStatus(TOM_FELTSTATUS)
      return
    }

    const startverdier = new Map(navn.map(felt => [felt, lesFeltverdi(felt, rot)]))
    const oppdater = () => {
      const ny: Feltstatus = {
        endrede: navn.filter(felt => lesFeltverdi(felt, rot) !== startverdier.get(felt)),
        feltIder: Object.fromEntries(navn.map(felt => [felt, finnFeltId(felt, rot)])),
      }
      setStatus(forrige => (JSON.stringify(forrige) === JSON.stringify(ny) ? forrige : ny))
    }
    oppdater()

    let frame = 0
    const sjekk = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(oppdater)
    }

    for (const hendelse of ENDRINGSHENDELSER) document.addEventListener(hendelse, sjekk, true)
    return () => {
      cancelAnimationFrame(frame)
      for (const hendelse of ENDRINGSHENDELSER) document.removeEventListener(hendelse, sjekk, true)
    }
  }, [nokkel, rotRef])

  return status
}

export type GjeldendeFeilmelding = Valideringsfeil & { feltId?: string }

type AktivitetFeilState = {
  feltfeil: Record<string, string>
  gjeldendeFeilmeldinger: GjeldendeFeilmelding[]
}

const AktivitetFeilContext = createContext<AktivitetFeilState>({ feltfeil: {}, gjeldendeFeilmeldinger: [] })

export const AktivitetFeilProvider = AktivitetFeilContext.Provider

export function gjeldendeFeilmeldinger(
  feilmeldinger: Valideringsfeil[] | null | undefined,
  { endrede, feltIder }: Feltstatus,
): GjeldendeFeilmelding[] {
  return (feilmeldinger ?? [])
    .filter(({ felt }) => !felt || !endrede.includes(felt))
    .map(feil => ({ ...feil, feltId: feil.felt ? feltIder[feil.felt] : undefined }))
}

export function useAktivitetFeilState(
  aktivitetId: number | string | null,
  feilmeldinger: Valideringsfeil[] | null | undefined,
  vurdertTidspunkt: string | null | undefined,
  rotRef: RefObject<HTMLElement | null>,
): AktivitetFeilState {
  const feltstatus = useFeltstatus(feilmeldingerNokkel(aktivitetId, vurdertTidspunkt, feilmeldinger), rotRef)
  return useMemo(() => {
    const gjeldende = gjeldendeFeilmeldinger(feilmeldinger, feltstatus)
    return { feltfeil: feltfeilFraFeilmeldinger(gjeldende), gjeldendeFeilmeldinger: gjeldende }
  }, [feilmeldinger, feltstatus])
}

export function useAktivitetFeil<T>(egneFeil?: FormErrors<T>): FormErrors<T> {
  const { feltfeil } = useContext(AktivitetFeilContext)
  return useMemo(() => ({ ...feltfeil, ...egneFeil }) as FormErrors<T>, [feltfeil, egneFeil])
}
