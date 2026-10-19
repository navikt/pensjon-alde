import { describe, expect, it } from 'vitest'
import type { OmsorgGrunnlagDTO } from './omsorg.types'
import {
  byggOmsorgEndringSummary,
  byggOmsorgPayload,
  grupperOmsorgLinjer,
  medOmsorgGrunnlag,
  omsorgLabel,
  omsorgLinjerFraVurdering,
  toOmsorgTilSletting,
} from './omsorg.utils'
import type {
  OppdaterOpptjeningGrunnlag,
  OppdaterOpptjeningVurdering,
  OpptjeningstyperResponse,
} from './opptjening.types'
import { harEndringer, tilLinjeState } from './opptjening.utils'

const opptjeningstyper: OpptjeningstyperResponse = {
  // Oppdiktet kode – testene trenger bare en vilkårlig kode med beskrivelse
  omsorg: { typer: [{ code: 'OMS_BARN', description: 'Omsorg for barn' }], subTyper: [] },
}

describe('grupperOmsorgLinjer', () => {
  it('grupperer per person og sorterer aar uten aa endre originalen', () => {
    const senere = tilLinjeState({ omsorgType: 'OMS_BARN', ar: 2022, fnrOmsorgFor: '111' })
    const annenPerson = tilLinjeState({ omsorgType: 'OMS_BARN', ar: 2021, fnrOmsorgFor: '222' })
    const tidligere = {
      ...tilLinjeState({ omsorgType: 'OMS_BARN', ar: 2020, fnrOmsorgFor: '111' }),
      _status: 'deleted' as const,
    }
    const linjer = [senere, annenPerson, tidligere]

    expect(grupperOmsorgLinjer(linjer)).toEqual([
      ['111', [tidligere, senere]],
      ['222', [annenPerson]],
    ])
    expect(linjer).toEqual([senere, annenPerson, tidligere])
  })

  it('samler linjer uten foedselsnummer i en egen gruppe', () => {
    const mangler = tilLinjeState({ omsorgType: 'OMS_BARN', ar: 2020 })
    const tom = tilLinjeState({ omsorgType: 'OMS_BARN', ar: 2021, fnrOmsorgFor: '' })
    const nullverdi = tilLinjeState({ omsorgType: 'OMS_BARN', ar: 2022, fnrOmsorgFor: null })

    expect(grupperOmsorgLinjer([nullverdi, tom, mangler])).toEqual([[null, [mangler, tom, nullverdi]]])
  })

  it('returnerer ingen grupper for en tom liste', () => {
    expect(grupperOmsorgLinjer([])).toEqual([])
  })
})

describe('omsorgLabel', () => {
  it('viser fnr det er omsorg for når det finnes', () => {
    expect(omsorgLabel({ omsorgType: 'OMS_BARN', ar: 2020, fnrOmsorgFor: '12345678901' }, opptjeningstyper)).toBe(
      'Omsorg for barn (2020) – omsorg for 12345678901',
    )
    expect(omsorgLabel({ omsorgType: 'OMS_BARN', ar: 2020, fnrOmsorgFor: null }, opptjeningstyper)).toBe(
      'Omsorg for barn (2020)',
    )
  })
})

describe('toOmsorgTilSletting', () => {
  it('sender kun år og type, som det backend identifiserer omsorg med', () => {
    const linje = tilLinjeState({ ar: 2020, omsorgType: 'OMS_BARN', fnrOmsorgFor: '10987654321' })

    expect(toOmsorgTilSletting(linje)).toEqual({ ar: 2020, omsorgType: 'OMS_BARN' })
  })
})

describe('byggOmsorgPayload', () => {
  it('sender kun slettede linjer som flat backend-DTO-liste', () => {
    const slettet = {
      ...tilLinjeState({ ar: 2020, omsorgType: 'OMS_BARN', fnrOmsorgFor: '10987654321' }),
      _status: 'deleted' as const,
    }
    const uendret = tilLinjeState({ ar: 2021, omsorgType: 'OMS_BARN', fnrOmsorgFor: '10987654321' })

    expect(byggOmsorgPayload([slettet, uendret], '12345678901')).toEqual({
      fnr: '12345678901',
      omsorgTilSletting: [{ ar: 2020, omsorgType: 'OMS_BARN' }],
    })
  })
})

describe('medOmsorgGrunnlag', () => {
  const omsorgListe: OmsorgGrunnlagDTO[] = [
    { omsorgId: 1, fnrOmsorgFor: '111', omsorgType: 'OMS_BARN', ar: 2019, kilde: 'PP01' },
    { omsorgId: 2, fnrOmsorgFor: '222', omsorgType: 'OMS_BARN', ar: 2020, kilde: 'PP01' },
  ]

  it('henter øvrige felter fra grunnlaget basert på år og type', () => {
    expect(medOmsorgGrunnlag({ ar: 2020, omsorgType: 'OMS_BARN' }, omsorgListe)).toEqual(omsorgListe[1])
  })

  it('returnerer kun år og type når grunnlaget mangler', () => {
    expect(medOmsorgGrunnlag({ ar: 2020, omsorgType: 'OMS_BARN' }, undefined)).toEqual({
      ar: 2020,
      omsorgType: 'OMS_BARN',
    })
  })
})

describe('omsorgLinjerFraVurdering', () => {
  const grunnlag: NonNullable<OppdaterOpptjeningGrunnlag['opptjeningsGrunnlagDto']> = {
    fnr: '12345678901',
    omsorgListe: [
      { omsorgId: 5, omsorgType: 'OMS_BARN', ar: 2020, fnrOmsorgFor: '10987654321' },
      { omsorgId: 6, omsorgType: 'OBU6', ar: 2021, fnrOmsorgFor: '10987654321' },
    ],
  }

  it('gir uendrede linjer fra grunnlaget når det ikke finnes noen vurdering', () => {
    const linjer = omsorgLinjerFraVurdering(grunnlag, null)

    expect(linjer.map(l => l._status)).toEqual(['original', 'original'])
    expect(harEndringer(byggOmsorgEndringSummary(linjer, opptjeningstyper))).toBe(false)
  })

  it('markerer linjene i vurderingen som slettet og beholder resten', () => {
    const vurdering: OppdaterOpptjeningVurdering = {
      omsorgTilSletting: [{ ar: 2020, omsorgType: 'OMS_BARN' }],
    }

    const linjer = omsorgLinjerFraVurdering(grunnlag, vurdering)

    expect(linjer.map(l => [l.omsorgType, l._status])).toEqual([
      ['OMS_BARN', 'deleted'],
      ['OBU6', 'original'],
    ])
    expect(byggOmsorgEndringSummary(linjer, opptjeningstyper).slettede).toEqual([
      {
        id: 'omsorg-0',
        kategori: 'Omsorg',
        label: 'Omsorg for barn (2020) – omsorg for 10987654321',
        endringer: undefined,
      },
    ])
  })

  it('viser kun år og type når slettet linje mangler i grunnlaget', () => {
    const vurdering: OppdaterOpptjeningVurdering = {
      omsorgTilSletting: [{ ar: 2020, omsorgType: 'OMS_BARN' }],
    }

    const linjer = omsorgLinjerFraVurdering(undefined, vurdering)

    expect(linjer).toHaveLength(1)
    expect(linjer[0]._status).toBe('deleted')
    expect(byggOmsorgEndringSummary(linjer, opptjeningstyper).slettede[0].label).toBe('Omsorg for barn (2020)')
  })
})
