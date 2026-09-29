import assert from 'node:assert/strict'
import test from 'node:test'
import type { CalEvent } from '../shared/types.ts'
import { fingerprint, planSync, rebuildLinks, syncWindow } from './sync-engine.ts'

const window = syncWindow(new Date('2026-09-29T12:00:00.000Z'))

function event(partial: Partial<CalEvent> & Pick<CalEvent, 'uid' | 'title' | 'start' | 'end'>): CalEvent {
  return {
    description: '',
    location: '',
    allDay: false,
    recurrence: '',
    updated: '2026-09-29T00:00:00.000Z',
    status: 'confirmed',
    ...partial,
  }
}

test('copies an Apple-only event to Gmail and keeps a match untouched', () => {
  const piano = event({
    uid: 'piano',
    title: 'Piano lesson',
    start: '2026-10-02T16:00:00.000Z',
    end: '2026-10-02T16:45:00.000Z',
    href: 'practice://apple/piano',
  })
  const market = event({
    uid: 'market',
    title: 'Market run',
    start: '2026-09-30T08:00:00.000Z',
    end: '2026-09-30T08:45:00.000Z',
    href: 'practice://apple/market',
  })
  const marketGoogle = { ...market, href: undefined, googleId: 'g-market' }
  const plan = planSync({ apple: [piano, market], google: [marketGoogle], links: [], window })
  assert.equal(plan.ops.length, 1)
  assert.equal(plan.ops[0]?.kind, 'create')
  assert.equal(plan.ops[0]?.target, 'google')
  assert.equal(plan.ops[0]?.event.title, 'Piano lesson')
})

test('newer Apple copy wins when the same event differs', () => {
  const apple = event({
    uid: 'standup',
    title: 'Team standup',
    start: '2026-10-01T09:00:00.000Z',
    end: '2026-10-01T09:20:00.000Z',
    updated: '2026-09-29T11:00:00.000Z',
    href: 'practice://apple/standup',
  })
  const google = event({
    uid: 'standup',
    title: 'Team standup — old room',
    start: '2026-10-01T09:00:00.000Z',
    end: '2026-10-01T09:30:00.000Z',
    updated: '2026-09-27T11:00:00.000Z',
    googleId: 'g-standup',
  })
  const plan = planSync({ apple: [apple], google: [google], links: [], window })
  assert.equal(plan.ops.length, 1)
  assert.equal(plan.ops[0]?.target, 'google')
  assert.equal(plan.ops[0]?.kind, 'update')
  assert.equal(plan.ops[0]?.event.googleId, 'g-standup')
  assert.equal(fingerprint(plan.ops[0]!.event), fingerprint(apple))
})

test('matches a Gmail iCalUID that gained an @google.com suffix', () => {
  const apple = event({
    uid: 'deep-work',
    title: 'Deep work',
    start: '2026-10-01T14:00:00.000Z',
    end: '2026-10-01T16:00:00.000Z',
    href: 'practice://apple/deep-work',
  })
  const google = event({
    uid: 'deep-work@google.com',
    title: 'Deep work',
    start: '2026-10-01T14:00:00.000Z',
    end: '2026-10-01T16:00:00.000Z',
    googleId: 'g-deep',
  })
  const plan = planSync({ apple: [apple], google: [google], links: [], window })
  assert.equal(plan.ops.length, 0)
})

test('deletes the Apple copy after Gmail cancelled it', () => {
  const apple = event({
    uid: 'piano',
    title: 'Piano lesson',
    start: '2026-10-02T16:00:00.000Z',
    end: '2026-10-02T16:45:00.000Z',
    href: 'practice://apple/piano',
  })
  const google = event({
    uid: 'piano',
    title: 'Piano lesson',
    start: '2026-10-02T16:00:00.000Z',
    end: '2026-10-02T16:45:00.000Z',
    status: 'cancelled',
    googleId: 'g-piano',
  })
  const plan = planSync({
    apple: [apple],
    google: [google],
    links: [{ uid: 'piano', hash: 'x', appleHref: apple.href, googleId: 'g-piano', start: apple.start, end: apple.end }],
    window,
  })
  assert.equal(plan.ops[0]?.kind, 'delete')
  assert.equal(plan.ops[0]?.target, 'apple')
})

test('keeps links that sit outside the sync window', () => {
  const old = {
    uid: 'old',
    hash: 'h',
    appleHref: 'practice://apple/old',
    googleId: 'g-old',
    start: '2020-01-01T00:00:00.000Z',
    end: '2020-01-01T01:00:00.000Z',
  }
  const plan = planSync({ apple: [], google: [], links: [old], window })
  assert.equal(plan.ops.length, 0)
  assert.deepEqual(plan.outsideLinks, [old])
  const links = rebuildLinks([], [], plan.outsideLinks, [old])
  assert.equal(links.length, 1)
  assert.equal(links[0]?.uid, 'old')
})
