import assert from 'node:assert/strict'
import test from 'node:test'
import { occurrenceIntervals, recurrenceLabel } from '../shared/recur.ts'

test('weekly count shows four occurrences from the series start', () => {
  const hits = occurrenceIntervals(
    {
      start: '2026-10-01T14:00:00.000Z',
      end: '2026-10-01T16:00:00.000Z',
      allDay: false,
      recurrence: 'FREQ=WEEKLY;COUNT=4',
    },
    new Date(2026, 8, 1),
    new Date(2026, 11, 1),
  )
  assert.equal(hits.length, 4)
  assert.equal(recurrenceLabel('FREQ=WEEKLY;COUNT=4'), 'Repeats every week')
})
