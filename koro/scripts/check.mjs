import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureSurreal } from './ensure-surreal.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = 8099

function waitForVersion(url) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const tick = async () => {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(400) })
        if (response.ok) {
          resolve(await response.text())
          return
        }
      } catch {
        // server still booting
      }
      if (Date.now() - started > 15000) reject(new Error('SurrealDB did not start'))
      else setTimeout(tick, 200)
    }
    void tick()
  })
}

const bin = await ensureSurreal()
const child = spawn(bin, ['start', '--unauthenticated', '--bind', `127.0.0.1:${port}`, '--no-banner', 'memory'], {
  stdio: 'ignore',
})
let code = 1
try {
  await waitForVersion(`http://127.0.0.1:${port}/version`)
  code = await new Promise((resolve) => {
    const run = spawn('npx', ['tsx', 'scripts/apply.ts'], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, SURREAL_URL: `ws://127.0.0.1:${port}/rpc` },
    })
    run.on('exit', (exitCode) => resolve(exitCode ?? 1))
  })
} finally {
  child.kill('SIGTERM')
}
process.exit(code)
