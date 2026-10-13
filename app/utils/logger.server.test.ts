import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLogger } from './logger.server'

const captured = (spy: ReturnType<typeof vi.spyOn>) => {
  const [line] = spy.mock.calls[0] as [string]
  return line
}

describe('createLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('skriver én linje med JSON til stdout', () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    createLogger('test').info('Hei', { behandlingId: 123, nested: { a: [1, 2] } })

    const line = captured(stdout)
    expect(line.endsWith('\n')).toBe(true)
    expect(line.trimEnd()).not.toContain('\n')
    expect(JSON.parse(line)).toMatchObject({
      level: 'info',
      logger: 'test',
      message: 'Hei',
      behandlingId: 123,
      nested: { a: [1, 2] },
    })
  })

  it('serialiserer feil med stacktrace på én linje til stderr', () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    createLogger('test').error('Feilet', { behandlingId: 1 }, new Error('boom'))

    const line = captured(stderr)
    expect(line.trimEnd()).not.toContain('\n')
    const entry = JSON.parse(line)
    expect(entry).toMatchObject({ level: 'error', behandlingId: 1, error: { name: 'Error', message: 'boom' } })
    expect(entry.error.stack).toContain('boom')
  })

  it('håndterer bigint og sirkulære referanser', () => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const circular: Record<string, unknown> = {}
    circular.self = circular

    createLogger('test').info('BigInt', { offset: 10n })
    createLogger('test').info('Sirkulær', { circular })

    expect(JSON.parse(stdout.mock.calls[0][0] as string)).toMatchObject({ offset: '10' })
    expect(JSON.parse(stdout.mock.calls[1][0] as string)).toMatchObject({ message: 'Sirkulær' })
  })
})
