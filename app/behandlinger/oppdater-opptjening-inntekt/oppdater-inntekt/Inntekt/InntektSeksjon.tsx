import { VStack } from '@navikt/ds-react'
import { useMemo, useState } from 'react'
import { InntektTabell } from './InntektTabell'
import type { InntektFeil, InntektFeilFelt, InntektFelt, InntektKategori } from './inntekt.types'
import {
  erRedigerbar,
  INNTEKT_KATEGORIER,
  type InntektLinjeState,
  type InntektstyperPerKategori,
  sorterInntektLinjer,
} from './inntekt.utils'

interface InntektSeksjonProps {
  linjer: InntektLinjeState[]
  typer: InntektstyperPerKategori
  feil: Record<string, InntektFeil>
  readOnly: boolean
  visAlleFeil: boolean
  onLeggTil: (kategori: InntektKategori) => void
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
  onTilbakestill: (id: string) => void
  onOppdater: (id: string, felt: InntektFelt, verdi: string) => void
}

export function InntektSeksjon({
  linjer,
  typer,
  feil,
  readOnly,
  visAlleFeil,
  onLeggTil,
  onSlett,
  onGjenopprett,
  onTilbakestill,
  onOppdater,
}: InntektSeksjonProps) {
  const [redigerer, setRedigerer] = useState<Set<string>>(() => new Set())
  const [berort, setBerort] = useState<Set<string>>(() => new Set())
  const sortert = useMemo(() => sorterInntektLinjer(linjer), [linjer])
  const visEndring = !readOnly || linjer.some(linje => linje._status !== 'original')

  const erIRedigering = (linje: InntektLinjeState) =>
    linje._status === 'new' || redigerer.has(linje._id) || !!feil[linje._id]

  const visFeil = (id: string, felt: InntektFeilFelt) =>
    visAlleFeil || berort.has(`${id}|*`) || berort.has(`${id}|${felt}`)

  const onBerort = (id: string, felter: string[]) =>
    setBerort(forrige => {
      if (felter.every(felt => forrige.has(`${id}|${felt}`))) return forrige
      return new Set([...forrige, ...felter.map(felt => `${id}|${felt}`)])
    })

  const onRediger = (id: string, rediger: boolean) => {
    if (!rediger && feil[id]) {
      onBerort(id, ['*'])
      return
    }
    setRedigerer(forrige => {
      const neste = new Set(forrige)
      if (rediger) neste.add(id)
      else neste.delete(id)
      return neste
    })
  }

  return (
    <VStack gap="space-32">
      {INNTEKT_KATEGORIER.map(({ kategori, tittel }) => (
        <InntektTabell
          key={kategori}
          kategori={kategori}
          tittel={tittel}
          linjer={sortert.filter(linje => linje.kategori === kategori)}
          typer={typer[kategori]}
          feil={feil}
          redigerbar={!readOnly && erRedigerbar(kategori)}
          visEndring={visEndring && erRedigerbar(kategori)}
          erIRedigering={erIRedigering}
          visFeil={visFeil}
          onBerort={onBerort}
          onRediger={onRediger}
          onLeggTil={onLeggTil}
          onSlett={onSlett}
          onGjenopprett={onGjenopprett}
          onTilbakestill={onTilbakestill}
          onOppdater={onOppdater}
        />
      ))}
    </VStack>
  )
}
