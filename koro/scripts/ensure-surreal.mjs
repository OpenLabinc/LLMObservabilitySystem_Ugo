import { access, chmod, mkdir } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Readable } from 'node:stream'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const exec = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dest = path.join(root, '.bin', 'surreal')
const version = '3.3.5'
const url = `https://github.com/surrealdb/surrealdb/releases/download/v${version}/surreal-v${version}.linux-amd64.tgz`

async function versionOf(bin) {
  try {
    const { stdout } = await exec(bin, ['version'])
    return stdout.trim()
  } catch {
    return ''
  }
}

export async function ensureSurreal() {
  const current = await versionOf(dest)
  if (current.includes(version)) return dest
  await mkdir(path.dirname(dest), { recursive: true })
  const tmpCopy = '/tmp/surreal'
  if ((await versionOf(tmpCopy)).includes(version)) {
    const { copyFile } = await import('node:fs/promises')
    await copyFile(tmpCopy, dest)
    await chmod(dest, 0o755)
    return dest
  }
  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`Could not download SurrealDB ${version} (${response.status}). Seed checks need the local binary, not cloud credentials.`)
  }
  const tarPath = path.join(root, '.bin', 'surreal.tgz')
  await pipeline(Readable.fromWeb(response.body), createWriteStream(tarPath))
  await exec('tar', ['-xzf', tarPath, '-C', path.dirname(dest)])
  await chmod(dest, 0o755)
  try {
    await access(dest)
  } catch {
    throw new Error('SurrealDB binary did not extract to koro/.bin/surreal')
  }
  return dest
}
