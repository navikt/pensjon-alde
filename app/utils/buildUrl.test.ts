import { describe, expect, it } from 'vitest'
import { buildUrl } from './build-url'

describe('buildUrl', () => {
  it('replaces single parameter in template', () => {
    const template = 'https://example.com/api/{id}'
    const params = { id: '12345' }
    expect(buildUrl(template, params)).toBe('https://example.com/api/12345')
  })

  it('replaces multiple parameters in template', () => {
    const template = 'https://example.com/api/{resource}/{id}'
    const params = { resource: 'users', id: '12345' }
    expect(buildUrl(template, params)).toBe('https://example.com/api/users/12345')
  })

  it('encodes parameter values with special characters', () => {
    const template = 'https://example.com/api/{query}'
    const params = { query: 'hello world' }
    expect(buildUrl(template, params)).toBe('https://example.com/api/hello%20world')
  })

  it('handles numeric parameter values', () => {
    const template = 'https://example.com/api/{behandlingId}/{aktivitetId}'
    const params = { behandlingId: 6359437, aktivitetId: 6020942 }
    expect(buildUrl(template, params)).toBe('https://example.com/api/6359437/6020942')
  })

  it('uses "intern" subdomain when no request is provided', () => {
    const template = 'https://{subdomain}.example.com/api'
    const params = {}
    expect(buildUrl(template, params)).toBe('https://intern.example.com/api')
  })

  it('uses "ansatt" subdomain when request hostname includes "ansatt"', () => {
    const template = 'https://{subdomain}.example.com/api'
    const params = {}
    const request = new Request('https://app.ansatt.nav.no/path')
    expect(buildUrl(template, params, request)).toBe('https://ansatt.example.com/api')
  })

  it('uses "intern" subdomain when request hostname does not include "ansatt"', () => {
    const template = 'https://{subdomain}.example.com/api'
    const params = {}
    const request = new Request('https://app.intern.nav.no/path')
    expect(buildUrl(template, params, request)).toBe('https://intern.example.com/api')
  })

  it('combines subdomain and parameters in same template', () => {
    const template = 'https://{subdomain}.nav.no/sak/{sakId}'
    const params = { sakId: '789' }
    const request = new Request('https://alde.ansatt.nav.no/behandling/123')
    expect(buildUrl(template, params, request)).toBe('https://ansatt.nav.no/sak/789')
  })

  it('handles templates without parameters', () => {
    const template = 'https://example.com/api/endpoint'
    const params = {}
    expect(buildUrl(template, params)).toBe('https://example.com/api/endpoint')
  })

  it('encodes special URL characters in parameters', () => {
    const template = 'https://example.com/search/{term}'
    const params = { term: 'key=value&other=data' }
    expect(buildUrl(template, params)).toBe('https://example.com/search/key%3Dvalue%26other%3Ddata')
  })

  it('handles empty string parameter values', () => {
    const template = 'https://example.com/api/{id}'
    const params = { id: '' }
    expect(buildUrl(template, params)).toBe('https://example.com/api/')
  })

  it('handles zero as numeric parameter', () => {
    const template = 'https://example.com/page/{page}'
    const params = { page: 0 }
    expect(buildUrl(template, params)).toBe('https://example.com/page/0')
  })

  it('replaces same parameter multiple times if it appears in template', () => {
    const template = 'https://example.com/{id}/details/{id}'
    const params = { id: '123' }
    expect(buildUrl(template, params)).toBe('https://example.com/123/details/123')
  })
})
