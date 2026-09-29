import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { Service } from './service.ts'
import { emptyState, openStore } from './store.ts'

test('practice desk sync copies both ways and then propagates a delete', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'supercal-'))
  const service = await Service.create({ prefer: 'file', filePath: join(dir, 'store.json') })
  try {
    await service.init()
    const before = await service.getState()
    assert.equal(before.mode, 'practice')
    assert.equal(before.events.find((event) => event.uid === 'supercal-piano')?.onGoogle, false)
    assert.equal(before.events.find((event) => event.uid === 'supercal-travel')?.onApple, false)
    assert.equal(before.events.find((event) => event.uid === 'supercal-standup')?.diverged, true)

    const synced = await service.sync('manual')
    const piano = synced.events.find((event) => event.uid === 'supercal-piano')
    const travel = synced.events.find((event) => event.uid === 'supercal-travel')
    const standup = synced.events.find((event) => event.uid === 'supercal-standup')
    const deep = synced.events.find((event) => event.uid === 'supercal-deep-work')
    assert.equal(piano?.onApple, true)
    assert.equal(piano?.onGoogle, true)
    assert.equal(travel?.onApple, true)
    assert.equal(travel?.onGoogle, true)
    assert.equal(standup?.diverged, false)
    assert.equal(standup?.title, 'Team standup')
    assert.equal(deep?.onGoogle, true)
    assert.ok(synced.runs[0]?.messages.some((message) => message.includes('Piano lesson') && message.includes('Gmail')))
    assert.ok(synced.runs[0]?.messages.some((message) => message.includes('Travel day') && message.includes('Apple')))

    await service.deleteEvent('supercal-piano', 'apple')
    const removed = await service.sync('manual')
    assert.equal(removed.events.find((event) => event.uid === 'supercal-piano'), undefined)

    const added = await service.addEvent({
      title: 'Call the plumber',
      start: '2026-10-08T15:00:00.000Z',
      end: '2026-10-08T15:30:00.000Z',
      side: 'google',
    })
    const created = added.events.find((event) => event.title === 'Call the plumber')
    assert.ok(created)
    assert.equal(created.onGoogle, true)
    assert.equal(created.onApple, false)
    const copied = await service.sync('manual')
    const both = copied.events.find((event) => event.title === 'Call the plumber')
    assert.equal(both?.onApple, true)
    assert.equal(both?.onGoogle, true)
  } finally {
    await service.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('surreal store round-trips connections, events, and sync runs', async (t) => {
  try {
    const health = await fetch('http://127.0.0.1:8000/health')
    if (!health.ok) return t.skip('SurrealDB is not running')
  } catch {
    return t.skip('SurrealDB is not running')
  }
  const store = await openStore({ database: 'caltest' })
  try {
    assert.equal(store.kind, 'surreal')
    const state = emptyState()
    state.seeded = true
    state.intervalSec = 300
    state.nextSyncAt = '2026-09-29T12:30:00.000Z'
    state.practiceApple = [{
      uid: 'one',
      title: 'One',
      description: '',
      location: 'Home',
      start: '2026-10-01T10:00:00.000Z',
      end: '2026-10-01T11:00:00.000Z',
      allDay: false,
      recurrence: '',
      updated: '2026-09-29T12:00:00.000Z',
      status: 'confirmed',
      href: 'practice://apple/one',
    }]
    state.practiceLinks = [{ uid: 'one', hash: 'abc', appleHref: 'practice://apple/one', start: state.practiceApple[0].start, end: state.practiceApple[0].end }]
    state.runs = [{
      id: 'run-1',
      trigger: 'manual',
      mode: 'practice',
      startedAt: '2026-09-29T12:00:00.000Z',
      finishedAt: '2026-09-29T12:00:02.000Z',
      created: 1,
      updated: 0,
      deleted: 0,
      messages: ['Copied “One” to Gmail'],
      errors: [],
    }]
    await store.save(state)
    const loaded = await store.load()
    assert.equal(loaded.intervalSec, 300)
    assert.equal(loaded.seeded, true)
    assert.equal(loaded.practiceApple[0]?.title, 'One')
    assert.equal(loaded.practiceApple[0]?.href, 'practice://apple/one')
    assert.equal(loaded.practiceLinks[0]?.appleHref, 'practice://apple/one')
    assert.equal(loaded.practiceLinks[0]?.googleId, undefined)
    assert.equal(loaded.runs[0]?.messages[0], 'Copied “One” to Gmail')
    await store.save(emptyState())
  } finally {
    await store.close()
  }
})
