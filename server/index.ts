import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Side } from '../shared/types.ts'
import { googleConfigured } from './google.ts'
import { HttpError, Service, type EventInput } from './service.ts'
import { closeSurrealChild } from './store.ts'

const webOrigin = process.env.WEB_ORIGIN || 'http://127.0.0.1:5173'

export async function start(): Promise<() => Promise<void>> {
  const service = await Service.create()
  await service.init()
  const app = new Hono()
  app.use('*', cors({
    origin: (origin) => {
      if (!origin) return webOrigin
      const allowed = new Set([webOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'])
      return allowed.has(origin) ? origin : webOrigin
    },
  }))

  app.get('/api/health', (c) => c.json({ ok: true, store: service.storeKind, googleConfigured: googleConfigured() }))
  app.get('/api/state', async (c) => c.json(await service.getState()))
  app.post('/api/sync', async (c) => c.json(await service.sync('manual')))
  app.put('/api/settings', async (c) => {
    const body = await c.req.json<{ intervalSec: number }>()
    return c.json(await service.setIntervalSec(body.intervalSec))
  })
  app.post('/api/events', async (c) => c.json(await service.addEvent(await c.req.json<EventInput>())))
  app.patch('/api/events/:uid', async (c) => c.json(await service.patchEvent(c.req.param('uid'), await c.req.json<EventInput>())))
  app.delete('/api/events/:uid', async (c) => {
    const side = c.req.query('side')
    const target: Side | 'both' = side === 'apple' || side === 'google' ? side : 'both'
    return c.json(await service.deleteEvent(c.req.param('uid'), target))
  })
  app.post('/api/connect/apple', async (c) => {
    const body = await c.req.json<{ appleId: string; appPassword: string }>()
    return c.json(await service.connectAppleAccount(body.appleId ?? '', body.appPassword ?? ''))
  })
  app.post('/api/disconnect', async (c) => {
    const body = await c.req.json<{ provider: Side }>()
    return c.json(await service.disconnect(body.provider))
  })
  app.get('/api/connect/google', (c) => {
    if (!googleConfigured()) return c.redirect(`${webOrigin}/?google_error=missing`)
    return c.redirect(service.googleRedirect())
  })
  app.get('/api/connect/google/callback', async (c) => {
    const code = c.req.query('code')
    const failure = c.req.query('error')
    if (!code || failure) return c.redirect(`${webOrigin}/?google_error=${encodeURIComponent(failure || 'cancelled')}`)
    try {
      await service.connectGoogleAccount(code)
      return c.redirect(`${webOrigin}/?connected=google`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed'
      return c.redirect(`${webOrigin}/?google_error=${encodeURIComponent(message)}`)
    }
  })
  app.onError((error, c) => {
    const status = error instanceof HttpError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Something went wrong'
    return c.json({ error: message }, status as 400)
  })

  const port = Number(process.env.PORT || 8787)
  const server = serve({ fetch: app.fetch, port, hostname: '0.0.0.0' })
  console.log(`Supercal API on http://127.0.0.1:${port}`)
  return async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await service.close()
    await closeSurrealChild()
  }
}

if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  await start()
}
