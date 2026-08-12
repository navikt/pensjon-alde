import { createDecipheriv } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const TEST_KEY = 'MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE'

vi.mock('./env.server', () => ({
  env: { pidEncryptionKey: TEST_KEY },
}))

function decryptForTest(encryptedPid: string, key: string): string {
  const [ivPart, dataPart] = encryptedPid.split('.')
  const keyBuffer = Buffer.from(key, 'base64url')
  const iv = Buffer.from(ivPart, 'base64url')
  const encryptedData = Buffer.from(dataPart, 'base64url')

  const authTag = encryptedData.subarray(encryptedData.length - 12)
  const ciphertext = encryptedData.subarray(0, encryptedData.length - 12)

  const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv, { authTagLength: 12 })
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8')
}

describe('encryptPid', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('krypterer fødselsnummer til et format med iv og data separert med punktum', async () => {
    const { encryptPid } = await import('./pid-encryption.server')
    const encrypted = encryptPid('12345678901')
    const parts = encrypted.split('.')

    expect(parts).toHaveLength(2)
    expect(parts[0].length).toBeGreaterThan(0)
    expect(parts[1].length).toBeGreaterThan(0)
  })

  it('produserer ulik kryptert verdi for hvert kall fordi IV er tilfeldig', async () => {
    const { encryptPid } = await import('./pid-encryption.server')
    const fnr = '12345678901'

    expect(encryptPid(fnr)).not.toBe(encryptPid(fnr))
  })

  it('krypterer slik at verdien kan dekrypteres tilbake til opprinnelig fødselsnummer', async () => {
    const { encryptPid } = await import('./pid-encryption.server')
    const fnr = '12345678901'

    expect(decryptForTest(encryptPid(fnr), TEST_KEY)).toBe(fnr)
  })

  it('kaster feil når krypteringsnøkkel mangler', async () => {
    vi.doMock('./env.server', () => ({ env: { pidEncryptionKey: undefined } }))
    const { encryptPid } = await import('./pid-encryption.server')

    expect(() => encryptPid('12345678901')).toThrow('PSAK_PID_ENCRYPTION_KEY')
  })
})
