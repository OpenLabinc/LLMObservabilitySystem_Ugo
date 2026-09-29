import type { CalEvent, Side } from '../shared/types.ts'
import { overlapsWindow, type Window } from './sync-engine.ts'

export interface CalendarPort {
  list(window: Window): Promise<CalEvent[]>
  create(event: CalEvent): Promise<CalEvent>
  update(event: CalEvent): Promise<CalEvent>
  remove(event: CalEvent): Promise<void>
}

export function practicePort(events: CalEvent[], side: Side): CalendarPort {
  const create = async (event: CalEvent): Promise<CalEvent> => {
    const stored: CalEvent = {
      ...event,
      status: 'confirmed',
      updated: new Date().toISOString(),
      href: side === 'apple' ? event.href ?? `practice://apple/${event.uid}` : undefined,
      googleId: side === 'google' ? event.googleId ?? `practice_${event.uid}` : event.googleId,
    }
    const index = events.findIndex((item) => item.uid === stored.uid)
    if (index >= 0) events[index] = stored
    else events.push(stored)
    return { ...stored }
  }
  return {
    async list(window) {
      return events.filter((event) => overlapsWindow(event, window)).map((event) => ({ ...event }))
    },
    create,
    update: create,
    async remove(event) {
      const index = events.findIndex((item) => item.uid === event.uid || (event.href && item.href === event.href) || (event.googleId && item.googleId === event.googleId))
      if (index >= 0) events.splice(index, 1)
    },
  }
}
