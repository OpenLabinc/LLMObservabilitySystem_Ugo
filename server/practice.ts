import { DateTime } from 'luxon'
import type { CalEvent } from '../shared/types.ts'

export function practiceSeed(now = DateTime.now()): { apple: CalEvent[]; google: CalEvent[] } {
  const at = (plusDays: number, hour: number, minute = 0) =>
    now.startOf('day').plus({ days: plusDays, hours: hour, minutes: minute }).toUTC().toISO()!
  const day = (plusDays: number) => now.startOf('day').plus({ days: plusDays }).toISODate()!

  const marketUpdated = now.minus({ days: 2 }).toUTC().toISO()!
  const market: CalEvent = {
    uid: 'supercal-market',
    title: 'Market run',
    description: 'Already on both calendars.',
    location: 'Town market',
    start: at(1, 8),
    end: at(1, 8, 45),
    allDay: false,
    recurrence: '',
    updated: marketUpdated,
    status: 'confirmed',
    href: 'practice://apple/supercal-market',
  }

  const piano: CalEvent = {
    uid: 'supercal-piano',
    title: 'Piano lesson',
    description: 'Only on Apple until the next sync.',
    location: 'Studio B',
    start: at(3, 16),
    end: at(3, 16, 45),
    allDay: false,
    recurrence: '',
    updated: now.minus({ hours: 5 }).toUTC().toISO()!,
    status: 'confirmed',
    href: 'practice://apple/supercal-piano',
  }

  const standupStart = at(2, 9)
  const standupApple: CalEvent = {
    uid: 'supercal-standup',
    title: 'Team standup',
    description: 'Moved to the smaller room.',
    location: 'Room 2',
    start: standupStart,
    end: at(2, 9, 20),
    allDay: false,
    recurrence: '',
    updated: now.minus({ hours: 1 }).toUTC().toISO()!,
    status: 'confirmed',
    href: 'practice://apple/supercal-standup',
  }
  const standupGoogle: CalEvent = {
    ...standupApple,
    title: 'Team standup — old room',
    description: 'Original hold.',
    location: 'Room 8',
    end: at(2, 9, 30),
    updated: now.minus({ days: 2 }).toUTC().toISO()!,
    href: undefined,
    googleId: 'practice_supercal-standup',
  }

  const deepStart = now.startOf('day').plus({ days: 1, hours: 14 }).toUTC()
  const deep: CalEvent = {
    uid: 'supercal-deep-work',
    title: 'Deep work',
    description: 'A weekly block. The series syncs as one event.',
    location: 'Home',
    start: deepStart.toISO()!,
    end: deepStart.plus({ hours: 2 }).toISO()!,
    allDay: false,
    recurrence: 'FREQ=WEEKLY;COUNT=4',
    updated: now.minus({ hours: 8 }).toUTC().toISO()!,
    status: 'confirmed',
    href: 'practice://apple/supercal-deep-work',
  }

  const travel: CalEvent = {
    uid: 'supercal-travel',
    title: 'Travel day',
    description: 'Only on Gmail until the next sync.',
    location: '',
    start: day(6),
    end: day(7),
    allDay: true,
    recurrence: '',
    updated: now.minus({ hours: 3 }).toUTC().toISO()!,
    status: 'confirmed',
    googleId: 'practice_supercal-travel',
  }

  return {
    apple: [market, piano, standupApple, deep],
    google: [
      { ...market, href: undefined, googleId: 'practice_supercal-market' },
      standupGoogle,
      travel,
    ],
  }
}

export function cloneEvent(event: CalEvent): CalEvent {
  return { ...event }
}
