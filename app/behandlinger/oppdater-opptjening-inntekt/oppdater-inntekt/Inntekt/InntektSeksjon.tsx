import { PlusIcon } from '@navikt/aksel-icons'
import { Accordion, BodyShort, Box, Button, Heading, HStack, Tag, TextField, VStack } from '@navikt/ds-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { InntektTabell } from './InntektTabell'
import type { InntektFeil, InntektFeilFelt, InntektFelt, InntektKategori } from './inntekt.types'
import {
  erGyldigInntektAr,
  erRedigerbar,
  grupperInntektLinjerPerAr,
  INNTEKT_KATEGORIER,
  type InntektLinjeState,
  type InntektstyperPerKategori,
  inntektFeltId,
  inntektLinjeBeskrivelse,
} from './inntekt.utils'

interface InntektSeksjonProps {
  linjer: InntektLinjeState[]
  typer: InntektstyperPerKategori
  feil: Record<string, InntektFeil>
  readOnly: boolean
  innsendingsforsok: number
  onLeggTil: (kategori: InntektKategori, inntektAr: string) => void
  onSlett: (id: string) => void
  onGjenopprett: (id: string) => void
  onTilbakestill: (id: string) => void
  onOppdater: (id: string, felt: InntektFelt, verdi: string) => void
}

const harEndring = (linjer: InntektLinjeState[]) => linjer.some(linje => linje._status !== 'original')

export function InntektSeksjon({
  linjer,
  typer,
  feil,
  readOnly,
  innsendingsforsok,
  onLeggTil,
  onSlett,
  onGjenopprett,
  onTilbakestill,
  onOppdater,
}: InntektSeksjonProps) {
  const [redigerer, setRedigerer] = useState<Set<string>>(() => new Set())
  const [berort, setBerort] = useState<Set<string>>(() => new Set())
  const [ekstraAr, setEkstraAr] = useState<string[]>([])
  const [nyttAr, setNyttAr] = useState('')
  const [nyttArFeil, setNyttArFeil] = useState<string>()
  const [fokusAr, setFokusAr] = useState<string | null>(null)
  const idPrefix = useId()
  const nyttArHeadingId = `${idPrefix}-nytt-ar`
  const headerId = (inntektAr: string) => `${idPrefix}-ar-${inntektAr}`
  const visAlleFeil = innsendingsforsok > 0
  const visEndring = !readOnly || harEndring(linjer)

  const grupper = useMemo(() => grupperInntektLinjerPerAr(linjer, ekstraAr), [linjer, ekstraAr])
  const arGrupper = grupper.flatMap(({ inntektAr, linjer: linjerForAr }) =>
    inntektAr === null ? [] : [{ inntektAr, linjer: linjerForAr }],
  )
  const linjerUtenAr = grupper.find(({ inntektAr }) => inntektAr === null)?.linjer ?? []
  const arMedFeil = arGrupper
    .filter(({ linjer: linjerForAr }) => linjerForAr.some(linje => feil[linje._id]))
    .map(({ inntektAr }) => inntektAr)

  const [aapneAr, setAapneAr] = useState<Set<string>>(
    () =>
      new Set(
        grupperInntektLinjerPerAr(linjer)
          .filter(({ inntektAr, linjer: linjerForAr }) => inntektAr !== null && harEndring(linjerForAr))
          .map(({ inntektAr }) => inntektAr as string),
      ),
  )
  const [handtertForsok, setHandtertForsok] = useState(innsendingsforsok)
  if (handtertForsok !== innsendingsforsok) {
    setHandtertForsok(innsendingsforsok)
    if (arMedFeil.length > 0) setAapneAr(forrige => new Set([...forrige, ...arMedFeil]))
  }

  const alleAapne = arGrupper.length > 0 && arGrupper.every(({ inntektAr }) => aapneAr.has(inntektAr))

  const settApen = (inntektAr: string, apen: boolean) =>
    setAapneAr(forrige => {
      const neste = new Set(forrige)
      if (apen) neste.add(inntektAr)
      else neste.delete(inntektAr)
      return neste
    })

  useEffect(() => {
    if (!fokusAr) return
    const header = document.getElementById(headerId(fokusAr))
    header?.scrollIntoView({ block: 'center' })
    header?.focus()
    setFokusAr(null)
  })

  const kjenteLinjer = useRef(new Set(linjer.map(linje => linje._id)))
  useEffect(() => {
    const nyLinje = linjer.find(linje => linje._status === 'new' && !kjenteLinjer.current.has(linje._id))
    kjenteLinjer.current = new Set(linjer.map(linje => linje._id))
    if (nyLinje) document.getElementById(inntektFeltId(nyLinje._id, 'inntektAr'))?.focus()
  }, [linjer])

  const leggTilAr = () => {
    const inntektAr = nyttAr.trim()
    if (!erGyldigInntektAr(inntektAr)) {
      setNyttArFeil('År må ha fire siffer')
      return
    }
    setNyttArFeil(undefined)
    setNyttAr('')
    if (!arGrupper.some(gruppe => gruppe.inntektAr === inntektAr)) setEkstraAr(forrige => [...forrige, inntektAr])
    settApen(inntektAr, true)
    setFokusAr(inntektAr)
  }

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

  const tabeller = (linjerForAr: InntektLinjeState[], headingLevel: '3' | '4', kontekst: string) =>
    INNTEKT_KATEGORIER.filter(({ kategori }) => linjerForAr.some(linje => linje.kategori === kategori)).map(
      ({ kategori, tittel }) => (
        <InntektTabell
          key={kategori}
          kategori={kategori}
          tittel={tittel}
          kontekst={kontekst}
          headingLevel={headingLevel}
          linjer={linjerForAr.filter(linje => linje.kategori === kategori)}
          typer={typer[kategori]}
          feil={feil}
          redigerbar={!readOnly && erRedigerbar(kategori)}
          visEndring={visEndring && erRedigerbar(kategori)}
          beskrivLinje={linje => inntektLinjeBeskrivelse(linje, typer)}
          erIRedigering={erIRedigering}
          visFeil={visFeil}
          onBerort={onBerort}
          onRediger={onRediger}
          onSlett={onSlett}
          onGjenopprett={onGjenopprett}
          onTilbakestill={onTilbakestill}
          onOppdater={onOppdater}
        />
      ),
    )

  const leggTilKnapper = (inntektAr: string) =>
    !readOnly && (
      <HStack gap="space-8">
        {INNTEKT_KATEGORIER.filter(({ redigerbar }) => redigerbar).map(({ kategori, tittel }) => (
          <Button
            key={kategori}
            type="button"
            variant="secondary"
            size="small"
            icon={<PlusIcon aria-hidden />}
            onClick={() => onLeggTil(kategori, inntektAr)}
          >
            Legg til {tittel.toLowerCase()}
          </Button>
        ))}
      </HStack>
    )

  if (readOnly && grupper.length === 0) return <BodyShort>Ingen inntekter registrert.</BodyShort>

  return (
    <VStack gap="space-32">
      {arGrupper.length > 0 && (
        <VStack gap="space-8">
          <HStack justify="end">
            <Button
              type="button"
              variant="tertiary"
              size="small"
              onClick={() => setAapneAr(alleAapne ? new Set() : new Set(arGrupper.map(({ inntektAr }) => inntektAr)))}
            >
              {alleAapne ? 'Lukk alle år' : 'Åpne alle år'}
            </Button>
          </HStack>
          <Accordion size="small" aria-label="Inntekt per år">
            {arGrupper.map(({ inntektAr, linjer: linjerForAr }) => (
              <Accordion.Item
                key={inntektAr}
                open={aapneAr.has(inntektAr)}
                onOpenChange={apen => settApen(inntektAr, apen)}
              >
                <Accordion.Header id={headerId(inntektAr)}>
                  <HStack as="span" gap="space-8" align="center">
                    <span>Inntektsår {inntektAr}</span>
                    {harEndring(linjerForAr) && (
                      <Tag variant="warning" size="xsmall">
                        Endret
                      </Tag>
                    )}
                    {visAlleFeil && arMedFeil.includes(inntektAr) && (
                      <Tag variant="error" size="xsmall">
                        Feil
                      </Tag>
                    )}
                  </HStack>
                </Accordion.Header>
                <Accordion.Content>
                  <VStack gap="space-24">
                    {linjerForAr.length === 0 && <BodyShort>Ingen inntekter registrert for året.</BodyShort>}
                    {tabeller(linjerForAr, '3', `inntektsår ${inntektAr}`)}
                    {leggTilKnapper(inntektAr)}
                  </VStack>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion>
        </VStack>
      )}
      {(!readOnly || linjerUtenAr.length > 0) && (
        <Box as="section" aria-labelledby={nyttArHeadingId}>
          <Heading id={nyttArHeadingId} size="small" level="3" spacing>
            Nytt inntektsår
          </Heading>
          <VStack gap="space-24">
            {tabeller(linjerUtenAr, '4', 'nytt inntektsår')}
            {!readOnly && (
              <HStack gap="space-8" align="end">
                <TextField
                  label="År"
                  size="small"
                  inputMode="numeric"
                  value={nyttAr}
                  error={nyttArFeil}
                  onChange={e => {
                    setNyttAr(e.target.value)
                    setNyttArFeil(undefined)
                  }}
                  onKeyDown={e => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    leggTilAr()
                  }}
                  style={{ width: '6rem' }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  icon={<PlusIcon aria-hidden />}
                  onClick={leggTilAr}
                >
                  Legg til inntektsår
                </Button>
              </HStack>
            )}
          </VStack>
        </Box>
      )}
    </VStack>
  )
}
