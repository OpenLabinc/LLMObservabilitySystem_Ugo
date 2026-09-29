import assert from 'node:assert/strict'
import test from 'node:test'
import type { CalEvent } from '../shared/types.ts'
import { buildIcs, parseIcs } from './ics.ts'
import { fromGoogleItem, toGoogleBody } from './google-map.ts'

const event: CalEvent = {
  uid: 'lesson-1',
  title: 'Piano, lesson',
  description: 'Bring the book\npage 4',
  location: 'Studio B',
  start: '2026-10-02T20:00:00.000Z',
  end: '2026-10-02T20:45:00.000Z',
  allDay: false,
  recurrence: 'FREQ=WEEKLY;COUNT=4',
  updated: '2026-09-29T12:00:00.000Z',
  status: 'confirmed',
}

test('ics round trip keeps the fields Apple Calendar needs', () => {
  const parsed = parseIcs(buildIcs(event))[0]
  assert.ok(parsed)
  assert.equal(parsed.uid, event.uid)
  assert.equal(parsed.title, event.title)
  assert.equal(parsed.description, event.description)
  assert.equal(parsed.location, event.location)
  assert.equal(parsed.start, event.start)
  assert.equal(parsed.end, event.end)
  assert.equal(parsed.recurrence, event.recurrence)
})

test('unfolds long lines and reads a New York timezone', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:fold-1',
    'SUMMARY:Design review with the',
    '  team',
    'DTSTART;TZID=America/New_York:20260929T090000',
    'DTEND;TZID=America/New_York:20260929T100000',
    'DTSTAMP:20260929T120000Z',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const parsed = parseIcs(ics)[0]
  assert.equal(parsed?.title, 'Design review with the team')
  assert.equal(parsed?.start, '2026-09-29T13:00:00.000Z')
  assert.equal(parsed?.end, '2026-09-29T14:00:00.000Z')
})

test('all-day events stay on their dates', () => {
  const allDay: CalEvent = { ...event, allDay: true, start: '2026-10-06', end: '2026-10-07', recurrence: '' }
  const parsed = parseIcs(buildIcs(allDay))[0]
  assert.equal(parsed?.allDay, true)
  assert.equal(parsed?.start, '2026-10-06')
  assert.equal(parsed?.end, '2026-10-07')
})

test('google event mapping keeps the iCal UID', () => {
  const body = toGoogleBody(event)
  const mapped = fromGoogleItem({
    id: 'g1',
    iCalUID: event.uid,
    summary: event.title,
    description: event.description,
    location: event.location,
    updated: event.updated,
    recurrence: [`RRULE:${event.recurrence}`],
    start: { dateTime: event.start },
    end: { dateTime: event.end },
  })
  assert.equal(mapped?.uid, event.uid)
  assert.equal(mapped?.googleId, 'g1')
  assert.equal(mapped?.recurrence, event.recurrence)
  assert.equal((body.recurrence as string[])[0], `RRULE:${event.recurrence}`)
})
