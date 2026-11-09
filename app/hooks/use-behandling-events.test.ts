import { describe, expect, it } from 'vitest'
import { nesteReconnectDelay } from './use-behandling-events'

describe('nesteReconnectDelay', () => {
  it('dobler ventetiden', () => {
    expect(nesteReconnectDelay(15_000)).toBe(30_000)
  })

  it('stopper på fem minutter', () => {
    expect(nesteReconnectDelay(4 * 60_000)).toBe(5 * 60_000)
    expect(nesteReconnectDelay(5 * 60_000)).toBe(5 * 60_000)
  })
})
