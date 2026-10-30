import { PlusIcon } from '@navikt/aksel-icons'
import {
  BodyLong,
  BodyShort,
  Box,
  Button,
  Heading,
  HStack,
  Modal,
  Tag,
  UNSAFE_Combobox,
  VStack,
} from '@navikt/ds-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { InntektTabell } from './InntektTabell'
import type { InntektFeil, InntektFeilFelt, InntektFelt, InntektKategori } from './inntekt.types'
import {
  brukteInntektstyper,
  erGyldigInntektAr,
  erRedigerbar,
  grupperInntektLinjerPerAr,
  INNTEKT_KATEGORIER,
  type InntektLinjeState,
  type InntektstyperPerKategori,
  inntektFeltId,
  inntektLinjeBeskrivelse,
  ledigInntektstype,
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
  const [sok, setSok] = useState('')
  const [arFeil, setArFeil] = useState<string>()
  const [arTilForkasting, setArTilForkasting] = useState<string | null>(null)
  const idPrefix = useId()
  const utenArHeadingId = `${idPrefix}-uten-ar`
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

  const [valgteAr, setValgteAr] = useState<Set<string>>(
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
    if (arMedFeil.length > 0) setValgteAr(forrige => new Set([...forrige, ...arMedFeil]))
  }

  const alleAr = arGrupper.map(({ inntektAr }) => inntektAr)
  const linjerIAr = (inntektAr: string) => arGrupper.find(gruppe => gruppe.inntektAr === inntektAr)?.linjer ?? []
  const filtrerteAr = alleAr.filter(inntektAr => inntektAr.startsWith(sok.trim()))
  const viste = arGrupper.filter(({ inntektAr }) => valgteAr.has(inntektAr))

  const velgAr = (inntektAr: string, valgt: boolean) =>
    setValgteAr(forrige => {
      const neste = new Set(forrige)
      if (valgt) neste.add(inntektAr)
      else neste.delete(inntektAr)
      return neste
    })

  const onToggleAr = (verdi: string, valgt: boolean) => {
    const inntektAr = verdi.trim()
    setSok('')
    if (!valgt && !readOnly && harEndring(linjerIAr(inntektAr))) {
      setArTilForkasting(inntektAr)
      return
    }
    if (!valgt || alleAr.includes(inntektAr)) {
      setArFeil(undefined)
      velgAr(inntektAr, valgt)
      return
    }
    if (readOnly) return
    if (!erGyldigInntektAr(inntektAr)) {
      setArFeil('År må ha fire siffer')
      return
    }
    setArFeil(undefined)
    setEkstraAr(forrige => [...forrige, inntektAr])
    velgAr(inntektAr, true)
  }

  const forkastAr = (inntektAr: string) => {
    const ider = new Set<string>()
    for (const linje of linjerIAr(inntektAr)) {
      ider.add(linje._id)
      if (linje._status === 'new') onSlett(linje._id)
      if (linje._status === 'deleted') onGjenopprett(linje._id)
      if (linje._status === 'deleted' || linje._status === 'modified') onTilbakestill(linje._id)
    }
    setRedigerer(forrige => new Set([...forrige].filter(id => !ider.has(id))))
    setBerort(forrige => new Set([...forrige].filter(nokkel => !ider.has(nokkel.split('|')[0]))))
    setEkstraAr(forrige => forrige.filter(ar => ar !== inntektAr))
    velgAr(inntektAr, false)
    setArTilForkasting(null)
  }

  const kjenteLinjer = useRef(new Set(linjer.map(linje => linje._id)))
  useEffect(() => {
    const nyLinje = linjer.find(linje => linje._status === 'new' && !kjenteLinjer.current.has(linje._id))
    kjenteLinjer.current = new Set(linjer.map(linje => linje._id))
    if (nyLinje) document.getElementById(inntektFeltId(nyLinje._id, 'inntektsType'))?.focus()
  }, [linjer])

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
          brukteTyper={linje => brukteInntektstyper(linjer, linje.kategori, linje.inntektAr, linje._id)}
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
            disabled={ledigInntektstype(linjer, typer[kategori], kategori, inntektAr) === null}
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
      {(!readOnly || arGrupper.length > 0) && (
        <Box style={{ maxWidth: '32rem' }}>
          <UNSAFE_Combobox
            label="Inntektsår"
            description={
              readOnly
                ? 'Velg årene du vil se.'
                : 'Velg årene du vil se eller endre. Skriv et nytt år og trykk Enter for å legge det til.'
            }
            size="small"
            isMultiSelect
            allowNewValues={!readOnly}
            inputMode="numeric"
            options={alleAr}
            filteredOptions={filtrerteAr}
            selectedOptions={alleAr.filter(inntektAr => valgteAr.has(inntektAr))}
            value={sok}
            onChange={verdi => {
              setSok(verdi)
              if (verdi) setArFeil(undefined)
            }}
            onToggleSelected={onToggleAr}
            error={arFeil}
          />
        </Box>
      )}
      {viste.map(({ inntektAr, linjer: linjerForAr }) => (
        <Box as="section" key={inntektAr} aria-labelledby={headerId(inntektAr)}>
          <VStack gap="space-16">
            <HStack gap="space-8" align="center">
              <Heading id={headerId(inntektAr)} size="small" level="3">
                Inntektsår {inntektAr}
              </Heading>
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
            {linjerForAr.length === 0 && <BodyShort>Ingen inntekter registrert for året.</BodyShort>}
            {tabeller(linjerForAr, '4', `inntektsår ${inntektAr}`)}
            {leggTilKnapper(inntektAr)}
          </VStack>
        </Box>
      ))}
      {linjerUtenAr.length > 0 && (
        <Box as="section" aria-labelledby={utenArHeadingId}>
          <Heading id={utenArHeadingId} size="small" level="3" spacing>
            Uten inntektsår
          </Heading>
          <VStack gap="space-24">{tabeller(linjerUtenAr, '4', 'uten inntektsår')}</VStack>
        </Box>
      )}
      {!readOnly && (
        <Modal
          open={arTilForkasting !== null}
          onClose={() => setArTilForkasting(null)}
          header={{ heading: `Fjerne inntektsår ${arTilForkasting ?? ''}?` }}
          size="small"
        >
          <Modal.Body>
            <BodyLong>
              Endringene du har gjort for inntektsår {arTilForkasting} blir forkastet hvis du fjerner året.
            </BodyLong>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="danger" onClick={() => arTilForkasting && forkastAr(arTilForkasting)}>
              Fjern og forkast endringer
            </Button>
            <Button type="button" variant="secondary" onClick={() => setArTilForkasting(null)}>
              Behold året
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </VStack>
  )
}
