import { DateTime } from 'luxon'
import type { CalEvent } from '../shared/types.ts'

export function parseIcs(ics: string): CalEvent[] {
  const unfolded = ics.replace(/\r?\n[ \t]/g, '')
  const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1)
  const events: CalEvent[] = []
  for (const block of blocks) {
    const body = block.split(/END:VEVENT/i)[0] ?? ''
    const fields = new Map<string, { params: Record<string, string>; value: string }>()
    for (const line of body.split(/\r?\n/)) {
      if (!line || line.startsWith('BEGIN:') || line.startsWith('END:')) continue
      const parsed = parseLine(line)
      if (!parsed) continue
      if (!fields.has(parsed.name)) fields.set(parsed.name, parsed)
    }
    const uid = fields.get('UID')?.value
    if (!uid) continue
    const start = fields.get('DTSTART')
    if (!start) continue
    const startParsed = parseWhen(start.params, start.value)
    const endField = fields.get('DTEND')
    const endParsed = endField ? parseWhen(endField.params, endField.value) : undefined
    const allDay = startParsed.allDay
    const end = endParsed?.iso ?? (allDay ? addDays(startParsed.iso, 1) : addHours(startParsed.iso, 1))
    const stamp = fields.get('LAST-MODIFIED')?.value || fields.get('DTSTAMP')?.value
    events.push({
      uid: unescapeText(uid),
      title: unescapeText(fields.get('SUMMARY')?.value ?? ''),
      description: unescapeText(fields.get('DESCRIPTION')?.value ?? ''),
      location: unescapeText(fields.get('LOCATION')?.value ?? ''),
      start: startParsed.iso,
      end,
      allDay,
      recurrence: (fields.get('RRULE')?.value ?? '').replace(/^RRULE:/i, ''),
      updated: stamp ? (parseWhen({}, stamp.endsWith('Z') || stamp.includes('T') ? stamp : `${stamp}T000000Z`).iso) : new Date(0).toISOString(),
      status: /cancelled/i.test(fields.get('STATUS')?.value ?? '') ? 'cancelled' : 'confirmed',
    })
  }
  return events
}

export function buildIcs(event: CalEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Supercal//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${formatUtc(event.updated || new Date().toISOString())}`,
    `LAST-MODIFIED:${formatUtc(new Date().toISOString())}`,
    event.allDay ? `DTSTART;VALUE=DATE:${event.start.slice(0, 10).replace(/-/g, '')}` : `DTSTART:${formatUtc(event.start)}`,
    event.allDay ? `DTEND;VALUE=DATE:${event.end.slice(0, 10).replace(/-/g, '')}` : `DTEND:${formatUtc(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ]
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`)
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`)
  if (event.recurrence) lines.push(`RRULE:${event.recurrence.replace(/^RRULE:/i, '')}`)
  if (event.status === 'cancelled') lines.push('STATUS:CANCELLED')
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

function parseLine(line: string): { name: string; params: Record<string, string>; value: string } | null {
  let name = ''
  let i = 0
  while (i < line.length && line[i] !== ';' && line[i] !== ':') {
    name += line[i]
    i += 1
  }
  if (!name) return null
  const params: Record<string, string> = {}
  while (line[i] === ';') {
    i += 1
    let key = ''
    while (i < line.length && line[i] !== '=' && line[i] !== ';' && line[i] !== ':') {
      key += line[i]
      i += 1
    }
    let value = ''
    if (line[i] === '=') {
      i += 1
      if (line[i] === '"') {
        i += 1
        while (i < line.length && line[i] !== '"') {
          value += line[i]
          i += 1
        }
        if (line[i] === '"') i += 1
      } else {
        while (i < line.length && line[i] !== ';' && line[i] !== ':') {
          value += line[i]
          i += 1
        }
      }
    }
    params[key.toUpperCase()] = value
  }
  if (line[i] !== ':') return null
  return { name: name.toUpperCase(), params, value: line.slice(i + 1) }
}

function parseWhen(params: Record<string, string>, value: string): { iso: string; allDay: boolean } {
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(value)) {
    const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
    return { iso, allDay: true }
  }
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/)
  if (!match) return { iso: new Date(value).toISOString(), allDay: false }
  const [, year, month, day, hour, minute, second, zulu] = match
  if (zulu || !params.TZID) {
    return {
      iso: new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second)).toISOString(),
      allDay: false,
    }
  }
  const zoned = DateTime.fromObject(
    { year: +year, month: +month, day: +day, hour: +hour, minute: +minute, second: +second },
    { zone: params.TZID },
  )
  if (!zoned.isValid) {
    return { iso: new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second)).toISOString(), allDay: false }
  }
  return { iso: zoned.toUTC().toISO() ?? new Date().toISOString(), allDay: false }
}

function formatUtc(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

function addDays(isoDay: string, days: number): string {
  const [year, month, day] = isoDay.slice(0, 10).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 3_600_000).toISOString()
}

function unescapeText(value: string): string {
  let out = ''
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === '\\' && i + 1 < value.length) {
      const next = value[i + 1]
      if (next === 'n' || next === 'N') out += '\n'
      else if (next === ',') out += ','
      else if (next === ';') out += ';'
      else out += next
      i += 1
    } else out += value[i]
  }
  return out
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function fold(line: string): string {
  if (line.length <= 73) return line
  const parts = [line.slice(0, 73)]
  let rest = line.slice(73)
  while (rest.length) {
    parts.push(` ${rest.slice(0, 72)}`)
    rest = rest.slice(72)
  }
  return parts.join('\r\n')
}
