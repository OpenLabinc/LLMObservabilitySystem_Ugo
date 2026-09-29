import type { CalEvent, Link, PublicEvent, Side, SideSnap, SyncOp } from '../shared/types.ts'

export type Window = { start: string; end: string }

type Group = { uid: string; apple?: CalEvent; google?: CalEvent }

export function fingerprint(event: Pick<CalEvent, 'title' | 'description' | 'location' | 'start' | 'end' | 'allDay' | 'recurrence'>): string {
  return JSON.stringify({
    title: event.title.trim(),
    description: event.description.trim(),
    location: event.location.trim(),
    start: canon(event.start, event.allDay),
    end: canon(event.end, event.allDay),
    allDay: event.allDay,
    recurrence: event.recurrence.trim(),
  })
}

export function canon(value: string, allDay: boolean): string {
  if (allDay || /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 10)
  const time = Date.parse(value)
  return Number.isNaN(time) ? value : new Date(time).toISOString()
}

export function inWindow(start: string, window: Window): boolean {
  const time = Date.parse(start.length <= 10 ? `${start.slice(0, 10)}T00:00:00.000Z` : start)
  if (Number.isNaN(time)) return true
  return time >= Date.parse(window.start) && time <= Date.parse(window.end)
}

export function overlapsWindow(event: CalEvent, window: Window): boolean {
  if (event.status === 'cancelled') return inWindow(event.start || window.start, window)
  if (event.recurrence) return Date.parse(event.allDay ? `${event.start.slice(0, 10)}T00:00:00.000Z` : event.start) <= Date.parse(window.end)
  const start = Date.parse(event.allDay ? `${event.start.slice(0, 10)}T00:00:00.000Z` : event.start)
  const end = Date.parse(event.allDay ? `${event.end.slice(0, 10)}T00:00:00.000Z` : event.end)
  return end >= Date.parse(window.start) && start <= Date.parse(window.end)
}

export function syncWindow(now = new Date()): Window {
  const start = new Date(now)
  start.setUTCDate(start.getUTCDate() - 90)
  const end = new Date(now)
  end.setUTCDate(end.getUTCDate() + 365)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function groupEvents(apple: CalEvent[], google: CalEvent[], links: Link[], window?: Window): Map<string, Group> {
  const groups = new Map<string, Group>()
  const place = (event: CalEvent, side: Side) => {
    let uid = resolveUid(event, side, links)
    if (side === 'google' && !groups.has(uid)) {
      for (const key of groups.keys()) {
        if (sameIdentity(key, event.uid) || sameIdentity(key, uid)) {
          uid = key
          break
        }
      }
    }
    const group = groups.get(uid) ?? { uid }
    group[side] = event
    groups.set(uid, group)
  }
  for (const event of apple) place(event, 'apple')
  for (const event of google) place(event, 'google')
  if (window) {
    for (const link of links) {
      if (!groups.has(link.uid) && inWindow(link.start, window)) groups.set(link.uid, { uid: link.uid })
    }
  }
  return groups
}

export function planSync(input: { apple: CalEvent[]; google: CalEvent[]; links: Link[]; window: Window }): { ops: SyncOp[]; outsideLinks: Link[] } {
  const groups = groupEvents(input.apple, input.google, input.links, input.window)
  const ops: SyncOp[] = []
  for (const group of groups.values()) {
    const link = input.links.find((item) => item.uid === group.uid)
    const apple = alive(group.apple)
    const google = alive(group.google)
    if (apple && google) {
      if (fingerprint(apple) !== fingerprint(google)) {
        if (Date.parse(apple.updated) >= Date.parse(google.updated)) {
          ops.push(op('update', 'google', carry(apple, google, group.uid, 'google'), `Updated "${label(apple)}" on Gmail`))
        } else {
          ops.push(op('update', 'apple', carry(google, apple, group.uid, 'apple'), `Updated "${label(google)}" on Apple Calendar`))
        }
      }
      continue
    }
    if (apple && !google) {
      if (group.google?.status === 'cancelled' || link?.googleId) {
        ops.push(op('delete', 'apple', apple, `Removed "${label(apple)}" from Apple Calendar`))
      } else {
        ops.push(op('create', 'google', carry(apple, undefined, group.uid, 'google'), `Copied "${label(apple)}" to Gmail`))
      }
      continue
    }
    if (google && !apple) {
      if (group.apple?.status === 'cancelled' || link?.appleHref) {
        ops.push(op('delete', 'google', google, `Removed "${label(google)}" from Gmail`))
      } else {
        ops.push(op('create', 'apple', carry(google, undefined, group.uid, 'apple'), `Copied "${label(google)}" to Apple Calendar`))
      }
    }
  }
  const outsideLinks = input.links.filter((link) => !groups.has(link.uid) && !inWindow(link.start, input.window))
  return { ops, outsideLinks }
}

export function rebuildLinks(apple: CalEvent[], google: CalEvent[], outside: Link[], previous: Link[]): Link[] {
  const groups = groupEvents(apple, google, previous)
  const links = [...outside]
  for (const group of groups.values()) {
    const appleEvent = alive(group.apple)
    const googleEvent = alive(group.google)
    if (!appleEvent && !googleEvent) continue
    const basis = appleEvent && googleEvent
      ? (Date.parse(appleEvent.updated) >= Date.parse(googleEvent.updated) ? appleEvent : googleEvent)
      : (appleEvent ?? googleEvent)!
    links.push({
      uid: group.uid,
      hash: fingerprint(basis),
      appleHref: appleEvent?.href,
      googleId: googleEvent?.googleId,
      start: basis.start,
      end: basis.end,
    })
  }
  return links
}

export function projectEvents(apple: CalEvent[], google: CalEvent[], links: Link[]): PublicEvent[] {
  const groups = groupEvents(apple, google, links)
  const events: PublicEvent[] = []
  for (const group of groups.values()) {
    const appleEvent = alive(group.apple)
    const googleEvent = alive(group.google)
    if (!appleEvent && !googleEvent) continue
    const newer = appleEvent && googleEvent
      ? (Date.parse(appleEvent.updated) >= Date.parse(googleEvent.updated) ? appleEvent : googleEvent)
      : (appleEvent ?? googleEvent)!
    events.push({
      uid: group.uid,
      title: newer.title,
      description: newer.description,
      location: newer.location,
      start: newer.start,
      end: newer.end,
      allDay: newer.allDay,
      recurrence: newer.recurrence,
      onApple: Boolean(appleEvent),
      onGoogle: Boolean(googleEvent),
      diverged: Boolean(appleEvent && googleEvent && fingerprint(appleEvent) !== fingerprint(googleEvent)),
      apple: appleEvent ? snap(appleEvent) : undefined,
      google: googleEvent ? snap(googleEvent) : undefined,
    })
  }
  events.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title))
  return events
}

function snap(event: CalEvent): SideSnap {
  return {
    title: event.title,
    description: event.description,
    location: event.location,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    updated: event.updated,
  }
}

function carry(source: CalEvent, target: CalEvent | undefined, uid: string, side: Side): CalEvent {
  return {
    ...source,
    uid,
    status: 'confirmed',
    href: side === 'apple' ? target?.href : undefined,
    etag: side === 'apple' ? target?.etag : undefined,
    googleId: side === 'google' ? target?.googleId : undefined,
  }
}

function op(kind: SyncOp['kind'], target: Side, event: CalEvent, message: string): SyncOp {
  return { kind, target, event, message }
}

function alive(event: CalEvent | undefined): CalEvent | undefined {
  return event && event.status !== 'cancelled' ? event : undefined
}

function label(event: CalEvent): string {
  return event.title.trim() || 'Untitled'
}

function resolveUid(event: CalEvent, side: Side, links: Link[]): string {
  if (side === 'google' && event.googleId) {
    const hit = links.find((link) => link.googleId === event.googleId)
    if (hit) return hit.uid
  }
  if (side === 'apple' && event.href) {
    const hit = links.find((link) => link.appleHref === event.href)
    if (hit) return hit.uid
  }
  const bare = event.uid.replace(/@google\.com$/i, '')
  const hit = links.find((link) => link.uid === event.uid || link.uid === bare)
  if (hit) return hit.uid
  return event.uid
}

function sameIdentity(a: string, b: string): boolean {
  if (a === b) return true
  return a.replace(/@google\.com$/i, '') === b.replace(/@google\.com$/i, '')
}
