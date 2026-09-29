import { occurrenceIntervals } from '../shared/recur.ts'
import type { PublicEvent } from '../shared/types.ts'

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1)
}

export function monthCells(cursor: Date): Date[] {
  const first = startOfMonth(cursor)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function dayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function eventsOnDay(events: PublicEvent[], day: Date): PublicEvent[] {
  const start = dayStart(day)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return events
    .filter((event) => occurrenceIntervals(event, start, end).length > 0)
    .sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title))
}

export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

export function formatSpan(event: Pick<PublicEvent, 'start' | 'end' | 'allDay'>): string {
  if (event.allDay) {
    const end = shiftDate(event.end, -1)
    if (end === event.start.slice(0, 10)) return 'All day'
    return `All day · ${event.start.slice(0, 10)} to ${end}`
  }
  return `${formatClock(event.start)} – ${formatClock(event.end)}`
}

export function whereLabel(event: PublicEvent): string {
  if (event.diverged) return 'Apple and Gmail differ'
  if (event.onApple && event.onGoogle) return 'On Apple and Gmail'
  if (event.onApple) return 'Only on Apple Calendar'
  return 'Only on Gmail'
}

function shiftDate(isoDay: string, days: number): string {
  const [year, month, day] = isoDay.slice(0, 10).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
