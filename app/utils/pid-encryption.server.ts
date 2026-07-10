import { createCipheriv, randomBytes } from 'node:crypto'
import { env } from './env.server'

const PID_ALGORITHM = 'aes-256-gcm'
const PID_IV_LENGTH = 12
const PID_AUTH_TAG_LENGTH = 12

function getPidEncryptionKey(): Buffer {
  if (!env.pidEncryptionKey) {
    throw new Error('Miljøvariabel PSAK_PID_ENCRYPTION_KEY er ikke satt')
  }

  return Buffer.from(env.pidEncryptionKey, 'base64url')
}

export function encryptPid(pid: string): string {
  const key = getPidEncryptionKey()
  const iv = randomBytes(PID_IV_LENGTH)

  const cipher = createCipheriv(PID_ALGORITHM, key, iv, { authTagLength: PID_AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(pid, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  const ivEncoded = iv.toString('base64url')
  const dataEncoded = Buffer.concat([encrypted, authTag]).toString('base64url')

  return `${ivEncoded}.${dataEncoded}`
}
