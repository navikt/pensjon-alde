import { describe, expect, it } from 'vitest'
import { tilLinjeState } from '../felles/opptjening.utils'
import type { OpptjeningstyperResponse } from '../felles/opptjening-types'
import { byggOmsorgPayload, medOmsorgGrunnlag, omsorgLabel, toOmsorgTilSletting } from './omsorg.utils'
import type { OmsorgGrunnlagDTO } from './omsorg-types'

const opptjeningstyper: OpptjeningstyperResponse = {
  // Oppdiktet kode – testene trenger bare en vilkårlig kode med beskrivelse
  omsorg: { typer: [{ code: 'OMS_BARN', description: 'Omsorg for barn' }], subTyper: [] },
}

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
  it('sender kun år og type, som er det backend identifiserer omsorg med', () => {
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
