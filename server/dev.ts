import { spawn } from 'node:child_process'
import { start } from './index.ts'

const stop = await start()
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', '5173'], {
  stdio: 'inherit',
  cwd: new URL('..', import.meta.url).pathname,
})

function shutdown() {
  vite.kill('SIGTERM')
  void stop().finally(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
vite.on('exit', (code) => {
  void stop().finally(() => process.exit(code ?? 0))
})
