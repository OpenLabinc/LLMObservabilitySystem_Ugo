import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export function seal(plain: string, keyPath = 'data/token.key'): string {
  const key = loadKey(keyPath)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.')
}

export function open(payload: string, keyPath = 'data/token.key'): string {
  const [iv, tag, data] = payload.split('.')
  if (!iv || !tag || !data) throw new Error('Stored credential is unreadable.')
  const decipher = createDecipheriv('aes-256-gcm', loadKey(keyPath), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}

export function publicError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  return raw.replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic [redacted]').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').slice(0, 400)
}

function loadKey(keyPath: string): Buffer {
  const fromEnv = process.env.TOKEN_KEY?.trim()
  if (fromEnv) return scryptSync(fromEnv, 'supercal', 32)
  mkdirSync(dirname(keyPath), { recursive: true })
  if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(32).toString('base64url'), { mode: 0o600 })
  return scryptSync(readFileSync(keyPath, 'utf8'), 'supercal', 32)
}
