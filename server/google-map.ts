import type { CalEvent } from '../shared/types.ts'
import { canon } from './sync-engine.ts'

export type GoogleItem = {
  id?: string | null
  iCalUID?: string | null
  status?: string | null
  summary?: string | null
  description?: string | null
  location?: string | null
  updated?: string | null
  etag?: string | null
  recurrence?: string[] | null
  start?: { date?: string | null; dateTime?: string | null } | null
  end?: { date?: string | null; dateTime?: string | null } | null
}

export function fromGoogleItem(item: GoogleItem): CalEvent | null {
  const uid = item.iCalUID || item.id
  if (!uid) return null
  const allDay = Boolean(item.start?.date && !item.start?.dateTime)
  const start = allDay ? item.start?.date : item.start?.dateTime
  if (!start) {
    if (item.status === 'cancelled') {
      return {
        uid,
        title: item.summary ?? '',
        description: item.description ?? '',
        location: item.location ?? '',
        start: item.updated ?? new Date(0).toISOString(),
        end: item.updated ?? new Date(0).toISOString(),
        allDay: false,
        recurrence: '',
        updated: item.updated ?? new Date(0).toISOString(),
        status: 'cancelled',
        googleId: item.id ?? undefined,
        etag: item.etag ?? undefined,
      }
    }
    return null
  }
  const end = allDay ? (item.end?.date ?? start) : (item.end?.dateTime ?? start)
  const rule = item.recurrence?.find((line) => line.startsWith('RRULE:'))?.slice('RRULE:'.length) ?? ''
  return {
    uid,
    title: item.summary ?? '',
    description: item.description ?? '',
    location: item.location ?? '',
    start: canon(start, allDay),
    end: canon(end, allDay),
    allDay,
    recurrence: rule,
    updated: item.updated ?? new Date(0).toISOString(),
    status: item.status === 'cancelled' ? 'cancelled' : 'confirmed',
    googleId: item.id ?? undefined,
    etag: item.etag ?? undefined,
  }
}

export function toGoogleBody(event: CalEvent): Record<string, unknown> {
  const body: Record<string, unknown> = {
    iCalUID: event.uid,
    summary: event.title,
    description: event.description,
    location: event.location,
    start: event.allDay ? { date: event.start.slice(0, 10) } : { dateTime: event.start, timeZone: 'UTC' },
    end: event.allDay ? { date: event.end.slice(0, 10) } : { dateTime: event.end, timeZone: 'UTC' },
  }
  if (event.recurrence) body.recurrence = [`RRULE:${event.recurrence.replace(/^RRULE:/i, '')}`]
  return body
}
