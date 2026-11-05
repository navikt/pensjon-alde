import { describe, expect, it } from 'vitest'
import { sorterRader } from '~/utils/sorter-rader'
import type { Utenlandsopphold } from './types'
import { tilUtenlandsoppholdRader } from './UtenlandsoppholdTabell'

function lagOpphold(overrides: Partial<Utenlandsopphold>): Utenlandsopphold {
  return {
    utenlandsoppholdId: null,
    fom: null,
    tom: null,
    land: null,
    pensjonsordning: null,
    bodd: null,
    arbeidet: null,
    persongrunnlagId: null,
    version: null,
    changeStamp: null,
    ...overrides,
  }
}

describe('tilUtenlandsoppholdRader', () => {
  it('mapper opphold til rader med landnavn', () => {
    expect(
      tilUtenlandsoppholdRader([
        lagOpphold({
          utenlandsoppholdId: 1,
          fom: '2001-01-01',
          tom: '2003-12-31',
          land: 'SWE',
          bodd: true,
          arbeidet: false,
        }),
      ]),
    ).toEqual([{ id: '1', fom: '2001-01-01', tom: '2003-12-31', land: 'Sverige', bodd: true, arbeidet: false }])
  })

  it('lager id når utenlandsoppholdId mangler', () => {
    expect(tilUtenlandsoppholdRader([lagOpphold({ fom: '2001-01-01' })])[0].id).toBe('2001-01-01-0')
  })

  it('sorterer på fom med åpne datoer sist', () => {
    const rader = tilUtenlandsoppholdRader([
      lagOpphold({ utenlandsoppholdId: 1, fom: '2001-01-01' }),
      lagOpphold({ utenlandsoppholdId: 2, fom: null }),
      lagOpphold({ utenlandsoppholdId: 3, fom: '2010-06-01' }),
    ])

    expect(sorterRader(rader, [{ columnId: 'fom', direction: 'desc' }]).map(it => it.id)).toEqual(['3', '1', '2'])
  })
})
