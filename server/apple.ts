import { createDAVClient, type DAVCalendar } from 'tsdav'
import type { CalEvent } from '../shared/types.ts'
import { buildIcs, parseIcs } from './ics.ts'
import type { CalendarPort } from './ports.ts'
import { overlapsWindow } from './sync-engine.ts'

export async function connectApple(appleId: string, appPassword: string): Promise<{ calendarUrl: string; calendarName: string }> {
  const client = await clientFor(appleId, appPassword)
  const calendar = pickCalendar(await client.fetchCalendars())
  return { calendarUrl: calendar.url, calendarName: displayName(calendar) }
}

export function applePort(appleId: string, appPassword: string, calendarUrl: string): CalendarPort {
  let calendar: DAVCalendar | null = null
  const ready = async () => {
    const client = await clientFor(appleId, appPassword)
    if (!calendar || calendar.url !== calendarUrl) {
      const calendars = await client.fetchCalendars()
      calendar = calendars.find((item) => item.url === calendarUrl) ?? pickCalendar(calendars)
    }
    return { client, calendar }
  }
  return {
    async list(window) {
      const { client, calendar: current } = await ready()
      const objects = await client.fetchCalendarObjects({ calendar: current })
      const events: CalEvent[] = []
      for (const object of objects) {
        const parsed = parseIcs(typeof object.data === 'string' ? object.data : String(object.data ?? ''))[0]
        if (!parsed) continue
        const event = { ...parsed, href: object.url, etag: object.etag }
        if (overlapsWindow(event, window)) events.push(event)
      }
      return events
    },
    async create(event) {
      const { client, calendar: current } = await ready()
      const filename = `${event.uid.replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`
      const response = await client.createCalendarObject({
        calendar: current,
        filename,
        iCalString: buildIcs(event),
      })
      if (!response.ok) throw new Error(`Apple Calendar rejected the new event (${response.status}).`)
      const location = response.headers.get('location')
      const href = location ? new URL(location, current.url).toString() : joinUrl(current.url, filename)
      return { ...event, href, status: 'confirmed' }
    },
    async update(event) {
      if (!event.href) throw new Error(`“${event.title}” has no Apple Calendar address to update.`)
      const { client } = await ready()
      const response = await client.updateCalendarObject({
        calendarObject: { url: event.href, data: buildIcs(event), etag: event.etag },
      })
      if (!response.ok) throw new Error(`Apple Calendar rejected the update (${response.status}).`)
      return event
    },
    async remove(event) {
      if (!event.href) throw new Error(`“${event.title}” has no Apple Calendar address to delete.`)
      const { client } = await ready()
      const response = await client.deleteCalendarObject({ calendarObject: { url: event.href, etag: event.etag } })
      if (!response.ok && response.status !== 404) throw new Error(`Apple Calendar rejected the delete (${response.status}).`)
    },
  }
}

function clientFor(appleId: string, appPassword: string) {
  return createDAVClient({
    serverUrl: 'https://caldav.icloud.com',
    credentials: { username: appleId, password: appPassword },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  })
}

function pickCalendar(calendars: DAVCalendar[]): DAVCalendar {
  const usable = calendars.filter((calendar) => !calendar.components || calendar.components.includes('VEVENT'))
  const named = usable.find((calendar) => /^(calendar|home)$/i.test(displayName(calendar)))
  const chosen = named ?? usable[0]
  if (!chosen) throw new Error('No Apple calendar was found on this account.')
  return chosen
}

function displayName(calendar: DAVCalendar): string {
  const name = calendar.displayName
  if (typeof name === 'string' && name.trim()) return name.trim()
  return 'Calendar'
}

function joinUrl(base: string, name: string): string {
  return base.endsWith('/') ? `${base}${name}` : `${base}/${name}`
}

