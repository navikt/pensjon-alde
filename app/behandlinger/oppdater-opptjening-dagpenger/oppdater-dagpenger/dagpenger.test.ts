import { describe, expect, it } from 'vitest'
import {
  byggDagpengerPayload,
  dagpengerLinjerFraVurdering,
  endreDagpengerFelt,
  finnDagpengerFeil,
  nyDagpengerLinje,
  tilbakestillDagpengerLinje,
} from './dagpenger.utils'

const original = { ar: 2024, dagpengerType: 'DP', utbetalteDagpenger: 10000, barnetillegg: 500, kilde: 'POPP' }

describe('dagpenger', () => {
  it('replays saved updates, additions and deletions for attestation', () => {
    const vurdering = {
      dagpengerTilLagring: [
        { ...original, utbetalteDagpenger: 20000 },
        { ...original, ar: 2025 },
      ],
      dagpengerTilSletting: [{ ar: 2023, dagpengerType: 'DP' }],
    }
    const linjer = dagpengerLinjerFraVurdering({ dagpengerListe: [original] }, vurdering)
    expect(linjer.map(linje => linje._status)).toEqual(['modified', 'new', 'deleted'])
    expect(linjer[0]._original).toEqual(original)
    const payload = byggDagpengerPayload(linjer)
    expect(payload.dagpengerTilLagring[0]).not.toHaveProperty('kilde')
    expect(payload.dagpengerTilLagring[0]).not.toHaveProperty('rapportType')
    expect(payload.dagpengerTilLagring[0]).not.toHaveProperty('_original')
    expect(payload.dagpengerTilSletting).toEqual(vurdering.dagpengerTilSletting)
    expect(payload.dagpengerTilLagring[0].utbetalteDagpenger).toBe(20000)
  })

  it('replays cleared optional fields that PEN omits from the saved assessment', () => {
    const medFerietillegg = { ...original, ferietillegg: 12000 }
    const [linje] = dagpengerLinjerFraVurdering(
      { dagpengerListe: [medFerietillegg] },
      {
        dagpengerTilLagring: [{ ar: 2024, dagpengerType: 'DP', utbetalteDagpenger: 10000, barnetillegg: 500 }],
        dagpengerTilSletting: [],
      },
    )
    expect(linje._status).toBe('modified')
    expect(linje.ferietillegg).toBeNull()
    expect(linje._original?.ferietillegg).toBe(12000)
  })

  it('moves a row to another type by saving the new key and deleting the old one', () => {
    const [linje] = dagpengerLinjerFraVurdering({ dagpengerListe: [original] }, null)
    const endret = { ...linje, dagpengerType: 'DP_FF', _status: 'modified' as const }
    expect(byggDagpengerPayload([endret])).toEqual({
      dagpengerTilLagring: [
        {
          ar: 2024,
          dagpengerType: 'DP_FF',
          utbetalteDagpenger: 10000,
          barnetillegg: 500,
          uavkortetDagpengegrunnlag: null,
          ferietillegg: null,
        },
      ],
      dagpengerTilSletting: [{ ar: 2024, dagpengerType: 'DP' }],
    })
    expect(tilbakestillDagpengerLinje(endret).dagpengerType).toBe('DP')
    const ny = { ...nyDagpengerLinje('DP'), ar: 2024, utbetalteDagpenger: 1 }
    expect(finnDagpengerFeil([endret, ny])[ny._id]?.dagpengerType).toContain('samme år og type')
  })

  it('clears uavkortet grunnlag and ferietillegg for DP_FF and restores them when switching back', () => {
    const [linje] = dagpengerLinjerFraVurdering(
      { dagpengerListe: [{ ...original, uavkortetDagpengegrunnlag: 300000, ferietillegg: 12000 }] },
      null,
    )
    const fiskere = endreDagpengerFelt(linje, 'dagpengerType', 'DP_FF')
    expect(fiskere.uavkortetDagpengegrunnlag).toBeNull()
    expect(fiskere.ferietillegg).toBeNull()
    expect(byggDagpengerPayload([{ ...fiskere, _status: 'modified' }]).dagpengerTilLagring[0]).toMatchObject({
      dagpengerType: 'DP_FF',
      uavkortetDagpengegrunnlag: null,
      ferietillegg: null,
    })
    const tilbake = endreDagpengerFelt(fiskere, 'dagpengerType', 'DP')
    expect(tilbake.uavkortetDagpengegrunnlag).toBe(300000)
    expect(tilbake.ferietillegg).toBe(12000)
    expect(tilbake).not.toHaveProperty('_skjulteVerdier')
    const angret = tilbakestillDagpengerLinje(fiskere)
    expect(angret.ferietillegg).toBe(12000)
    expect(angret).not.toHaveProperty('_skjulteVerdier')
  })

  it('does not submit unchanged rows', () => {
    expect(byggDagpengerPayload(dagpengerLinjerFraVurdering({ dagpengerListe: [original] }, null))).toEqual({
      dagpengerTilLagring: [],
      dagpengerTilSletting: [],
    })
  })

  it('reports errors on the exact fields that are wrong', () => {
    const ny = { ...nyDagpengerLinje('DP'), ar: 2024 }
    expect(finnDagpengerFeil([ny])[ny._id]).toEqual({ utbetalteDagpenger: 'Fyll inn utbetalte dagpenger.' })
    expect(finnDagpengerFeil([{ ...ny, utbetalteDagpenger: 0 }])).toEqual({})
    expect(Object.keys(finnDagpengerFeil([{ ...ny, utbetalteDagpenger: 1.5, ferietillegg: -1 }])[ny._id])).toEqual([
      'utbetalteDagpenger',
      'ferietillegg',
    ])
    expect(Object.keys(finnDagpengerFeil([{ ...ny, ar: 12, dagpengerType: null }])[ny._id])).toEqual([
      'ar',
      'dagpengerType',
      'utbetalteDagpenger',
    ])
    const slettet = {
      ...dagpengerLinjerFraVurdering({ dagpengerListe: [original] }, null)[0],
      _status: 'deleted' as const,
    }
    const duplikat = finnDagpengerFeil([slettet, { ...ny, utbetalteDagpenger: 1 }])[ny._id]
    expect(duplikat?.ar).toContain('samme år og type')
    expect(duplikat?.dagpengerType).toContain('samme år og type')
  })
})
