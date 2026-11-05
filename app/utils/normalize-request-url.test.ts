import { describe, expect, it } from 'vitest'
import { normalizeRequestUrl } from './normalize-request-url'

const path = (url: string) => {
  const normalized = normalizeRequestUrl(url)
  return normalized.pathname + normalized.search
}

describe('normalizeRequestUrl', () => {
  it.each([
    ['http://localhost:3001/behandling/1/aktivitet/2.data', '/behandling/1/aktivitet/2'],
    ['http://localhost:3001/_root.data', '/'],
    ['http://localhost:3001/behandling/1/_.data', '/behandling/1/'],
    ['http://localhost:3001/behandling/1.data?_routes=root,routes/behandling', '/behandling/1'],
    ['http://localhost:3001/behandling/1.data?index&justCompleted=2', '/behandling/1?justCompleted=2'],
    ['http://localhost:3001/behandling/1/aktivitet/2', '/behandling/1/aktivitet/2'],
    ['http://localhost:3001/settings?returnTo=%2F', '/settings?returnTo=%2F'],
  ])('%s -> %s', (input, expected) => {
    expect(path(input)).toBe(expected)
  })
})
