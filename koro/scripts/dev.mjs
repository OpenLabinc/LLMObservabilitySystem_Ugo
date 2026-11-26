import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureSurreal } from './ensure-surreal.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = 8000
const log = createWriteStream(path.join(root, '.bin', 'surreal.log'), { flags: 'a' })

async function versionUp() {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/version`, { signal: AbortSignal.timeout(400) })
    return response.ok
  } catch {
    return false
  }
}

const bin = await ensureSurreal()
let server
if (!(await versionUp())) {
  server = spawn(bin, ['start', '--unauthenticated', '--bind', `127.0.0.1:${port}`, '--no-banner', 'memory'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stdout?.pipe(log)
  server.stderr?.pipe(log)
  const started = Date.now()
  while (!(await versionUp())) {
    if (Date.now() - started > 15000) {
      console.error('SurrealDB did not start. See koro/.bin/surreal.log')
      process.exit(1)
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
}

const seed = spawn('npx', ['tsx', 'scripts/apply.ts', '--seed-only'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, SURREAL_URL: `ws://127.0.0.1:${port}/rpc` },
})
const seedCode = await new Promise((resolve) => seed.on('exit', (code) => resolve(code ?? 1)))
if (seedCode !== 0) {
  server?.kill('SIGTERM')
  process.exit(seedCode)
}

const vite = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
  cwd: root,
  stdio: 'inherit',
})

function stop() {
  vite.kill('SIGTERM')
  server?.kill('SIGTERM')
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
vite.on('exit', (code) => {
  server?.kill('SIGTERM')
  process.exit(code ?? 0)
})
