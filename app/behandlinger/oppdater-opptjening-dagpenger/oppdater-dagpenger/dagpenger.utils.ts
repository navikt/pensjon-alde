import type {
  DagpengerDTO,
  DagpengerGrunnlag,
  DagpengerLinje,
  DagpengerTilSletting,
  Dagpengertype,
  DagpengerVurdering,
} from './dagpenger.types'

export const DAGPENGER_FELTER: (keyof DagpengerDTO)[] = [
  'ar',
  'dagpengerType',
  'utbetalteDagpenger',
  'uavkortetDagpengegrunnlag',
  'ferietillegg',
  'barnetillegg',
]

const MAKS_BELOP = 2147483647

export const BELOPSFELTER = [
  ['utbetalteDagpenger', 'Utbetalte dagpenger'],
  ['barnetillegg', 'Barnetillegg'],
  ['uavkortetDagpengegrunnlag', 'Uavkortet dagpengegrunnlag'],
  ['ferietillegg', 'Ferietillegg'],
] as const

type BelopFelt = (typeof BELOPSFELTER)[number][0]
export type DagpengerFeilFelt = 'ar' | 'dagpengerType' | BelopFelt
export type DagpengerFeil = Partial<Record<DagpengerFeilFelt, string>>

const PAKREVDE_BELOP: BelopFelt[] = ['utbetalteDagpenger', 'barnetillegg']

const nokkel = (dto: Pick<DagpengerDTO, 'ar' | 'dagpengerType'>) => `${dto.ar}:${dto.dagpengerType}`

const sammeNokkel = (venstre: DagpengerDTO, hoyre: DagpengerTilSletting) =>
  venstre.ar === hoyre.ar && venstre.dagpengerType === hoyre.dagpengerType

export const harEndretNokkel = (linje: DagpengerLinje) => !!linje._original && nokkel(linje) !== nokkel(linje._original)

export const dagpengertypeLabel = (typer: Dagpengertype[], kode: string | null | undefined) =>
  typer.find(type => type.code === kode)?.description ?? kode ?? ''

export const formaterBelop = (verdi: number | null | undefined) => (verdi == null ? '' : verdi.toLocaleString('nb-NO'))

export function dagpengerLinjerFraVurdering(
  grunnlag: DagpengerGrunnlag | null | undefined,
  vurdering: DagpengerVurdering | null | undefined,
): DagpengerLinje[] {
  const linjer: DagpengerLinje[] = (grunnlag?.dagpengerListe ?? []).map((dto, indeks) => ({
    ...dto,
    _id: `dagpenger-${indeks}`,
    _status: 'original',
    _original: { ...dto },
  }))
  for (const lagret of vurdering?.dagpengerTilLagring ?? []) {
    // PEN lagrer vurderingen uten null-felter, så tømte valgfrie felt må settes eksplisitt
    const dto = {
      ...lagret,
      uavkortetDagpengegrunnlag: lagret.uavkortetDagpengegrunnlag ?? null,
      ferietillegg: lagret.ferietillegg ?? null,
    }
    const indeks = linjer.findIndex(linje => sammeNokkel(linje, dto))
    if (indeks >= 0) linjer[indeks] = { ...linjer[indeks], ...dto, _status: 'modified' }
    else linjer.push({ ...dto, _id: `dagpenger-ny-${linjer.length}`, _status: 'new', _original: null })
  }
  for (const dto of vurdering?.dagpengerTilSletting ?? []) {
    const indeks = linjer.findIndex(linje => sammeNokkel(linje, dto))
    if (indeks >= 0) linjer[indeks] = { ...linjer[indeks], _status: 'deleted' }
    else
      linjer.push({
        ...dto,
        utbetalteDagpenger: null,
        barnetillegg: null,
        _id: `dagpenger-slettet-${linjer.length}`,
        _status: 'deleted',
        _original: null,
      })
  }
  return linjer
}

export function nyDagpengerLinje(type: string): DagpengerLinje {
  return {
    _id: crypto.randomUUID(),
    _status: 'new',
    _original: null,
    ar: new Date().getFullYear() - 1,
    dagpengerType: type,
    utbetalteDagpenger: null,
    barnetillegg: 0,
  }
}

export function tilbakestillDagpengerLinje(linje: DagpengerLinje): DagpengerLinje {
  if (!linje._original) return linje
  const { _skjulteVerdier, ...uten } = linje
  return { ...uten, ...linje._original }
}

// Dagpenger for fiskere og fangstmenn har ikke uavkortet dagpengegrunnlag eller ferietillegg
export const erUtenGrunnlagOgFerietillegg = (type: string | null | undefined) => type === 'DP_FF'

export function endreDagpengerFelt(
  linje: DagpengerLinje,
  felt: keyof DagpengerDTO,
  verdi: string | number | null,
): DagpengerLinje {
  const neste = { ...linje, [felt]: verdi }
  if (felt !== 'dagpengerType') return neste
  const varUten = erUtenGrunnlagOgFerietillegg(linje.dagpengerType)
  const blirUten = erUtenGrunnlagOgFerietillegg(verdi as string | null)
  if (!varUten && blirUten) {
    return {
      ...neste,
      _skjulteVerdier: {
        uavkortetDagpengegrunnlag: linje.uavkortetDagpengegrunnlag ?? null,
        ferietillegg: linje.ferietillegg ?? null,
      },
      uavkortetDagpengegrunnlag: null,
      ferietillegg: null,
    }
  }
  if (varUten && !blirUten) {
    const { _skjulteVerdier, ...uten } = neste
    return { ...uten, ..._skjulteVerdier }
  }
  return neste
}

function opptatteNokler(linje: DagpengerLinje): string[] {
  if (linje._status === 'deleted') return [nokkel(linje._original ?? linje)]
  if (linje._original && harEndretNokkel(linje)) return [nokkel(linje), nokkel(linje._original)]
  return [nokkel(linje)]
}

const erGyldigBelop = (verdi: number | null | undefined) =>
  Number.isInteger(verdi) && (verdi as number) >= 0 && (verdi as number) <= MAKS_BELOP

export function finnDagpengerFeil(linjer: DagpengerLinje[]): Record<string, DagpengerFeil> {
  const forekomster = new Map<string, number>()
  for (const n of linjer.flatMap(opptatteNokler)) forekomster.set(n, (forekomster.get(n) ?? 0) + 1)

  const feil: Record<string, DagpengerFeil> = {}
  for (const linje of linjer) {
    if (linje._status === 'original' || linje._status === 'deleted') continue
    const linjeFeil: DagpengerFeil = {}
    const gyldigAr = Number.isInteger(linje.ar) && (linje.ar as number) >= 1900 && (linje.ar as number) <= 9999
    if (!gyldigAr) linjeFeil.ar = 'Oppgi et gyldig år.'
    if (!linje.dagpengerType) linjeFeil.dagpengerType = 'Velg dagpengertype.'
    if (gyldigAr && linje.dagpengerType && opptatteNokler(linje).some(n => (forekomster.get(n) ?? 0) > 1)) {
      linjeFeil.ar = 'Det finnes allerede dagpenger med samme år og type.'
      linjeFeil.dagpengerType = linjeFeil.ar
    }
    for (const [felt, label] of BELOPSFELTER) {
      const verdi = linje[felt]
      if (verdi == null) {
        if (PAKREVDE_BELOP.includes(felt)) linjeFeil[felt] = `Fyll inn ${label.toLowerCase()}.`
      } else if (!erGyldigBelop(verdi)) {
        linjeFeil[felt] = `${label} må være et helt tall mellom 0 og 2 147 483 647.`
      }
    }
    if (Object.keys(linjeFeil).length > 0) feil[linje._id] = linjeFeil
  }
  return feil
}

export function byggDagpengerPayload(linjer: DagpengerLinje[], fnr: string): DagpengerVurdering {
  return {
    fnr,
    dagpengerTilLagring: linjer
      .filter(linje => linje._status === 'new' || linje._status === 'modified')
      .map(linje => ({
        ar: linje.ar as number,
        dagpengerType: linje.dagpengerType as string,
        utbetalteDagpenger: linje.utbetalteDagpenger as number,
        barnetillegg: linje.barnetillegg as number,
        uavkortetDagpengegrunnlag: linje.uavkortetDagpengegrunnlag ?? null,
        ferietillegg: linje.ferietillegg ?? null,
      })),
    dagpengerTilSletting: linjer
      .filter(linje => linje._status === 'deleted' || (linje._status === 'modified' && harEndretNokkel(linje)))
      .map(linje => {
        const { ar, dagpengerType } = linje._original ?? linje
        return { ar: ar as number, dagpengerType: dagpengerType as string }
      }),
  }
}
