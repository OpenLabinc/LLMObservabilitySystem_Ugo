import type { PublicEvent } from './types.ts'

export type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export type RecurrenceRule = {
  freq: Freq
  interval: number
  count?: number
  until?: Date
  byday?: number[]
}

const dayIndex: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
}

export function parseRule(recurrence: string): RecurrenceRule | null {
  const body = recurrence.trim().replace(/^RRULE:/i, '')
  if (!body) return null
  const parts = new Map<string, string>()
  for (const chunk of body.split(';')) {
    const [key, value] = chunk.split('=')
    if (key && value) parts.set(key.toUpperCase(), value)
  }
  const freq = parts.get('FREQ')
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY' && freq !== 'YEARLY') return null
  const byday = parts.get('BYDAY')
    ?.split(',')
    .map((token) => dayIndex[token.trim().slice(-2).toUpperCase()] ?? -1)
    .filter((day) => day >= 0)
  return {
    freq,
    interval: Math.max(1, Number(parts.get('INTERVAL') || 1) || 1),
    count: parts.get('COUNT') ? Number(parts.get('COUNT')) : undefined,
    until: parts.get('UNTIL') ? parseUntil(parts.get('UNTIL')!) : undefined,
    byday: byday && byday.length ? byday : undefined,
  }
}

export function recurrenceLabel(recurrence: string): string {
  const rule = parseRule(recurrence)
  if (!rule) return ''
  const unit = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' }[rule.freq]
  const every = rule.interval === 1 ? '' : `${rule.interval} `
  const plural = rule.interval === 1 ? '' : 's'
  return `Repeats every ${every}${unit}${plural}`
}

export function occurrenceIntervals(
  event: Pick<PublicEvent, 'start' | 'end' | 'allDay' | 'recurrence'>,
  rangeStart: Date,
  rangeEnd: Date,
): Array<{ start: Date; end: Date }> {
  const masterStart = parseEventDate(event.start, event.allDay)
  const masterEnd = parseEventDate(event.end, event.allDay)
  const duration = Math.max(masterEnd.getTime() - masterStart.getTime(), event.allDay ? 86_400_000 : 60_000)
  const rule = parseRule(event.recurrence)
  if (!rule) {
    if (masterEnd > rangeStart && masterStart < rangeEnd) return [{ start: masterStart, end: masterEnd }]
    return []
  }

  const out: Array<{ start: Date; end: Date }> = []
  let cursor = new Date(masterStart)
  let seen = 0
  for (let guard = 0; guard < 8000; guard += 1) {
    if (rule.until && cursor > rule.until) break
    if (cursor.getTime() > rangeEnd.getTime() + duration && seen > 0) break
    if (matches(masterStart, cursor, rule)) {
      seen += 1
      if (rule.count && seen > rule.count) break
      const end = new Date(cursor.getTime() + duration)
      if (end > rangeStart && cursor < rangeEnd) out.push({ start: new Date(cursor), end })
    }
    const next = new Date(cursor)
    next.setDate(next.getDate() + 1)
    cursor = next
  }
  return out
}

export function parseEventDate(value: string, allDay: boolean): Date {
  if (allDay || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number)
    return new Date(year, (month ?? 1) - 1, day ?? 1)
  }
  return new Date(value)
}

function parseUntil(value: string): Date {
  if (/^\d{8}$/.test(value)) {
    return parseEventDate(value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'), true)
  }
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/)
  if (!match) return new Date(value)
  const [, year, month, day, hour, minute, second] = match
  return new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second))
}

function dayStamp(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
}

function matches(start: Date, cursor: Date, rule: RecurrenceRule): boolean {
  const diffDays = dayStamp(cursor) - dayStamp(start)
  if (diffDays < 0) return false
  if (rule.freq === 'DAILY') return diffDays % rule.interval === 0
  if (rule.freq === 'WEEKLY') {
    const weeks = Math.floor(diffDays / 7)
    if (weeks % rule.interval !== 0) return false
    if (rule.byday?.length) return rule.byday.includes(cursor.getDay())
    return diffDays % 7 === 0
  }
  if (rule.freq === 'MONTHLY') {
    const months = (cursor.getFullYear() - start.getFullYear()) * 12 + (cursor.getMonth() - start.getMonth())
    return months >= 0 && months % rule.interval === 0 && cursor.getDate() === start.getDate()
  }
  const years = cursor.getFullYear() - start.getFullYear()
  return years >= 0 && years % rule.interval === 0 && cursor.getMonth() === start.getMonth() && cursor.getDate() === start.getDate()
}
